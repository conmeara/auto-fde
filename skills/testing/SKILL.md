---
name: testing
description: This skill should be used for the test phase of an Auto-FDE project — the user trying the built plugin live before formal evals. Use it when they want to test the plugin themselves, get a synthetic starting artifact (meeting transcript, request doc) to test with, hand over a test session's transcript or corrections, check which skills are still untested, or expand test cases from their sessions. Not for the automated benchmarks or practice run — the evaluating skill — nor post-deploy field reports — the improving skill.
---

# Testing

The human's phase. Reviewing on the Skills page told them what the skills
*say*; this phase tells them what the skills *do*. Your job is to make
starting frictionless, capture everything they observe, and convert it
into eval cases and fixes — never to test in their place. Every real
phrasing the user types is worth more than ten generated ones: this is
where the eval set stops being same-mind authored.

## 1. Make starting frictionless

The blank page is the enemy — most users stall at "how do I even test
this?". Hand them, in one message:

- The live-load one-liner: `cd <any scratch dir> && claude --plugin-dir
  <absolute plugin path>` — a real session with the plugin loaded, no
  install step. Edits to the plugin show up on the next session.
- The kits (below), each with its opening prompt ready to paste.
- One sentence of posture: "Use it like a teammate would — and when
  something is off, say so in that session's chat ('the intake is right
  but the tone of voice is wrong here, here, and here'). Those in-session
  corrections are the most valuable thing you produce."

## 2. Kits: a ready-made way in, per journey

A journey is an entry point into the team's workflow — where a real task
starts (a kickoff meeting, an inbound request, a brief landing in a
channel). Read `catalog.json` and the digests for the entry-point skills,
then write one kit per journey under `test/kits/<journey>/`:

- **The starting artifact** the journey begins with — a synthetic meeting
  transcript, request email, or intake doc. Fictional client, fictional
  names, never real client material; reuse the practice fixture's
  fictional client when `practice/` exists so the two stay one world.
  Rich enough to exercise the skill, with 1-2 details deliberately
  missing so composition (the interview skill) gets exercised.
- **`README.md`** — the opening prompt verbatim (phrased exactly as the
  team would type it, not as a demo), and 3-5 watch-fors pulled from the
  skill's success criteria ("does it use the canonical section headings",
  "does it ask about the missing budget instead of inventing one").

Done when every entry-point journey has a kit whose artifact a stranger
could pick up and start testing with in under a minute.

## 3. Ingest what they saw

The input is a test session's transcript (a path — Claude Code sessions
live under `~/.claude/projects/<project-dir>/*.jsonl` — or an export, or
just corrections pasted in chat). Mine it completely; nothing the user
observed gets dropped:

- **Corrections** ("missed the tone of voice", "wrong template") →
  per-skill revision notes, verbatim where possible. Route them through
  the reviewing skill's machinery (normalize → revise workflow →
  re-verify) — do not build a second revision path here.
- **Confirmed behaviors** (the skill fired and did the right thing) →
  append the user's actual phrasing to that skill's
  `evals/trigger-evals.json` as an ordinary case (`"source": "test
  drive"`, NOT pinned — real human phrasings are exactly what the
  hold-out split should contain).
- **Trigger misses** (wrong skill fired, or none) → a trigger-benchmark
  problem: pin the failing query as a regression case (`"pinned": true`,
  which always scores as train) and triage per the evaluating skill —
  don't patch skill bodies for routing failures.
- **Output failures** the user hit → after the fix, pin the case
  (evals.json entry or checks.json check) and record it in
  `.build/regressions.json` (source `test drive · series N`).

Then update `.build/test-log.json`:

```json
{
  "series": [{ "id": 1, "date": "2026-07-07", "sessions": 2,
               "skillsExercised": ["intake", "launch-brief"],
               "casesFiled": 3, "notes": ["tone of voice off in briefs"] }],
  "coverage": { "intake": { "verdict": "pass", "lastSeries": 1 },
                "launch-brief": { "verdict": "issues", "lastSeries": 1 } }
}
```

Skills absent from `coverage` are untested — the dashboard's Test page
shows the grid and nudges the gaps. Done when every observation in the
transcript is a filed case, a queued fix, or a coverage row.

## 4. Expand — then let the machine run

After a series or two, scale what the human seeded. Generate variation
cases anchored to observed sessions only (paraphrases of queries they
actually typed, adjacent scenarios from the same journey — never
free-floating inventions), and show the user the list to skim: approving
variations of their own usage is cheap; unreviewed generated cases are
how eval sets go bad.

Provenance is load-bearing: approved expansions are appended with
`"source": "synthetic-expansion"` and always score as **train** — the
hold-out headline stays anchored to human-observed phrasings. Then offer
the autonomous leg: `/fde-eval trigger` (and `output` when evals exist)
runs the grown set without the user in the loop.

## Closing a series

Regenerate the dashboard (`python3
${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py <project-root>`) and
publish it with the Artifact tool (same path, same URL). Report coverage
(tested / issues / untested), cases filed, fixes queued, and the
recommendation: another series on the untested skills, or `/fde-eval` to
formalize what testing found.
