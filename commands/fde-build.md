---
description: Build the team plugin from the approved catalog — build, verify, revise every skill
argument-hint: "[skill slugs to build, for a pilot subset]"
---

Run the build phase of this Auto-FDE engagement. Use the building skill
(auto-fde:building) for the method and pipeline details.

Arguments: $ARGUMENTS

Preconditions: `catalog.json` exists and the user has confirmed the catalog
is approved (ask if unclear). If skill slugs were passed, build only that
pilot subset.

The phase, in order:

1. Scaffold the plugin skeleton (`<plugin-name>/` per the catalog: manifest,
   commands, agents, templates dir) if not present. Copy bundled template
   files listed in the catalog — file copies, never agent-retyped content.
2. Run the build workflow
   (`${CLAUDE_PLUGIN_ROOT}/scripts/build-skills.workflow.js`) — build →
   adversarial verify → revise per skill. For pilot subsets, edit the SLUGS
   constant in a copy of the script under `.build/` — do not rely on `args`
   when re-invoking by scriptPath.
3. Record verify scores to `.build/verify-scores.json`; update each catalog
   skill's `status`.
4. Run the plugin-validator agent on the built plugin; fix findings.
5. Regenerate `review/data.js` (`${CLAUDE_PLUGIN_ROOT}/scripts/gen-review-data.py`)
   so the Skills tab is live, and verify it renders.

End with the run record (counts, scores, failures) and point the user at the
Skills tab of `review/review.html` → then `/fde-review`.
