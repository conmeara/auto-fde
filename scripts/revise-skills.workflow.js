export const meta = {
  name: 'fde-revise-skills',
  description: 'Apply human review notes to built skills, then re-verify each fix',
  whenToUse: 'Review phase of an Auto-FDE engagement, after the user exports notes from review.html',
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

const { pluginDir, doctrinePath, digestsDir, notes, globalRules } = args
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

Ground truth for any factual change: digests in ${digestsDir}. Change only what the note and rules require. Return what you changed.`,
    {
      label: `fix:${n.slug}`, phase: 'Fix',
      schema: {
        type: 'object',
        required: ['slug', 'changes'],
        properties: { slug: { type: 'string' }, changes: { type: 'array', items: { type: 'string' } } },
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

Read the files and judge for yourself: noteAddressed, rulesApplied, noRegression (check against digests in ${digestsDir} and the doctrine at ${doctrinePath}). verdict pass only if all three are true; otherwise list concrete blocking issues.`,
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
  perSkill: ok,
}
log(`revision done: ${record.cleanFirstTry} clean, ${record.forcedFixes.length} force-fixed, ${record.unresolved.length} unresolved`)
// Main loop after this: deterministic grep sweep for anything the notes said to
// purge (never trust agents on purges), regenerate review/data.js, update catalog.
return record
