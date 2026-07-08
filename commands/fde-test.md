---
description: Test the built plugin live — kits to get started, session-transcript ingestion, coverage tracking, case expansion
argument-hint: "[kit | ingest <transcript-or-notes> | expand]"
---

Run the test phase of this Auto-FDE project. Use the testing skill
(auto-fde:testing) for the method.

Arguments: $ARGUMENTS

Preconditions: a built plugin that has been through at least one review
round (Gate 2). Testing before review wastes your corrections on skills
that are about to be revised anyway — say so and get the user's go-ahead
if review was skipped.

This phase is the human's: you make starting frictionless, capture what
they observe, and turn it into eval cases and fixes — you never test in
their place (that is what `/fde-eval practice` automates later).

- **no argument** — report where testing stands: per-skill coverage from
  `.build/test-log.json`, skills never exercised, the live-load one-liner
  (`claude --plugin-dir <plugin>` from a scratch directory), and the kits
  available. If no kit exists yet, offer to generate them.
- **kit** — generate or refresh the test kits: one per entry-point journey,
  each a synthetic starting artifact (fictional, never real client
  material) plus the opening prompt in the team's own words and a short
  what-to-watch-for list. Kits live under `test/kits/<journey>/`.
- **ingest** — mine a test session: the argument is a session transcript
  path (or the user pastes notes/corrections in chat). Every correction
  becomes a per-skill revision note routed through the reviewing machinery;
  every confirmed behavior becomes a real-phrasing eval case; trigger
  misses go to the trigger benchmark. Update `.build/test-log.json`.
- **expand** — generate variation cases anchored to what the sessions
  actually exercised, present the list for the user to skim (approve/cull),
  append approved cases with `"source": "synthetic-expansion"` (they score
  as train only — the hold-out headline stays human-grounded), then offer
  to run the eval workflows autonomously (`/fde-eval`).

Close every invocation by regenerating the dashboard
(`python3 ${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py <project-root>`)
and publishing it with the Artifact tool (same file path, same URL; if the
tool is unavailable, the file also opens locally). End with coverage
(tested / untested skills), cases filed this session, fixes queued, and
whether the user should keep testing or move to `/fde-eval`.
