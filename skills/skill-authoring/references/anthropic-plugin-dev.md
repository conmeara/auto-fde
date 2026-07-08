# plugin-dev — Distilled Reference (Claude Code Plugin Development)

Source: https://github.com/anthropics/claude-code/tree/main/plugins/plugin-dev (Anthropic, MIT; author Daisy Hollman). Supplemented with the official marketplace schema (`https://json.schemastore.org/claude-code-marketplace.json`, referenced by `anthropics/claude-code/.claude-plugin/marketplace.json`). Fetched 2026-07-05; re-verified against live docs (code.claude.com/docs: plugins, plugins-reference, skills, hooks, sub-agents) 2026-07-07 — path-replacement, `when_to_use`, reload, and agent-frontmatter claims corrected.
Re-fetch cadence: re-verify this file against the live docs at the start of any project more than a month after the stamp above.

The plugin-dev plugin ships: 1 command (`/plugin-dev:create-plugin`), 3 agents (`agent-creator`, `plugin-validator`, `skill-reviewer`), and 7 skills (`plugin-structure`, `skill-development`, `command-development`, `agent-development`, `hook-development`, `mcp-integration`, `plugin-settings`).

---

## 1. Plugin Directory Structure & Auto-Discovery

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # REQUIRED: plugin manifest — must be in .claude-plugin/
├── commands/                # Slash commands (.md files)
├── agents/                  # Subagent definitions (.md files)
├── skills/                  # Skills: one subdirectory per skill
│   └── skill-name/
│       └── SKILL.md         # Required for each skill
├── hooks/
│   └── hooks.json           # Event handler configuration
├── .mcp.json                # MCP server definitions (plugin root)
└── scripts/                 # Helper scripts / utilities
```

Critical rules (verbatim intent from plugin-structure skill):
1. `plugin.json` MUST be in the `.claude-plugin/` directory.
2. Component directories (`commands/`, `agents/`, `skills/`, `hooks/`) MUST be at plugin root, NOT nested inside `.claude-plugin/`.
3. Only create directories for components the plugin actually uses.
4. Use kebab-case for all directory and file names.

Auto-discovery (on plugin enable; `/reload-plugins` picks up changes to hooks/, .mcp.json, agents/, and output-styles/ mid-session — no restart; SKILL.md text edits are live-detected):
- Reads `.claude-plugin/plugin.json` (manifest optional — without it, defaults are scanned and the plugin name derives from the directory name).
- Commands: all `.md` files in `commands/` (subdirectories create namespaces: `commands/utils/helper.md` → `/helper (plugin:plugin-name:utils)`). Docs now treat commands as "skills as flat .md files" — prefer `skills/` for new plugins.
- Agents: all `.md` files in `agents/`.
- Skills: every subdirectory of `skills/` containing a `SKILL.md` (must be named exactly `SKILL.md`). A single-skill plugin may instead place `SKILL.md` at the plugin root (invocation name from frontmatter `name`).
- Hooks: `hooks/hooks.json`, or inline/custom path in manifest.
- MCP: `.mcp.json` at plugin root, or inline/custom path in manifest.
- **Custom manifest paths REPLACE their default directory** for `commands`, `agents`, and `outputStyles` (also `experimental.themes`/`experimental.monitors`): if the manifest specifies `commands`, the default `commands/` is NOT scanned. To keep the default and add more, list it explicitly: `"commands": ["./commands/", "./extras/"]`. Exception: the `skills` field **ADDS to** the default `skills/` scan (always scanned; listed dirs load alongside it). `hooks`/`mcpServers`/`lspServers` have their own merge rules. When both a default folder and a matching manifest key exist, `/doctor` and `claude plugin list` flag the ignored folder (v2.1.140+).

## 2. plugin.json Schema

Location: `.claude-plugin/plugin.json`. Only `name` is required.

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | **yes** | kebab-case; unique across installed plugins; regex `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` (start with letter, end alphanumeric, no spaces/underscores) |
| `version` | string | no | semver `MAJOR.MINOR.PATCH`; if omitted, the git commit SHA is the version (every commit = new version); if set, users only get updates when you bump it |
| `description` | string | no | 50–200 chars recommended (marketplace display) |
| `author` | object or string | no | object `{name (required), email, url}` or string `"Name <email> (url)"` |
| `homepage` | string (URL) | no | docs/landing page (not source — use `repository`) |
| `repository` | string (URL) or object | no | object form `{type, url, directory}` |
| `license` | string | no | SPDX identifier (`MIT`, `Apache-2.0`, `(MIT OR Apache-2.0)`) |
| `keywords` | string[] | no | 5–10 tags for discovery |
| `skills` | string or string[] | no | extra skill dirs (`<name>/SKILL.md`); **ADDS to** the default `skills/` scan |
| `commands` | string or string[] | no | custom command dirs/files; **REPLACES** default `commands/` (list it explicitly to keep it) |
| `agents` | string or string[] | no | custom agent files/dirs; **REPLACES** default `agents/` |
| `outputStyles` | string or string[] | no | custom output-style files/dirs; **REPLACES** default `output-styles/` |
| `hooks` | string (path to JSON) or object (inline) | no | default `"./hooks/hooks.json"`; own merge rules |
| `mcpServers` | string (path to JSON) or object (inline) | no | default `./.mcp.json`; own merge rules |
| `lspServers` | string or object | no | default `./.lsp.json`; own merge rules |

Path rules for all component-path fields:
- Must be relative to plugin root, must start with `./`.
- No absolute paths, no `../` parent navigation, forward slashes only (even on Windows).

Minimal valid manifest: `{"name": "hello-world"}`.

Complete manifest example (from manifest-reference.md):
```json
{
  "name": "enterprise-devops",
  "version": "2.3.1",
  "description": "Comprehensive DevOps automation for enterprise CI/CD pipelines",
  "author": { "name": "DevOps Team", "email": "devops@company.com", "url": "https://company.com/devops" },
  "homepage": "https://docs.company.com/plugins/devops",
  "repository": { "type": "git", "url": "https://github.com/company/devops-plugin.git" },
  "license": "Apache-2.0",
  "keywords": ["devops", "ci-cd", "automation"],
  "commands": ["./commands", "./admin-commands"],
  "agents": "./specialized-agents",
  "hooks": "./config/hooks.json",
  "mcpServers": "./.mcp.json"
}
```

## 3. marketplace.json Schema

Location: `.claude-plugin/marketplace.json` at the **marketplace repo root**. (Anthropic's own is at `anthropics/claude-code/.claude-plugin/marketplace.json`.)

Top level — required: `name`, `owner`, `plugins`.

| Field | Type | Notes |
|---|---|---|
| `$schema` | string | optional; `https://json.schemastore.org/claude-code-marketplace.json` |
| `name` | string | marketplace identifier (e.g. `claude-code-plugins`) |
| `version` | string | marketplace manifest version |
| `description` | string | human-readable |
| `owner` | object | `{name (required), email, url}` |
| `plugins` | array | plugin entries (below) |

