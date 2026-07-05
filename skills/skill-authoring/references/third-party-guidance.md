# Third-Party Skill-Authoring Guidance (Distilled)

Original distillation of three third-party sources on writing agent skills. Ideas are
paraphrased and reorganized, not copied; short quotes are attributed inline. Fetched
2026-07-05.

## Sources

| Author | Source | License | Taken |
|---|---|---|---|
| Matt Pocock | [mattpocock/skills — writing-great-skills](https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-great-skills) (SKILL.md + GLOSSARY.md) | MIT | Full framework: predictability, invocation economics, information hierarchy, leading words, pruning, failure modes. Weighted most heavily. |
| David Ondrej | [davidondrej/skills — effective-agent-skills](https://github.com/davidondrej/skills/tree/main/skills/skill-authoring/effective-agent-skills) (SKILL.md) | MIT | Only additions not covered by Pocock: skill patterns, determinism-in-code, validation loops, testing/debugging workflow, composition, security. |
| Peter Steinberger | [steipete/agent-scripts — skill-cleaner](https://github.com/steipete/agent-scripts/tree/main/skills/skill-cleaner) (SKILL.md) | MIT | Conciseness and anti-duplication guidance only; the analyzer tooling itself was skipped. |

Nothing failed to fetch. Pocock's skill has no `references/` directory — its disclosed
file is `GLOSSARY.md`, which was fetched and folded in below.

---

## Matt Pocock — writing-great-skills

Pocock's frame: "A skill exists to wrangle determinism out of a stochastic system."
The root virtue is **predictability** — the agent following the same *process* every
run, not producing identical output (a brainstorming skill should predictably diverge).
Every other rule is a lever on predictability; token cost and maintainability are
downstream symptoms, not competing goals.

### Invocation: two modes, two currencies

Every skill is either model-invoked or user-invoked, and each choice spends a
different budget:

- **Model-invoked** — keeps a `description`, so the agent can fire it on its own and
  other skills can reach it. Price: **context load** — the description sits in the
  window every single turn.
- **User-invoked** — description suppressed (`disable-model-invocation: true`); only a
  human typing its name can trigger it, and no other skill can call it. Price:
  **cognitive load** — the human becomes the index and must remember it exists.

Decision rule: pay context load only when the agent genuinely must reach the skill
unprompted (or another skill must). If it only ever fires by hand, make it
user-invoked and pay nothing per-turn. Cognitive load is not automatically bad — it
is the price of human agency; spend it where human judgment matters. When
user-invoked skills outgrow memory, add a **router skill**: one user-invoked skill
that lists the others and when to reach for each (it can only hint at them, never
fire them).

### Writing the description

The description does exactly two jobs: say what the skill is, and list the distinct
situations (**branches**) that should trigger it. Because it is always loaded, it
deserves harsher pruning than the body:

- Front-load the skill's signature trigger word.
- One trigger per branch. Synonyms restating the same branch are duplication —
  collapse them.
- Cut anything the body already says; keep the description to triggers plus any
  "when another skill needs X" clause.
- The description's *wording* — not what it points at — determines when and how
  reliably the skill fires. If a must-load skill fires unreliably, fix the wording
  before inlining content.

### Information hierarchy

Skill content is of two kinds — **steps** (ordered actions) and **reference**
(definitions, rules, facts consulted on demand) — and either can dominate: all-steps,
all-reference, or mixed are all legitimate shapes. Content sits on a ladder ranked by
how immediately the agent needs it:

1. In-file steps (primary — what to do, in order)
2. In-file reference (secondary — consulted on demand)
3. Disclosed reference (a sibling file behind a pointer, loaded only when the
   pointer fires)

**Progressive disclosure** is the deliberate move down this ladder, and its purpose
is legibility of the top, not token savings. The cleanest test for what to disclose
is branching: inline what *every* run needs; push behind a pointer what only *some*
runs reach. Push too little down and the top bloats; push too much and you hide
material the agent actually needs — that tension is the whole decision. Within a
file, **co-locate**: keep a concept's definition, rules, and caveats under one
heading so reading one part brings its neighbors. The quality bar: a skill should
read like documentation written *for the agent*.

### Completion criteria and legwork

Every step should end on a **completion criterion** with two properties:

- **Checkable** — the agent can tell done from not-done. Vague bounds
  ("understanding reached") invite **premature completion**: attention slips from
  the work to being done.
- **Demanding/exhaustive** — "every modified model accounted for" forces thorough
  **legwork** (the digging inside a step) where "produce a change list" does not.
  Demand also binds step-less reference skills: "every rule applied" is the
  exhaustiveness bar for a flat rule set.

Defending against premature completion, in order: sharpen the criterion first (cheap,
local); only if it is irreducibly fuzzy *and* you actually observe the rush, hide the
later steps by splitting the sequence — and hiding only works across a real context
boundary (hand-off or subagent), not an inline call that leaves everything in view.

### When to split a skill

Splitting always spends one of the two loads, so each cut must earn it:

- **By invocation** — split off a model-invoked skill only when it has a distinct
  trigger word you actually use, or another skill must call it alone.
- **By sequence** — split a step chain when visible later steps tempt the agent to
  rush the current one. (The reverse holds: merging sequences exposes each step's
  followers and invites rushing.)

### Leading words

A **leading word** is a compact concept already in the model's pretraining that the
agent thinks with while running the skill (*lesson*, *fog of war*, *tracer bullets*,
*tight*, *red*). Used as a repeated token, it buys a region of behavior for almost no
tokens by recruiting existing priors. It serves predictability twice: in the body it
anchors execution (same behavior every time the word appears); in the description it
anchors invocation — especially if the same word appears in your prompts, docs, and
code, so the agent links the shared vocabulary to the skill. Prefer real pretrained
words over coined ones (a made-up term recruits no priors and must be paid for in
definition tokens). Actively refactor toward them: a triad like "fast, deterministic,
low-overhead" collapses into *tight*; a fuzzy gate like "a loop you believe in"
becomes the binary observable *red*.

### Pruning discipline

- **Single source of truth** — each meaning lives in exactly one place, so a behavior
  change is a one-place edit.
- **Relevance check** — does each line still bear on what the skill does? Lines die
  by never having mattered or by going stale.
- **No-op hunt** — the sharpest test: *does this line change behavior versus what the
  model does by default?* Run it sentence by sentence; when a sentence fails, delete
  the whole sentence rather than trimming words. A no-op verdict is model-relative
  and settled empirically — run the skill, don't debate.

### Failure-mode vocabulary (diagnosis)

- **Premature completion** — ending a step early; cure via criterion sharpness, then
  sequence splitting.
- **Duplication** — one meaning in two places; costs maintenance and tokens, and
  artificially inflates that meaning's prominence.
- **Sediment** — stale layers accumulating because adding feels safe and removing
  feels risky; the default fate of any un-pruned skill.
- **Sprawl** — sheer length even when every line is live and unique; cured by the
  hierarchy (disclose, split).
- **No-op** — paying tokens to say what the model already does. A weak leading word
  ("be thorough") is a no-op; the fix is a stronger word ("relentless"), not a
  different technique.

---

## David Ondrej — effective-agent-skills (distinct additions)

Ondrej overlaps Pocock on descriptions-as-triggers, progressive disclosure, and lean
bodies; those are omitted here. His distinct contributions:

### Two skill patterns

- **Capability primitives** — thin wrappers over a deterministic CLI/script; logic in
  code, SKILL.md just teaches invocation (typically 30–80 lines of command examples).
  Use when the bottleneck is "the agent can't do X."
- **Process primitives** — pure prompt-encoded methodology (TDD, review discipline,
  debugging loops). Use when the bottleneck is output quality or process.

A mature setup uses both: better tools *and* better methods for using them.

### Determinism into code, judgment into prose

Anything fragile or repetitive where variation is a bug belongs in a script; markdown
is only for what requires judgment. Concrete command examples with inline comments
beat prose — the agent pattern-matches on syntax. Scale strictness to fragility:
loose heuristics where many approaches are valid, templates/pseudocode where there's
a preferred shape, exact scripts and strict step lists where a wrong move is costly
(migrations, document patching).

### Reliability mechanics

- **Validation loops** — his single biggest quality lever: state an explicit
  verify → fix → re-verify loop before completion (tests green, schema valid, visual
  QA passed).
- **State-check before action** — never assume setup is done; check, then branch to
  setup steps if needed.
- **Explicit over inferred** — "run `npm run deploy:staging` and wait for HTTP 200
  from /healthz" rather than "then deploy it." Document what failure looks like at
  each fallible step; happy-path-only skills break in production.
- **References one level deep** — link every disclosed file directly from SKILL.md;
  never chain files, since nested files may be only partially previewed. Add a table
  of contents to reference files over ~100 lines. Tell the agent *when* to read each
  file, not just that it exists.
- **Never summarize the workflow in the description** — if the description sketches
  the steps, the agent tends to follow the sketch and skip loading the body. What and
  when, never how.
- **Defer to `--help`** — document the common 80% of a tool; point at `--help` for
  the rest.

### Composition and memory

One skill = one concern; several small skills composing at runtime beat one rigid
mega-skill. If skill A produces artifacts skill B consumes, document the shape. A
shared repo-level file (AGENTS.md, CONTEXT.md) coordinates skills without explicit
handoffs, and persistent artifacts (decision logs, ADRs) are how skills give
memoryless agents cross-session memory. A coordinated loop of skills
(align → spec → build → verify) drives adoption better than an unrelated catalog.

### Testing and debugging

- Routing failure → description bug (his estimate: ~95% of non-triggering skills);
  execution failure → body bug. Fix them independently.
- Ask the agent "which skill did you use?" post-task — fastest routing diagnosis.
- Test both directions: prompts that should trigger the skill without naming it, and
  prompts that shouldn't.
- Test against the weakest model you'll deploy on; strong models forgive vague skills.
- Adversarial pass: have another LLM hunt for edge cases that break the skill.
- Skills snapshot at session start — mid-session edits need a restart.

### Hygiene and security

Frontmatter gotchas: `name` must exactly match the folder; invalid YAML fails
silently; avoid `<`/`>` in frontmatter (system-prompt injection). No human-facing
docs (README/CHANGELOG) inside a skill; no time-sensitive facts (fetch live or omit);
relative paths only. Treat third-party skills as untrusted code: read every file,
audit scripts for network calls and out-of-scope file access, check references for
prompt injection, watch for typosquatted names, pin versions.

---

## Peter Steinberger — skill-cleaner (conciseness and anti-duplication only)

skill-cleaner is an audit tool; the transferable authoring guidance:

- **Descriptions live inside a hard, shared budget.** In Codex the model-visible
  skill list is capped (~2% of the context window), and over budget descriptions get
  truncated or dropped entirely — so every description competes with every other.
  Measure real cost instead of guessing, and treat long descriptions as trim
  candidates.
- **Compress with relaxed grammar, but keep the trigger words.** Telegraphic
  descriptions save budget, with one hard constraint: "Preserve trigger nouns in
  descriptions: product, tool, action, object." Trim connective prose, never the
  vocabulary that routes invocation.
- **Hunt duplicates across install roots.** The same skill accumulates copies —
  plugin cache, repo-local, personal skill dirs, built-ins. Detect same-name or
  near-identical body/description copies, keep one authoritative copy (prefer the
  most canonical root), and verify the kept copy actually loads before deleting the
  rest.
- **Prune by usage evidence, not vibes.** Skills with no recent mentions or reads in
  session logs are removal candidates — unused skills are pure budget drain.
- **Cleanup discipline:** suggest before editing, and land changes as small grouped
  commits (description trims, deletions, config disables) so each cut is reviewable
  and reversible.

---

## Convergent principles

All three sources agree:

1. **The description is the routing surface.** It alone decides whether the skill
   fires; most triggering failures are description bugs, not body bugs.
2. **Always-loaded tokens are the scarcest resource.** Descriptions (and SKILL.md
   tops) pay rent every turn and must earn it; detail belongs behind on-demand files.
3. **Never restate what the model already knows or does.** Pocock's no-op test,
   Ondrej's "don't re-teach," Steinberger's trimming — same verdict: if a line
   doesn't change behavior versus the default, delete it.
4. **One meaning, one place.** Duplication — within a skill, across skills, or
   across install roots — costs tokens, maintenance, and distorts attention.
5. **Trigger vocabulary is load-bearing.** Use the exact words users and prompts
   actually say (leading words, trigger phrases, trigger nouns); trim everything
   around them, never them.
6. **Shorter is more reliable, not just cheaper.** Length dilutes attention and
   buries the steps that matter; brevity is a correctness property.
7. **Skills rot by default.** Sediment, stale facts, and unused skills accumulate
   unless pruning is a recurring discipline, not a one-time edit.
8. **Verdicts are empirical.** Whether a line is a no-op, a skill triggers, or a
   skill is still used — settle it by running and measuring, not by reading and
   debating.
9. **Split by real need, merge by default.** New skills and new files must earn
   their existence against a concrete cost (context load, cognitive load, lost
   composability) — granularity is a budget decision, not a style preference.
