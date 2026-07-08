export const meta = {
  name: 'fde-eval-trigger',
  description: 'Benchmark skill-triggering accuracy on a train/hold-out split with three blind judge votes per case',
  whenToUse: 'Eval phase of an Auto-FDE project; fix descriptions on the train score, report the hold-out score, iterate until hold-out accuracy ≥0.99 at precision 1.0',
  phases: [
    { title: 'Collect', detail: 'normalize descriptions + trigger cases, assign the 60/40 split' },
    { title: 'Judge', detail: 'three blind judges per skill pick from descriptions alone' },
    { title: 'Score', detail: 'per-skill label readers + script-side majority scoring' },
    { title: 'Live', detail: 'sampled hold-out queries through claude -p with the plugin actually installed' },
  ],
}

// args (paths absolute):
//   pluginDir  - the team plugin root (skills/*/SKILL.md + evals/trigger-evals.json)
//   buildDir   - project .build/ dir for intermediate files
//   live       - optional boolean: run the live calibration rung (default false).
//                Judges are the cheap iteration loop; run live ONCE after the
//                judge bar is met — the phase is not done without it.
//   liveSample - optional sample size for the live rung (default 30)
//
// One ROUND per invocation. Anti-overfitting rules the main loop must keep:
//   - Fix descriptions ONLY from train failures. Hold-out failures are counted,
//     never detailed — if you can read a hold-out query, you can tune to it.
//   - The HOLD-OUT score is the headline. Train is the fix target.
//   - Relabeling a case or accepting a miss requires adding a replacement case,
//     so the set only grows. Record rounds/casesAdded/relabeled/acceptedMisses
//     into .build/trigger-report.json when merging this report.
// Judges are BLIND for real: collect writes a queries-only view
// (trigger-queries.json) and judges read ONLY that file — the labeled file
// (trigger-cases.json) is read after judging, by per-skill label readers, so
// no single agent ever inlines the whole labeled set into one output.
// Regression cases pinned by review/practice/improve carry "pinned": true and
// always score as TRAIN — a pinned case that landed in hold-out would fail
// invisibly, which defeats the point of pinning it.
// LIVE CALIBRATION (args.live): judges simulate routing from descriptions; the
// live rung measures the real thing — a deterministic hold-out sample runs
// through fresh `claude -p` sessions with the plugin loaded via --plugin-dir,
// counting actual Skill-tool invocations, and the report carries the
// judge-vs-live delta. The sample is chosen script-side (no agent picks it),
// runner agents see only the query they type (never labels, skills, or evals),
// and live failures are counted, never detailed — hold-out discipline holds.
// Field baseline to beat: 0.997 accuracy / 1.000 precision.

// scriptPath invocations can deliver args as a JSON string — tolerate both
const ARGS = typeof args === 'string' ? JSON.parse(args) : (args || {})
const { pluginDir, buildDir } = ARGS
if (!pluginDir || !buildDir) throw new Error('eval-trigger requires args: pluginDir, buildDir')

