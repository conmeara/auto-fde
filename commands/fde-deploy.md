---
description: Roll the plugin out to the team — packaging, connections, the site artifact, and the rollout kit, as a guided checklist
---

Run the deploy phase of this Auto-FDE engagement. Use the deploying skill
(auto-fde:deploying) for the method.

Preconditions: evals passing (check `.build/eval-report.md`; warn and confirm
if not).

This phase is a guided checklist recorded in `.build/deploy.json`: you
prepare each item, the user does what only a human can (restart Claude,
approve `/mcp` auth, send links), and you verify after.

1. **Package.** Marketplace manifest (single- or multi-plugin per the
   catalog) with a description, version bump, TESTING.md (smoke tests +
   `claude plugin validate --strict` as first triage), and
   `dev-sync.sh` (`${CLAUDE_PLUGIN_ROOT}/scripts/dev-sync.sh`) for the
   edit→reinstall loop. Local install via the loop; the user restarts and
   runs the smoke tests in a fresh session — done when they pass.
2. **Validate.** `claude plugin validate --strict` on every plugin and the
   marketplace file, then the plugin-validator agent, then the
   deterministic sweep (paths, confidential terms, references).
3. **Connect.** One checklist item per catalog integration: exact setup
   steps, the user performs the auth (never credentials in chat), you
   verify with a harmless call — then offer to run the gated evals that
   were waiting on it.
4. **Site.** Author the wiki
   (`${CLAUDE_PLUGIN_ROOT}/scripts/gen-wiki.workflow.js` — tutorials from
   the real graded transcripts, verified), generate `site.html`
   (`python3 ${CLAUDE_PLUGIN_ROOT}/scripts/gen-site.py <engagement-root>`),
   verify with preview tools, and publish it with the Artifact tool — one
   stable link for the whole team, no hosting step.
5. **Videos (optional).** One brief per article in `.build/video-briefs/`;
   hand to the Ripple + UI Backlot plugins when installed
   (github.com/conmeara/ripple, github.com/conmeara/ui-backlot), otherwise
   ship the briefs as a handoff list. Site slots show placeholders until
   files exist.
6. **Rollout kit.** Pilot group, workshop outline, support channel, and the
   misfire channel: teammates report wrong-skill/bad-output moments in one
   message; each report lands in `<engagement>/feedback/` for
   `/fde-improve`.

End by regenerating the dashboard
(`python3 ${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py <engagement-root>`)
and publishing it with the Artifact tool (if unavailable, both files also
open locally). Report both links — dashboard for the champion, site for the
team — the checklist state, and the open items with owners, then start the
`/fde-improve` loop.
