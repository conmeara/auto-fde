---
name: planning
description: This skill should be used for the planning phase of an Auto-FDE engagement — synthesizing discovery digests into a skill catalog (catalog.json), designing which skills, commands, agents, and integrations a team plugin needs, and producing the plan review page for the champion to approve. Use it when digests exist and the user wants a plan, a catalog, or asks "what skills should we build", and for revising the catalog before anything is built. Not for feedback on already-built skills — that is the reviewing skill.
---

# Planning

Synthesize digests into `catalog.json` — the single source of truth every
later phase builds from — and put it in front of the human on the review
page. Nothing gets built from a catalog the champion hasn't approved.

## Synthesize the catalog

Read every digest in `discovery/digests/` and `engagement.md`, then design
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
- **Vendor skills get catalog entries** (`vendor: true`) so triggering and
  the review page see the whole surface, but they're never built.
- **Commands are phase routers**, thin, few. Agents only for genuinely
  separate perspectives (adversarial review, research). Integrations list
  what needs auth and how.
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
2. Instantiate the review page if `review/` is empty: copy
   `${CLAUDE_PLUGIN_ROOT}/templates/review/review.html` in, then run
   `${CLAUDE_PLUGIN_ROOT}/scripts/gen-review-data.py <engagement-root>`.
3. Verify it renders before calling it ready — serve the directory and check
   the Plan tab shows every skill, commands, agents, integrations, and the
   open-questions callout (preview tools if available; at minimum confirm
   data.js parses and the skill count matches the catalog).

## Hand to the human

Walk the champion through the catalog's shape in chat (counts by phase and
type, the judgment calls you made, the open questions), then send them to
the Plan tab to approve/note each item. Done when the user has either
approved the catalog or given revision notes — record approval in chat
before `/fde-build` is allowed to start.
