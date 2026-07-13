---
name: building
description: This skill should be used for the build phase of an Auto-FDE project — scaffolding the team plugin and running the build→verify→revise workflow that authors every catalog skill from the discovery digests. Use it when the catalog is approved and it's time to build the plugin, a pilot subset, or rebuild specific skills, even if the user just says "build it".
---

# Building

Author every approved catalog skill at production quality, each one built
from digests, adversarially verified, and revised until it passes. Confirm
the catalog is approved before starting; building from an unapproved
catalog wastes the run.

## 1. Scaffold the plugin skeleton (inline — no workflow, real `cp` copies)

If `<plugin-name>/` (from `catalog.json`) doesn't exist:

- `.claude-plugin/plugin.json` per the manifest rules in the doctrine's
  plugin-dev reference; `commands/` with the catalog's phase routers;
  `agents/` with the catalog's agents (proper triggering frontmatter and
  example blocks); an empty `skills/`.
- Copy every file listed in catalog `templates` into
  `<plugin-name>/templates/` — real file copies (`cp`), never agent-retyped
  content. Blank templates only; derive a blank from an example when none
  exists, and flag oversized or confidential files instead of copying.
- Copy the deterministic checker into the plugin:
  `cp ${CLAUDE_PLUGIN_ROOT}/scripts/run-checks.py <plugin-name>/scripts/`.
  Every grader (build verify, output evals, practice run) executes it
  instead of eyeballing mechanical checks, and it ships with the plugin so
  the team's evals stay runnable after handoff.
- Generate `<plugin-name>/README.md` from the catalog — what the plugin
  is, the team's phases, the skill list by phase, install pointer,
  integrations and their env vars — plus a `.gitignore` (workspace debris,
  `.DS_Store`). The plugin is a repo the team will own; it needs a front
  door. (LICENSE only when the catalog says the plugin publishes beyond
  the team.)
- If the catalog declares `hooks` or an integration carries `mcp` config,
  scaffold them now: `hooks/hooks.json` (formats in the doctrine's
  plugin-dev reference §8) and `.mcp.json` at the plugin root (§9 —
  `${CLAUDE_PLUGIN_ROOT}` command paths, `${ENV_VAR}` secrets documented
  in the README, never literal tokens).
- If several skills will share doctrine-like team rules, create one
  `<plugin-name>/reference/<team>-doctrine.md` now so built skills point at
  it instead of pasting it.

Done when the skeleton passes a quick structural look and every catalog
template path resolves to a real bundled file.

## 2. Run the build workflow

Full build — invoke the Workflow tool with
`scriptPath: ${CLAUDE_PLUGIN_ROOT}/scripts/build-skills.workflow.js` and
absolute-path args:
`{ catalogPath, projectRoot, pluginDir, digestsDir, doctrinePath:
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

Each built skill ships four eval artifacts: `evals/trigger-evals.json`,
`evals/evals.json`, `evals/checks.json` (deterministic graders compiled
from the catalog's `success` criteria), and one `evals/reference/<evalId>.md`
solution per output eval. The verifier runs the checks against the
reference solutions — a reference that fails its own checks blocks the
skill.

From the workflow's return record:

- `.build/verify-scores.json` — per-slug `{scores, verdict, openQuestions}`
  (shape in the doctrine's eval-formats reference; `gen-dashboard.py` reads
  it for the Skills page).
- Merge per-skill open questions into `.build/open-questions.json`.
- Update each built skill's catalog `status` (`built` / `verified` per
  verdict); re-run lost or failed slugs via SLUGS before proceeding.

## 4. Gate and stage review

1. Run `claude plugin validate <plugin-name>/ --strict` — the platform's
   own deterministic check; fix every error. Then run the auto-fde
   plugin-validator agent on `<plugin-name>/` for everything the CLI
   can't know; fix every error it reports, rerun both until clean. Treat
   leaked machine paths and dangling template references as blockers, not
   warnings.
2. Deterministic sweep (never trust agents on this): grep the built plugin
   for absolute paths (`/Users/`, `/home/`), for the project's
   confidential terms, and confirm every `${CLAUDE_PLUGIN_ROOT}` reference
   in built skills resolves.
3. Regenerate the dashboard
   (`python3 ${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py
   <project-root>`), confirm the Skills page renders with verify scores,
   and publish it with the Artifact tool — same file path, so it redeploys
   to the champion's existing link. If the Artifact tool is unavailable,
   `dashboard.html` also opens locally.

Report the run record (first-pass rate, revised, averages, open-question
count) and hand the champion the dashboard's Skills page (Gate 2) →
`/fde-review`. When the review round closes with approvals, the reviewing
skill records them in `.build/approvals.json`.