Plugin entry — required: `name`, `source`. Optional: `version`, `description`, `author {name, email, url}`, `homepage`, `repository`, `license`, `keywords`, `category` (e.g. `"development"`, `"productivity"`, `"learning"`, `"security"`), `tags`, `dependencies` (plugin names, optionally `name@marketplace`), `strict` (boolean, default `true` — require plugin.json in plugin folder; if `false` the marketplace entry provides the manifest), plus component overrides (`commands`, `agents`, `skills`, `hooks`, `mcpServers`, `lspServers`, `outputStyles`, ...) with the same `./`-relative path rules.

`source` forms (per official schema):
- Relative path string: `"./plugins/plugin-dev"` — plugin root relative to marketplace root (the directory containing `.claude-plugin/`, not `.claude-plugin/` itself).
- npm: `{"source": "npm", "package": "...", "version": "^1.0.0", "registry": "https://..."}`.
- Git URL: `{"source": "url", "url": "https://... or git@...", "ref": "main|v1.0.0", "sha": "<40-hex>"}`.
- GitHub: `{"source": "github", "repo": "owner/repo", "ref": ..., "sha": ...}`.
- Monorepo subdir: `{"source": "git-subdir", "url": ..., "path": "tools/claude-plugin", "ref": ..., "sha": ...}` — only the subdirectory is materialized (sparse partial clone).

