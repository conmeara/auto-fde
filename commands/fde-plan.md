---
description: Synthesize discovery digests into a skill catalog and the plan review page
---

Run the planning phase of this Auto-FDE engagement. Use the planning skill
(auto-fde:planning) for the method.

Preconditions: `discovery/digests/` must contain digests. If it doesn't, stop
and point the user to `/fde-discover`.

Produce, in order:

1. `catalog.json` — synthesize the digests into a skill catalog conforming to
   `${CLAUDE_PLUGIN_ROOT}/templates/schemas/catalog.schema.json`. If a catalog
   already exists, this is a revision: preserve statuses and reconcile rather
   than regenerate.
2. `review/review.html` + `review/data.js` — instantiate the review template
   (`${CLAUDE_PLUGIN_ROOT}/templates/review/`) so the Plan tab shows the full
   catalog for approval. Verify it renders with the preview tools before
   telling the user it's ready.
3. `.build/open-questions.json` — everything the digests couldn't answer.

End by telling the user to open `review/review.html`, mark up the catalog,
and re-run `/fde-plan` with their notes (or just describe changes in chat).
Do not proceed to build — `/fde-build` requires an approved catalog.
