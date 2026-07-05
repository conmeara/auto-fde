# Auto-FDE

**A forward-deployed-engineering delivery kit for Claude Code.** Auto-FDE
runs the lifecycle of bringing Claude to a team: discover their workflows,
plan a skill catalog, build their plugin, review it together, eval it, and
deploy it with a site, tutorials, and demos. It's built for two users — the
champion inside a team who wants Claude working for their teammates, and the
FDE/consultant doing it across client teams. It automates as much of the
work as possible and teaches the FDE method at every step, keeping the human
at the review gates.

Inspired by the auto-researcher idea: if the research loop can be automated,
so can the field-deployment loop. The methodology here was proven end to end
on a real engagement first (a 40+-skill creative-production plugin), and this
plugin is that run, generalized.

## The lifecycle

| Phase | Command | What happens |
| --- | --- | --- |
| Dashboard | `/fde` | Where the engagement stands, what to run next |
| Discover | `/fde-discover` | Kickoff interview; then corpus extraction, transcript ingestion, and SME interviews → knowledge digests |
| Plan | `/fde-plan` | Digests → `catalog.json` (skills/commands/agents/integrations) → Plan tab of the review page |
| Build | `/fde-build` | Build → adversarial verify → revise, per skill, as a background workflow; validator gate |
| Review | `/fde-review` | Champion's review-page notes → catalog reshapes + revision workflow + deterministic sweeps |
| Eval | `/fde-eval` | Trigger benchmark to ≥0.99 accuracy / 1.0 precision; output evals; generated practice project |
| Deploy | `/fde-deploy` | Marketplace packaging, TESTING.md, team site (overview/install/wiki), rollout kit |

Every engagement is a working directory with a fixed layout
([reference/engagement-layout.md](reference/engagement-layout.md)). Two
artifacts carry the handoffs: **digests** (all discovery, whatever the
source) and **catalog.json** (the single source of truth for scope). One
evolving **review page** grows a tab per phase so the human always opens the
same file.

## What's inside

- **skills/** — the method: one skill per phase, plus
  [skill-authoring](skills/skill-authoring/SKILL.md), the authoring doctrine
  every build/verify/revise agent loads (distilled from Anthropic's
  plugin-dev, skill-creator, and the Complete Guide, with ideas from Matt
  Pocock, David Ondrej, and Peter Steinberger — sources attributed in the
  skill's references).
- **scripts/** — the machinery: fan-out corpus extraction,
  build→verify→revise, note-driven revision, and trigger-benchmark
  workflows, plus the review-data generator and `dev-sync.sh` install loop.
- **templates/** — the surfaces: the tabbed review page, the deploy site
  (Overview / Install / Tutorials), and the schemas (catalog, digest,
  engagement brief). All examples use the fictional Acme Launch Team.
- **agents/** — `plugin-validator`, the structural gate.

## Install

```
claude plugin marketplace add conmeara/auto-fde
claude plugin install auto-fde@auto-fde
```

Then open (or create) your engagement directory and run `/fde`.

## Demo videos

Demo and tutorial videos for deployed plugins are produced agentically with
[Ripple](https://github.com/conmeara/ripple) (agent-made videos) and
[UI Backlot](https://github.com/conmeara/ui-backlot) (HTML re-creations of
app UIs so agents can "screen-record" without a screen). The deploy phase
leaves labeled placeholder slots for that handoff.

## Status

v1: full lifecycle commands, skills, workflows, and templates; validated
structurally (validator + trigger-eval machinery). First synthetic
end-to-end dogfood run is the next milestone — see [PLAN.md](PLAN.md).
