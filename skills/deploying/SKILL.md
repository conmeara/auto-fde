---
name: deploying
description: This skill should be used for the deploy phase of an Auto-FDE engagement — packaging the team plugin into an installable marketplace, generating the team-facing site (overview, install guide, tutorials wiki), and preparing the rollout kit (workshop, demos, support). Use it when evals pass and the user wants to ship, package, publish, or roll out the plugin to the team, or set up the plugin's website or wiki.
---

# Deploying

Ship the plugin and everything the team needs to adopt it. Check
`.build/eval-report.md` first — deploying past failing evals needs the
user's explicit say-so.

## 1. Package

- `marketplace.json` beside the plugin(s) (multi-plugin when the catalog
  bundles vendor plugins), names matching manifests exactly; version bump
  to the release version.
- `TESTING.md` — marketplace add → install → connect integrations (auth
  steps per catalog `integrations`) → one smoke test per phase router.
- Copy `${CLAUDE_PLUGIN_ROOT}/scripts/dev-sync.sh` next to the marketplace
  for the maintainer's edit→reinstall loop (installed plugins are frozen
  cache copies; uninstall→re-add→install→restart is the only reliable
  loop — document that in TESTING.md).
- Install locally via that loop and run the smoke tests yourself. Done when
  they pass in a fresh session, not before.

## 2. Final gate

Run the auto-fde plugin-validator agent on the packaged suite, then the
deterministic sweep: zero absolute machine paths, zero confidential terms,
every bundled reference resolving, all manifests parsing. Errors block;
document any warning you accept.

## 3. The site

Instantiate `${CLAUDE_PLUGIN_ROOT}/templates/site/` into `site/`:

1. Copy the template files; regenerate `site/data.js` from `catalog.json`
   and `engagement.md` (plugin identity, phases, skills, agents, install
   steps, integrations — the template README documents SITE_DATA).
2. Seed the tutorials wiki: keep the template's generic articles, add one
   per phase router command using the team's own vocabulary and a worked
   example from the practice project.
3. Every article and the overview keep their demo-video placeholder slots.
   Video production is handed off to the Ripple plugin (agent-made videos,
   github.com/conmeara/ripple) with UI Backlot for HTML app surfaces
   (github.com/conmeara/ui-backlot) — list each placeholder as a line item
   for that handoff; don't record or fake videos here.
4. Verify every page renders from data.js alone (serve + preview check),
   then note the hosting step (GitHub Pages or an internal static host) for
   the human.

## 4. Rollout kit

Write `.build/deploy.json` (checklist per the review-page data contract)
and finish the review page's Deploy tab: install steps, pilot group,
workshop outline (45 min: install together → one real task per lane → where
help lives), support channel, and the demo-video handoff list. Regenerate
`review/data.js`.

Report where everything landed and the remaining human steps: host the
site, schedule the pilot workshop, and start the feedback loop — real usage
feeds the next `/fde-review` round.
