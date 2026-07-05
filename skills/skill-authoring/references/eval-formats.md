# Eval file formats

The exact formats the Auto-FDE pipeline reads. Both files live in each built
skill at `skills/<slug>/evals/`. Formats follow Anthropic's skill-creator
conventions so its tooling stays compatible.

## trigger-evals.json

Read by `scripts/eval-trigger.workflow.js` (the collect stage normalizes all
skills' files into `.build/trigger-cases.json`).

```json
[
  { "query": "realistic user prompt that should fire this skill", "should_trigger": true },
  { "query": "near-miss that shares keywords but belongs to a sibling or no skill", "should_trigger": false }
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

## evals.json

Output evals; run manually or by the eval phase once live connections exist.

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
      ]
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

## Where results land (engagement `.build/`)

- `verify-scores.json` — `{ "<slug>": { "scores": {"fidelity": n, "bestPractices": n, "triggering": n}, "verdict": "pass|revise|fail", "openQuestions": [] } }`
- `trigger-report.json` — the eval-trigger workflow's return value (its
  `perSkill` rows already carry failure query strings) plus `rounds` and
  `acceptedMisses` added by the main loop, per the review-page data
  contract.
- `eval-report.md` — human-readable eval narrative for the Evals tab.
