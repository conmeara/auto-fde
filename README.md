# Auto-FDE

**A forward-deployed-engineering delivery kit for Claude Code.** Auto-FDE
runs the lifecycle of bringing Claude to a team: discover their workflows,
plan a skill catalog, build their plugin, review it together, test it live
like a teammate would, eval it against hard targets, and deploy it with a
site, guides, and demos. It's built for two users — the champion inside a
team who wants Claude working for their teammates, and the FDE/consultant
doing it across client teams. Automation owns the mechanical work; the
human owns the judgment work — testing, triage, and the review gates.

Inspired by the auto-researcher idea: if the research loop can be automated,
so can the field-deployment loop. The methodology here was proven end to end
on a real engagement first (a 40+-skill creative-production plugin), and this
plugin is that run, generalized.

## The lifecycle

| Phase | Command | What happens |
| --- | --- | --- |
| Dashboard | `/fde` | Regenerates `dashboard.html` at the engagement root and publishes it as a shareable Claude artifact — the page the FDE operates from (Overview: next command, gates, lifecycle guide, references) |
| Discover | `/fde-discover` | Kickoff interview; then corpus extraction, transcript ingestion, and SME interviews → knowledge digests |
| Plan | `/fde-plan` | Digests → `catalog.json` (skills/commands/agents/integrations) → Plan page of the dashboard |
| Build | `/fde-build` | Build → adversarial verify → revise, per skill, as a background workflow; validator gate |
| Review | `/fde-review` | Champion's dashboard notes → catalog reshapes + revision workflow + deterministic sweeps |
| Test | `/fde-test` | You use the plugin live (`--plugin-dir`), kits make starting a one-minute job; your session transcripts become fixes and real-phrasing eval cases |
| Eval | `/fde-eval` | Trigger benchmark on a 60/40 hold-out split (≥0.99 hold-out accuracy / 1.0 precision, 3 blind judges + a live `claude -p` calibration); output evals vs a no-skill baseline on the real harness; executed and graded practice run |
| Deploy | `/fde-deploy` | Marketplace packaging, TESTING.md, team site (overview/install/guides), rollout kit |
| Improve | `/fde-improve` | Team misfire reports → eval cases → fixes → re-benchmark — the permanent flywheel |

## What's inside

- **skills/** — the method: one skill per phase, plus
  [skill-authoring](skills/skill-authoring/SKILL.md), the authoring doctrine
  every build/verify/revise agent loads (distilled from Anthropic's
  plugin-dev, skill-creator, and the Complete Guide, with ideas from Matt
  Pocock, David Ondrej, and Peter Steinberger — sources attributed in the
  skill's references).
- **scripts/** — the machinery: fan-out corpus extraction,
  build→verify→revise, note-driven revision, trigger-benchmark, output-eval,
  and practice-run workflows, the deterministic checks runner
  (`run-checks.py` — executes every mechanical `checks.json` check with
  evidence, and is copied into each built plugin so the team's evals stay
  runnable after handoff), plus the page generators (`gen-dashboard.py`,
  `gen-site.py`), the font embedder (`embed-fonts.py`), and the
  `dev-sync.sh` install loop.
- **templates/** — the surfaces: the dashboard
  ([templates/dashboard/](templates/dashboard/)), the deploy site
  ([templates/site/](templates/site/), Overview / Install / docs-style
  Guides), the embedded Anthropic fonts
  ([templates/fonts/](templates/fonts/NOTE.md), re-embedded via
  `scripts/embed-fonts.py`), and the schemas (catalog, digest, engagement
  brief). All examples use the fictional Acme Launch Team.
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

v3: the copilot correction — a nine-step lifecycle with a human **Test**
phase between Review and Eval (you use the plugin live; transcripts become
fixes and eval cases), checks-as-code grading (`run-checks.py`), evals run
on the real harness, the platform-styled dashboard and team site (shareable
artifacts, operated from Overview), and the eval flywheel — hold-out trigger
benchmark, baseline-checked output evals, executed practice run, regression
ledger, `/fde-improve`. First synthetic end-to-end dogfood run is still the
next milestone — see [PLAN.md](PLAN.md).
