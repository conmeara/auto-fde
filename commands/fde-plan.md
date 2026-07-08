---
description: Synthesize discovery digests into a skill catalog and the project dashboard
---

Run the planning phase of this Auto-FDE project. Use the planning skill
(auto-fde:planning) for the method.

Preconditions: `discovery/digests/` must contain digests. If it doesn't, stop
and point the user to `/fde-discover`.

Produce, in order:

1. `catalog.json` — synthesize the digests into a skill catalog conforming to
   `${CLAUDE_PLUGIN_ROOT}/templates/schemas/catalog.schema.json`. Each skill
   entry carries success criteria (`success`: 2-4 must-pass checks) that build
   compiles into `checks.json`. If a catalog already exists, this is a
   revision: preserve statuses and reconcile rather than regenerate.
2. `dashboard.html` — seed or regenerate the dashboard with
   `${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py` (one file at the
   project root — there is no `review/` directory). Verify the Plan page
   renders, then publish with the Artifact tool so the champion has a stable
   link. If the Artifact tool is unavailable, the file also opens locally.
3. `.build/open-questions.json` — everything the digests couldn't answer.

End by telling the user the champion reviews the catalog on the dashboard's
Plan page (Gate 1): export notes from the dashboard and re-run `/fde-plan`
with them, or just describe changes in chat. Do not proceed to build —
`/fde-build` requires an approved catalog.
