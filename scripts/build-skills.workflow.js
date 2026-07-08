export const meta = {
  name: 'fde-build-skills',
  description: 'Build every catalog skill from digests, adversarially verify, revise failures',
  whenToUse: 'Build phase of an Auto-FDE project, after the catalog is approved',
  phases: [
    { title: 'Load', detail: 'read the catalog into a work list' },
    { title: 'Build', detail: 'author SKILL.md + references + evals per skill' },
    { title: 'Verify', detail: 'adversarial fidelity/best-practices/triggering review' },
    { title: 'Revise', detail: 'apply blocking fixes where verdict was not pass' },
  ],
}

// args (all paths absolute):
//   catalogPath    - project catalog.json
//   projectRoot - project working directory (catalog digest/source paths are relative to it)
//   pluginDir      - the team plugin root being built (…/<plugin-name>)
//   digestsDir     - project discovery/digests/
//   doctrinePath   - Auto-FDE's skills/skill-authoring/SKILL.md (the authoring doctrine)
//   sourcesNote    - optional sentence about where raw sources live and access caveats
//
// PILOT SUBSETS: edit SLUGS below in a copy of this script under the project's
// .build/ dir, then invoke by scriptPath. Do NOT pass a subset via `args` and
// expect it on a scriptPath re-invocation — that failed silently twice in the
// field. SLUGS = null builds only skills still statused planned/building;
// an explicit SLUGS list overrides statuses (any non-vendor, non-cut slug).
const SLUGS = null

// scriptPath invocations can deliver args as a JSON string — tolerate both
const ARGS = typeof args === 'string' ? JSON.parse(args) : (args || {})
const { catalogPath, projectRoot, pluginDir, digestsDir, doctrinePath, sourcesNote } = ARGS
if (!catalogPath || !projectRoot || !pluginDir || !digestsDir || !doctrinePath) {
  throw new Error('build-skills requires args: catalogPath, projectRoot, pluginDir, digestsDir, doctrinePath')
}

const WORKLIST_SCHEMA = {
  type: 'object',
  required: ['team', 'pluginName', 'skills'],
  properties: {
    team: { type: 'string' },
    pluginName: { type: 'string' },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        required: ['slug', 'title', 'phase', 'type', 'summary', 'status'],
        properties: {
          slug: { type: 'string' },
          title: { type: 'string' },
          phase: { type: 'string' },
          lane: { type: 'string' },
          type: { type: 'string' },
          summary: { type: 'string' },
          status: { type: 'string' },
          success: { type: 'array', items: { type: 'string' } },
          digests: { type: 'array', items: { type: 'string' } },
          sources: { type: 'array', items: { type: 'string' } },
          templates: { type: 'array', items: { type: 'string' } },
          composes: { type: 'array', items: { type: 'string' } },
          vendor: { type: 'boolean' },
          notes: { type: 'string' },
        },
      },
    },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['slug', 'fidelity', 'bestPractices', 'triggering', 'verdict', 'blockingIssues', 'openQuestions'],
  properties: {
    slug: { type: 'string' },
    fidelity: { type: 'number', description: '0-10: matches the digests/sources exactly' },
    bestPractices: { type: 'number', description: '0-10: conforms to the authoring doctrine' },
    triggering: { type: 'number', description: '0-10: description will trigger correctly, no overlap' },
    verdict: { enum: ['pass', 'revise', 'fail'] },
    blockingIssues: { type: 'array', items: { type: 'string' } },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
}

phase('Load')
const catalog = await agent(
  `Read the Auto-FDE catalog at ${catalogPath} and return the work list. Include team, plugin.name as pluginName, and every entry of skills[] with all its fields. Do not filter, reorder, or summarize.`,
  { label: 'load-catalog', schema: WORKLIST_SCHEMA },
)
if (!catalog) throw new Error('could not load catalog')

let work = catalog.skills.filter(s => !s.vendor && s.status !== 'cut' && s.status !== 'deployed')
work = SLUGS
  ? work.filter(s => SLUGS.includes(s.slug))
  : work.filter(s => s.status === 'planned' || s.status === 'building')
