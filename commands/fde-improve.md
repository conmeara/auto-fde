---
description: Turn team feedback into eval cases and fixes — the permanent post-deploy flywheel
argument-hint: "[path to a feedback report, or paste it in chat]"
---

Run the improve phase of this Auto-FDE project. Use the improving skill
(auto-fde:improving) for the method.

Arguments: $ARGUMENTS

Preconditions: a deployed plugin (or at least one that has been through
`/fde-eval`), and feedback to process — files in `feedback/`, or a report
pasted in chat (save it into `feedback/` first so the trail is durable).
Exception: "a new Claude model shipped" needs no feedback — it re-runs
both benchmarks unchanged and reports what flipped, including capability
cases that now pass.

1. Convert each report not yet listed under `converted` in
   `.build/feedback-log.json` into exactly one eval case on the owning
   skill — a trigger case for routing misses, an output eval or check
   otherwise — plus a `.build/regressions.json` entry.
2. Reproduce: run the new case and confirm it fails as reported before
   touching anything. A case that already passes means the report was
   misread.
3. Fix — description for routing, skill body for output; batches go
   through `${CLAUDE_PLUGIN_ROOT}/scripts/revise-skills.workflow.js`.
4. Re-benchmark: any description change re-runs
   `${CLAUDE_PLUGIN_ROOT}/scripts/eval-trigger.workflow.js`; output
   changes re-run `${CLAUDE_PLUGIN_ROOT}/scripts/eval-output.workflow.js`
   for the touched skills.
5. Update `.build/feedback-log.json`, then regenerate the dashboard
   (`${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py`) and republish it as
   the Claude Artifact — same file path, same URL.

End with converted / fixed / still-open counts and any doctrine-level
lesson (same fix twice) worth folding into the team reference.
