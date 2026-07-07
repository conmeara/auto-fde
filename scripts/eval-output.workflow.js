export const meta = {
  name: 'fde-eval-output',
  description: 'Run every skill output eval on the real Claude harness — with-skill vs no-skill baseline, 3× each arm, transcripts kept',
  whenToUse: 'Eval phase of an Auto-FDE engagement, after the trigger benchmark; proves each skill beats what Claude produces without it',
  phases: [
    { title: 'Collect', detail: 'normalize evals.json + checks.json into a case list' },
    { title: 'Run', detail: 'claude -p per arm in isolated worktrees: with-skill (--plugin-dir) ×3 + baseline ×3' },
    { title: 'Grade', detail: 'run-checks.py executes mechanical + trace checks; rubric only for what code cannot check' },
  ],
}

// args (paths absolute):
//   pluginDir - the team plugin root (skills/*/evals/{evals.json,checks.json})
//   buildDir  - engagement .build/ dir
//
// Design decisions this encodes:
//   - REAL HARNESS: every run is a headless `claude -p` session — the with-skill
//     arm loads the plugin via --plugin-dir and the skill triggers (or fails to)
//     exactly as it would for a teammate; the baseline arm runs bare. The
//     stream-json transcript of every run is preserved under
//     .build/output-runs/ — the complete record of the trial, so a failed
//     case can be triaged (agent mistake vs grader defect) by reading it.
//   - BOTH ARMS ×3: agent behavior varies between runs; single trials are
//     unreliable in either direction. A case passes only if every with-skill
//     run passed; the baseline "passes" (cut-candidate signal) when ≥2/3 of
//     its runs pass.
//   - Deterministic checks are EXECUTED BY CODE: graders run the bundled
//     scripts/run-checks.py (with --trace for used-tool/ran-command kinds)
//     and copy its per-check results + evidence verbatim; the rubric judge
//     rules only on judge-kind checks and subjective expectations.
//   - The child session runs with --dangerously-skip-permissions inside an
//     isolated worktree subdir — the worktree is the sandbox.
//   - Evals whose entry carries a "gated" field need live connections and are
//     reported gated, never mocked — a mock that passes vacuously is worse
//     than no eval.

// scriptPath invocations can deliver args as a JSON string — tolerate both
const ARGS = typeof args === 'string' ? JSON.parse(args) : (args || {})
const { pluginDir, buildDir } = ARGS
if (!pluginDir || !buildDir) throw new Error('eval-output requires args: pluginDir, buildDir')
const RUNS = 3

phase('Collect')
const collect = await agent(
  `Prepare output-eval inputs for a Claude plugin. Plugin root: ${pluginDir}

Read every skills/*/evals/evals.json. For each eval entry produce one case:
{ "skill", "evalId", "prompt", "files": [absolute paths of listed input files under that skill's evals/],
  "expectations": [...], "checksPath": absolute path to that skill's evals/checks.json or null,
  "reference": relative path of the eval's reference solution if present (evals/reference/...) else null,
  "gated": the entry's "gated" string if present (what live connection it needs) else null }
Write the full list to ${buildDir}/output-eval-cases.json and create the transcript dir ${buildDir}/output-runs/. Return every case's {skill, evalId, gated} plus totals. Do not invent cases for skills without evals.json — count them in missingEvals.`,
  {
    label: 'collect',
    schema: {
      type: 'object',
      required: ['cases', 'missingEvals'],
      properties: {
        cases: {
          type: 'array',
          items: {
            type: 'object',
            required: ['skill', 'evalId'],
            properties: {
              skill: { type: 'string' },
              evalId: { type: 'number' },
              gated: { type: 'string', description: 'omit when runnable' },
            },
          },
        },
        missingEvals: { type: 'array', items: { type: 'string' } },
      },
    },
  },
)
if (!collect) throw new Error('collect failed')
const gated = collect.cases.filter(c => c.gated)
const runnable = collect.cases.filter(c => !c.gated)
if (collect.missingEvals.length) log(`no output evals for: ${collect.missingEvals.join(', ')}`)
log(`${runnable.length} runnable cases, ${gated.length} gated`)

const RUN_SCHEMA = {
  type: 'object',
  required: ['workdir', 'outputs', 'transcript', 'seconds', 'skillUsed', 'summary'],
  properties: {
    workdir: { type: 'string', description: 'absolute path of the work/ dir the child session ran in' },
    outputs: { type: 'array', items: { type: 'string' }, description: 'absolute paths of files the child session produced (excluding inputs/ copies and harness files)' },
    transcript: { type: 'string', description: 'absolute path of the preserved stream-json transcript under .build/output-runs/' },
    tokens: { type: 'number', description: 'input+output tokens from the final result event; omit if unavailable' },
    seconds: { type: 'number', description: 'wall-clock seconds of the claude -p run' },
    skillUsed: { type: 'boolean', description: 'any tool_use named "Skill" in the transcript' },
    summary: { type: 'string', description: 'one line; on harness failure, the tail of stderr' },
  },
}

