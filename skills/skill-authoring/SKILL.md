---
name: skill-authoring
description: This skill must be used whenever writing, revising, or reviewing a skill, command, or agent for a team plugin — it is the Auto-FDE authoring doctrine. Use it when building catalog skills, verifying a built skill, fixing review findings, optimizing a description, or when the user asks how to write good skills, descriptions, or evals, even if they don't say "doctrine".
---

# Skill authoring doctrine

The compass for every skill Auto-FDE builds. A skill exists to make a
stochastic system predictable: same *process* every run. Every rule below is
a lever on predictability. Where these rules and your instincts disagree,
the rules win; where two rules collide, prefer the one that deletes tokens.

## Non-negotiables (structure)

- Directory and frontmatter `name` are the same kebab-case string. The file
  is exactly `SKILL.md`. No "claude"/"anthropic" in names.
- `description` under 1024 characters, containing both what the skill does
  and when to use it. No `<` or `>` anywhere in frontmatter.
- Body under 500 lines. No README.md inside a skill — depth goes in
  `references/` (linked one level deep only, each link saying *when* to read
  it), deterministic work in `scripts/`, output materials in `assets/`.
- Compose, don't duplicate: if a sibling skill owns a job, point to it.

## The description is the routing surface

Claude picks skills from name + description alone, and only reaches for a
skill when the task isn't trivially handleable — so descriptions must earn
attention against every other installed skill:

- Shape: what it does + when to use it + key capabilities, in third person,
  front-loading the signature trigger word. ~100–200 words.
- Use the words the team actually says (their artifact names, tools, verbs).
  Trigger vocabulary is load-bearing — trim around it, never trim it.
- Claude undertriggers by default: be a little pushy, enumerate adjacent
  phrasings, add "even if they don't explicitly ask for X".
- Add negative triggers when a sibling skill could collide ("not for X —
  that is the launch-brief skill"). Never put angle brackets in the
  wording; frontmatter forbids them.
- One trigger per distinct branch; synonyms restating a branch are
  duplication. Never sketch the workflow steps in the description — the
  agent will follow the sketch and skip the body.

## The body is documentation written for the agent

- Imperative voice. Explain *why* a rule matters instead of shouting
  ALL-CAPS MUSTs — rigid caps are a yellow flag, reasons generalize.
- Every step ends on a completion criterion that is **checkable** (done vs
  not-done is decidable) and **demanding** ("every field accounted for", not
  "produce a list"). Vague endpoints cause premature completion.
- End fallible work with a validation loop: verify → fix → re-verify, with
  the concrete check named (schema valid, render clean, file resolves).
- Check state before acting; never assume setup happened. Say what failure
  looks like at each fallible step.
- Determinism belongs in code: if variation is a bug, bundle a script and
  teach its invocation; prose is for judgment. Concrete commands with
  comments beat paragraphs.
- Inline what every run needs; push behind a reference pointer what only
  some runs reach (that branching test is the whole progressive-disclosure
  decision). Co-locate a concept's rules and caveats under one heading.
- Include input/output examples; define output formats as explicit
  templates, not descriptions of formats.

## Conciseness is a correctness property

- Run the no-op test sentence by sentence: does this line change behavior
  versus what the model already does? If not, delete the sentence.
- One meaning, one place — within the skill, across the plugin (shared
  doctrine lives in one referenced file, never pasted per skill).
- Length dilutes attention. When trimming, delete whole sentences rather
  than compressing wording, and keep the trigger nouns.

## Team fidelity (Auto-FDE engagements)

Skills built for a team are only as good as their fidelity to that team:

- Verbatim artifacts (field lists, section headings, column names, canonical
  labels, boilerplate) are reproduced character-for-character from the
  digests and cited sources. When prose and a real template disagree, the
  template wins.
- Bundled templates get wired, never described: instruct copying/filling the
  real file via `${CLAUDE_PLUGIN_ROOT}/templates/...` paths, and confirm the
  path resolves.
- Record the team's process as it is — warts, exceptions, house vocabulary.
  Do not improve their process unless the catalog note says to.
- Never invent a team fact. A gap becomes an open question in your return
  payload, not a plausible guess. No absolute machine paths, no stale
  contact names, no confidential client material in skill content.

## Every skill ships with evals

Author all four artifacts with the skill, formats in
[references/eval-formats.md](references/eval-formats.md). (The last two are
for team-plugin skills, whose outputs are checkable artifacts; skills whose
outputs are judgment over live engagement state — like Auto-FDE's own —
ship the first two.)

- `evals/trigger-evals.json` — realistic queries, positives across phrasings
  plus near-miss negatives that share keywords but belong elsewhere. Toy
  queries test nothing.
- `evals/evals.json` — 2–3 real task prompts with discriminating, binary,
  objectively checkable expectations. An assertion that would pass on a
  wrong output is worse than none. Skip assertions for genuinely subjective
  qualities; those get human review. Entries that need a live connection
  carry a `"gated"` field naming the need — a gated eval beats a mock that
  passes vacuously.
- `evals/checks.json` — deterministic graders compiled from the ground truth
  and the catalog's success criteria: verbatim headings and field lists
  become `contains-all` checks, bundled template paths become
  `path-resolves`. Use the `judge` kind only where code genuinely can't
  decide.
- `evals/reference/<evalId>.md` — one reference solution per output eval
  that passes every check. It proves the eval solvable and calibrates the
  grader.

## Go deeper

- [references/anthropic-skill-creator.md](references/anthropic-skill-creator.md)
  — read when running or designing evals (exact JSON schemas, TP/FN/TN/FP
  mechanics, anti-overfitting loop, benchmarking), or bootstrapping a skill
  from transcripts.
- [references/anthropic-plugin-dev.md](references/anthropic-plugin-dev.md)
  — read when touching plugin structure: manifests, command/agent
  frontmatter and limits, hooks, MCP, marketplace, validator checklist.
- [references/third-party-guidance.md](references/third-party-guidance.md)
  — read when pruning or restructuring an existing skill (no-op hunting,
  splitting/merging, leading words, failure-mode vocabulary) and for the
  full reasoning behind this doctrine.
