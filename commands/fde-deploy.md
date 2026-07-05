---
description: Package the plugin, generate the deploy site, and prepare the team rollout
---

Run the deploy phase of this Auto-FDE engagement. Use the deploying skill
(auto-fde:deploying) for the method.

Preconditions: evals passing (check `.build/eval-report.md`; warn and confirm
if not).

1. **Package.** Marketplace manifest (single- or multi-plugin per the
   catalog), version bump, install docs (marketplace add → install →
   connections/auth per catalog `integrations`), TESTING.md smoke tests, and
   `dev-sync.sh` (`${CLAUDE_PLUGIN_ROOT}/scripts/dev-sync.sh`) for the
   edit→reinstall iteration loop.
2. **Validate.** plugin-validator agent on the final package — zero leaked
   machine paths, every template reference resolving.
3. **Site.** Instantiate `${CLAUDE_PLUGIN_ROOT}/templates/site/` into `site/`:
   Overview (catalog-driven), Install (steps + connections), Tutorials (wiki
   seeded from the engagement brief's rollout plan). Data comes from
   catalog.json — regenerate, don't hand-edit. Verify rendering with the
   preview tools.
4. **Rollout kit.** Update the review page's Deploy tab checklist: pilot
   group, workshop outline, support channel, and demo-video slots — video
   production hands off to the Ripple and UI Backlot plugins
   (github.com/conmeara/ripple, github.com/conmeara/ui-backlot); link them,
   don't reimplement.

End with where everything landed and the remaining human steps (hosting the
site, scheduling the pilot workshop).
