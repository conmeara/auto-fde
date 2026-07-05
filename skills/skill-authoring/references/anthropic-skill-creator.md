# Distilled: Anthropic's skill-creator + skill-building guidance

Ground-truth reference for the Auto-FDE build pipeline (especially the eval phase). Distilled from
Anthropic's `skill-creator` skill (anthropics/skills repo, fetched 2026-07-05), "The Complete Guide to
Building Skills for Claude" (PDF, Jan 2026 edition), and the engineering blog post "Equipping agents
for the real world with Agent Skills" (Oct 2025). Direct quotes are from those sources; JSON schemas
and script parameters are copied verbatim from the repo. Links in Sources at the bottom.

---

## 1. What a skill is; anatomy

A skill is a directory containing a `SKILL.md` file (YAML frontmatter + Markdown instructions), plus
optional bundled resources:

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic/repetitive tasks
    ├── references/ - Docs loaded into context as needed
    └── assets/     - Files used in output (templates, icons, fonts)
```

Hard rules (from the guide):
- File must be exactly `SKILL.md` (case-sensitive); folder name kebab-case, no spaces/underscores/capitals.
- `name`: kebab-case, should match folder name. Names containing "claude" or "anthropic" are reserved/forbidden.
- `description`: required, under 1024 characters, must include BOTH what the skill does AND when to use it.
- No XML angle brackets (`<` `>`) anywhere in frontmatter (it lands in the system prompt; injection risk).
- No README.md inside the skill folder — all docs go in SKILL.md or `references/`.
- Optional frontmatter: `license`, `compatibility` (1-500 chars, environment requirements),
  `allowed-tools`, free-form `metadata:` (author, version, mcp-server, etc.).

Design principles: **composability** (skills load alongside other skills; don't assume exclusivity)
and **portability** (same skill works on Claude.ai, Claude Code, and API).

## 2. Progressive disclosure doctrine

Three-level loading system; this is "the core design principle that makes Agent Skills flexible and scalable":

1. **Metadata (name + description)** — always loaded into the system prompt for every installed skill
   (~100 words). This is all Claude sees when deciding whether to use the skill.
2. **SKILL.md body** — loaded only when the skill triggers. Target **<500 lines** (skill-creator) /
   **under 5,000 words** (guide's troubleshooting chapter).
3. **Bundled resources** — read on demand; "effectively unbounded" because agents with a filesystem
   read them only as needed. Scripts can be *executed without ever being loaded into context*.

Placement rules:
- SKILL.md body: core workflow instructions only. "Keep SKILL.md focused on core instructions. Move
  detailed documentation to `references/` and link to it."
- If approaching the 500-line limit, "add an additional layer of hierarchy along with clear pointers
  about where the model using the skill should go next."
- Reference files: state clearly *when* to read each one. For reference files >300 lines, include a
  table of contents.
- Multi-domain skills: organize by variant (e.g., `references/aws.md`, `references/gcp.md`) so Claude
  reads only the relevant file. "If certain contexts are mutually exclusive or rarely used together,
  keeping the paths separate will reduce the token usage." (blog)
- Scripts: use for deterministic/repetitive work. "Code is deterministic; language interpretation isn't."
  Make it clear whether Claude should *run* a script or *read* it as reference (blog).
- Assets: templates/fonts/icons consumed by the output, never loaded as instructions.

## 3. The skill authoring loop

The skill-creator's core loop, verbatim in outline:

> - Decide what you want the skill to do and roughly how it should do it
> - Write a draft of the skill
> - Create a few test prompts and run claude-with-access-to-the-skill on them
> - Help the user evaluate the results both qualitatively and quantitatively
> - Rewrite the skill based on feedback ... Repeat until you're satisfied
> - Expand the test set and try again at larger scale

### Bootstrapping from examples of the work
- **Capture intent from existing transcripts**: if a conversation already contains the workflow
  ("turn this into a skill"), extract the tools used, the sequence of steps, corrections the user
  made, and observed input/output formats — then have the user fill gaps and confirm.
- **Iterate on a single task first** (guide, "Pro Tip"): "the most effective skill creators iterate on
  a single challenging task until Claude succeeds, then extract the winning approach into a skill."
  Then expand to multiple test cases for coverage.
- **Start with evaluation** (blog): "Identify specific gaps in your agents' capabilities by running
  them on representative tasks and observing where they struggle... Then build skills incrementally
  to address these shortcomings."
- **Iterate with Claude** (blog): ask Claude to capture its successful approaches and common mistakes
  into the skill; if it goes off track, ask it to self-reflect on what went wrong. "This process will
  help you discover what context Claude actually needs, instead of trying to anticipate it upfront."
- Interview before drafting: edge cases, input/output formats, example files, success criteria,
  dependencies. Four intake questions: what should it enable, when should it trigger, expected output
  format, and whether test cases make sense (objectively verifiable outputs → yes; subjective outputs
  like writing style → often no).

### Test-run mechanics (skill-creator workspace convention)
- Test cases: 2-3 realistic prompts, saved to `evals/evals.json` (prompts first, assertions drafted
  later while runs execute).
- Results live in `<skill-name>-workspace/` sibling to the skill dir, organized as
  `iteration-N/eval-<ID>/{with_skill,without_skill}/outputs/`.
- **Every eval runs twice, spawned in the same turn**: once with the skill, once as baseline
  (no skill for a new skill; a snapshot of the old version when improving an existing skill).
- Capture `total_tokens` and `duration_ms` from each subagent completion into `timing.json`
  immediately — "this is the only opportunity to capture this data."
- Grade with a grader agent → `grading.json`; aggregate → `benchmark.json`; run an analyst pass;
  show the human a review UI (outputs + benchmark); collect `feedback.json`; improve; rerun into
  `iteration-N+1/`. Human review comes BEFORE self-directed revision.
- Stop when: the user is happy, the feedback is all empty, or you're not making meaningful progress.

### Improvement heuristics (skill-creator, "How to think about improvements")
1. **Generalize from the feedback** — the skill will run across millions of prompts; don't ship
   "fiddly overfitty changes, or oppressively constrictive MUSTs" that only fix the few test examples.
2. **Keep the prompt lean** — remove things not pulling their weight; read the *transcripts*, not just
   outputs, and delete skill parts that cause wasted work.
3. **Explain the why** — "If you find yourself writing ALWAYS or NEVER in all caps, or using super
   rigid structures, that's a yellow flag"; reframe with reasoning instead.
4. **Look for repeated work across test cases** — if every test run independently wrote the same
   helper script, bundle that script in `scripts/` and point the skill at it.

Writing style: imperative form; explain importance "in lieu of heavy-handed musty MUSTs"; include
input/output examples; define output formats as explicit templates.

## 4. Description optimization

The description is "the primary triggering mechanism." All "when to use" information goes in the
description, not the body.

### What to include
- Structure: `[What it does] + [When to use it] + [Key capabilities]`.
- Specific trigger phrases users would actually say; relevant file types/extensions; concrete verbs.
- Phrase in the imperative ("Use this skill for..." not "this skill does...").
- Focus on the user's *intent* — what they're trying to achieve — not implementation details.
- "The description competes with other skills for Claude's attention — make it distinctive and
  immediately recognizable."
- Claude currently tends to **undertrigger**, so make descriptions "a little bit pushy" — enumerate
  adjacent phrasings and add "even if they don't explicitly ask for X."
- Length: ~100-200 words target; **hard limit 1024 characters** (truncated beyond that). Remember the
  description is injected into every conversation for every installed skill — space is shared.
- Negative triggers to fix overtriggering: "Do NOT use for simple data exploration (use data-viz
  skill instead)" / "Use specifically for online payment workflows, not for general financial queries."

### What kills triggering
Bad description examples from the guide: "Helps with projects." (too vague); "Creates sophisticated
multi-page documentation systems." (missing triggers); "Implements the Project entity model with
hierarchical relationships." (too technical, no user language). Debugging trick: ask Claude "When
would you use the [skill name] skill?" — it quotes the description back; adjust based on what's missing.

### How triggering actually works (skill-creator)
Skills appear in Claude's `available_skills` list as name + description; Claude decides from that
alone. Key mechanic: **"Claude only consults skills for tasks it can't easily handle on its own"** —
simple one-step queries ("read this PDF") may not trigger even with a perfect description match.
Complex, multi-step, or specialized queries trigger reliably. Consequence: trigger-eval queries must
be substantive enough that consulting a skill would actually help.

## 5. Trigger evals: measuring triggering accuracy

This is skill-creator's most concrete eval methodology (scripts: `run_eval.py`, `run_loop.py`,
`improve_description.py`).

### Eval set format
~20 queries, mixed positive/negative, as JSON:

```json
[
  {"query": "the user prompt", "should_trigger": true},
  {"query": "another prompt", "should_trigger": false}
]
```

### Query design rules
- Queries must be **realistic** — concrete and specific: file paths, personal/job context, column
  names, company names, URLs, backstory; some lowercase, abbreviations, typos, casual speech; mixed
  lengths; focus on edge cases over clear-cut cases.
  - Bad: `"Format this data"`, `"Extract text from PDF"`, `"Create a chart"`
  - Good: `"ok so my boss just sent me this xlsx file (its in my downloads, called something like
    'Q4 sales final FINAL v2.xlsx') and she wants me to add a column that shows the profit margin as
    a percentage. The revenue is in column C and costs are in column D i think"`
