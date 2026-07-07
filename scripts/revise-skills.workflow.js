export const meta = {
  name: 'fde-revise-skills',
  description: 'Apply human review notes to built skills, then re-verify each fix',
  whenToUse: 'Review phase of an Auto-FDE engagement, after the user exports notes from the dashboard',
  phases: [
    { title: 'Fix', detail: 'apply the per-skill note plus global rules' },
    { title: 'Re-verify', detail: 'confirm the note was addressed and nothing regressed' },
  ],
}

// args (paths absolute):
//   pluginDir    - the team plugin root
//   doctrinePath - Auto-FDE's skills/skill-authoring/SKILL.md
//   digestsDir   - engagement discovery/digests/ (ground truth for re-verify)
//   notes        - [{slug, note}] one entry per skill the reviewer flagged
//   globalRules  - [string] rules applying to EVERY noted skill (renames already
//                  applied to catalog, purge lists, doctrine changes, version bump)
//
// Catalog-level changes (renames, merges, cuts) are applied to catalog.json and
// the filesystem by the main loop BEFORE this workflow runs — agents here only
// edit skill content in place.

// scriptPath invocations can deliver args as a JSON string — tolerate both
const ARGS = typeof args === 'string' ? JSON.parse(args) : (args || {})
const { pluginDir, doctrinePath, digestsDir, notes, globalRules } = ARGS
if (!pluginDir || !doctrinePath || !Array.isArray(notes) || !notes.length) {
  throw new Error('revise-skills requires args: pluginDir, doctrinePath, notes[] (and optionally globalRules[])')
}
const rules = (globalRules || []).map((r, i) => `${i + 1}. ${r}`).join('\n') || '(none)'
log(`revising ${notes.length} skills, ${(globalRules || []).length} global rules`)

const RECHECK_SCHEMA = {
  type: 'object',
  required: ['slug', 'noteAddressed', 'rulesApplied', 'noRegression', 'verdict', 'blockingIssues'],
  properties: {
    slug: { type: 'string' },
    noteAddressed: { type: 'boolean', description: 'the reviewer note is genuinely resolved, not paraphrased around' },
    rulesApplied: { type: 'boolean', description: 'every global rule that applies to this skill is applied' },
    noRegression: { type: 'boolean', description: 'fidelity/doctrine quality did not drop' },
    verdict: { enum: ['pass', 'revise'] },
    blockingIssues: { type: 'array', items: { type: 'string' } },
  },
}

const doctrineBlock = `AUTHORING DOCTRINE: read ${doctrinePath} first and conform to it.`

const results = await pipeline(
  notes,

  // Fix
  n => agent(
    `Revise one skill per the team's human review. ${doctrineBlock}

Skill: ${pluginDir}/skills/${n.slug}/ (read every file first).

REVIEWER NOTE (the priority — resolve it fully, in spirit not just letter):
${n.note}

GLOBAL RULES (apply every one that touches this skill):
${rules}

Ground truth for any factual change: digests in ${digestsDir}. Change only what the note and rules require.

THEN pin the fix as a regression case (the flywheel rule: every fixed finding becomes a permanent eval case): append ONE discriminating case to this skill's evals that would have caught the reviewer's finding — a trigger-evals.json case (give it "pinned": true so the benchmark always scores it as train — a pinned case hidden in hold-out would fail invisibly) if the finding was about routing, otherwise an evals.json expectation or checks.json check. Describe it in your regressionCase return field ("<file>: <the case>").

Return what you changed, the regression case, and whether you edited the frontmatter description (descriptionChanged) — edited descriptions force a trigger-benchmark re-run.`,
    {
      label: `fix:${n.slug}`, phase: 'Fix',
      schema: {
        type: 'object',
        required: ['slug', 'changes', 'regressionCase', 'descriptionChanged'],
        properties: {
          slug: { type: 'string' },
          changes: { type: 'array', items: { type: 'string' } },
          regressionCase: { type: 'string' },
          descriptionChanged: { type: 'boolean' },
        },
      },
    },
  ),

  // Re-verify with a fresh skeptic; one forced-fix round, then a SECOND
  // recheck decides the verdict — a fix is never trusted unverified.
  async (fix, n) => {
    if (!fix) return null
    const recheck = round => agent(
      `Verify a revision actually satisfied the reviewer. Be adversarial.${round > 1 ? ' This is a second-round check after a forced fix.' : ''}

Skill: ${pluginDir}/skills/${n.slug}/
The reviewer asked: ${n.note}
Global rules that had to be applied:\n${rules}

Read the files and judge for yourself: noteAddressed, rulesApplied, noRegression (check against digests in ${digestsDir} and the doctrine at ${doctrinePath}). Also confirm the fix was pinned as a regression eval case in the skill's evals — a case that would genuinely have caught the finding, not a vacuous one; a missing or vacuous case is a blocking issue. verdict pass only if all three are true; otherwise list concrete blocking issues.`,
      { label: `recheck${round > 1 ? round : ''}:${n.slug}`, phase: 'Re-verify', schema: RECHECK_SCHEMA },
    )
    let check = await recheck(1)
    if (check && check.verdict !== 'pass') {
      const forced = await agent(
        `A revision was rejected on re-verify. Fix ALL blocking issues, nothing else. ${doctrineBlock}
Skill: ${pluginDir}/skills/${n.slug}/
Blocking issues:\n${check.blockingIssues.map((b, i) => `${i + 1}. ${b}`).join('\n')}
Return what you changed.`,
        {
          label: `force-fix:${n.slug}`, phase: 'Re-verify',
          schema: { type: 'object', required: ['changes'], properties: { changes: { type: 'array', items: { type: 'string' } } } },
        },
      )
      const second = forced ? await recheck(2) : null
      check = { ...(second || check), forcedFix: !!forced }
    }
    return { slug: n.slug, fix, check }
  },
)

const ok = results.filter(Boolean)
const record = {
  revised: ok.length,
  cleanFirstTry: ok.filter(r => r.check && !r.check.forcedFix && r.check.verdict === 'pass').length,
  forcedFixes: ok.filter(r => r.check && r.check.forcedFix).map(r => r.slug),
  unresolved: ok.filter(r => !r.check || r.check.verdict !== 'pass').map(r => r.slug),
  lost: notes.filter((n, i) => !results[i]).map(n => n.slug),
  descriptionsChanged: ok.filter(r => r.fix && r.fix.descriptionChanged).map(r => r.slug),
  // Already ledger-shaped for .build/regressions.json — append these verbatim
  // (the dashboard's Regression ledger reads source/finding/guardedBy/status).
  regressionCases: ok.filter(r => r.fix && r.fix.regressionCase).map(r => {
    const n = notes.find(x => x.slug === r.slug)
    const note = n ? n.note : ''
    return {
      source: 'review note',
      finding: note.length > 140 ? note.slice(0, 137) + '…' : note,
      guardedBy: `${r.slug} · ${r.fix.regressionCase.split(':')[0]}`,
      status: 'open',
    }
  }),
  perSkill: ok,
}
log(`revision done: ${record.cleanFirstTry} clean, ${record.forcedFixes.length} force-fixed, ${record.unresolved.length} unresolved, ${record.descriptionsChanged.length} descriptions changed`)
// Main loop after this: deterministic grep sweep for anything the notes said to
// purge (never trust agents on purges); append record.regressionCases VERBATIM
// to .build/regressions.json (they are already ledger-shaped: source, finding,
// guardedBy, status); if descriptionsChanged is non-empty, RE-RUN the trigger
// benchmark before reporting done (regression gate); regenerate the dashboard
// (scripts/gen-dashboard.py), update catalog.
return record
