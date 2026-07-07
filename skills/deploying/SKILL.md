---
name: deploying
description: This skill should be used for the deploy phase of an Auto-FDE engagement — walking the user through the rollout of the team plugin: marketplace packaging and install, connecting integrations and MCP auth, generating the team site (a shareable Claude artifact with overview, install guide, and wiki), video briefs, and the rollout kit. Use it when evals pass and the user wants to ship, package, publish, or roll out the plugin to the team, connect the team's tools, or set up the plugin's site or wiki.
---

# Deploying

Ship the plugin and everything the team needs to adopt it. This phase is a
guided checklist: you prepare each item, the user performs the parts only a
human can (restarts, auth approvals, sending links), and you verify after —
each item recorded in `.build/deploy.json` so the Deploy page shows exactly
where rollout stands. Check `.build/eval-report.md` first — deploying past
failing evals needs the user's explicit say-so.

## 1. Package

- `marketplace.json` beside the plugin(s) (multi-plugin when the catalog
  bundles vendor plugins), names matching manifests exactly; version bump
  to the release version; a marketplace-level `description`.
- `TESTING.md` — marketplace add → install → connect integrations (auth
  steps per catalog `integrations`) → one smoke test per phase router.
  First triage step for a plugin that won't load:
  `claude plugin validate <plugin> --strict`.
- Copy `${CLAUDE_PLUGIN_ROOT}/scripts/dev-sync.sh` next to the marketplace
  for the maintainer's edit→reinstall loop (installed plugins are frozen
  cache copies; uninstall→re-add→install→restart is the only reliable
  loop — document that in TESTING.md).
- Local install: run the sync loop, then hand the user their step —
  **restart Claude Code and run the smoke tests in the fresh session**
  (only a human can restart the app). Verify the results they report; the
  item is done when the smoke tests pass in a fresh session, not before.

## 2. Final gate

Run `claude plugin validate <plugin> --strict` on every plugin and the
marketplace file. Then the auto-fde plugin-validator agent on the packaged
suite, then the deterministic sweep: zero absolute machine paths, zero
confidential terms, every bundled reference resolving, all manifests
parsing. Errors block; document any warning you accept.

## 3. Connect the team's tools

One checklist item per catalog integration, walked in order:

1. Lay out the exact steps — where the MCP server gets added (bundled
   `.mcp.json` ships with the plugin; external servers need
   `claude mcp add …`), which env vars to set, where the token comes from,
   who in the team can issue it.
2. The user performs the auth (`/mcp` approvals are theirs; never ask for
   credentials in chat — env vars and the team's secret store only).
3. Verify: call something harmless through the connection, or have the
   user paste the tool listing. Gated evals that named this connection can
   run now — offer it.

An integration nobody can auth yet stays an open checklist item with an
owner, not a silent skip.

## 4. The site — one page, one link

The team-facing site is a single self-contained `site.html` at the
engagement root, published as a Claude artifact — one stable link for the
whole team, no hosting step.

1. Author the wiki first: Workflow tool, `scriptPath:
   ${CLAUDE_PLUGIN_ROOT}/scripts/gen-wiki.workflow.js`,
   `args: { engagementRoot, pluginDir, buildDir }` — one tutorial per phase
   router, worked examples distilled from the real graded transcripts
   (practice run, test sessions), every command and path verified. Articles
   land in `.build/wiki/`.
2. Generate: `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/gen-site.py
   <engagement-root>` — Overview (phases, skills, integrations, the misfire
   channel), Install (steps + connection guide), Wiki (the articles).
   Regenerate, never hand-edit.
3. Verify rendering with the preview tools, then publish `site.html` with
   the Artifact tool — same file path every run, so the team's link stays
   stable. If the Artifact tool is unavailable this session, the file also
   opens locally.

## 5. Demo videos (optional, separate plugins)

Write one brief per wiki article to `.build/video-briefs/<name>.md`: the
article's worked example as the script (the graded transcript is the
source), which surfaces appear on screen, target length. Then check
whether the video plugins are installed (their commands respond):

- Installed → hand each brief to **Ripple** (agent video editing,
  github.com/conmeara/ripple), with **UI Backlot** for app-UI surfaces
  rendered as scriptable HTML instead of screen recordings
  (github.com/conmeara/ui-backlot).
- Not installed → the briefs ship as a handoff list with install pointers.

Either way the site's video slots render placeholders until real files
exist — never record, fake, or block on videos here.

## 6. Rollout kit

Write `.build/deploy.json` per the dashboard data contract — the Deploy
tab renders the checklist: install steps, integration connections (with
owners), pilot group, workshop outline (45 min: install together → one
real task per lane → where help lives), support channel, the video-brief
handoff list, and the misfire-channel announcement.

The misfire channel: the kit tells every teammate that when the wrong
skill fires or an output is off, they send one message — what they asked,
what happened, what they expected — to the support channel. Save each
report as a file in `<engagement>/feedback/`; `/fde-improve` turns it into
an eval case and a fix. Mention the channel in TESTING.md and on the
site's Overview page too.

Close by regenerating the dashboard (`python3
${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py <engagement-root>`) and
publishing it with the Artifact tool. Report the two links (dashboard for
the champion, site for the team), what's checked off, and the open items
with owners — scheduling the pilot workshop is the user's; real usage
feeds `/fde-improve` from here.