- **Should-trigger (8-10)**: coverage across phrasings (formal + casual), cases that don't name the
  skill or file type but clearly need it, uncommon use cases, cases where the skill competes with
  another skill but should win.
- **Should-not-trigger (8-10)**: the valuable ones are **near-misses** — shared keywords/concepts but
  a different actual need; adjacent domains; ambiguous phrasing where naive keyword matching would
  fire. "Don't make should-not-trigger queries obviously irrelevant. 'Write a fibonacci function' as
  a negative test for a PDF skill is too easy — it doesn't test anything."
- Human sign-off on the eval set before optimizing: "bad eval queries lead to bad descriptions."

### Measurement mechanics (run_eval.py)
- For each query, the harness registers the skill's name+description so it appears in the model's
  available-skills surface, then runs `claude -p "<query>"` and watches the event stream: the query
  counts as **triggered** if the model invokes the Skill tool (or Reads the skill file) for that
  skill; any other first tool call counts as not triggered.
- **Each query runs 3 times** (`--runs-per-query 3`, default) to get a per-query trigger rate;
  triggering is stochastic, so single runs are unreliable.
- A query **passes** if: `should_trigger` and trigger_rate ≥ 0.5, or `not should_trigger` and
  trigger_rate < 0.5 (`--trigger-threshold 0.5`, default).
