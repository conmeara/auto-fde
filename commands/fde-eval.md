---
description: Eval the built plugin — triggering benchmark, output evals, practice project
argument-hint: "[trigger | output | practice]"
---

Run the eval phase of this Auto-FDE engagement. Use the evaluating skill
(auto-fde:evaluating) for the method.

Arguments: $ARGUMENTS

Preconditions: a built plugin that has been through at least one review
round (per the engagement layout's phase table). If review was skipped,
say so and get the user's go-ahead before proceeding. Default to the
trigger benchmark if no argument.

- **trigger** — run
  `${CLAUDE_PLUGIN_ROOT}/scripts/eval-trigger.workflow.js`: judge every
  trigger query against the full catalog descriptions, score TP/FN/TN/FP,
  iterate on colliding descriptions until accuracy ≥ 0.99 with precision
  1.0 (no over-triggering). Distinguish real description collisions from
  mislabeled eval cases — fix whichever is actually wrong.
- **output** — run the per-skill output evals that don't require live
  connections; list which are gated on auth and what's needed.
- **practice** — generate a synthetic practice project: a fictional client
  intake artifact rich enough to exercise every phase of the team's
  workflow, plus a phase-by-phase runbook with what to run and what to
  verify. Never reuse real client material.

Write results to `.build/eval-report.md`, regenerate `review/data.js` so the
Evals tab is live, and update catalog statuses. End with the scores, what was
fixed, accepted misses (with reasons), and whether the plugin is ready for
`/fde-deploy`.
