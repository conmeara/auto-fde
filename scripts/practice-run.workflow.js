export const meta = {
  name: 'fde-practice-run',
  description: 'Drive the synthetic practice project end to end — an agent plays the champion, every runbook step graded with the skill checks',
  whenToUse: 'Eval phase of an Auto-FDE engagement, after the practice fixture exists; the dress rehearsal before deploy',
  phases: [
    { title: 'Parse', detail: 'read the runbook into ordered steps' },
    { title: 'Drive', detail: 'one claude -p session per step (--plugin-dir), sequential, shared workdir' },
    { title: 'Grade', detail: 'run-checks.py (with --trace) + the runbook verify note per step' },
  ],
}

// args (paths absolute):
//   engagementRoot - engagement working directory (practice/ lives here)
//   pluginDir      - the built team plugin root
//   buildDir       - engagement .build/ dir
//
// Steps run SEQUENTIALLY in one shared workdir (.build/practice-run/work/) —
// later steps consume earlier steps' artifacts, exactly like a real user's
// working directory. That is the point of the practice run: it exercises the
// handoffs between skills, not just each skill alone.
// REAL HARNESS: each step is a fresh headless `claude -p` session with the
// plugin loaded via --plugin-dir — the skill triggers (or fails to) exactly
// as it would for the champion, and the stream-json transcript preserved at
// .build/practice-run/step-N.jsonl is the harness's own record of the trial,
// not the driver's self-report.
// Failures file eval cases: each failed step returns a concrete suggested
// case; the main loop appends it to the owning skill's evals and records it
// in .build/regressions.json (source: "practice run · step N").
// Steps needing live connections report gated, never mocked.

// scriptPath invocations can deliver args as a JSON string — tolerate both
const ARGS = typeof args === 'string' ? JSON.parse(args) : (args || {})
const { engagementRoot, pluginDir, buildDir } = ARGS
if (!engagementRoot || !pluginDir || !buildDir) {
  throw new Error('practice-run requires args: engagementRoot, pluginDir, buildDir')
}
const runDir = `${buildDir}/practice-run`
const workDir = `${runDir}/work`

phase('Parse')
const parsed = await agent(
  `Parse an Auto-FDE practice runbook into ordered steps.

Read ${engagementRoot}/practice/README.md (the phase-by-phase runbook) and the fixture files beside it. Produce the step list:
[{ "step": 1, "title": one line, "skill": the plugin skill slug this step exercises (from ${pluginDir}/skills/),
   "instruction": what the champion does, verbatim from the runbook,
   "verify": what the runbook says to verify, "gated": live-connection need or null }]
Write it to ${runDir}/steps.json (create directories as needed) and also create an empty workdir at ${workDir}. Return the steps (step/title/skill/gated) in order, step numbers 1-based and matching steps.json exactly.`,
  {
    label: 'parse-runbook',
    schema: {
      type: 'object',
      required: ['steps'],
      properties: {
        steps: {
          type: 'array',
          items: {
            type: 'object',
            required: ['step', 'title', 'skill'],
            properties: {
              step: { type: 'number' },
              title: { type: 'string' },
              skill: { type: 'string' },
              gated: { type: 'string', description: 'omit when runnable' },
            },
          },
        },
      },
    },
  },
)
if (!parsed || !parsed.steps.length) throw new Error('could not parse practice/README.md into steps')
log(`${parsed.steps.length} runbook steps`)

const GRADE_SCHEMA = {
  type: 'object',
  required: ['passed', 'total', 'verdict', 'note', 'filedCase'],
  properties: {
    passed: { type: 'number' },
    total: { type: 'number' },
    verdict: { enum: ['pass', 'fail'] },
    note: { type: 'string' },
    filedCase: {
      type: 'string',
      description: 'on fail: a concrete eval case to append to the owning skill (a trigger query or an output-eval prompt + expectation); empty string on pass',
    },
  },
}

const runbook = []
const failures = []

