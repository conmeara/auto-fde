---
description: Eval the built plugin — trigger benchmark, output evals, practice run
argument-hint: "[trigger | output | practice]"
---

Run the eval phase of this Auto-FDE project. Use the evaluating skill
(auto-fde:evaluating) for the method.

Arguments: $ARGUMENTS

Preconditions: a built plugin that has been through at least one review
round, and ideally through `/fde-test` — testing seeds the eval set with
real phrasings, and benchmarking a never-tested plugin measures only
agent-authored cases (per the project layout's phase table). If review
or testing was skipped, say so and get the user's go-ahead before
proceeding. Default to the trigger benchmark if no argument.

- **trigger** — run
  `${CLAUDE_PLUGIN_ROOT}/scripts/eval-trigger.workflow.js`: deterministic
  60/40 train/hold-out split, three blind judges per skill. Iterate until
  hold-out accuracy ≥ 0.99 at precision 1.0 — the hold-out score is the
  headline; fix descriptions from train failures only, never from hold-out
  queries. Triage each train failure: description collision → fix the
  descriptions; mislabeled case → relabel and add a replacement; accepted
  miss → record the reason and add a replacement. The set only grows.
  When the bar is met, run once more with `live: true` — a hold-out sample
  through real `claude -p` sessions with the plugin installed; the phase is
  not done without the judge-vs-live delta in the report. Merge each round
  and the triage ledger (rounds, casesAdded, relabeled, acceptedMisses)
  into `.build/trigger-report.json`.
- **output** — run
  `${CLAUDE_PLUGIN_ROOT}/scripts/eval-output.workflow.js`: each runnable
  eval runs on the real harness — with-skill (`--plugin-dir`) 3× plus a
  no-skill baseline 3×, fresh `claude -p` sessions in isolated worktrees,
  transcripts preserved under `.build/output-runs/`; run-checks.py grades
  mechanical and trace checks, the rubric judge only what code can't.
  Results go to `.build/output-evals.json`. List gated evals with the live
  connection each needs — never mock them. Flag skills whose baseline
  passes ≥2/3 runs as cut candidates; `skillNeverFired` cases go to the
  trigger benchmark, not the skill body. Before filing any fix from a
  failed case, read the failing run's transcript (agent mistake vs grader
  defect). Then Gate 3: regenerate and publish the dashboard, and get the
  champion's feedback on the Evals page before any revision.
- **practice** — generate the synthetic practice fixture and runbook if
  missing (fictional client, never real client material), then run
  `${CLAUDE_PLUGIN_ROOT}/scripts/practice-run.workflow.js`: each runbook
  step is a fresh `claude -p` session with the plugin loaded, sequential in
  a shared workdir, graded with the owning skill's checks; per-step
  transcripts land at `.build/practice-run/step-N.jsonl`. Failures file
  eval cases and `.build/regressions.json` entries; a step whose skill
  never fired is a trigger-benchmark problem.

Write results to `.build/eval-report.md`, regenerate the dashboard
(`${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py`), and publish it with the
Artifact tool — same file path, so the champion's link stays stable (if the
Artifact tool is unavailable, say `dashboard.html` also opens locally). End
with the scores, what was fixed, accepted misses (with reasons), cut
candidates, and whether the plugin is ready for `/fde-deploy`.
