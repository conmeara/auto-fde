# Distilled: OpenAI — Testing agent skills systematically with evals

Distilled from the OpenAI Developers blog post "eval-skills" (Dominik Kundel
& Gabriel Chua, 2026-01-22). Ideas are paraphrased and reorganized, not
copied; short quotes are attributed inline. Fetched 2026-07-08. Link in
Sources at the bottom.

Relevance to Auto-FDE: independent, near-parallel confirmation of the eval
model this pipeline already runs. The post is Codex-centric (its runner is
`codex exec --json`); the methodology is tool-agnostic and maps cleanly onto
Auto-FDE's `claude -p --plugin-dir` + stream-json + `run-checks.py` +
`checks.json` stack. Where its mechanics and ours differ, the mapping table
at the bottom is the translation.

## 1. Core thesis

Skills are testable artifacts. Iterating on them by eyeballing outputs
doesn't scale and hides regressions; treat evals like software tests so
improvements and regressions are visible as metrics. "Every manual fix you
make here … is a candidate for a future eval, so you can lock in the
intended behavior before evaluating at scale." (This is exactly Auto-FDE's
regression ledger / flywheel rationale.)

## 2. Success-criteria taxonomy (four categories)

Define success criteria *before* implementation, sorted into four kinds,
each targeting a different failure mode:

- **Outcome** — did the task complete? does the artifact exist / the app
  run? (verify the artifact)
- **Process** — did the agent invoke the skill and follow the intended
  tools and steps? (verify the path, not just the result)
- **Style** — does the output follow the conventions you asked for?
- **Efficiency** — did it get there "without thrashing" — no unnecessary
  commands, no excessive token use?

Maps onto the catalog's `success` criteria and the check kinds Auto-FDE
compiles into `checks.json`.

## 3. Layered grading — deterministic first, model-assisted second

"Begin with fast checks that explain behavior, then add slower, heavier
checks only when they reduce risk."

### Deterministic checks (the fast, debuggable rung)

Run the skill under a structured-trace runner (`codex exec --json` →
line-delimited JSONL events), then assert against the trace and the
filesystem:

- Each command the agent ran appears as an `item.completed` event of type
  `command_execution` — assert a required command fired
  (`e.item.command.includes("npm install")`), or **count** them to detect
  looping/thrashing.
- Artifact existence: `existsSync(path.join(projectDir, "package.json"))`.
- "Everything is deterministic and debuggable. If a check fails, you can
  open the JSONL file and see exactly what happened." (Auto-FDE's
  transcript-first triage: read the `.jsonl` run before filing a fix.)

### Model-assisted rubric grading (the qualitative rung)

Deterministic checks answer "did it do the basics?" but "don't answer 'did
it do it the way you wanted?'" For style/quality, constrain a grader's
final response to a JSON Schema (`--output-schema`):

```json
{
  "overall_pass": true,
  "score": 87,
  "checks": [ { "id": "...", "pass": true, "notes": "..." } ]
}
```

Use it sparingly — only where code genuinely can't decide (Auto-FDE's
`judge` check kind).

## 4. Prompt-dataset (triggering) design

"For a single skill, a small set of 10–20 prompts is enough to surface
regressions." Every row is "a situation where you care whether the skill
does or does not activate." Breakdown:

- **Explicit** trigger (`should_trigger=true`) — names the skill directly.
- **Implicit** trigger — describes the scenario without naming it.
- **Contextual** trigger — the real ask plus domain noise.
- **Negative controls** (`should_trigger=false`) — guard against false
  positives.

Grow the set from real failures encountered during development or usage,
not up front. Same `should_trigger` schema and positive/near-miss/negative
philosophy as Auto-FDE's `trigger-evals.json`.

## 5. Extension checks (add only when they buy risk reduction)

Command-count thrashing detection; token tracking via `usage.input_tokens`
/ `usage.output_tokens` on `turn.completed`; post-run build verification
(`npm run build`); conditional runtime smoke tests (Playwright/curl, "use
sparingly"); repository cleanliness (`git status --porcelain`); sandbox
compliance (skill still works without escalated permissions).

## 6. Iteration philosophy

(a) Manual exploration to surface hidden assumptions about environment,
execution, and triggering; (b) small, targeted prompts that grow as
failures emerge; (c) layered grading — deterministic first, rubric second;
(d) continuous tightening of the skill's name/description/steps until
success is "unambiguous." "Start small and grow over time as you encounter
real failures during development or usage."

## 7. Auto-FDE ↔ OpenAI mapping

| OpenAI post | Auto-FDE equivalent |
|---|---|
| `codex exec --json` JSONL trace | `claude -p --plugin-dir` stream-json transcript (`.build/output-runs/`, `step-N.jsonl`) |
| deterministic checks over the trace | `run-checks.py` executing `checks.json` (`contains-all`, `path-resolves`, …) |
| `--output-schema` rubric grading | the `judge` check kind |
| 10–20 prompt set, positive/negative | `trigger-evals.json` (positives across phrasings + near-miss negatives) |
| outcome/process/style/efficiency | catalog `success` criteria → compiled checks |
| "every manual fix is a future eval" | regression ledger (`.build/regressions.json`) + `/fde-improve` flywheel |

## Sources

- OpenAI Developers — "Testing agent skills systematically with evals"
  (Dominik Kundel, Gabriel Chua; 2026-01-22):
  https://developers.openai.com/blog/eval-skills/
