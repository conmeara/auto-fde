---
name: evaluating
description: This skill should be used for the eval phase of an Auto-FDE engagement — running the trigger-eval benchmark on a built team plugin, iterating descriptions until accuracy targets are met, running output evals, and generating a synthetic practice project for end-to-end testing. Use it when the user wants to test, benchmark, or eval the plugin, check triggering accuracy, or set up a dummy project to try the plugin on.
---

# Evaluating

Prove the plugin routes and produces correctly before a team sees it.
Three rungs, cheapest first. Deep methodology (formats, scoring math,
anti-overfitting) lives in the skill-authoring doctrine's
anthropic-skill-creator reference — read it before your first benchmark.

## Trigger benchmark (always)

Targets: accuracy ≥ 0.99, precision = 1.0 (over-triggering annoys a whole
team; a missed trigger annoys one user once). Field baseline: 0.997/1.000.

Loop, one round per workflow run:

1. Workflow tool, `scriptPath:
   ${CLAUDE_PLUGIN_ROOT}/scripts/eval-trigger.workflow.js`,
   `args: { pluginDir, buildDir }` (absolute).
2. Triage every failure in the report — each is exactly one of:
   - **Description collision/vagueness** → fix the description(s) per the
     doctrine (sharpen scope, add negative triggers, decide which skill
     owns the contested ground and say so in both descriptions).
   - **Mislabeled eval case** → the judge picked a genuinely better owner;
     relabel the case to that skill.
   - **Accepted miss** → an overlap that is correct by design (a composing
     skill vs its host) or a knowledge-gap query no skill should claim.
     Record in `.build/trigger-report.json` under `acceptedMisses`, each
     with a reason — an accepted miss without a reason is just a miss.
3. Re-run. Done when targets are met or every remaining failure is an
   accepted miss with a written reason. Skills the report lists under
   `missingEvals` are not passing — author their evals and include them.

Write `.build/eval-report.md` (rounds, scores, what changed each round,
accepted misses), merge `rounds`/`acceptedMisses` into
`.build/trigger-report.json`, regenerate `review/data.js`, and check the
Evals tab renders.

## Output evals (when runnable)

Run each skill's `evals/evals.json` with fictional inputs; grade binary,
burden of proof on the expectation. Anything needing live team connections
(MCP auth, real tenancy) gets listed as **gated** with what's needed —
never faked with mocks that would pass vacuously. Record results in
`.build/output-evals.json` (`{run, passed, gated}`).

## Practice project (before deploy)

Generate a synthetic end-to-end fixture under `practice/`:

- A fictional client and intake artifact (transcript or request doc) rich
  enough to exercise every phase of the team's workflow, with 3-4 inputs
  deliberately left open so composition (the interview skill) gets
  exercised. Never real client material, never real names.
- `practice/README.md` — a phase-by-phase runbook: the command to run, what
  to expect, what to verify at each step.

Done when a fresh session could follow the runbook without you. Then
report all three rungs' results and whether `/fde-deploy` is warranted.
