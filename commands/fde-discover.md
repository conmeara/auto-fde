---
description: Run FDE discovery — kickoff interview, then extract team knowledge into digests
argument-hint: "[path to sources or transcripts, or 'interview']"
---

Run the discovery phase of this Auto-FDE engagement. Use the discovery skill
(auto-fde:discovery) for the method; read
`${CLAUDE_PLUGIN_ROOT}/reference/engagement-layout.md` for where everything
goes.

Arguments: $ARGUMENTS

Route by state and arguments:

- **No `engagement.md` yet** → start with the kickoff interview regardless of
  arguments; it scopes everything else.
- **Argument is a directory of documents** → corpus extraction (fan-out
  workflow at `${CLAUDE_PLUGIN_ROOT}/scripts/extract-corpus.workflow.js`).
- **Argument is a transcript file or `discovery/transcripts/` has unprocessed
  files** → transcript ingestion.
- **Argument is `interview` or `.build/open-questions.json` has unresolved
  entries** → live interview mode.
- **No arguments, engagement.md exists** → report what discovery inputs exist
  (per the brief's materials inventory) and which are not yet digested, then
  run the most valuable pending intake.

All modes end the same way: digests written to `discovery/digests/` in the
digest format, a summary of what was captured and what open questions
remain, and the dashboard regenerated
(`python3 ${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py <engagement-root>`)
so Home reflects discovery progress.
