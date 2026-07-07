---
name: reviewing
description: This skill should be used for the review phase of an Auto-FDE engagement — ingesting the champion's notes from the dashboard (exported markdown or chat feedback) about built skills, reshaping the catalog to match (renames, merges, cuts), and running the revision workflow that applies every note and re-verifies. Use it whenever human review feedback on built skills needs to be applied, even if the user just pastes notes or says "here's my feedback". Not for plan-stage catalog feedback before any skills exist — that is the planning skill.
---

# Reviewing

Turn human review into applied, re-verified changes. The champion's notes
are the highest-authority input in the whole lifecycle — every note gets
resolved or explicitly pushed back on, never silently dropped.

## 1. Normalize the notes

Ingest the dashboard export (markdown grouped by slug: `[catalog]`,
`[skill]`, and `[eval] <skill>#<evalId>` sections) plus anything said in
chat. Split into:

- **Catalog changes** — renames, merges, cuts, additions, scope moves.
- **Per-skill notes** — `[{slug, note}]`, one entry per flagged skill,
  preserving the reviewer's wording. `[eval]` sections from the Evals page
  bucket here too, as notes on the owning skill.
- **Global rules** — anything phrased as "everywhere" (purge legacy tool X,
  new naming rule, version bump). Ambiguous notes get one clarifying
  question now — cheaper than a wrong revision run.

Done when every exported note is assigned to exactly one bucket and the
user has confirmed your reading of the ambiguous ones.

## 2. Catalog changes first, on the filesystem

Apply renames/merges/cuts to `catalog.json` AND the plugin tree (`git mv`
skill dirs, update frontmatter names to match, fix `composes` references,
update router commands). Merges keep the best content of both — read both
before deleting either. New skills get catalog entries and go through the
build workflow, not hand-authoring. Done when every catalog-bucket note is
reflected in both `catalog.json` and the plugin tree, and no `composes`
entry or command references a renamed/removed slug.

## 3. Run the revision workflow

Workflow tool, `scriptPath:
${CLAUDE_PLUGIN_ROOT}/scripts/revise-skills.workflow.js`, args:
`{ pluginDir, doctrinePath:
"${CLAUDE_PLUGIN_ROOT}/skills/skill-authoring/SKILL.md", digestsDir,
notes, globalRules }`. Every fix is pinned as a regression eval case by
the fixer and re-verified by a fresh skeptic inside the workflow;
unresolved slugs in the return record get investigated individually, not
re-queued blindly. The record also returns `regressionCases` and
`descriptionsChanged` — step 5 consumes both. Done when the run record
shows every noted slug either passing re-verify or explained in your
report.

## 4. The deterministic sweep

Agents claim; grep decides. After the workflow:

- Grep the whole plugin for every purge target in the global rules. A
  legitimate survivor (a verbatim label a real template prints, a negative
  eval assertion) gets a written justification; anything else gets fixed.
- Confirm every bundled-template reference still resolves after renames.
- Frontmatter `name` == directory for every skill; eval JSON all parses.

## 5. Close the loop

The regression gate first: append the run's `regressionCases` to
`.build/regressions.json` (`source: "review note"`, `status: "open"` until
the next benchmark passes them). If `descriptionsChanged` is non-empty,
re-run the trigger benchmark (eval-trigger workflow) before reporting done
— an edited description with a stale score is an unverified change. The
same rule for bodies: if the revision touched skill bodies after output
evals exist, re-run the eval-output workflow for the touched skills — an
edited body with a stale output score is equally unverified (the dashboard
flags it as `staleOutput`).

Then regenerate the dashboard
(`python3 ${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py <engagement-root>`)
and publish it with the Artifact tool — same file path, so the champion's
link stays stable (if the tool is unavailable this session, the file also
opens locally). Confirm the Skills page reflects the changes, update catalog
statuses (`approved` for skills the champion approved unchanged), append
the round's Gate 2 decision to `.build/approvals.json`
(`{gate: 2, date, by, note}`), and bump the plugin version if the notes
amounted to a new draft. Report: what
changed, what passed re-verify, notes you pushed back on and why — then
recommend another review round or `/fde-eval`.
