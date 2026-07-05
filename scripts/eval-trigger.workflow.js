export const meta = {
  name: 'fde-eval-trigger',
  description: 'Benchmark skill-triggering accuracy: judge every trigger query against the full description catalog',
  whenToUse: 'Eval phase of an Auto-FDE engagement; iterate until accuracy ≥0.99 at precision 1.0',
  phases: [
    { title: 'Collect', detail: 'normalize descriptions + trigger cases to .build/' },
    { title: 'Judge', detail: 'one judge per skill simulates selection over its queries' },
  ],
}

// args (paths absolute):
//   pluginDir - the team plugin root (skills/*/SKILL.md + evals/trigger-evals.json)
//   buildDir  - engagement .build/ dir for intermediate files
//
// One ROUND per invocation. The main loop reads the report, fixes colliding
// descriptions (or mislabeled eval cases — decide which is actually wrong),
// then re-runs. Field baseline to beat: 0.997 accuracy / 1.000 precision.
// Judges read the case file from disk — never inline hundreds of queries into
// one giant structured output.

const { pluginDir, buildDir } = args
if (!pluginDir || !buildDir) throw new Error('eval-trigger requires args: pluginDir, buildDir')

phase('Collect')
const collect = await agent(
  `Prepare trigger-eval inputs for a Claude plugin. Plugin root: ${pluginDir}

1. Read every skills/*/SKILL.md frontmatter → write ${buildDir}/eval-catalog.json:
   [{"slug", "description"}] for ALL skills (this is the routing surface judges see).
2. Read every skills/*/evals/trigger-evals.json → normalize ALL cases into
   ${buildDir}/trigger-cases.json: {"<slug>": [{"query", "shouldTrigger"}]}.
   Skills missing trigger evals: list them in missingEvals, do not fabricate cases.
Write both files to disk, then return exactly the schema fields: the full skills slug list, totalCases, and missingEvals.`,
  {
    label: 'collect',
    schema: {
      type: 'object',
      required: ['skills', 'totalCases', 'missingEvals'],
      properties: {
        skills: { type: 'array', items: { type: 'string' } },
        totalCases: { type: 'number' },
        missingEvals: { type: 'array', items: { type: 'string' } },
      },
    },
  },
)
if (!collect) throw new Error('collect failed')
if (collect.missingEvals.length) log(`NO trigger evals for: ${collect.missingEvals.join(', ')} — coverage gap, not counted as passing`)
log(`${collect.skills.length} skills, ${collect.totalCases} queries`)

phase('Judge')
const JUDGE_SCHEMA = {
  type: 'object',
  required: ['slug', 'tp', 'fn', 'tn', 'fp', 'failures'],
  properties: {
    slug: { type: 'string' },
    tp: { type: 'number' }, fn: { type: 'number' }, tn: { type: 'number' }, fp: { type: 'number' },
    failures: {
      type: 'array',
      description: 'every FN and FP case',
      items: {
        type: 'object',
        required: ['query', 'expected', 'picked', 'kind', 'analysis'],
        properties: {
          query: { type: 'string' },
          expected: { type: 'string' },
          picked: { type: 'string', description: 'skill the judge selected, or "none"' },
          kind: { enum: ['FN', 'FP'] },
          analysis: { type: 'string', description: 'description collision vs mislabeled eval case — say which and why' },
        },
      },
    },
  },
}

// skills without trigger evals get no judge — they have no cases to score
const judgeable = collect.skills.filter(s => !collect.missingEvals.includes(s))
const judged = await parallel(judgeable.map(slug => () =>
  agent(
    `Simulate Claude's skill selection for the trigger evals of ONE skill.

Read ${buildDir}/eval-catalog.json (the full description catalog — the only routing information Claude has) and the "${slug}" entry of ${buildDir}/trigger-cases.json.

For each query, decide as Claude would: given this query mid-conversation, which catalog description (if any) would you invoke? Judge from descriptions alone — no knowledge of skill bodies. Then score against shouldTrigger for "${slug}": TP = should and did; FN = should but picked none/other; TN = shouldn't and didn't; FP = shouldn't but did.

For every FN/FP, analyze: is it a real description collision/vagueness, or is the eval case mislabeled (another skill is the genuinely better owner)? Name the better owner when there is one.`,
    { label: `judge:${slug}`, phase: 'Judge', schema: JUDGE_SCHEMA },
  )
))

const ok = judged.filter(Boolean)
const tot = { tp: 0, fn: 0, tn: 0, fp: 0 }
for (const j of ok) { tot.tp += j.tp; tot.fn += j.fn; tot.tn += j.tn; tot.fp += j.fp }
const n = tot.tp + tot.fn + tot.tn + tot.fp
const report = {
  skills: ok.length,
  lostJudges: judgeable.filter((s, i) => !judged[i]),
  missingEvals: collect.missingEvals,
  totalQueries: n,
  accuracy: n ? +(((tot.tp + tot.tn) / n).toFixed(4)) : 0,
  precision: (tot.tp + tot.fp) ? +((tot.tp / (tot.tp + tot.fp)).toFixed(4)) : 1,
  recall: (tot.tp + tot.fn) ? +((tot.tp / (tot.tp + tot.fn)).toFixed(4)) : 1,
  counts: tot,
  // perSkill.failures carries query strings per the review-page data contract;
  // the top-level failures array keeps the full triage detail.
  perSkill: ok.map(j => ({
    slug: j.slug, tp: j.tp, fn: j.fn, tn: j.tn, fp: j.fp,
    failures: j.failures.map(f => `${f.kind}: ${f.query}`),
  })),
  failures: ok.flatMap(j => j.failures.map(f => ({ skill: j.slug, ...f }))),
}
log(`accuracy ${report.accuracy} · precision ${report.precision} · recall ${report.recall} (${report.failures.length} failures to triage)`)
// Main loop: triage report.failures (fix descriptions for collisions, relabel
// genuinely-mislabeled cases, record accepted misses with reasons), write
// .build/eval-report.md, regenerate review data, re-run for the next round.
return report
