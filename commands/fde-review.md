---
description: Turn the champion's exported dashboard notes into a revision pass over the built plugin
argument-hint: "[path to exported review notes]"
---

Run the review phase of this Auto-FDE engagement. Use the reviewing skill
(auto-fde:reviewing) for the method.

Arguments: $ARGUMENTS

Preconditions: a built plugin and a generated `dashboard.html` at the
engagement root. The champion reviews on the dashboard's Skills page — and
the Evals page once evals exist: approve, leave notes, export.

1. Ingest the notes — from the exported file (argument or default export
   location) and anything the user says in chat. Normalize into per-skill
   revision notes plus global rules (renames, merges, cuts, doctrine
   changes). The export may include `[eval] <skill>#<evalId>` sections;
   bucket those onto the owning skill.
2. Apply catalog-level changes first (catalog.json is the source of truth:
   renames, merges, cuts, additions).
3. Run the revision workflow
   (`${CLAUDE_PLUGIN_ROOT}/scripts/revise-skills.workflow.js`) — each touched
   skill gets its specific note plus the global rules, then re-verify. The
   workflow pins every fix as a regression eval case and reports
   `descriptionsChanged`.
4. Deterministic sweep after the agents: grep the plugin for anything the
   notes said to purge; confirm every bundled template reference resolves.
5. Append the regression cases to `.build/regressions.json`. If any
   description changed, re-run the trigger benchmark before reporting done
   (regression gate).
6. Regenerate the dashboard
   (`python3 ${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py <engagement-root>`),
   publish it with the Artifact tool (same file path keeps the same URL; if
   the tool is unavailable, the file also opens locally), and update catalog
   statuses.

End with what changed, what passed re-verify, and whether another review
round looks needed — if not, point to `/fde-eval`.
