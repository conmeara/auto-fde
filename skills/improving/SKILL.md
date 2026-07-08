---
name: improving
description: This skill should be used for the improve phase of an Auto-FDE project — converting team feedback and misfire reports into eval cases and fixes on a deployed plugin. Use it when processing the project's feedback/ directory, when a teammate reports "the plugin picked the wrong skill" or a bad output, or for a periodic post-deploy health pass — even if the user just pastes a complaint about the plugin into chat.
---

# Improving

The permanent post-deploy flywheel: every report ends as a pinned eval
case, and the eval set only grows. One pass = ingest → convert → fix →
re-benchmark → republish.

## 1. Ingest

Read every file in `feedback/` not listed under `converted` in
`.build/feedback-log.json`. A report pasted in chat gets saved into
`feedback/` first (one file per report) so the trail is durable, then
processed like the rest.

## 2. Convert — one report, exactly one eval case

Attribute each report to the owning skill, then pin it:

- **Routing miss** (wrong skill fired, nothing triggered) → a
  `evals/trigger-evals.json` case with the reporter's actual words as the
  query and `"pinned": true` — pinned cases always score as train, so a
  regression can never fail invisibly in the hidden hold-out split.
- **Output problem** → an `evals/evals.json` expectation, or a
  `checks.json` check when code can verify it.

Append to `.build/regressions.json`: `{source: "team report <file>",
finding, guardedBy, status: "open"}`. Add the filename to
`feedback-log.json` `converted`. A report that isn't a plugin defect
(user error, missing training) gets logged with a reason instead of a
case — it feeds the site's tutorials, not the eval set.

## 3. Reproduce, then fix

Run the new case and confirm it fails as reported — a case that already
passes means the report was misread; go back. Then fix the description
(routing) or the skill body (output) under the authoring doctrine.
Batches go through the revision workflow: Workflow tool, `scriptPath:
${CLAUDE_PLUGIN_ROOT}/scripts/revise-skills.workflow.js`. Append its
returned `regressionCases` to `regressions.json`; a non-empty
`descriptionsChanged` forces step 4.

## 4. Re-benchmark

- Any description changed → re-run
  `${CLAUDE_PLUGIN_ROOT}/scripts/eval-trigger.workflow.js`
  (`{pluginDir, buildDir}`); hold-out targets still apply.
- Any output change → re-run
  `${CLAUDE_PLUGIN_ROOT}/scripts/eval-output.workflow.js` and check the
  touched skills' cases in `.build/output-evals.json`.
- **A new Claude model shipped** → re-run BOTH suites unchanged, even with
  zero feedback queued (the preconditions waive the feedback requirement
  for this trigger). Skills route and produce differently across models;
  a deployed plugin nobody re-benchmarked after an upgrade is an unknown.
  Report what flipped — including capability cases that now pass.

A regression entry flips to `"passing"` only when the benchmark actually
passes its case — never on the strength of the fix alone.

## Capability cases and saturation

Not every eval should pass. Catalog entries the team cut or deferred as
too hard can be pinned as **capability cases** (`"capability": true` in
evals.json) — expected to fail, excluded from the pass bar, re-tried on
every model upgrade. They are the hill: a capability case that starts
passing is a feature the team can now have; raise it with them. And a
suite sitting at 100% with no capability cases is saturated, not finished
— it tracks regressions but gives no improvement signal; say so in the
report instead of celebrating it.

## 5. Close the loop

Regenerate the dashboard (`${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py
<project-root>`) and republish it with the Artifact tool — same file
path, same URL. If the Artifact tool is unavailable, the file also opens
locally. Report converted / fixed / still-open. A recurring lesson (same
fix twice) gets folded into the team plugin's
`reference/<team>-doctrine.md` so future skills inherit it.