Working example (abridged from `anthropics/claude-code/.claude-plugin/marketplace.json`):
```json
{
  "$schema": "https://json.schemastore.org/claude-code-marketplace.json",
  "name": "claude-code-plugins",
  "version": "1.0.0",
  "description": "Bundled plugins for Claude Code ...",
  "owner": { "name": "Anthropic", "email": "support@anthropic.com" },
  "plugins": [
    {
      "name": "plugin-dev",
      "description": "Comprehensive toolkit for developing Claude Code plugins. ...",
      "version": "0.1.0",
      "author": { "name": "Daisy Hollman", "email": "daisy@anthropic.com" },
      "source": "./plugins/plugin-dev",
      "category": "development"
    }
  ]
}
```
(Note: the marketplace named `claude-code-marketplace` in plugin-dev's install instructions corresponds to this file; entries may omit `version`/`author` — only `name` and `source` are required.)

## 4. ${CLAUDE_PLUGIN_ROOT}

Environment variable resolving to the plugin's absolute installed path. Use it for **all** intra-plugin references, because install location varies by installation method, OS, and user preference.

Where to use: hook `command` paths, MCP `command`/`args`, script execution in commands (`` !`bash ${CLAUDE_PLUGIN_ROOT}/scripts/run.sh` ``), file references in commands (`@${CLAUDE_PLUGIN_ROOT}/templates/report.md`), resource paths in agent/skill text, and inside executed scripts (available as an env var: `source "${CLAUDE_PLUGIN_ROOT}/lib/common.sh"`).

Never use: hardcoded absolute paths (`/Users/name/plugins/...`), working-directory-relative paths (`./scripts/...` inside command bodies), or `~/` shortcuts.

Other env vars available to command hooks: `$CLAUDE_PROJECT_DIR` (project root), `$CLAUDE_ENV_FILE` (SessionStart only — append `export VAR=...` lines to persist env vars), `$CLAUDE_CODE_REMOTE` (set in remote contexts).

## 5. Skill Authoring (skill-development skill + skill-creator methodology)

Anatomy:
```
skill-name/
├── SKILL.md          (required: YAML frontmatter + markdown body)
├── scripts/          (executable code — deterministic/repeated tasks; can run without loading into context)
├── references/       (docs loaded into context as needed: schemas, API docs, patterns)
├── examples/         (complete working code users copy/adapt)   [plugin-dev convention]
└── assets/           (files used in output, never loaded into context: templates, fonts, boilerplate)
```

Frontmatter fields (per live Claude Code docs, all optional; `description` strongly recommended): `name` (display name; defaults to the directory name — the directory name, not `name`, sets the `/command`, except for a plugin-root SKILL.md), `description`, `when_to_use`, plus the Claude Code extensions below. `version`/`license` are open-standard metadata (plugin-dev uses e.g. `0.1.0`). `when_to_use` is **supported** (not deprecated): appended to `description` in the skill listing; the combined text is truncated at 1,536 chars in the listing (configurable via `skillListingMaxDescChars`).

Claude Code extension fields (all optional):
- `disable-model-invocation: true` — user-typed only; Claude cannot auto-invoke; description removed from the always-on listing. Use for side-effectful workflows (deploy, commit).
- `user-invocable: false` — hidden from the `/` menu; Claude-only background knowledge. Controls menu visibility only, not Skill-tool access.
- `allowed-tools` — tools pre-approved (no permission prompt) while the skill is active; does not restrict other tools. `disallowed-tools` — tools removed from the pool while active (clears on next user message).
- `context: fork` — run the skill in a forked subagent (SKILL.md content becomes the prompt); `agent: <type>` picks the subagent type (default `general-purpose`).
- `model` / `effort` — override for the turn; `argument-hint` / `arguments` — autocomplete hint and named positional args; `paths` — glob patterns gating auto-activation; `hooks` — hooks scoped to the skill's lifecycle.
- Substitutions available in the body: `$ARGUMENTS`, `$N`/`$ARGUMENTS[N]`, `$name`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_SESSION_ID}`; `` !`cmd` `` injects command output before Claude sees the content.

Skill-listing character budget: skill names are always listed, but descriptions share a budget of ~1% of the model's context window (least-invoked skills dropped first). `/doctor` reports shortened/dropped descriptions. Raise via the `skillListingBudgetFraction` setting (e.g. `0.02`) or `SLASH_COMMAND_TOOL_CHAR_BUDGET`; free budget by setting low-priority skills to `"name-only"` in `skillOverrides` (plugin skills are not affected by `skillOverrides` — manage via `/plugin`). Front-load the key use case: each entry's combined description+when_to_use caps at 1,536 chars regardless of budget.

Frontmatter template (from skill-development):
```yaml
---
name: skill-name
description: This skill should be used when the user asks to "specific phrase 1", "specific phrase 2", "specific phrase 3". Include exact phrases users would say that should trigger this skill. Be concrete and specific.
version: 0.1.0
---
```

Name/size limits: the official Agent Skills spec (docs.claude.com; enforced by the skill-creator packaging validator, referenced by this skill) requires `name` to be lowercase letters/numbers/hyphens, max 64 chars, **matching the skill directory name**, and `description` max 1024 chars. Note: plugin-dev's own SKILL.md files use title-case display names (`name: Skill Development`) — prefer the spec rule (name == directory, kebab-case) for new skills.

Description rules (the most critical field — determines triggering):
- Third person: `This skill should be used when the user asks to "X", "Y", "Z"...` — never "Use this skill when you..." or "Load when...".
- Include specific, quoted trigger phrases users would actually say; be concrete, not generic.
- skill-reviewer flags descriptions <50 chars or >500 chars.
- Good: `This skill should be used when the user asks to "create a hook", "add a PreToolUse hook", "validate tool use", or mentions hook events (PreToolUse, PostToolUse, Stop).`
- Bad: `Provides hook guidance.` (no triggers), `Use this skill when working with hooks.` (wrong person, vague).

Body writing style:
- Imperative/infinitive form, verb-first ("To create a hook, define the event type."), never second person ("You should...").
- Written for another Claude instance: include only what is beneficial and non-obvious to Claude.

Progressive disclosure — three loading levels:
1. Metadata (name + description): always in context (~100 words).
2. SKILL.md body: loaded when skill triggers — keep <5k words; target **1,500–2,000 words**; skill-reviewer wants 1,000–3,000; >5,000 = "strongly recommend splitting".
3. Bundled resources: loaded/executed as needed (effectively unlimited; scripts run without entering context).

Rules of thumb:
- No duplication: information lives in SKILL.md **or** references, not both; prefer references for detail.
- If a reference file is large (>10k words), include grep search patterns in SKILL.md.
- SKILL.md must explicitly list its references/examples/scripts (an "Additional Resources" section) or Claude won't know they exist.
- Plugin skills are distributed with the plugin — no ZIP packaging step (unlike generic skill-creator).

Creation process (6 steps): (1) gather concrete usage examples/trigger phrases from the user; (2) plan reusable contents by asking what scripts/references/assets each example needs repeatedly; (3) create the directory structure (only needed subdirs); (4) write resources first, then a lean SKILL.md; (5) validate (structure, frontmatter, triggers, style, progressive disclosure, referenced files exist, scripts executable) — use the skill-reviewer agent; (6) iterate after real use (strengthen triggers, move long sections to references/).

## 6. Command Authoring (command-development skill)

Commands are markdown files whose content becomes **instructions FOR Claude** when invoked — write directives to Claude ("Review this code for..."), never messages to the user ("This command will..."). Frontmatter is entirely optional; a bare prompt file is a valid command.

Locations: project `.claude/commands/` ("(project)" in /help), personal `~/.claude/commands/` ("(user)"), plugin `plugin-name/commands/` ("(plugin-name)").

Frontmatter fields (all optional):
| Field | Type | Default | Notes |
|---|---|---|---|
| `description` | string | first line of prompt | shown in `/help`; keep under ~60 chars; start with a verb |
| `allowed-tools` | string or array | inherits conversation | e.g. `Read, Write, Bash(git:*)`; use narrow Bash filters, not `Bash(*)`; pre-allow MCP tools by full name |
| `model` | string | inherits | `sonnet` \| `opus` \| `haiku` |
| `argument-hint` | string | none | e.g. `[pr-number] [priority] [assignee]`; square brackets per arg; powers autocomplete |
| `disable-model-invocation` | boolean | `false` | `true` = user-typed only; SlashCommand tool cannot invoke programmatically (use for destructive/approval commands) |

Dynamic features:
- `$ARGUMENTS` — all arguments as one string; `$1`, `$2`, ... — positional arguments.
- `@path/to/file` — inlines file content before Claude processes the command (`@$1` works); `@${CLAUDE_PLUGIN_ROOT}/templates/x.md` for plugin files.
- `` !`command` `` — executes bash inline to inject dynamic context (e.g. `` !`git diff --name-only` ``); requires the matching `allowed-tools` Bash permission; keep commands fast and non-destructive.

Organization: flat for 5–15 commands; subdirectories for 15+ (namespace shown in /help). Naming: verb-noun kebab-case (`review-pr`, `fix-issue`); avoid generic names (`test`, `run`); consider a plugin prefix to avoid collisions.

Commands vs skills vs agents: commands = user-initiated, explicit actions (`/deploy`); skills = auto-activating knowledge triggered by conversation context; agents = autonomous multi-step tasks Claude delegates to. Commands can orchestrate both: mention a skill name to trigger it, or instruct Claude to launch a plugin agent (via the Task tool) — the agent must exist in `plugin/agents/`.

Validate inputs early in the command body (argument validation, file-existence checks, plugin-resource checks with `` !`test -f ...` ``) and give corrective guidance on failure.

## 7. Agent Authoring (agent-development skill)

Agents are autonomous subprocesses for complex multi-step tasks. File: `agents/agent-name.md` = YAML frontmatter + markdown body (the body **is** the system prompt, written in second person: "You are...").

Frontmatter (per live docs, only `name` and `description` are required — `model` and `color` are optional):
| Field | Required | Format |
|---|---|---|
| `name` | yes | lowercase letters/numbers/hyphens; plugin-dev enforces **3–50 chars**, start/end alphanumeric, no underscores; filename need not match |
| `description` | yes | triggering conditions + `<example>` blocks; **10–5,000 chars** (best 200–1,000 with 2–4 examples) |
| `model` | no | `inherit` (default) \| `sonnet` \| `opus` \| `haiku` \| `fable` \| full model ID |
| `color` | no | `red` \| `blue` \| `green` \| `yellow` \| `purple` \| `orange` \| `pink` \| `cyan` (display color in task list/transcript) |
| `tools` | no | e.g. `Read, Grep, Glob`; omit = all tools; least privilege |
| `disallowedTools` | no | tools to deny, removed from inherited/specified list |
| `effort` | no | `low` \| `medium` \| `high` \| `xhigh` \| `max`; overrides session effort |
| `maxTurns` | no | max agentic turns before the subagent stops |
| `skills` | no | skills preloaded into the subagent's context at startup (full content, not just description) |
| `memory` | no | persistent memory scope: `user` \| `project` \| `local` |
| `background` | no | `true` = always run as a background task |
| `isolation` | no | `worktree` = run in a temporary git worktree |

Not supported for plugin-shipped agents (ignored for security): `hooks`, `mcpServers`, `permissionMode` (these work only in `.claude/agents/` / `~/.claude/agents/`).

Description format — begins `Use this agent when [conditions]. Examples:` followed by 2–4 blocks:
```
<example>
Context: [Situation that should trigger agent]
user: "[User message]"
assistant: "[Response before triggering]"
<commentary>
[Why agent should trigger]
</commentary>
assistant: "I'll use the [agent-name] agent to [what it does]."
</example>
```
Show both explicit (user asks) and proactive (after relevant events) triggering, different phrasings of the same intent, and when NOT to use the agent.

System prompt: **20–10,000 chars** (best 500–3,000). Standard structure: role/expertise → **Core Responsibilities** (numbered) → **Process** (step-by-step) → **Quality Standards** → **Output Format** → **Edge Cases**. Color conventions (plugin-dev): blue/cyan analysis-review, green generation/creation, yellow validation/caution, red security/critical, purple/pink transformation/creative (live docs list no `magenta`; valid set is in the table above).

When agents make sense: autonomous work (validation, generation, analysis) as opposed to user-initiated actions (commands). agent-creator's guidance: code-review agents should assume "recently written code," not the whole codebase, unless told otherwise. For vague requests ask clarifying questions; break very complex requirements into multiple agents.

## 8. Hooks (hook-development skill)

Five hook types:
- **Prompt-based** (LLM decides): `{"type": "prompt", "prompt": "...", "timeout": 30}` — `$ARGUMENTS` interpolates the hook input JSON; supported on most events (not SessionEnd, StopFailure, PostCompact, MessageDisplay, FileChanged, and a few other context-only events).
- **Command**: `{"type": "command", "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh"}` — for fast deterministic checks.
- **`http`** (POST the event JSON to a URL), **`mcp_tool`** (call a configured MCP tool; for a plugin's own server, `server` takes `plugin:<plugin-name>:<server-name>`), **`agent`** (agentic verifier with tools).

Format difference (important): plugin `hooks/hooks.json` uses a **wrapper**: `{"description": "optional", "hooks": {"PreToolUse": [...], ...}}`. User `.claude/settings.json` uses the **direct** format with events at top level.

```json
{
  "description": "Validation hooks for code quality",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/validate.sh", "timeout": 30 }
        ]
      }
    ]
  }
}
```

Core events (plugin-dev): `PreToolUse`, `PostToolUse`, `Stop`, `SubagentStop`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreCompact`, `Notification`. (The current marketplace schema enumerates many more newer events — PostToolUseFailure, SubagentStart, PermissionRequest, Setup, FileChanged, etc.)