- Run with the same model that powers the target sessions, so the test matches user experience.
- Defaults: 10 parallel workers, 30s timeout per query.

### Scoring: TP/FN/TN/FP
Per-run confusion-matrix scoring (as computed in `run_loop.py`):
- TP = triggers on should-trigger runs; FN = non-triggers on should-trigger runs
- FP = triggers on should-not-trigger runs; TN = non-triggers on should-not-trigger runs
- precision = TP/(TP+FP); recall = TP/(TP+FN); accuracy = (TP+TN)/total

### Optimization loop (run_loop.py) — anti-overfitting design
1. Split the eval set **60% train / 40% held-out test** (`--holdout 0.4`), stratified by
   `should_trigger`, fixed seed.
2. Evaluate the current description on train + test (3 runs/query).
3. If any train queries fail, call Claude (`improve_description.py`) with: current description, the
   failed-to-trigger and false-trigger lists with trigger rates, all previous attempts + their train
   scores ("do NOT repeat these — try something structurally different"), and the full SKILL.md body
   for context. **Test scores are stripped from the history the improver sees** (blinded), so it can
   only optimize against train.
4. The improver prompt explicitly forbids "an ever-expanding list of specific queries" — it must
   generalize failures to broader categories of intent, stay ~100-200 words, hard-cap 1024 chars
   (with an automatic shorten-rewrite pass if exceeded).
5. Iterate up to `--max-iterations 5`; stop early if all train queries pass.
6. **`best_description` is selected by TEST score, not train score** — "to avoid overfitting."

### Under/over-triggering signals in production (guide)
- Undertriggering: skill doesn't load when it should; users manually enable it; support questions
  about when to use it. Fix: add detail/nuance/keywords (especially technical terms) to the description.
- Overtriggering: loads for irrelevant queries; users disable it; confusion about purpose.
  Fix: negative triggers, more specificity, clarified scope.

## 6. Output evals: pass criteria and formats

### evals.json (per-skill, at `evals/evals.json`)
```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's example prompt",
      "expected_output": "Description of expected result",
      "files": ["evals/files/sample1.pdf"],
      "expectations": ["The output includes X", "The skill used script Y"]
    }
  ]
}
```

### Assertion design
- Assertions ("expectations") are **objectively verifiable statements** with descriptive names that
  read clearly in a results viewer.
- Don't force assertions onto subjective skills (writing style, design quality) — those get
  qualitative human review instead.
- A good assertion is **discriminating**: "it passes when the skill genuinely succeeds and fails when
  it doesn't." Assertions that pass for clearly-wrong outputs (filename exists but content is wrong)
  are called out as worse than useless — "a passing grade on a weak assertion... creates false confidence."
