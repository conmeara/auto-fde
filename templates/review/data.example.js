/* ============================================================
   Example review data — fictional "Acme Launch Team".
   Matches templates/review/DATA-CONTRACT.md exactly.

   At engagement time, scripts/gen-review-data.py writes data.js
   in this shape. To preview the template with this sample:
       cp data.example.js data.js
   ============================================================ */

window.FDE_DATA = {
  generated: "2026-07-05T12:00:00Z",
  engagement: {
    team: "Acme Launch Team",
    pluginName: "acme-launch",
    version: "0.1.0"
  },

  /* ── Plan tab ─────────────────────────────────────────────── */
  catalog: {
    phases: ["Anytime", "Planning", "Launch", "Wrap"],
    lanes: ["PM", "Comms"],
    skills: [
      {
        slug: "launch-brief",
        title: "Launch Brief",
        phase: "Planning",
        lane: "PM",
        type: "document",
        summary: "Draft the canonical 5-section launch brief from a kickoff conversation or notes.",
        status: "verified",
        composes: ["interview"],
        templates: ["templates/Launch-Brief.docx"]
      },
      {
        slug: "press-release",
        title: "Press Release",
        phase: "Launch",
        lane: "Comms",
        type: "document",
        summary: "Write a press release in Acme house style with required boilerplate and approval chain.",
        status: "built",
        templates: ["templates/Press-Release.docx"]
      },
      {
        slug: "launch-checklist",
        title: "Launch Checklist",
        phase: "Launch",
        lane: "PM",
        type: "workflow",
        summary: "Run the T-minus launch checklist: owners, gates, go/no-go, day-of comms.",
        status: "built"
      },
      {
        slug: "interview",
        title: "Interview",
        phase: "Anytime",
        type: "workflow",
        summary: "Reusable elicitation: ask the user structured questions to fill gaps in any artifact.",
        status: "verified",
        notes: "Composed by launch-brief and retro for missing inputs."
      },
      {
        slug: "metrics-report",
        title: "Metrics Report",
        phase: "Wrap",
        lane: "PM",
        type: "integration",
        summary: "Pull launch metrics from the analytics MCP and produce the wrap report.",
        status: "planned",
        notes: "Blocked on analytics MCP auth decision — see open questions."
      },
      {
        slug: "retro",
        title: "Retro",
        phase: "Wrap",
        type: "document",
        summary: "Facilitate and write up the launch retro using the team's template.",
        status: "planned",
        composes: ["interview"],
        templates: ["templates/Retro.docx"]
      }
    ],
    commands: [
      { name: "launch", summary: "Router: show where this launch stands and what to run next.", status: "built" },
      { name: "launch-wrap", summary: "Run the Wrap phase end to end.", status: "planned" }
    ],
    agents: [
      { name: "brand-review", summary: "Adversarial reviewer for Acme voice and brand rules.", status: "built" }
    ],
    integrations: [
      { name: "analytics", kind: "mcp", authNotes: "Team API token; each user signs in on first use." }
    ]
  },

  openQuestions: [
    {
      skill: "",
      question: "Should launch docs default to docx output, or stay in markdown until final?",
      status: "open"
    },
    {
      skill: "press-release",
      question: "Two boilerplate paragraphs found in sources (2023 and 2025 revisions) — which is canonical?",
      status: "open"
    },
    {
      skill: "metrics-report",
      question: "Which analytics workspace is the source of truth for launch metrics?",
      status: "resolved"
    }
  ],

  /* ── Skills tab ───────────────────────────────────────────── */
  builtSkills: {
    "launch-brief": {
      files: [
        {
          path: "SKILL.md",
          content: `---
name: launch-brief
description: Draft the canonical Acme launch brief. Use when the user wants to start a launch brief, turn kickoff notes or a transcript into a brief, or asks what a launch needs before planning starts.
---

# Launch Brief

Draft the five-section Acme launch brief from whatever input exists — a kickoff
transcript, scattered notes, or nothing at all.

## Workflow

1. **Collect inputs.** Look for kickoff notes, a transcript, or a prior brief in
   the working directory. If key facts are missing, compose \`interview\` to ask
   the user targeted questions — never invent dates, owners, or tiers.
2. **Draft the five sections** in order (see structure below).
3. **Fill the template.** Render into \`templates/Launch-Brief.docx\`, keeping
   all heading styles intact.
4. **Review pass.** Check every claim against the inputs. Flag anything
   unsourced with \`[CONFIRM]\`.

## The five sections

| # | Section | Owner | Must contain |
|---|---------|-------|--------------|
| 1 | What we are launching | PM | One-sentence product statement |
| 2 | Why now | PM | Market window, exec ask |
| 3 | Audience & message | Comms | Primary audience, one core message |
| 4 | Timeline & tier | PM | Tier (1–3), target date, gates |
| 5 | Risks & dependencies | PM | Top 3 risks with owners |

## Rules

- The brief is **one page**. Cut before you shrink the font.
- Tier decides everything downstream — if tier is unknown, stop and ask.
- Never mark the brief final; the PM does that in review.

## Output

Write \`Launch-Brief-<product>.docx\` to the working directory and summarize
what is still \`[CONFIRM]\`-flagged.
`
        },
        {
          path: "references/brief-structure.md",
          content: `# Brief structure notes

Digested from three past briefs (Redwood, Bluebird, Kestrel launches).

## Observed conventions

- Product statement always leads with the customer, not the feature.
- "Why now" cites at most two data points — more reads as padding.
- Tier definitions:
  - **Tier 1** — exec-visible, press moment, all-hands demo.
  - **Tier 2** — blog + customer email, no press.
  - **Tier 3** — changelog only.

## Anti-patterns seen in old briefs

- Risks listed without owners (Redwood) — every risk needs a name.
- Timeline in prose (Bluebird) — always the gate table.
`
        },
        {
          path: "evals/eval-notes.md",
          content: `# Eval notes — launch-brief

## Output eval

Given the Kestrel kickoff transcript, the skill must produce a brief where:

- [ ] all five sections present, in order
- [ ] tier matches the transcript (Tier 2)
- [ ] no invented dates — the transcript names no ship date, so the
      timeline section must carry \`[CONFIRM]\`
- [ ] risks each have an owner
`
        }
      ],
      scores: { fidelity: 9, bestPractices: 9, triggering: 8, verdict: "pass" },
      openQuestions: [
        "Old briefs sometimes had a sixth 'budget' section — include it, or leave budget to the LOE?"
      ]
    },

    "press-release": {
      files: [
        {
          path: "SKILL.md",
          content: `---
name: press-release
description: Write a press release in Acme house style. Use when the user asks for a press release, launch announcement, or PR draft for a product launch.
---

# Press Release

Write a launch press release in Acme house style, ending with the required
boilerplate and routed through the comms approval chain.

## Workflow

1. Read the launch brief for the product statement, audience, and core message.
2. Draft with the house structure:
   - Headline: **active voice, under 12 words, no puns.**
   - Dek: one sentence, the customer benefit.
   - Body: quote from the exec sponsor, one customer proof point.
   - Boilerplate: append verbatim from \`references/boilerplate.md\`.
3. Run the \`brand-review\` agent on the draft; apply its required fixes.
4. Output as docx from \`templates/Press-Release.docx\`.

## Approval chain

> Draft → Comms lead → Legal (Tier 1 only) → Exec sponsor. The skill routes;
> humans approve. Never mark a release approved.

## Style rules

- No superlatives without a citation ("fastest", "first", "only").
- Product names exactly as trademarked — \`Acme Fleet™\` on first mention.
- Dateline city is always *San Francisco* unless the brief says otherwise.
`
        },
        {
          path: "references/boilerplate.md",
          content: `# Acme boilerplate (verbatim)

Append exactly this paragraph to every release:

> Acme builds coordination tools for teams that ship. Founded in 2019,
> Acme serves over 4,000 companies worldwide. Learn more at acme.example.

**Never edit this text.** If the release needs a different boilerplate,
that is a comms-lead decision, not a drafting decision.

⚠ Two revisions of this paragraph exist in the source folder (2023, 2025).
The 2025 revision is used here pending confirmation — see open questions.
`
        }
      ],
      scores: { fidelity: 8, bestPractices: 9, triggering: 7, verdict: "revise" },
      openQuestions: [
        "Confirm the canonical boilerplate revision (2023 vs 2025) before this ships.",
        "Should Tier 2 launches get a shortened release, or none at all?"
      ]
    },

    "launch-checklist": {
      files: [
        {
          path: "SKILL.md",
          content: `---
name: launch-checklist
description: Run the Acme T-minus launch checklist. Use when the user wants to run the launch checklist, check launch readiness, do a go/no-go review, or asks what is left before launch day.
---

# Launch Checklist

Run the T-minus checklist for a launch: owners, gates, go/no-go, and day-of
comms. This is a workflow skill — it drives a conversation, not a document.

## Gates

1. **T-14** — brief final, tier locked, owners assigned.
2. **T-7** — press release approved (Tier 1–2), docs staged, support briefed.
3. **T-2** — go/no-go with exec sponsor. Record the decision and who made it.
4. **T-0** — day-of comms in order: release, blog, customer email, social.

## Behavior

- Ask for the launch name, then walk the gates *in order* — never skip ahead.
- For each item, record: done / not done / blocked, and the owner.
- A blocked item at T-2 is an automatic **no-go recommendation**; the human
  can override, and the override is recorded with their name.
- End every run by writing \`checklist-<launch>-<date>.md\` with the full state.
`
        }
      ],
      scores: null,
      openQuestions: []
    },

    "interview": {
      files: [
        {
          path: "SKILL.md",
          content: `---
name: interview
description: Structured elicitation to fill gaps in any artifact. Use when required information is missing and the user must be asked — invoked mostly by other skills (launch-brief, retro), or directly when the user says "interview me" about a launch.
---

# Interview

Reusable elicitation: ask the user structured questions to fill specific gaps.
Other skills compose this one; it rarely triggers on its own.

## Contract

The calling skill passes a **gap list** — named fields it could not source.
For each gap:

1. Ask *one* question at a time, most important first.
2. Offer the likely default when one exists ("Tier 2, like most feature
   launches?") so the user can just confirm.
3. Accept "skip" — record the field as \`[CONFIRM]\` and move on.

## Rules

- Maximum 7 questions per session; park the rest as \`[CONFIRM]\`.
- Never re-ask something answered earlier in the conversation.
- Return answers as a flat \`field: value\` list the caller can merge.
`
        }
      ],
      scores: { fidelity: 9, bestPractices: 8, triggering: 9, verdict: "pass" },
      openQuestions: []
    }
  },

  /* ── Evals tab ────────────────────────────────────────────── */
  evals: {
    trigger: {
      accuracy: 0.97,
      precision: 0.98,
      recall: 0.96,
      rounds: 2,
      totalQueries: 240,
      perSkill: [
        { slug: "launch-brief", tp: 29, fn: 1, tn: 29, fp: 1,
          failures: ["we need to get the doc started for the June thing"] },
        { slug: "press-release", tp: 28, fn: 2, tn: 30, fp: 0,
          failures: [
            "draft the announcement for Fleet",
            "can you write up something for the press about Tuesday"
          ] },
        { slug: "launch-checklist", tp: 30, fn: 0, tn: 30, fp: 0, failures: [] },
        { slug: "interview", tp: 27, fn: 3, tn: 29, fp: 1,
          failures: ["ask me some questions"] }
      ],
      acceptedMisses: [
        {
          slug: "interview",
          query: "ask me some questions",
          reason: "Too generic to route — interview is composed by other skills; bare requests should stay in normal conversation."
        },
        {
          slug: "launch-brief",
          query: "we need to get the doc started for the June thing",
          reason: "No launch signal in the query; triggering here would misfire on every document request."
        }
      ]
    },
    output: { run: 3, passed: 3, gated: ["metrics-report"] },
    reportMarkdown: `# Eval report — acme-launch v0.1.0

Two refinement rounds against 240 generated queries (60 per built skill,
balanced positive/negative).

## Round summary

| Round | Accuracy | Precision | Recall | Change |
|-------|----------|-----------|--------|--------|
| 1 | 91.7% | 93.4% | 90.0% | baseline |
| 2 | 97.1% | 98.3% | 95.8% | tightened press-release and interview descriptions |

## What changed between rounds

- \`press-release\` description gained "launch announcement" and "PR draft"
  phrasings — recovered 4 false negatives.
- \`interview\` description now says it is *mostly invoked by other skills*,
  cutting 3 false positives on generic "help me think" queries.

## Remaining known misses

Both remaining misses are **accepted** (see accepted-misses list): they are
queries with no launch signal, where triggering would cause worse misfires
elsewhere.

## Output evals

3 of 3 output evals pass. \`metrics-report\` is gated: it has no output eval
until the analytics MCP auth question is resolved and the skill is built.
`
  },

  /* ── Deploy tab ───────────────────────────────────────────── */
  deploy: {
    checklist: [
      { item: "Marketplace manifest validated", done: true },
      { item: "Plugin installs cleanly from a fresh checkout", done: true },
      { item: "Team site generated and reviewed", done: true },
      { item: "Analytics MCP token provisioned for the team", done: false },
      { item: "Walkthrough session scheduled with the launch team", done: false }
    ],
    installSteps: [
      "Run \`/plugin marketplace add acme/claude-plugins\` in Claude Code.",
      "Run \`/plugin install acme-launch@acme\` and restart Claude Code.",
      "Try it: \`/launch\` shows where your current launch stands.",
      "First use of \`metrics-report\` will prompt you to sign in to the analytics MCP."
    ],
    siteDir: "site/",
    notes: `Rollout starts with the **PM lane** (launch-brief, launch-checklist) while
the boilerplate question blocks press-release for Comms.

- Pilot group: the Kestrel launch team, week of July 13.
- \`metrics-report\` ships in v0.2 once analytics auth lands.
- Feedback goes through the site's feedback link — triage weekly.`
  }
};