Matchers: exact tool name (`"Write"`), alternation (`"Read|Write|Edit"`), wildcard (`"*"`), regex (`"mcp__.*__delete.*"`). Case-sensitive.

Input: JSON on stdin — common fields `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`; plus event-specific `tool_name`/`tool_input`/`tool_result`, `user_prompt`, `reason`. Prompt hooks can interpolate `$TOOL_INPUT`, `$TOOL_RESULT`, `$USER_PROMPT`.

Output: `{"continue": true, "suppressOutput": false, "systemMessage": "..."}`; PreToolUse adds `{"hookSpecificOutput": {"permissionDecision": "allow|deny|ask", "updatedInput": {...}}}`; Stop/SubagentStop use `{"decision": "approve|block", "reason": "..."}`. Exit codes: `0` success (stdout → transcript), `2` blocking error (stderr fed back to Claude), other = non-blocking error.

Behavior: all matching hooks run **in parallel** (independent, unordered, can't see each other's output; identical handlers deduplicated). Default timeouts: command/http/mcp_tool 600s, prompt 30s, agent 60s (UserPromptSubmit capped at 30s). Reload: editing plugin `hooks/` does NOT require a restart — run `/reload-plugins` to pick up changes to hooks/, .mcp.json, agents/, and output-styles/; direct hook edits in settings files are picked up automatically by the file watcher. Inspect with `/hooks`; debug with `claude --debug`. Security: validate stdin, quote all bash variables, deny path traversal (`..`) and sensitive files (`.env`), never log secrets.