- For programmatically checkable assertions, write and run a script rather than eyeballing —
  "scripts are faster, more reliable, and can be reused across iterations."

### Grading rules (agents/grader.md)
- Verdicts are binary. "No partial credit: Each expectation is pass or fail, not partial."
- PASS requires: clear cited evidence AND "the evidence reflects genuine task completion, not just
  surface-level compliance."
- FAIL when: no evidence; evidence contradicts; unverifiable from available info; evidence is
  superficial; or the output meets the assertion "by coincidence rather than by actually doing the work."
- **"When uncertain: The burden of proof to pass is on the expectation."**
- Grader must inspect actual output files, not trust the transcript's claims about them.
- Beyond predefined assertions, the grader extracts and verifies implicit **claims** from the output
  (factual / process / quality) and flags unverifiable ones — catches issues assertions miss.
- The grader also critiques the eval set itself (`eval_feedback`): assertions that would pass on
  wrong outputs, important observed outcomes no assertion covers, assertions that can't be verified.
  "Keep the bar high" — only flag things the eval author would call a good catch.

### grading.json (per run; field names are load-bearing for the viewer)
```json
{
  "expectations": [
    {"text": "...", "passed": true, "evidence": "..."}
  ],
  "summary": {"passed": 2, "failed": 1, "total": 3, "pass_rate": 0.67},
  "execution_metrics": {"tool_calls": {"Read": 5}, "total_tool_calls": 15,
    "total_steps": 6, "errors_encountered": 0, "output_chars": 12450, "transcript_chars": 3200},
  "timing": {"executor_duration_seconds": 165.0, "grader_duration_seconds": 26.0,
    "total_duration_seconds": 191.0},
  "claims": [{"claim": "...", "type": "factual", "verified": true, "evidence": "..."}],
  "user_notes_summary": {"uncertainties": [], "needs_review": [], "workarounds": []},
  "eval_feedback": {"suggestions": [{"assertion": "...", "reason": "..."}], "overall": "..."}
}
```
Expectations must use exactly `text` / `passed` / `evidence` (not `name`/`met`/`details`).
Companion files: `metrics.json` from the executor (tool-call counts, files_created, errors,
output_chars) and `timing.json` (total_tokens, duration_ms — captured at subagent completion or lost).

## 7. Benchmarking, variance, and performance measurement

### Benchmark structure
- Two configurations per eval: `"with_skill"` and `"without_skill"` (exact strings — the viewer keys
  on them). Baseline = no skill for new skills, or the pre-edit snapshot when improving.
- **3 runs per configuration** (`runs_per_configuration: 3`) to measure variance.
- Metrics per run: assertion `pass_rate`, `time_seconds`, `tokens`, `tool_calls`, `errors`.
- Aggregation (`aggregate_benchmark.py`): per-configuration **mean, stddev (sample, n-1), min, max**
  for pass_rate / time_seconds / tokens, plus a **delta** row (with_skill mean − baseline mean),
  rendered as e.g. `85% ± 5%` vs `35% ± 8%`, delta `+0.50`.

### benchmark.json (abridged; see references/schemas.md in the repo for full schema)
```json
{
  "metadata": {"skill_name": "...", "executor_model": "...", "evals_run": [1,2,3],
    "runs_per_configuration": 3},
  "runs": [{"eval_id": 1, "eval_name": "...", "configuration": "with_skill", "run_number": 1,
    "result": {"pass_rate": 0.85, "passed": 6, "failed": 1, "total": 7,
      "time_seconds": 42.5, "tokens": 3800, "tool_calls": 18, "errors": 0},
    "expectations": [{"text": "...", "passed": true, "evidence": "..."}], "notes": []}],
  "run_summary": {
    "with_skill":    {"pass_rate": {"mean": 0.85, "stddev": 0.05, "min": 0.80, "max": 0.90},
                      "time_seconds": {"mean": 45.0, "stddev": 12.0}, "tokens": {"mean": 3800, "stddev": 400}},
    "without_skill": {"pass_rate": {"mean": 0.35, "stddev": 0.08}, "time_seconds": {"mean": 32.0},
                      "tokens": {"mean": 2100}},
    "delta": {"pass_rate": "+0.50", "time_seconds": "+13.0", "tokens": "+1700"}
  },
  "notes": ["freeform analyzer observations"]
}
```

