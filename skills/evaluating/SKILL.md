---
name: evaluating
description: This skill should be used for the eval phase of an Auto-FDE project — running the trigger-eval benchmark on a built team plugin, iterating descriptions until the hold-out accuracy target is met, running output evals against no-skill baselines, and generating then executing a synthetic practice project end to end. Use it when the user wants to test, benchmark, or eval the plugin, check triggering accuracy, or set up a dummy project to try the plugin on.
---

# Evaluating

Prove the plugin routes and produces correctly before a team sees it.
Three rungs, cheapest first. Deep methodology (formats, scoring math,
anti-overfitting) lives in the skill-authoring doctrine's
anthropic-skill-creator reference — read it before your first benchmark.

## Trigger benchmark (always)

The bar: HOLD-OUT accuracy ≥ 0.99 at precision 1.0 (field baseline:
0.997/1.000). The hold-out score is the headline; train is the fix
target. Never read or tune to hold-out queries — if you can read a
failing hold-out query, you can overfit to it. That discipline binds the
human too: tell the user not to open `.build/trigger-cases.json` (the
labeled, split-assigned file) — a hold-out query once read can't be
unread, and the headline stops meaning anything.

Loop, one round per workflow run:

1. Workflow tool, `scriptPath:
   ${CLAUDE_PLUGIN_ROOT}/scripts/eval-trigger.workflow.js`,
   `args: { pluginDir, buildDir }` (absolute).
2. Triage ONLY the train failures in the report — each is exactly one of:
   - **Description collision/vagueness** → fix the description(s) per the
     doctrine (sharpen scope, add negative triggers, decide which skill
     owns the contested ground and say so in both descriptions).
   - **Mislabeled eval case** → the judges picked a genuinely better
     owner; relabel the case AND add a replacement case.
   - **Accepted miss** → an overlap that is correct by design (a
     composing skill vs its host) or a knowledge-gap query no skill
     should claim. Record it with a reason AND add a replacement case —
     an accepted miss without a reason is just a miss, and the set only
     grows.
3. Merge `rounds`/`casesAdded`/`relabeled`/`acceptedMisses` into
   `.build/trigger-report.json`, then re-run. Iterate until the hold-out
   bar is met or every remaining failure is an accepted miss with a
   written reason. Skills the report lists under `missingEvals` are not
   passing — author their evals and include them.
4. **Live calibration, once, after the bar is met.** Judges simulate
   routing; this measures it. Re-run the workflow with
   `args: { pluginDir, buildDir, live: true }` — a deterministic hold-out
   sample runs through fresh `claude -p` sessions with the plugin actually
   installed (`--plugin-dir`), counting real Skill-tool invocations, and
   the report gains `live` with the judge-vs-live delta. The phase is not
   done without this run. A delta beyond ~0.02 means the judges are
   optimistic about the deployed routing surface — check the skill-listing
   budget (validator check 7) before touching any description.

## Output evals (when runnable)

Workflow tool, `scriptPath:
${CLAUDE_PLUGIN_ROOT}/scripts/eval-output.workflow.js`,
`args: { pluginDir, buildDir }`; write the report to
`.build/output-evals.json`. Every case runs on the REAL harness: with-skill
(`--plugin-dir`, the skill triggers on its own) 3× plus a no-skill baseline
3×, each a fresh `claude -p` session whose stream-json transcript is
preserved under `.build/output-runs/`. A case passes only when every
with-skill run passes; a baseline that passes ≥2/3 of its runs means the
skill added nothing on that task — a cut candidate to raise with the
champion, not to delete silently. Cases in `skillNeverFired` are routing
problems surfacing in the output rung — send them to the trigger
benchmark; don't patch the skill body. Evals carrying a `gated` field need
live team connections: list them with what they need, never mock them (a
mock that passes vacuously is worse than no eval).

**Transcript-first triage.** Before filing any fix from a failed case,
read the failing run's transcript in `.build/output-runs/` and decide:
agent mistake, or grader/task defect? The checks rows carry the checker's
evidence (what was missing, where) — a fix filed without reading the
failing run is a guess.

**Gate 3.** Regenerate the dashboard (`python3
${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py <project-root>`),
publish it with the Artifact tool (same file path redeploys to the same
URL; if the tool is unavailable this session, say the file also opens
locally), and get the champion's Evals-tab feedback BEFORE revising
anything. Their exported `[eval]` notes route through `/fde-review`;
record the decision in `.build/approvals.json` (`{gate: 3, date, by,
note}`).

## Practice run (before deploy)

If `practice/` doesn't exist, generate the fixture first:

- A fictional client and intake artifact (transcript or request doc) rich
  enough to exercise every phase of the team's workflow, with 3-4 inputs
  deliberately left open so composition (the interview skill) gets
  exercised. Never real client material, never real names.
- `practice/README.md` — a phase-by-phase runbook: the command to run,
  what to expect, what to verify at each step.

Then execute it: Workflow tool, `scriptPath:
${CLAUDE_PLUGIN_ROOT}/scripts/practice-run.workflow.js`,
`args: { projectRoot, pluginDir, buildDir }`; write the report to
`.build/practice-report.json`. Each runbook step is a fresh `claude -p`
session with the plugin loaded (`--plugin-dir`), run sequentially in
`.build/practice-run/work/` and graded with the owning skill's checks; the
per-step stream-json transcript at `.build/practice-run/step-N.jsonl` is
the harness's own record. A step whose skill never fired is a routing
failure — triage it with the trigger benchmark. For each failure: read the
step's transcript first, then append the suggested eval case to the owning
skill's evals, set the row's `filedCase`, and add a
`.build/regressions.json` entry (source `practice run · step N`). Keep the
runbook human-followable — the champion can replay any step.

## Closing the phase

Write `.build/eval-report.md` (rounds, scores, what changed each round,
accepted misses, cut candidates, practice results). Regenerate the
dashboard and publish it. Report all three rungs' results and whether
`/fde-deploy` is warranted.
