---
name: planning
description: This skill should be used for the planning phase of an Auto-FDE project — synthesizing discovery digests into a skill catalog (catalog.json), designing which skills, commands, agents, and integrations a team plugin needs, and staging the plan on the dashboard for the champion to approve. Use it when digests exist and the user wants a plan, a catalog, or asks "what skills should we build", and for revising the catalog before anything is built. Not for feedback on already-built skills — that is the reviewing skill.
---

# Planning

Synthesize digests into `catalog.json` — the single source of truth every
later phase builds from — and put it in front of the human on the
dashboard. Nothing gets built from a catalog the champion hasn't approved.

## Synthesize the catalog

Read every digest in `discovery/digests/` and `project.md`, then design
the catalog against the schema
(`${CLAUDE_PLUGIN_ROOT}/templates/schemas/catalog.schema.json`; worked
example: `catalog.example.json` beside it).

Design rules:

- **Phases come from the team.** Use their lifecycle words from the brief,
  plus an `Anytime` bucket. Lanes only if the team genuinely has distinct
  role audiences.
- **One skill, one concern; merge by default.** A skill earns existence with
  a distinct trigger situation. Three deck-shaped outputs are one `deck`
  skill with render targets, not three skills.
- **Type every skill** — document (produces a team artifact from a
  template), workflow (guides a process), integration (wraps a tool/MCP) —
  and list per skill: the digests that ground it, raw sources for fidelity,
  blank templates to bundle, and what it composes. A reusable `interview`
  elicitation skill is almost always worth planning; gaps compose it.
- **Every buildable skill gets `success`** (vendor and cut entries are
  exempt; the schema keeps the field optional for them) — 2-4 must-pass
  criteria distilled from the digests, spanning outcome, process, style, and
  efficiency. Write them now: build compiles them into that skill's
  deterministic `checks.json`, and vague criteria here become vague checks
  later.
- **Vendor skills get catalog entries** (`vendor: true`) so triggering and
  the dashboard see the whole surface, but they're never built.
- **Budget the routing surface.** Claude Code fits all skill descriptions
  into a listing budget (~1% of the context window, ≈8,000 characters) and
  truncates or drops on overflow. At ~150 words per description that is
  roughly 10-12 always-on skills — a 40-skill catalog cannot ship every
  description always-on. Plan the levers now: which skills are core
  (full description, model-invoked), which get
  `disable-model-invocation: true` (out of the listing, reached through
  the phase router commands — the per-skill lever that works for plugin
  skills), and note in the catalog when the team should raise
  `skillListingBudgetFraction`. The validator errors on an over-budget
  listing at build time; deciding it here is cheaper.
- **Commands are phase routers**, thin, few. Agents only for genuinely
  separate perspectives (adversarial review, research). Integrations list
  what needs auth and how — and when an integration has an MCP server the
  plugin should ship, fill its `mcp` config (server type, command/url,
  `${ENV_VAR}` secrets) so build bundles a working `.mcp.json` instead of
  leaving the team a manual setup doc.
- **Plan hooks where determinism is the requirement.** If a success
  criterion is really a gate ("no brief ships without the canonical
  headings", "every export runs the lint script"), that's a `hooks` entry
  (event, matcher, purpose), not prose in a skill body — build scaffolds
  `hooks/hooks.json` from it.
- Planning `summary` is one line for humans — final descriptions are
  authored at build time under the skill-authoring doctrine.

Every judgment call the digests can't settle goes to
`.build/open-questions.json` (`{skill, question, status: "open"}`).

If `catalog.json` already exists, this is a revision: apply the requested
changes, preserve `status` fields, and never regenerate wholesale.

## Validate and stage the review

1. Validate `catalog.json` against the schema (`python3 -c` with jsonschema,
   or field-by-field if unavailable). Every skill's `phase` must be in
   `phases`, every `composes` slug must exist, slugs kebab-case and unique.
2. Run `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py
   <project-root>` — it seeds `dashboard.html` at the project root on
   first run and injects the data.
3. Verify the Plan page renders before calling it ready — open the file or
   use preview tools; at minimum confirm the injected data parses and the
   skill count matches the catalog. Then publish `dashboard.html` with the
   Artifact tool: the same path redeploys to the same URL, so the champion
   keeps one stable link. If the Artifact tool isn't available in the
   session, the file also opens locally.

## Hand to the human

Walk the champion through the catalog's shape in chat (counts by phase and
type, the judgment calls you made, the open questions), then send them to
the dashboard's Plan page (Gate 1) to approve/note each item. Done when the
user has either approved the catalog or given revision notes — record the
approval durably by appending `{gate: 1, date, by, note}` to
`.build/approvals.json` before `/fde-build` is allowed to start; chat
memory doesn't survive sessions.