### Analyst pass (agents/analyzer.md, "Analyzing Benchmark Results")
Purpose: surface patterns aggregates hide; observations only, no improvement suggestions, no
subjective quality judgments, no speculation without evidence. Per-assertion patterns to check:
- Always passes in both configs → non-discriminating, "may not differentiate skill value"
- Always fails in both configs → broken assertion or beyond model capability
- Passes with skill, fails without → skill clearly adds value here
- Fails with skill, passes without → **skill may be hurting**
- Highly variable → flaky expectation or non-deterministic behavior

Plus cross-eval patterns (which evals are consistently hard; high-variance vs stable evals) and
resource patterns (does the skill add time/tokens; outlier runs skewing aggregates). Example notes:
"Eval 3 shows high variance (50% ± 40%) - may be flaky or model-dependent"; "Skill adds 13s average
execution time but improves pass rate by 50%".

### Blind A/B comparison (optional, higher rigor)
For "is the new version actually better?": give two outputs to an independent agent **without saying
which is which**; it picks a winner and scores a rubric (content: correctness/completeness/accuracy;
structure: organization/formatting/usability; 1-5 each → `comparison.json`). A post-hoc analyzer then
un-blinds, reads both skills and both transcripts, scores instruction-following 1-10, identifies
winner strengths / loser weaknesses, and emits prioritized improvement suggestions
(`analysis.json`; categories: instructions / tools / examples / error_handling / structure /
references; priority high = would likely have changed the outcome). Version progression across
iterations is tracked in `history.json` (per version: parent, expectation_pass_rate,
grading_result of baseline/won/lost/tie, is_current_best).

### Success-criteria targets (guide; "aspirational targets — rough benchmarks")
- Skill triggers on **90% of relevant queries** (measure: 10-20 test queries, track auto-load rate).
- Completes workflow in X tool calls (measure: same task with/without skill; count tool calls + tokens).
- 0 failed API calls per workflow (measure: MCP logs, retry rates).
- Qualitative: no prompting about next steps needed; workflows complete without user correction;
  consistent results across sessions (run the same request 3-5 times, compare structural consistency).
- Illustrative with/without comparison from the guide: without skill — 15 back-and-forth messages,
  3 failed API calls, 12,000 tokens; with skill — automatic execution, 2 clarifying questions,
  0 failed calls, 6,000 tokens.

## 8. Anti-patterns Anthropic calls out

Triggering:
- Vague/generic descriptions ("Helps with projects"), descriptions missing trigger phrases, or
  written in implementation-speak instead of user language.
- "When to use" info placed in the body instead of the description (body isn't loaded at decision time).
- Trigger evals made of toy queries — too-short positives, obviously-irrelevant negatives.

Content/structure:
- Over-long SKILL.md bodies (>500 lines / >5k words) instead of splitting into references;
  "all content loaded instead of progressive disclosure" degrades speed and response quality.
- Instructions too verbose or critical instructions buried mid-document (put them at top; use
  headers; repeat key points if needed).
- Ambiguous language ("Make sure to validate things properly") vs. explicit checklists; for critical
  validations, bundle a script instead of prose.
- ALL-CAPS ALWAYS/NEVER and rigid structures as a substitute for explaining why (yellow flag).
- Overfitting the skill to the handful of iteration examples; ever-growing lists of specific cases
  in the description.
- Duplicated context: letting every invocation re-derive the same helper script instead of bundling
  it once in `scripts/`; keeping content in SKILL.md that belongs in a rarely-needed reference.
- Dead weight: instructions that cause wasted/unproductive transcript activity.
- Too many skills enabled at once (evaluate if >20-50 enabled simultaneously).

Process:
- Writing assertions for inherently subjective outputs.
- Trusting single runs (no variance data) or judging by train-set performance.
- Skipping human review of outputs before self-directed revision.
- Weak assertions that create false confidence; assertions nobody can verify from the outputs.

Format/packaging: wrong SKILL.md casing, non-kebab-case names, README.md inside the skill folder,
XML tags in frontmatter, >1024-char descriptions.

## 9. Sources

- skill-creator skill (SKILL.md, references/schemas.md, agents/{grader,analyzer,comparator}.md,
  scripts/{run_eval,run_loop,improve_description,aggregate_benchmark,generate_report,quick_validate,
  package_skill}.py, eval-viewer/): https://github.com/anthropics/skills/tree/main/skills/skill-creator
  - Raw SKILL.md: https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md
- The Complete Guide to Building Skills for Claude (PDF, 33 pp., Jan 2026):
  https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf
- Engineering blog — Equipping agents for the real world with Agent Skills (Oct 16, 2025):
  https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- Related (linked from the above, not distilled here): skills docs best-practices, Agent Skills open
  standard announcement, anthropics/skills examples repo.
