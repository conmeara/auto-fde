---
name: building
description: This skill should be used for the build phase of an Auto-FDE engagement — scaffolding the team plugin and running the build→verify→revise workflow that authors every catalog skill from the discovery digests. Use it when the catalog is approved and it's time to build the plugin, build a pilot subset of skills, or rebuild specific skills, even if the user just says "build it".
---

# Building

Author every approved catalog skill at production quality, each one built
from digests, adversarially verified, and revised until it passes. Confirm
the catalog is approved before starting; building from an unapproved
catalog wastes the run.

## 1. Scaffold the plugin skeleton (inline, by hand)

If `<plugin-name>/` (from `catalog.json`) doesn't exist:

- `.claude-plugin/plugin.json` per the manifest rules in the doctrine's
  plugin-dev reference; `commands/` with the catalog's phase routers;
  `agents/` with the catalog's agents (proper triggering frontmatter and
  example blocks); an empty `skills/`.
- Copy every file listed in catalog `templates` into
  `<plugin-name>/templates/` — real file copies (`cp`), never agent-retyped
  content. Blank templates only; derive a blank from an example when none
  exists, and flag oversized or confidential files instead of copying.
- If several skills will share doctrine-like team rules, create one
  `<plugin-name>/reference/<team>-doctrine.md` now so built skills point at
  it instead of pasting it.

Done when the skeleton passes a quick structural look and every catalog
template path resolves to a real bundled file.

## 2. Run the build workflow

Full build — invoke the Workflow tool with
`scriptPath: ${CLAUDE_PLUGIN_ROOT}/scripts/build-skills.workflow.js` and
absolute-path args:
`{ catalogPath, engagementRoot, pluginDir, digestsDir, doctrinePath:
"${CLAUDE_PLUGIN_ROOT}/skills/skill-authoring/SKILL.md", sourcesNote }`.

**Pilot subsets:** copy the script to `.build/build-skills.workflow.js`,
edit the `SLUGS` constant, and invoke that copy. Passing a subset through
`args` on a scriptPath re-invocation has silently built everything twice in
the field — the SLUGS edit is the only reliable filter.

Expect roughly 2 agents per skill (3 with revisions); a 40-skill catalog is
a 30-45 minute background run. Watch the run record: if the same blocking
issue recurs across skills, stop the workflow, fix the doctrine or the
prompt once, and resume — don't let 30 agents repeat one mistake.

## 3. Land the outputs

From the workflow's return record:

- `.build/verify-scores.json` — per-slug `{scores, verdict, openQuestions}`
  (shape in the doctrine's eval-formats reference).
- Merge per-skill open questions into `.build/open-questions.json`.
- Update each built skill's catalog `status` (`built` / `verified` per
  verdict); re-run lost or failed slugs via SLUGS before proceeding.

## 4. Gate and stage review

1. Run the auto-fde plugin-validator agent on `<plugin-name>/`; fix every
   error it reports, rerun until clean. Treat leaked machine paths and
   dangling template references as blockers, not warnings.
2. Deterministic sweep (never trust agents on this): grep the built plugin
   for absolute paths (`/Users/`, `/home/`), for the engagement's
   confidential terms, and confirm every `${CLAUDE_PLUGIN_ROOT}` reference
   in built skills resolves.
3. Regenerate `review/data.js`
   (`${CLAUDE_PLUGIN_ROOT}/scripts/gen-review-data.py <engagement-root>`)
   and confirm the Skills tab renders with verify scores.

Report the run record (first-pass rate, revised, averages, open-question
count) and hand the champion the Skills tab → `/fde-review`.
