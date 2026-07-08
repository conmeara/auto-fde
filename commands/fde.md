---
description: Regenerate the project dashboard and report where things stand and what to run next
---

The dashboard carries the full picture; this command regenerates it,
publishes it, and hands the user the one next move.

1. Run `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py <project-root>`
   (the current directory). It seeds `dashboard.html` at the project root
   on first run, embeds fresh data on every run, and prints the next command.
2. Publish `dashboard.html` with the Artifact tool — same file path every
   time, so it redeploys to the same URL and the champion's link stays
   stable. If the Artifact tool is unavailable in this session, say the file
   also opens locally in a browser.
3. Report in chat, briefly: current phase and step count, the one next
   command and why (both come from the generated status — don't re-derive
   them), gates waiting on the human, and attention items (open questions,
   eval debt, stale trigger or output scores, untested skills, unconverted
   feedback reports).
   Teach the method only on request or on a brand-new project.
4. If the directory has no `project.md`, this is a brand-new project:
   say the dashboard's Overview page is a guided tour of the whole method,
   explain the lifecycle in five sentences, and offer to start with
   `/fde-discover` (kickoff interview — no materials needed yet).
