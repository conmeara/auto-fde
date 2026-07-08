# Distilled: Anthropic — Demystifying evals for AI agents

Distilled from the Anthropic engineering post "Demystifying evals for AI
agents" (Mikaela Grace, Jeremy Hadfield, Rodrigo Olivares, Jiri De Jonghe;
2026-01-09). Ideas are paraphrased and reorganized; short quotes are
attributed inline. Fetched 2026-07-08. Link in Sources at the bottom.

Relevance to Auto-FDE: the deepest first-party treatment of *agent* eval
design (multi-turn, harness-in-the-loop) — the exact regime the eval phase
runs in. It supplies the vocabulary (trial, grader, transcript, harness,
suite), the variance math (pass@k / pass^k), and the grader/pitfall taxonomy
behind this pipeline's choices. Where it and Auto-FDE line up, see the
mapping table at the bottom.

## 1. Why agents are hard to eval

The autonomy that makes agents useful makes them hard to grade: they run
"over many turns: calling tools, modifying state, and adapting based on
intermediate results," so mistakes compound and creative solutions can beat
static expectations. Crucially, "when we evaluate 'an agent,' we're
evaluating the harness *and* the model working together" — which is why
Auto-FDE runs every eval on the real harness (`claude -p --plugin-dir`),
not against a mock.

## 2. Vocabulary (load-bearing)

- **Task / test case** — one problem with defined inputs + success criteria.
- **Trial** — one attempt at a task; you need several because of variance.
- **Grader** — the scoring logic; a task may have several, each with
  multiple assertions.
- **Transcript / trace / trajectory** — "complete record of a trial,
  including outputs, tool calls, reasoning, intermediate results."
- **Outcome** — the final environment state, not just the model's utterance.
- **Evaluation harness** — the end-to-end infra (instructions, tools,
  concurrency, recording, grading, aggregation).
- **Capability evals** ask "what can this agent do well?"; **regression
  evals** ask "does it still handle everything it used to?"

## 3. The build roadmap (start early, grow from failures)

"Evals get harder to build the longer you wait." Start at ~**20–50 tasks**
sourced from real failures, bug trackers, and manual pre-release checks —
early development has large effect sizes, so small samples are fine.

1. Convert existing manual tests and bug reports into tasks.
2. Write **unambiguous tasks with reference solutions** — the bar is "two
   domain experts would independently reach the same pass/fail verdict," and
   a working reference output proves the task solvable and the grader
   correct. ("Everything the grader checks should be clear from the task
   description.")
3. **Balanced problem sets** — positive cases (behavior *should* happen) and
   negative cases (*shouldn't*); no class imbalance, or you optimize
   one-sidedly (e.g. over-triggering search).
4. **Stable, isolated harness** — clean environment per trial; shared state
   causes correlated failures that look like agent problems but are
   infrastructure.
5. **Design graders thoughtfully** (see §4).
6. **Read transcripts** — verify the grader fires correctly and failures are
   fair before trusting scores.
7. **Watch saturation, own long-term** — a 100% pass rate stops giving
   signal; evals are living artifacts with clear ownership ("unit tests, not
   a luxury").

## 4. Three grader types

| Type | Methods | Trade |
|---|---|---|
| **Code-based** | string/regex/fuzzy match, binary tests, static analysis, outcome verification, tool-call verification, transcript analysis | fast, cheap, reproducible, debuggable — but brittle to valid variation |
| **Model-based** | rubric scoring, NL assertions, pairwise comparison, reference-based, multi-judge consensus | flexible, captures nuance — but non-deterministic, costly, needs calibration |
| **Human** | SME review, spot-check sampling, A/B, inter-annotator agreement | gold standard — but slow, expensive, calibrates the LLM graders |

Prefer deterministic grading; reach for an LLM judge only where needed;
combine as weighted / all-pass / hybrid scoring. Give an LLM judge an
**"Unknown" escape hatch** and isolate each rubric dimension to curb
hallucinated verdicts.

**The central grading rule:** "grade what the agent produced, not the path
it took." Checking for a rigid *sequence* of tool calls penalizes valid
alternative approaches — a headline anti-pattern.

## 5. Variance: pass@k vs pass^k

Single trials are unreliable; run k and report the right aggregate:

- **pass@k** — probability of ≥1 success in k trials (more shots → higher);
  use when one success suffices.
- **pass^k** — probability *all* k trials succeed (more shots → lower); use
  when you need reliability every time. Example: 75% per-trial at k=3 →
  pass^3 ≈ 42%.

Auto-FDE's output rung is a pass^3: "a case passes only when every
with-skill run passes."

## 6. Pitfalls called out

Ambiguous specs (a 0% pass@100 usually means a broken task, not an incapable
agent); over-rigid graders enforcing tool sequences; shared state across
trials (agents exploit git history / caches); class imbalance; grading
bypass (claiming "flight booked" without booking); eval saturation; vague
rubrics → LLM-judge hallucination; infrastructure flakiness masked as agent
failure. Field example: Opus 4.5 scored 42% on CORE-Bench under "rigid
grading that penalized variations, ambiguous task specs, and stochastic
tasks"; fixing the *evals* took it to 95%.

## 7. Metrics worth tracking

Transcript: turns, tool calls, total tokens. Latency: time-to-first-token,
output tok/s, time-to-last-token. Outcomes: pass rate, pass@k, pass^k,
error rate, cost per task.

## 8. Philosophy

Eval-driven development: "build evals to define planned capabilities before
agents can fulfill them, then iterate." Validate holistically — automated
evals for pre-deploy speed, production monitoring for ground truth, A/B for
big changes, transcript review for calibration. "Teams without evals get
bogged down in reactive loops … Teams that invest early find the opposite:
development accelerates as failures become test cases, test cases prevent
regressions, and metrics replace guesswork."

## 9. Auto-FDE ↔ this post

| Post | Auto-FDE equivalent |
|---|---|
| evaluate "harness + model together" | evals on the real harness via `--plugin-dir`, never mocked |
| reference solution proves task + grader | `evals/reference/<evalId>.md` that must pass its own `checks.json` |
| three grader types | `checks.json` code checks + `judge` kind + human review gates |
| "grade the outcome, not the path" | outcome/artifact checks, not tool-sequence assertions |
| pass^k for reliability | output rung passes only if all 3 with-skill runs pass |
| balanced positive/negative sets | `trigger-evals.json` positives + near-miss negatives |
| read transcripts before trusting scores | transcript-first triage (`.build/output-runs/`, `step-N.jsonl`) |
| regression evals as living artifacts | regression ledger (`.build/regressions.json`) + `/fde-improve` |
| "Unknown" escape hatch for judges | reserve `judge` for what code can't decide |

## Sources

- Anthropic Engineering — "Demystifying evals for AI agents" (Grace,
  Hadfield, Olivares, De Jonghe; 2026-01-09):
  https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