const skipped = catalog.skills.length - work.length
if (skipped) log(`building ${work.length} skills (${skipped} skipped: ${SLUGS ? 'vendor/cut/deployed/not in SLUGS' : 'vendor/cut or already built — use SLUGS to rebuild'})`)

const doctrineBlock = `AUTHORING DOCTRINE: read ${doctrinePath} FIRST and follow it exactly — it defines frontmatter rules, description style, progressive disclosure, conciseness, and eval requirements. Where the doctrine and your instincts disagree, the doctrine wins.`

const results = await pipeline(
  work,

  // Build
  s => agent(
    `Author one production-quality skill for the "${catalog.team}" team plugin.

${doctrineBlock}

Skill: ${s.slug} — ${s.title}
Team workflow phase: ${s.phase}${s.lane ? ` · lane: ${s.lane}` : ''} · type: ${s.type}
Planning summary: ${s.summary}
${s.notes ? `Planner notes: ${s.notes}` : ''}
${s.composes?.length ? `Composes these sibling skills (reference them, never duplicate their content): ${s.composes.join(', ')}` : ''}

GROUND TRUTH, in priority order:
1. Digests — read every listed digest in full: ${(s.digests || []).map(d => `${projectRoot}/${d}`).join(', ') || `${digestsDir} (scan for files whose "covers" includes this skill's topic)`}
2. Raw sources for verbatim fidelity where the digest cites them: ${(s.sources || []).map(d => `${projectRoot}/${d}`).join(', ') || 'none listed'}. ${sourcesNote || ''}
3. Web search ONLY for external standards the team materials assume but do not define.

${s.templates?.length ? `BUNDLED TEMPLATES: this skill must wire the real files ${s.templates.join(', ')} via \${CLAUDE_PLUGIN_ROOT} paths — instruct filling/copying the bundled file, never describe or recreate its contents in markdown. If a listed template file does not exist under ${pluginDir}, record that as an open question; do not fabricate.` : ''}

${s.success?.length ? `SUCCESS CRITERIA (set at plan time — the skill must meet these, and the checks you author must test them):
${s.success.map((x, i) => `${i + 1}. ${x}`).join('\n')}` : ''}

Write to ${pluginDir}/skills/${s.slug}/ :
- SKILL.md (frontmatter name matching the directory, doctrine-compliant description, lean imperative body)
- references/ for depth that doesn't belong in the body (only if genuinely needed)
- the FOUR eval artifacts, formats per the doctrine's eval-formats reference:
  1. evals/trigger-evals.json — positive queries + near-miss negatives
  2. evals/evals.json — 2-3 real task prompts with binary expectations (mark any eval needing live team connections with a "gated" field saying what it needs)
  3. evals/checks.json — deterministic graders compiled from the ground truth and the success criteria: verbatim headings/field lists as contains-all checks, template paths as path-resolves checks; "judge" kind only for what code genuinely cannot check
  4. evals/reference/<evalId>.md — one reference solution per output eval, produced from the fixture inputs, that passes every check (it proves the eval is solvable and calibrates the grader)

Anything the ground truth cannot answer goes in your openQuestions return field — never invent team facts.`,
    {
      label: `build:${s.slug}`, phase: 'Build',
      schema: {
        type: 'object',
        required: ['slug', 'description', 'files', 'openQuestions'],
        properties: {
          slug: { type: 'string' },
          description: { type: 'string', description: 'the frontmatter description as written' },
          files: { type: 'array', items: { type: 'string' } },
          openQuestions: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  ),

  // Verify (fresh adversarial agent). A failed build agent resolves to null —
  // guard explicitly so we never verify a skill that was never written.
  (built, s) => built && agent(
    `Adversarially verify a just-built skill. Be skeptical; your job is to find what is wrong, not to approve.

${doctrineBlock}

Skill under review: ${pluginDir}/skills/${s.slug}/ (read every file).
It claims to implement: ${s.title} (${s.type}) — ${s.summary}
Ground truth to check fidelity against: digests ${(s.digests || []).join(', ') || `in ${digestsDir}`}${s.sources?.length ? ` and raw sources ${s.sources.join(', ')}` : ''}.

Score 0-10 each:
- fidelity: verbatim artifacts (field lists, headings, labels) match the ground truth exactly; no invented team facts; bundled templates wired, not described. EXECUTE the deterministic checks with the bundled checker (Bash):
  python3 ${pluginDir}/scripts/run-checks.py "${pluginDir}/skills/${s.slug}/evals/checks.json" "${pluginDir}/skills/${s.slug}/evals/reference" --plugin-root "${pluginDir}"
  A reference solution that fails its own checks, a check that would pass on a wrong output, a missing reference, or a missing checker script (the scaffold copies it to ${pluginDir}/scripts/run-checks.py) is a blocking issue. Judge-kind rows come back passed: null — rule on those yourself.
- bestPractices: doctrine conformance — frontmatter, description style, body length and altitude, progressive disclosure, and all four eval artifacts present and discriminating (trigger-evals, evals, checks.json, reference solutions).
- triggering: the description alone routes correctly against the sibling catalog (${catalog.skills.map(x => x.slug).join(', ')}) — no overlap, no vagueness.

verdict: pass only if you found nothing that must change (typically all scores ≥ 8). revise = fixable blocking issues, listed concretely with file+location. fail = wrong at the root (say why).`,
    { label: `verify:${s.slug}`, phase: 'Verify', schema: VERIFY_SCHEMA },
  ).then(v => ({ built, verify: v })),

  // Revise only when needed
  async (r, s) => {
    if (!r || !r.verify) return r
    if (r.verify.verdict === 'pass') return { ...r, revised: false }
    const fix = await agent(
      `Fix a skill that failed adversarial verification. ${doctrineBlock}

Skill: ${pluginDir}/skills/${s.slug}/
Blocking issues to fix (fix ALL of them, change nothing else):
${r.verify.blockingIssues.map((b, i) => `${i + 1}. ${b}`).join('\n')}

Ground truth if needed: digests ${(s.digests || []).join(', ') || digestsDir}. Return what you changed per issue.`,
      {
        label: `revise:${s.slug}`, phase: 'Revise',
        schema: {
          type: 'object',
          required: ['fixed'],
          properties: { fixed: { type: 'array', items: { type: 'string' } }, couldNotFix: { type: 'array', items: { type: 'string' } } },
        },
      },
    )
    return { ...r, revised: true, fix }
  },
)

const ok = results.filter(Boolean)
const lost = work.filter((s, i) => !results[i]).map(s => s.slug)
if (lost.length) log(`agents lost/skipped for: ${lost.join(', ')} — re-run these slugs via SLUGS`)

const record = {
  built: ok.length,
  passFirst: ok.filter(r => r.verify && r.verify.verdict === 'pass').length,
  revised: ok.filter(r => r.revised).length,
  failed: ok.filter(r => r.verify && r.verify.verdict === 'fail').map(r => r.verify.slug),
  lostAgents: lost,
  avg: {
    fidelity: +(ok.reduce((n, r) => n + (r.verify?.fidelity ?? 0), 0) / (ok.length || 1)).toFixed(2),
    bestPractices: +(ok.reduce((n, r) => n + (r.verify?.bestPractices ?? 0), 0) / (ok.length || 1)).toFixed(2),
    triggering: +(ok.reduce((n, r) => n + (r.verify?.triggering ?? 0), 0) / (ok.length || 1)).toFixed(2),
  },
  perSkill: ok.map(r => ({
    slug: r.verify?.slug ?? r.built?.slug,
    verdict: r.verify?.verdict,
    scores: r.verify ? { fidelity: r.verify.fidelity, bestPractices: r.verify.bestPractices, triggering: r.verify.triggering } : null,
    revised: !!r.revised,
    openQuestions: [...(r.built?.openQuestions || []), ...(r.verify?.openQuestions || [])],
  })),
}
log(`done: ${record.passFirst}/${record.built} first-pass, ${record.revised} revised, avg fidelity ${record.avg.fidelity}`)
// Main loop: write .build/verify-scores.json as an object KEYED BY SLUG —
// { "<slug>": { scores, verdict, openQuestions } } (re-key record.perSkill;
// gen-dashboard.py requires that shape, not the array). Merge open questions
// into .build/open-questions.json, update catalog statuses, run plugin-validator,
// regenerate the dashboard (scripts/gen-dashboard.py).
return record
