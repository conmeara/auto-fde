# Eval file formats

The exact formats the Auto-FDE pipeline reads. All four eval artifacts live
in each built skill at `skills/<slug>/evals/`. `trigger-evals.json` and
`evals.json` follow Anthropic's skill-creator conventions so its tooling
stays compatible.

## trigger-evals.json

Read by `scripts/eval-trigger.workflow.js` (the collect stage normalizes all
skills' files into `.build/trigger-cases.json`).

```json
[
  { "query": "realistic user prompt that should fire this skill", "should_trigger": true },
  { "query": "near-miss that shares keywords but belongs to a sibling or no skill", "should_trigger": false },
  { "query": "the user's own phrasing from a live test session", "should_trigger": true, "source": "test drive" },
  { "query": "a generated variation of an observed query", "should_trigger": true, "source": "synthetic-expansion" },
  { "query": "a field report pinned as a regression case", "should_trigger": true, "pinned": true }
]
```

Rules:
- 8–10 positives: formal + casual phrasings, cases that never name the skill
  or file type, uncommon uses, cases where a sibling competes but this skill
  should win.
- 8–10 negatives: near-misses only — shared vocabulary, different need.
  Obviously-irrelevant negatives test nothing.
- Realistic texture: file names, personal context, typos, lowercase, mixed
  lengths. Queries must be substantive — Claude doesn't consult skills for
  trivial one-step asks, so a one-liner positive can be a false FN.
- `"pinned": true` marks a regression case appended by review, the practice
  run, test-phase failures, or `/fde-improve`. Pinned cases always score as
  **train** — the benchmark hides hold-out failure detail, and a pinned
  regression that failed invisibly would defeat the point of pinning it.
- `"source"` records provenance. `"test drive"` cases carry the user's real
  phrasing from live test sessions — appended unpinned, they enter the
  normal 60/40 split, which is exactly where human-observed queries belong.
  `"synthetic-expansion"` cases are generated variations (approved by the
  user) and always score as **train**: the hold-out headline never inflates
  on machine-generated cases.

## evals.json

Output evals, read by `scripts/eval-output.workflow.js` (each runnable case
runs with-skill 3× plus a no-skill baseline).

```json
{
  "skill_name": "<slug>",
  "evals": [
    {
      "id": 1,
      "prompt": "Realistic task prompt, as the team would type it",
      "expected_output": "What a correct result looks like",
      "files": ["evals/files/sample-input.md"],
      "expectations": [
        "Output includes the canonical 5 sections in order",
        "The bundled template file was copied, not recreated"
      ],
      "gated": "needs the team's live Jira connection"
    }
  ]
}
```

Rules:
- Expectations are binary and discriminating: pass only when the skill
  genuinely succeeded; burden of proof is on the expectation.
- Include input files under `evals/files/` when the task needs them —
  fictional stand-ins, never real client material.
- Subjective qualities (voice, design) get no assertion — flag them for
  human review instead.
- `"gated"` is optional and names the live connection the eval needs. Gated
  evals are listed by the eval phase, never mocked — a mock that passes
  vacuously is worse than no eval. Omit it on runnable evals.
- Every output eval gets a reference solution at `evals/reference/<id>.md`
  that passes every check — it proves the eval is solvable and calibrates
  the grader.

## checks.json

Deterministic graders, read by the eval-output and practice-run workflows
and by the build verifier (which runs them against `evals/reference/*`).
Compiled from the digests plus the catalog entry's `success` criteria.

```json
[
  { "name": "canonical sections", "kind": "contains-all",
    "values": ["## Summary", "## Risks", "## Owners"],
    "why": "the digest fixes these headings verbatim" },
  { "name": "template wired", "kind": "path-resolves",
    "value": "${CLAUDE_PLUGIN_ROOT}/templates/Launch-Brief.docx",
    "why": "success criterion: the bundled template is copied, not recreated" },
  { "name": "voice", "kind": "judge",
    "value": "reads in the team's terse announcement voice",
    "why": "code can't grade voice" }
]
```

Kinds:
- `contains` — the artifact contains the exact string in `value`.
- `contains-all` — the artifact contains every string in `values`,
  verbatim; the workhorse for headings and field lists.
- `regex` — `value` matches the artifact.
- `path-resolves` — the `${CLAUDE_PLUGIN_ROOT}` or relative path in `value`
  exists.
- `used-tool` — the run's session transcript contains a tool call named
  `value` (e.g. `"Skill"`). Trace kinds grade what the agent DID, not what
  it produced; they need the harness transcript (`--trace`), so they only
  apply to evals run via `claude -p` — the eval workflows pass the trace
  automatically.
- `ran-command` — a Bash call in the transcript contains `value` as a
  substring (e.g. `"cp "` proves a template was copied, not recreated —
  undecidable from the artifact alone).
- `judge` — an LLM judge rules on `value`; use only where code genuinely
  can't decide.

Rules:
- Mechanical kinds are EXECUTED BY CODE, never by an agent: the checker
  `scripts/run-checks.py` (copied into every built plugin at scaffold time)
  runs them and emits per-check evidence —
  `python3 <plugin>/scripts/run-checks.py <checks.json> <artifact paths...>
  --plugin-root <plugin>`. Graders copy its results verbatim and rule only
  on `judge` rows (returned with `passed: null`). A check that needs
  judgment to apply belongs under `judge`.
- A check that would pass on a wrong output is worse than none.

## Where results land (engagement `.build/`)

- `verify-scores.json` — `{ "<slug>": { "scores": {"fidelity": n, "bestPractices": n, "triggering": n}, "verdict": "pass|revise|fail", "openQuestions": [] } }`
- `trigger-report.json` — the eval-trigger workflow's return: `holdout` and
  `train` each `{accuracy, precision, recall}` (hold-out is the headline),
  `agreement`, and `perSkill` rows with `agree`, train-only `failures`
  (hold-out queries stay hidden), and `holdoutFails`; the main loop merges
  in `rounds`, `casesAdded`, `relabeled`, `acceptedMisses`.
- `output-evals.json` — the eval-output workflow's return: `cases` with
  `withSkill`/`baseline` arms, `gated`, and `cutCandidates` (the baseline
  passed too, so the skill added nothing).
- `practice-report.json` — the practice-run workflow's return: `runbook`
  rows with `checks`, `verdict`, `filedCase`.
- `regressions.json` — `[{"source", "finding", "guardedBy", "sinceRound",
  "status"}]`: every fixed finding pinned as a permanent eval case.
- `eval-report.md` — human-readable eval narrative for the Evals tab.