## 9. MCP Integration (mcp-integration skill)

Config: `.mcp.json` at plugin root (recommended) or `mcpServers` in plugin.json. Server types:
- `stdio` (default when `command` present): `{"command": "npx", "args": [...], "env": {...}}` — local process, spawned/managed by Claude Code.
- `sse`: `{"type": "sse", "url": "https://..."}` — hosted servers; OAuth handled automatically (browser prompt on first use).
- `http`: `{"type": "http", "url": "https://...", "headers": {"Authorization": "Bearer ${API_TOKEN}"}}`.
- `ws`: `{"type": "ws", "url": "wss://...", "headers": {...}}`.

Env var expansion works throughout (`${CLAUDE_PLUGIN_ROOT}`, user env vars like `${API_KEY}`) — document required env vars in README; never hardcode tokens; always HTTPS/WSS.

Tool naming: `mcp__plugin_<plugin-name>_<server-name>__<tool-name>` (e.g. `mcp__plugin_asana_asana__asana_create_task`). Pre-allow specific tool names in command `allowed-tools`; avoid wildcards. Servers start when the plugin enables (connect lazily on first tool use); config changes are picked up by `/reload-plugins` (no restart); verify with `/mcp`.

## 10. Plugin Settings Pattern (plugin-settings skill)