phase('Drive')
for (const s of parsed.steps) {
  if (s.gated) {
    runbook.push({ step: s.step, title: s.title, checks: { passed: 0, total: 0 }, verdict: 'gated', needs: s.gated })
    log(`step ${s.step} gated: ${s.gated}`)
    continue
  }

  const drive = await agent(
    `Operate one practice-run step on the REAL Claude Code harness. You are the harness operator — the child session does the champion's work, not you. Never perform the task yourself and never read the plugin's skill bodies.

Read step ${s.step} ("${s.title}") from ${runDir}/steps.json. Then:
1. Record the current file listing of ${workDir} (to diff after). Write the step's "instruction" VERBATIM to ${runDir}/__step-${s.step}-prompt.txt, appending exactly one line: "Work in the current directory. The practice fixture is at ${engagementRoot}/practice/."
2. Run the child session (Bash, single call, timeout 600000ms):
   cd ${workDir} && claude -p "$(cat ${runDir}/__step-${s.step}-prompt.txt)" --plugin-dir "${pluginDir}" --output-format stream-json --verbose --max-turns 50 --dangerously-skip-permissions > ${runDir}/step-${s.step}.jsonl 2> ${runDir}/step-${s.step}.err
   The plugin is live — the right skill must trigger on its own; do NOT name any skill in the prompt. If --dangerously-skip-permissions is rejected, retry once with --permission-mode acceptEdits.
3. From the transcript ${runDir}/step-${s.step}.jsonl: outputs = files created or modified under ${workDir} by this step (diff against your pre-run listing), skillsFired = every tool_use named "Skill" — its input's "skill" field verbatim (e.g. "team-plugin:launch-brief"); empty when none fired.
Return outputs + skillsFired + summary. A non-zero exit whose result event says subtype "error_max_turns" still counts — report what it produced. Only if the claude command failed to run (no result event) return outputs: [] with the tail of the .err file in summary — never fabricate artifacts.`,
    {
      label: `drive:step-${s.step}`, phase: 'Drive',
      schema: {
        type: 'object',
        required: ['outputs', 'skillsFired', 'summary'],
        properties: {
          outputs: { type: 'array', items: { type: 'string' } },
          skillsFired: { type: 'array', items: { type: 'string' } },
          summary: { type: 'string' },
        },
      },
    },
  )
  if (!drive) {
    runbook.push({ step: s.step, title: s.title, checks: { passed: 0, total: 0 }, verdict: 'fail', note: 'driver agent lost — re-run this step' })
    failures.push({ step: s.step, skill: s.skill, filedCase: '' })
    continue
  }

  const grade = await agent(
    `Grade one practice-run step. Mechanical and trace checks are executed by code — you copy their results; you rule only on judge-kind checks and the runbook's verify note.

Step ${s.step} ("${s.title}") of ${runDir}/steps.json — read it for the instruction and verify note.
If ${pluginDir}/skills/${s.skill}/evals/checks.json exists, run with Bash:
  python3 ${pluginDir}/scripts/run-checks.py "${pluginDir}/skills/${s.skill}/evals/checks.json" ${(drive.outputs || []).map(o => `"${o}"`).join(' ') || `"${workDir}"`} --plugin-root "${pluginDir}" --trace "${runDir}/step-${s.step}.jsonl"
Count its results verbatim — never re-decide a mechanical or trace check yourself; if the checker script is missing or errors, count every one as failed and say so in your note. Rule on the judge-kind rows (returned with passed: null) and the runbook's verify note yourself, burden of proof on the pass.
Artifacts: ${drive.outputs.join(', ') || workDir}; the session transcript is ${runDir}/step-${s.step}.jsonl (the harness record of what actually happened — read it when the artifacts alone can't explain a failure).
On fail, propose the ONE eval case that would have caught this — phrased so it can be appended verbatim to ${s.skill}'s evals.`,
    { label: `grade:step-${s.step}`, phase: 'Grade', schema: GRADE_SCHEMA },
  )
  if (!grade) {
    runbook.push({ step: s.step, title: s.title, checks: { passed: 0, total: 0 }, verdict: 'fail', note: 'grader lost — re-run this step' })
    failures.push({ step: s.step, skill: s.skill, note: 'grader lost — re-run this step', filedCase: '' })
    continue
  }
  const row = {
    step: s.step, title: s.title,
    checks: { passed: grade.passed, total: grade.total },
    verdict: grade.verdict,
    transcript: `.build/practice-run/step-${s.step}.jsonl`,
    skillFired: (drive.skillsFired || []).some(f => String(f).includes(s.skill)),
  }
  if (!row.skillFired) log(`step ${s.step}: skill "${s.skill}" never fired — routing problem, triage with the trigger benchmark`)
  if (grade.verdict === 'fail') {
    row.filedCase = `${s.skill} — pending`
    failures.push({ step: s.step, skill: s.skill, note: grade.note, filedCase: grade.filedCase })
  }
  runbook.push(row)
  log(`step ${s.step}: ${grade.verdict} (${grade.passed}/${grade.total})`)
}

const report = {
  fixture: 'practice/',
  runbook,
  failures,
  passed: runbook.filter(r => r.verdict === 'pass').length,
  gated: runbook.filter(r => r.verdict === 'gated').length,
}
log(`practice run: ${report.passed}/${runbook.length} pass, ${report.gated} gated, ${failures.length} failures to file`)
// Main loop: write .build/practice-report.json; for each failure APPEND the
// suggested eval case to the owning skill's evals (trigger cases get
// "pinned": true so they always score as train; update the row's filedCase to
// the real case id), add a .build/regressions.json entry ({source: "practice
// run · step N", finding, guardedBy, status: "open"}), regenerate the
// dashboard, and queue the fixes.
return report
