# Auto-FDE v1 plan

Auto-FDE turns the FDE lifecycle — discover a team's workflows, plan a skill
catalog, build a Claude plugin, review it, eval it, deploy it — into a
reusable Claude Code plugin. The methodology was proven once by hand (the
creative-studio engagement); v1 generalizes that run.

## Decisions (locked 2026-07-05)

- **Claude Code only.** The Workflow tool, preview tools, and plugin CLI are
  load-bearing; no multi-host support in v1.
- **Users:** team champions implementing Claude for their own team, and
  FDEs/consultants doing it for client teams. Maximum automation, human at
  review gates. The plugin also *teaches* the FDE method as it runs it.
- **Command prefix `/fde-*`** — `/fde` dashboard plus one command per phase.
- **One evolving review page.** A single `review/review.html` per engagement
  gains tabs as phases complete: Plan → Skills → Evals → Deploy. One design
  system, one generated `data.js`.
- **Fully generic templates.** The repo is public. All shipped templates and
  examples use the fictional **Acme Launch Team**. No real team content.
- **v1 done bar: structural validation.** plugin-validator-style checks pass
  and the trigger-eval workflow runs clean on the example catalog. (A full
  synthetic dogfood run is the first post-v1 milestone.)
- **Source strategy:** Anthropic sources (plugin-dev, skill-creator, Complete
  Guide) are the backbone — distilled closely with attribution. Third-party
  sources (Pocock weighted most, Ondrej, Steinberger's
  conciseness/anti-duplication points) are distilled as ideas, never
  vendored. All three distillates live inside the doctrine skill at
  `skills/skill-authoring/references/` (single source of truth) and feed its
  SKILL.md compass.

## Architecture

State backbone: every engagement is a working directory with a fixed layout
([reference/engagement-layout.md](reference/engagement-layout.md)). Two
artifacts carry all handoffs: **knowledge digests** (the only output of
discovery, regardless of intake mode) and **catalog.json** (the only source
of truth for scope; schema in `templates/schemas/`).

```
commands/   fde (dashboard) · fde-discover · fde-plan · fde-build ·
            fde-review · fde-eval · fde-deploy        — thin state-aware routers
skills/     skill-authoring (the doctrine/compass) + one method skill per phase:
            discovery · planning · building · reviewing · evaluating · deploying
agents/     plugin-validator — structural validation gate (original, checklist
            distilled from plugin-dev)
scripts/    extract-corpus.workflow.js   — fan-out digest extraction
            build-skills.workflow.js     — build → verify → revise per skill
            revise-skills.workflow.js    — review-note-driven revision pass
            eval-trigger.workflow.js     — triggering benchmark (TP/FN/TN/FP)
            gen-review-data.py           — scan engagement → review/data.js
            dev-sync.sh                  — uninstall+reinstall install loop
templates/  review/   — the evolving review page (tabbed, data.js-driven)
            site/     — deploy site: Overview / Install / Tutorials
            schemas/  — catalog schema+example, digest + engagement-brief templates
reference/  engagement-layout.md — the state convention (loaded by every phase)
references/ upstream sources (repo docs, not shipped logic)
```

### Discovery: three intake modes, one output

Corpus extraction (folder of docs → fan-out workflow), transcript ingestion
(meetings/interviews → same digest format), and live interview (Claude
elicits from the champion/SMEs; also the standard mechanism for burning down
open questions from any phase). Kickoff interview produces `engagement.md`
before any extraction.

### Build: the proven pipeline

Per catalog skill: build (from digests + real sources) → adversarial verify
(scored fidelity / best-practices / triggering + verdict) → revise if not
pass. Doctrine injected from the `skill-authoring` skill. Validator gate at
the end. Lessons encoded: extract once and build from extracts; never
bottleneck a fan-out on one giant structured output; edit the script's slug
filter for pilots instead of relying on `args` over `scriptPath`; templates
get bundled and wired, never described.

### Eval: three rungs

Trigger evals (automatable benchmark, target ≥0.99 accuracy / 1.0 precision),
output evals (gated on live connections), generated practice project
(synthetic client + runbook for end-to-end testing).

## Build order (all complete 2026-07-05)

1. ✅ State convention + schemas (`reference/`, `templates/schemas/`)
2. ✅ Distillates (`skills/skill-authoring/references/`) — plugin-dev, skill-creator, third-party
3. ✅ Commands (7) — thin routers
4. ✅ `skill-authoring` doctrine skill
5. ✅ Phase skills (6)
6. ✅ Workflow scripts + helpers (6)
7. ✅ Review template (generalized from `references/review/review.html`)
8. ✅ Site template (generalized from `references/site/`)
9. ✅ plugin-validator agent, README rewrite, structural validation sweep
10. ✅ Adversarial verification workflow (7 dimensions × 2 refuters); 26
    confirmed findings fixed, including the marketplace manifest install gap

## Post-v1

- Synthetic dogfood: generate a fictional team corpus, run
  `/fde-discover → /fde-deploy` end to end; fixture becomes the bundled demo.
- Output-eval harness once an engagement with live connections exists.
- Ripple + UI Backlot integration for agent-made demo videos (deploy phase
  currently ships documented handoffs only).
- Prompt flywheel: fold real-engagement feedback into the doctrine skill.