Per-project, user-managed configuration in `.claude/plugin-name.local.md`: YAML frontmatter (structured settings) + markdown body (prompts/context). Read from hooks (sed/grep frontmatter parsing with quick `exit 0` if the file is absent or `enabled != true`), commands, and agents. Add `.claude/*.local.md` to `.gitignore`. Also used for "temporarily active hooks": a hook script exits 0 immediately unless a flag file or config setting enables it.

## 11. Validation Checklist (what plugin-validator checks)

plugin-validator (agent; tools Read/Grep/Glob/Bash; triggers on request and proactively after plugin creation/modification) validates:

1. **Plugin root**: `.claude-plugin/plugin.json` exists; note location (project vs marketplace).
2. **Manifest**: valid JSON; required `name` in kebab-case; if present — `version` is semver X.Y.Z, `description` non-empty, `author` structure valid, `mcpServers` configs valid; unknown fields → warn, don't fail.
3. **Directory structure**: standard locations (`commands/`, `agents/`, `skills/`, `hooks/hooks.json`); auto-discovery works.
4. **Commands** (`commands/**/*.md`): frontmatter present (starts `---`); `description` exists; `argument-hint` format; `allowed-tools` is array if present; markdown body exists; no naming conflicts.
5. **Agents** (`agents/**/*.md`): frontmatter has `name` + `description` (required per live docs; `model` and `color` are optional — require them only as house style, not as spec); name is lowercase-hyphens 3–50 chars; description includes `<example>` blocks; if present, model ∈ {inherit, sonnet, opus, haiku, fable, full model ID} and color ∈ {red, blue, green, yellow, purple, orange, pink, cyan}; system prompt substantial (>20 chars).
6. **Skills** (`skills/*/SKILL.md`): SKILL.md exists per skill dir; frontmatter has `name` + `description`; description concise and clear; referenced files (references/, examples/, scripts/) actually exist — no dangling references.
7. **Hooks** (`hooks/hooks.json`): valid JSON; valid event names; each entry has `matcher` + `hooks` array; hook type is `command` or `prompt`; commands reference existing scripts via `${CLAUDE_PLUGIN_ROOT}` (no leaked absolute paths).
8. **MCP**: valid JSON; stdio has `command`; sse/http/ws have `url`; `${CLAUDE_PLUGIN_ROOT}` used for portability.
9. **File organization**: README.md exists and is comprehensive; no junk (node_modules, .DS_Store); .gitignore where needed; LICENSE present.
10. **Security**: no hardcoded credentials anywhere; MCP uses HTTPS/WSS not HTTP/WS; hooks free of obvious security issues; no secrets in example files.