phase('Collect')
const collect = await agent(
  `Prepare trigger-eval inputs for a Claude plugin. Plugin root: ${pluginDir}

1. Read every skills/*/SKILL.md frontmatter → write ${buildDir}/eval-catalog.json:
   [{"slug", "description"}] for ALL skills (this is the routing surface judges see).
2. Read every skills/*/evals/trigger-evals.json → normalize ALL cases into
   ${buildDir}/trigger-cases.json: {"<slug>": [{"query", "shouldTrigger", "split"}]}.
   Preserve file order. Assign split DETERMINISTICALLY: a case with "pinned": true
   OR "source": "synthetic-expansion" in its source file is ALWAYS "train"
   (pinned regression cases must stay triageable; generated expansions must
   never inflate the hold-out headline — it stays human-grounded); otherwise
   by 0-based position i in each skill's array, "holdout" when i % 5 is 3 or 4,
   else "train" (a stable 60/40 split that survives appends). Do not shuffle,
   dedupe, or reorder.
3. Write ${buildDir}/trigger-queries.json: {"<slug>": ["query", ...]} — the SAME
   cases in the SAME order but queries only, no labels, no split. This is the
   only file judges may read; leaking a label here invalidates the benchmark.
Skills missing trigger evals: list them in missingEvals, do not fabricate cases.
Write all three files to disk, then return exactly the schema fields: the full skills slug list, totalCases, and missingEvals.`,
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
// Blind pick only — judges see queries and the catalog, nothing else.
const JUDGE_SCHEMA = {
  type: 'object',
  required: ['slug', 'picks'],
  properties: {
    slug: { type: 'string' },
    picks: {
      type: 'array',
      description: 'one entry per query, in array order — do not skip any index',
      items: {
        type: 'object',
        required: ['i', 'picked'],
        properties: {
          i: { type: 'number', description: '0-based index of the query in the file' },
          picked: { type: 'string', description: 'slug of the catalog description you would invoke, or "none"' },
        },
      },
    },
  },
}

const VOTES = 3
const judgeable = collect.skills.filter(s => !collect.missingEvals.includes(s))
const judged = await parallel(judgeable.flatMap(slug =>
  Array.from({ length: VOTES }, (unused, v) => () =>
    agent(
      `You are judge ${v + 1} of ${VOTES}, simulating Claude's skill selection. Judge independently — from the routing surface alone.

Read ${buildDir}/eval-catalog.json (the full description catalog — the only routing information Claude has) and the "${slug}" entry of ${buildDir}/trigger-queries.json (a plain list of user queries). Do NOT read trigger-cases.json or any evals directory — those contain the answer key and reading them invalidates the benchmark.

For each query, in array order, decide as Claude would mid-conversation: which catalog description (if any) would you invoke for this query? Consider EVERY description in the catalog, not just "${slug}" — pick the single best owner, or "none" when no skill should claim it (Claude does not reach for a skill on trivial one-step asks). Return one pick per query with its 0-based index — every index, none skipped.`,
      { label: `judge${v + 1}:${slug}`, phase: 'Judge', schema: JUDGE_SCHEMA },
    )
  )
))

phase('Score')
// Per-skill label readers: each inlines only its own skill's ~20 cases, so no
// giant structured output, and a lost/truncated reader is visible per skill.
const READER_SCHEMA = {
  type: 'object',
  required: ['slug', 'cases'],
  properties: {
    slug: { type: 'string' },
    cases: {
      type: 'array',
      items: {
        type: 'object',
        required: ['query', 'shouldTrigger', 'split'],
        properties: {
          query: { type: 'string' },
          shouldTrigger: { type: 'boolean' },
          split: { enum: ['train', 'holdout'] },
        },
      },
    },
  },
}
const readers = await parallel(judgeable.map(slug => () =>
  agent(
    `Read ${buildDir}/trigger-cases.json and return ONLY the "${slug}" entry, verbatim: every case, file order, all three fields (query, shouldTrigger, split), no edits, no omissions.`,
    { label: `labels:${slug}`, phase: 'Score', schema: READER_SCHEMA },
  )
))

const perSkill = []
const failures = []
const tally = { train: { tp: 0, fn: 0, tn: 0, fp: 0 }, holdout: { tp: 0, fn: 0, tn: 0, fp: 0 } }
let agreeAll = 0, casesAll = 0, lostVotes = 0, unscoredAll = 0

judgeable.forEach((slug, sIdx) => {
  const votes = judged.slice(sIdx * VOTES, sIdx * VOTES + VOTES).filter(Boolean)
  lostVotes += VOTES - votes.length
  const reader = readers[sIdx]
  const cases = reader && Array.isArray(reader.cases) ? reader.cases : []
  if (!votes.length || !cases.length) {
    perSkill.push({ slug, tp: 0, fn: 0, tn: 0, fp: 0, agree: 0, failures: [], holdoutFails: 0, unscored: cases.length, lostVotes: VOTES - votes.length, readerLost: !cases.length })
    unscoredAll += cases.length
    return
  }
  const row = { slug, tp: 0, fn: 0, tn: 0, fp: 0, agree: 0, failures: [], holdoutFails: 0, unscored: 0 }
  let agreed = 0
  cases.forEach((c, i) => {
    const picks = votes
      .map(v => (v.picks.find(p => p.i === i) || {}).picked)
      .filter(p => typeof p === 'string')
    if (!picks.length) {
      // no surviving judge covered this index — count it, never hide it
      row.unscored++
      unscoredAll++
      return
    }
    const count = {}
    picks.forEach(p => { count[p] = (count[p] || 0) + 1 })
    const ranked = Object.keys(count).sort((a, b) => count[b] - count[a])
    // a full split (top count 1 with multiple voters) is disagreement, not a winner
    const majority = (count[ranked[0]] === 1 && picks.length > 1) ? 'split (no agreement)' : ranked[0]
    const unanimous = picks.length > 1 && picks.every(p => p === picks[0])
    if (unanimous || picks.length === 1) agreed++
    casesAll++

    // strict majority of surviving votes must pick this skill (3→2, 2→2, 1→1)
    const firedHere = (count[slug] || 0) > picks.length / 2
    const split = c.split === 'holdout' ? 'holdout' : 'train'
    let kind
    if (c.shouldTrigger) kind = firedHere ? 'tp' : 'fn'
    else kind = firedHere ? 'fp' : 'tn'
    row[kind]++
    tally[split][kind]++
    if (kind === 'fn' || kind === 'fp') {
      if (split === 'train') {
        row.failures.push(`${kind.toUpperCase()}: ${c.query}`)
        failures.push({ skill: slug, query: c.query, expected: c.shouldTrigger ? slug : 'not ' + slug, picked: majority, votes: picks, kind: kind.toUpperCase() })
      } else {
        row.holdoutFails++
      }
    }
  })
  row.agree = cases.length ? +(agreed / cases.length).toFixed(4) : 0
  agreeAll += agreed
  perSkill.push(row)
})

function score(t) {
  const n = t.tp + t.fn + t.tn + t.fp
  return {
    accuracy: n ? +(((t.tp + t.tn) / n).toFixed(4)) : 0,
    precision: (t.tp + t.fp) ? +((t.tp / (t.tp + t.fp)).toFixed(4)) : 1,
    recall: (t.tp + t.fn) ? +((t.tp / (t.tp + t.fn)).toFixed(4)) : 1,
    cases: n,
  }
}

const report = {
  skills: perSkill.length,
  missingEvals: collect.missingEvals,
  lostVotes,
  unscored: unscoredAll,
  totalQueries: casesAll,
  holdout: score(tally.holdout),
  train: score(tally.train),
  agreement: casesAll ? +((agreeAll / casesAll).toFixed(4)) : 0,
  perSkill,
  // Train-split failures only, with all three votes — triage each as a
  // description collision (fix the descriptions) or a mislabeled case
  // (relabel AND add a replacement case). Hold-out failures stay hidden.
  failures,
}
if (unscoredAll) log(`WARNING: ${unscoredAll} cases unscored (judge picks missing) — the round is incomplete, re-run affected skills before trusting the score`)
log(`hold-out ${report.holdout.accuracy} acc / ${report.holdout.precision} prec · train ${report.train.accuracy} acc · agreement ${report.agreement} (${failures.length} train failures to triage)`)

// ---- Live calibration (args.live) ----------------------------------------
if (ARGS.live) {
  phase('Live')
  const SAMPLE = ARGS.liveSample || 30
  const LIVE_RUNS = 3

  // Deterministic stratified sample: round-robin across skills over their
  // hold-out cases in file order — no shuffle, no agent choice, no labels leave
  // this script.
  const bySkill = {}
  judgeable.forEach((slug, sIdx) => {
    const cases = (readers[sIdx] && readers[sIdx].cases) || []
    cases.forEach((c, i) => {
      if (c.split === 'holdout') (bySkill[slug] = bySkill[slug] || []).push({ slug, sIdx, i, query: c.query, shouldTrigger: c.shouldTrigger })
    })
  })
  const sample = []
  let took = true
  while (sample.length < SAMPLE && took) {
    took = false
    for (const slug of Object.keys(bySkill)) {
      if (bySkill[slug].length && sample.length < SAMPLE) { sample.push(bySkill[slug].shift()); took = true }
    }
  }
  log(`live calibration: ${sample.length} hold-out queries × ${LIVE_RUNS} fresh sessions each`)

  const LIVE_SCHEMA = {
    type: 'object',
    required: ['runs'],
    properties: {
      runs: {
        type: 'array',
        description: 'one entry per session, in order',
        items: {
          type: 'object',
          required: ['fired'],
          properties: {
            fired: { type: 'array', items: { type: 'string' }, description: 'skill identifiers invoked via the Skill tool in this session; empty when none' },
          },
        },
      },
    },
  }

  const liveResults = await parallel(sample.map(p => () =>
    agent(
      `Measure REAL skill triggering on the Claude Code harness. You are the harness operator: never answer the query yourself, and never read the plugin's skills, evals, or any file under ${pluginDir} — you only run sessions and read transcripts.

You are in an isolated worktree. Steps:
1. Write this user query VERBATIM to __q.txt (exactly this text, nothing added):
${p.query}
2. Run ${LIVE_RUNS} fresh sessions sequentially (Bash, one call each, timeout 300000ms):
   claude -p "$(cat __q.txt)" --plugin-dir "${pluginDir}" --output-format stream-json --verbose --max-turns 3 --dangerously-skip-permissions > __run<N>.jsonl 2>/dev/null
   --max-turns 3 is deliberate: we measure routing, not task completion — an exit with result subtype "error_max_turns" is EXPECTED and the transcript is still valid. If --dangerously-skip-permissions is rejected, retry with --permission-mode acceptEdits.
3. For each transcript, list every tool_use named "Skill": report its input's "skill" field verbatim (e.g. "team-plugin:launch-brief"); empty list when none fired.
Return one entry per session, in order — fired: [] only when a session produced no transcript at all.`,
      { label: `live:${p.slug}#${p.i}`, phase: 'Live', schema: LIVE_SCHEMA, isolation: 'worktree' },
    )
  ))

  // Score live vs judges on the SAME sample, script-side.
  const lt = { tp: 0, fn: 0, tn: 0, fp: 0 }
  const jt = { tp: 0, fn: 0, tn: 0, fp: 0 }
  let liveLost = 0
  sample.forEach((p, k) => {
    const r = liveResults[k]
    if (!r || !Array.isArray(r.runs) || !r.runs.length) { liveLost++; return }
    const firedCount = r.runs.filter(run => (run.fired || []).some(f => String(f).includes(p.slug))).length
    const liveFired = firedCount > r.runs.length / 2
    lt[p.shouldTrigger ? (liveFired ? 'tp' : 'fn') : (liveFired ? 'fp' : 'tn')]++
    const votes = judged.slice(p.sIdx * VOTES, p.sIdx * VOTES + VOTES).filter(Boolean)
    const picks = votes.map(v => (v.picks.find(x => x.i === p.i) || {}).picked).filter(x => typeof x === 'string')
    if (picks.length) {
      const judgeFired = picks.filter(x => x === p.slug).length > picks.length / 2
      jt[p.shouldTrigger ? (judgeFired ? 'tp' : 'fn') : (judgeFired ? 'fp' : 'tn')]++
    }
  })
  report.live = {
    sample: sample.length - liveLost,
    lost: liveLost,
    runsPerQuery: LIVE_RUNS,
    live: score(lt),
    judgeOnSample: score(jt),
    // positive delta = judges are optimistic vs the real harness
    delta: +((score(jt).accuracy - score(lt).accuracy).toFixed(4)),
  }
  log(`live ${report.live.live.accuracy} acc vs judges ${report.live.judgeOnSample.accuracy} on the same sample (delta ${report.live.delta}, ${liveLost} lost)`)
} else {
  log('live calibration skipped (args.live not set) — run it once after the judge bar is met; the phase is not done without it')
}
// Main loop: triage report.failures, fix descriptions / relabel with
// replacements (new regression cases get "pinned": true), merge rounds +
// casesAdded + relabeled + acceptedMisses into .build/trigger-report.json,
// write .build/eval-report.md, regenerate the dashboard
// (scripts/gen-dashboard.py), and re-run for the next round.
return report
