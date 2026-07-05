---
name: auto-fde
description: This skill should be used when the user asks for Auto-FDE, FDE plugin delivery, field engineering workflow discovery, team plugin rollout, customer workflow synthesis, plugin eval flywheels, or demo/wiki artifacts that connect UI Backlot and Ripple.
version: 0.1.0
---

# Auto-FDE Lifecycle

Route FDE plugin work through a staged lifecycle. Keep outputs lightweight while this repo is a scaffold.

## Stages

1. **Discover workflows** - collect the team's repeated work, inputs, handoffs, tools, and failure points.
2. **Synthesis** - turn raw workflow notes into concise jobs-to-be-done, constraints, and candidate plugin surfaces.
3. **Plan** - choose the smallest useful plugin slice, define skills/commands/agents, and name review gates.
4. **Build** - create or modify the plugin components.
5. **Review** - check correctness, installability, security, and usefulness for the field team.
6. **Eval suites and flywheel** - capture example prompts, expected outputs, regression checks, and review loops.
7. **Plugin, wiki, and video demos** - package the plugin, document it for team use, use UI Backlot for HTML/wiki/demo surfaces, and use Ripple for repeatable agent-made video demos.

## Default Output

For a new FDE request, produce:

- current lifecycle stage
- target team/user
- workflow being automated
- plugin components likely needed
- open questions
- next artifact to create

## Source References

Read `references/source-guidance.md` before expanding this scaffold into implementation.