Report format: summary, Critical Issues / Warnings (each with file path, issue, fix), per-component counts, positive findings, prioritized recommendations, PASS/FAIL. Edge cases: manifest-only plugin is valid; empty dirs warn but don't fail; unknown manifest fields warn; corrupted files are skipped and reported.

skill-reviewer adds (skill quality): description 50–500 chars, third-person, specific trigger phrases; body 1,000–3,000 words in imperative form; progressive disclosure implemented; resources referenced from SKILL.md; severity-categorized findings.

Numeric limits summary:
- plugin name: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`; version semver; manifest paths `./`-relative, no `../`, no absolute.
- agent name 3–50 chars; agent description 10–5,000 chars; agent system prompt 20–10,000 chars.
- skill body <5k words (ideal 1,500–2,000); skill description ≤~500 chars per skill-reviewer; the official Agent Skills spec caps `name` at 64 chars and `description` at 1024 chars (soft limit to respect even where plugin-dev's checker doesn't enforce it).
- command description ~60 chars for /help display.

## 12. Distribution & Testing

Local development / testing:
- `claude plugin validate ./my-plugin` — the official CLI validator; checks plugin.json, skill/agent/command frontmatter, and hooks/hooks.json for syntax and schema errors. Unrecognized manifest fields are warnings (wrong types are errors); pass `--strict` to treat warnings as errors (use in CI and as the first validation gate). Also available in-session as `/plugin validate`.
- `claude --plugin-dir /path/to/plugin` (aliased `cc --plugin-dir ...` in plugin-dev docs) loads a plugin directly for testing; repeat the flag for multiple plugins. Run `/reload-plugins` after edits to pick up changes without restarting.
- Verification: skills load on trigger phrases; commands appear in `/help` and run (`/plugin-name:command-name`); agents trigger on example-like scenarios; hooks fire (`claude --debug`); MCP servers listed by `/mcp`.

Marketplace flow:
- A marketplace is a repo with `.claude-plugin/marketplace.json` listing plugin entries (schema in §3); plugins live in the same repo (relative `source`) or external git/npm sources.
- Install with the `/plugin` command: `/plugin install <plugin-name>@<marketplace-name>` (e.g. `/plugin install plugin-dev@claude-code-marketplace`), or configure in the project's `.claude/settings.json` so a team shares plugins (project scope) vs personal installs (user scope).
- Update: `/plugin update plugin-name` (referenced in plugin-dev's marketplace guidance). Bump `version` in plugin.json per semver on every release — MAJOR breaking, MINOR features, PATCH fixes; marketplace entries may pin `version`, git `ref`, or exact 40-hex `sha`.
- Publishing checklist (from plugin-dev): complete metadata in plugin.json, README (overview/installation/prerequisites/usage/env vars), LICENSE file, tested on clean install, validated manifest, marketplace entry with description/category/tags.

Marketplace-ready command/plugin qualities: cross-platform (detect platform, no macOS-only tools), dependency checks with install pointers, graceful degradation when optional tools are missing, no hardcoded paths, namespaced names to avoid collisions, deprecation warnings before removal, idempotent/atomic operations.

## 13. The /plugin-dev:create-plugin Workflow (8 phases)

Reference model for guided plugin creation: (1) **Discovery** — purpose, users, plugin type; (2) **Component planning** — which skills/commands/agents/hooks/MCP/settings, presented as a table for confirmation; (3) **Detailed design** — ask clarifying questions per component, wait for answers (critical, do not skip); (4) **Structure creation** — mkdir dirs + plugin.json + README + .gitignore; (5) **Implementation** — load the matching plugin-dev skill per component type; use agent-creator for agents; (6) **Validation** — plugin-validator + skill-reviewer + validate-agent.sh / validate-hook-schema.sh / test-hook.sh; (7) **Testing** — local `--plugin-dir` with the per-component verification checklist; (8) **Documentation** — README completeness, marketplace entry, summary. Explicit user confirmation gates after phases 1, 2, 3, 6, 7.

---

## Coverage Notes

Distilled from: plugin-dev README; SKILL.md of all 7 skills; all 3 agent definitions; the create-plugin command; references `manifest-reference.md`, `frontmatter-reference.md`, `marketplace-considerations.md`; the live `anthropics/claude-code/.claude-plugin/marketplace.json` and its JSON Schema. Not distilled (lower-value for this doc, available upstream): agent-development triggering/system-prompt references, hook patterns/migration/advanced references, MCP server-types/authentication/tool-usage references, plugin-settings parsing references, examples directories. The plugin-validator and skill-reviewer agent files upstream contain trailing artifact text (a stray closing code fence + conversational sentence) after the system prompt — quoted checklists above are from the structured body only.
