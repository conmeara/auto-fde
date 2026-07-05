# Auto-FDE

Auto-FDE is an FDE plugin delivery kit for running the lifecycle around team plugin deployments. It is meant to help field teams discover workflows, synthesize requirements, plan and build plugins, review the result, create eval flywheels, and publish the supporting wiki/demo materials.

This repo is intentionally minimal right now. The first version collects the source guidance for skill writing and Claude plugin development, then leaves the full lifecycle automation for later.

## Lifecycle

1. Discover all workflows
2. Synthesis
3. Plan
4. Build
5. Review
6. Eval suites and flywheel
7. Plugin, wiki, and video demos

## Current Skills

- `skills/auto-fde/` - lifecycle router for FDE plugin delivery.
- `skills/writing-great-skills/` - placeholder around Matt Pocock's writing-great-skills guidance.
- `skills/effective-agent-skills/` - placeholder around David Ondrej's effective-agent-skills guidance.
- `skills/plugin-dev/` - placeholder around Anthropic's Claude Code plugin-dev guidance.
- `skills/skill-creator/` - placeholder around Anthropic's skill-creator guidance.

## Source Guidance

- Matt Pocock: [writing-great-skills](https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-great-skills/SKILL.md)
- David Ondrej: [effective-agent-skills](https://github.com/davidondrej/skills/blob/main/skills/skill-authoring/effective-agent-skills/SKILL.md)
- AI Engineer: [Building Great Agent Skills: The Missing Manual](https://www.youtube.com/watch?v=UNzCG3lw6O0)
- Anthropic Claude Code: [plugin-dev](https://github.com/anthropics/claude-code/tree/main/plugins/plugin-dev)
- Anthropic: [skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
- Anthropic guide: [The Complete Guide to Building Skill for Claude](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf)

## Planned Integrations

- [UI Backlot](https://github.com/conmeara/ui-backlot) for turning discovered product workflows into editable HTML/HyperFrames wiki and demo surfaces.
- [Ripple](https://github.com/conmeara/ripple) for agent-made demo videos, review artifacts, and repeatable video QA.
