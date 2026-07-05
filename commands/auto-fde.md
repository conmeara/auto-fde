---
description: Route an FDE plugin delivery request through discovery, synthesis, plan, build, review, evals, and demo materials.
argument-hint: "[customer/team/workflow brief]"
allowed-tools: ["Read", "Write", "Edit", "Grep", "Glob", "Bash", "TodoWrite", "Task", "Skill"]
---

# Auto-FDE

Use the `auto-fde` skill to route this request through the scaffolded lifecycle.

Initial brief:

```text
$ARGUMENTS
```

Start by identifying which lifecycle stage the user is asking for. If the request is ambiguous, produce a short stage recommendation and the next concrete artifact to create.