const GRADE_SCHEMA = {
  type: 'object',
  required: ['verdict', 'checks', 'rubricNote', 'excerpt'],
  properties: {
    verdict: { enum: ['pass', 'fail'] },
    checks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'passed'],
        properties: {
          name: { type: 'string' },
          passed: { type: 'boolean' },
          evidence: { type: 'string', description: 'run-checks.py evidence verbatim for mechanical/trace checks; one clause of your own for judge/expectation rows' },
        },
      },
    },
    rubricNote: { type: 'string', description: 'one sentence on the judge-kind checks and expectations; name the root cause on fail' },
    excerpt: { type: 'string', description: 'short representative excerpt of the produced artifact (~10 lines max)' },
  },
}

const median = ns => {
  const a = ns.filter(n => typeof n === 'number').sort((x, y) => x - y)
  return a.length ? a[Math.floor(a.length / 2)] : undefined
}

function runPrompt(c, arm, n) {
  const withSkill = arm === 'with'
  return `Operate one output-eval run on the REAL Claude Code harness. You are the harness operator — the child session performs the task, not you.

You are in an isolated worktree (your cwd). Case: skill "${c.skill}", eval #${c.evalId}, arm "${arm}", run ${n}.

1. Read ${buildDir}/output-eval-cases.json and find your case. \`mkdir -p work/inputs\`; cp each of the case's "files" into work/inputs/. Write the case's "prompt" VERBATIM to __prompt.txt (at the worktree root, NOT inside work/), appending one line "Input files are in ./inputs/." only if there were input files.
2. Run the child session with Bash (single call, timeout 600000ms; note start/end epoch seconds):
   cd work && claude -p "$(cat ../__prompt.txt)"${withSkill ? ` --plugin-dir "${pluginDir}"` : ''} --output-format stream-json --verbose --max-turns 50 --dangerously-skip-permissions > ../__run.jsonl 2> ../__run.err
   ${withSkill ? 'The plugin is live — the skill must trigger on its own; do NOT mention the plugin or skill in the prompt.' : 'No plugin is loaded — this is the no-skill control; do NOT hint at any skill.'} If the flag --dangerously-skip-permissions is rejected, retry once with --permission-mode acceptEdits.
3. Preserve the transcript: cp __run.jsonl "${buildDir}/output-runs/${c.skill}-${c.evalId}-${arm}-r${n}.jsonl"
4. From __run.jsonl read the final {"type":"result"} event: tokens = usage input_tokens + output_tokens if present. skillUsed = whether any tool_use named "Skill" appears anywhere in the transcript (its input's "skill" field carries the identifier, e.g. "team-plugin:launch-brief").
5. outputs = files now under work/ that are not under work/inputs/ (the child's artifacts), absolute paths.
A non-zero exit whose result event says subtype "error_max_turns" still counts as a run — preserve the transcript and report what it produced. Only if the claude command itself failed to run (no result event) return outputs: [] with the tail of __run.err in summary — never fabricate artifacts.`
}

function gradePrompt(c, run) {
  return `Grade one output-eval run. Mechanical and trace checks are executed by code — you copy their results; you rule only on judge-kind checks and the eval's expectations.

Case: skill "${c.skill}", eval #${c.evalId} in ${buildDir}/output-eval-cases.json (read it for the prompt, expectations, and checksPath).
1. If checksPath is set, run with Bash:
   python3 ${pluginDir}/scripts/run-checks.py "<checksPath>" ${run.outputs.length ? run.outputs.map(o => `"${o}"`).join(' ') : `"${run.workdir}"`} --plugin-root "${pluginDir}" --trace "${run.transcript}"
   Copy every mechanical/trace check's {name, passed, evidence} from its JSON VERBATIM into your checks rows — never re-decide them yourself. If the checker script is missing or errors, mark every one failed with evidence "checker unavailable" and name that in rubricNote — do not fall back to eyeballing.
2. Rule on each judge-kind row yourself (the checker returns them with passed: null), burden of proof on the pass.
3. Apply the eval's "expectations" list — each becomes one more check row, judged against the run's artifacts (${run.outputs.join(', ') || run.workdir}), burden of proof on the pass.
A run that produced no artifacts fails every artifact check. verdict: pass only if every check passes.`
}

