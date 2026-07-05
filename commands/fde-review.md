---
description: Turn the user's review-page notes into a revision pass over the built plugin
argument-hint: "[path to exported review notes]"
---

Run the review phase of this Auto-FDE engagement. Use the reviewing skill
(auto-fde:reviewing) for the method.

Arguments: $ARGUMENTS

Preconditions: a built plugin and `review/data.js`. The user reviews in
`review/review.html` (Skills tab): approve, leave notes, export.

1. Ingest the notes — from the exported file (argument or default export
   location) and anything the user says in chat. Normalize into per-skill
   revision notes plus global rules (renames, merges, cuts, doctrine
   changes).
2. Apply catalog-level changes first (catalog.json is the source of truth:
   renames, merges, cuts, additions).
3. Run the revision workflow
   (`${CLAUDE_PLUGIN_ROOT}/scripts/revise-skills.workflow.js`) — each touched
   skill gets its specific note plus the global rules, then re-verify.
4. Deterministic sweep after the agents: grep the plugin for anything the
   notes said to purge; confirm every bundled template reference resolves.
5. Regenerate `review/data.js`, verify it renders, update catalog statuses.

End with what changed, what passed re-verify, and whether another review
round looks needed — if not, point to `/fde-eval`.