phase('Run')
const results = await pipeline(
  runnable,

  // run both arms on the real harness, RUNS× each
  async c => {
    const arms = await parallel([
      ...Array.from({ length: RUNS }, (u, i) => () =>
        agent(runPrompt(c, 'with', i + 1), { label: `with:${c.skill}#${c.evalId}·r${i + 1}`, phase: 'Run', schema: RUN_SCHEMA, isolation: 'worktree' })),
      ...Array.from({ length: RUNS }, (u, i) => () =>
        agent(runPrompt(c, 'base', i + 1), { label: `base:${c.skill}#${c.evalId}·r${i + 1}`, phase: 'Run', schema: RUN_SCHEMA, isolation: 'worktree' })),
    ])
    const withRuns = arms.slice(0, RUNS).filter(Boolean)
    const baseRuns = arms.slice(RUNS).filter(Boolean)
    if (!withRuns.length) return null
    return { withRuns, baseRuns }
  },

  // grade every run of both arms
  async (r, c) => {
    if (!r) return null
    const [withGrades, baseGrades] = await Promise.all([
      parallel(r.withRuns.map((run, i) => () =>
        agent(gradePrompt(c, run), { label: `grade-w${i + 1}:${c.skill}#${c.evalId}`, phase: 'Grade', schema: GRADE_SCHEMA }))),
      parallel(r.baseRuns.map((run, i) => () =>
        agent(gradePrompt(c, run), { label: `grade-b${i + 1}:${c.skill}#${c.evalId}`, phase: 'Grade', schema: GRADE_SCHEMA }))),
    ])
    const w = withGrades.filter(Boolean)
    const b = baseGrades.filter(Boolean)
    if (!w.length) return null

    // the card shows the FAILING run's detail when there is one — that is the
    // run a triager needs to see, not a passing sibling's
    const wShown = w.find(g => g.verdict === 'fail') || w[0]
    const bShown = b.find(g => g.verdict === 'fail') || b[0]
    const verdict = w.every(g => g.verdict === 'pass') ? 'pass' : 'fail'
    const consistent = w.every(g => g.verdict === w[0].verdict)
    const basePasses = b.filter(g => g.verdict === 'pass').length
    const skillFired = r.withRuns.filter(run => run.skillUsed).length

    // hydrate prompt/reference from the case file for the card
    const item = await agent(
      `Read ${buildDir}/output-eval-cases.json and return ONLY the entry with skill "${c.skill}" and evalId ${c.evalId} as {"item": {"prompt": ..., "reference": ...}}.`,
      { label: `card:${c.skill}#${c.evalId}`, phase: 'Grade', effort: 'low',
        schema: { type: 'object', required: ['item'], properties: { item: { type: 'object' } } } },
    ).then(x => (x && x.item) || {})

    return {
      skill: c.skill,
      evalId: c.evalId,
      prompt: item.prompt,
      reference: item.reference || undefined,
      withSkill: {
        verdict,
        excerpt: wShown.excerpt,
        checks: wShown.checks,
        rubricNote: (consistent ? '' : `Inconsistent across ${w.length} runs — read the failing transcript before filing a fix. `) + wShown.rubricNote,
        runs: r.withRuns.length,
        runVerdicts: w.map(g => g.verdict),
        consistent,
        skillFired,
        tokens: median(r.withRuns.map(x => x.tokens)),
        seconds: median(r.withRuns.map(x => x.seconds)),
        transcripts: r.withRuns.map(x => x.transcript),
      },
      baseline: b.length ? {
        verdict: basePasses >= Math.ceil(b.length * 2 / 3) ? 'pass' : 'fail',
        excerpt: bShown.excerpt,
        checks: bShown.checks,
        runs: r.baseRuns.length,
        passes: basePasses,
        tokens: median(r.baseRuns.map(x => x.tokens)),
        seconds: median(r.baseRuns.map(x => x.seconds)),
        transcripts: r.baseRuns.map(x => x.transcript),
      } : undefined,
      baselineAlsoPasses: b.length ? basePasses >= Math.ceil(b.length * 2 / 3) : false,
    }
  },
)

const cases = results.filter(Boolean)
const lost = runnable.filter((c, i) => !results[i]).map(c => `${c.skill}#${c.evalId}`)
const report = {
  cases,
  gated: gated.map(c => ({ skill: c.skill, needs: c.gated })),
  missingEvals: collect.missingEvals,
  lost,
  passed: cases.filter(c => c.withSkill.verdict === 'pass').length,
  run: cases.length,
  // A passing baseline (≥2/3 runs) means the skill adds nothing on this task — cut candidate.
  cutCandidates: cases.filter(c => c.baselineAlsoPasses).map(c => `${c.skill}#${c.evalId}`),
  // With-skill runs where the skill NEVER triggered: a routing problem
  // surfacing in the output rung — triage with the trigger benchmark.
  skillNeverFired: cases.filter(c => c.withSkill.skillFired === 0).map(c => `${c.skill}#${c.evalId}`),
}
log(`${report.passed}/${report.run} pass · ${report.gated.length} gated · ${report.cutCandidates.length} cut candidates · ${report.skillNeverFired.length} never-fired${lost.length ? ` · lost: ${lost.join(', ')}` : ''}`)
// Main loop: write this to .build/output-evals.json, regenerate the dashboard,
// and put the cases in front of the reviewers (Gate 3) BEFORE revising anything.
// Every run's transcript is under .build/output-runs/ — before filing any fix
// from a failed case, read the failing run's transcript and decide: agent
// mistake or grader defect.
return report
