# dashboard.html data contract

`dashboard.html` renders exclusively from `window.FDE_DATA`, embedded in the
page itself between the `/*__FDE_DATA_START__*/` and `/*__FDE_DATA_END__*/`
markers by `scripts/gen-dashboard.py` — never hand-edited. The page is fully
self-contained (no external requests, no sibling files), so the same file
opens locally and publishes as a Claude artifact for a shareable link.

The **Home** tab always renders: as the guided tour when `FDE_DATA` is null
(fresh template) and as live project state once `status` exists. Every
other tab appears only when its section is present, so the page grows as the
project advances.

```js
window.FDE_DATA = {
  generated: "2026-07-07T12:00:00Z",   // stamp from the generator
  project: {
    team: "Acme Launch Team",
    pluginName: "acme-launch",
    version: "0.1.0"
  },

  // ── Home tab (derived by the generator on every run) ─────────────────
  status: {
    phase: "eval",                     // id of the current lifecycle step
    stepsDone: 5, stepsTotal: 8,
    summary: "12 digests · 4 skills built · trigger 99.2% hold-out",
    next: {                            // the one command to run next
      command: "/fde-eval output",
      reason: "why this is next, one sentence"
    },
    gates: [                           // human gates currently waiting
      { id: 3, label: "Gate 3 · review eval outputs", waiting: 2 }
    ],
    attention: {                       // all optional; omit when zero
      openQuestions: 2,
      evalDebt: ["launch-checklist"],  // built skills missing trigger evals
      staleTrigger: true,              // descriptions edited since last benchmark
      feedbackQueue: 1                 // feedback/ reports not yet converted
    },
    spine: [                           // one row per lifecycle step, in order:
      { id: "setup",    state: "done",    stat: "project.md" },
      { id: "discover", state: "done",    stat: "12 digests" },
      { id: "plan",     state: "done",    stat: "6 skills planned" },
      { id: "build",    state: "done",    stat: "4/5 built" },
      { id: "review",   state: "done",    stat: "9 notes → 9 cases" },
      { id: "test",     state: "done",    stat: "4/5 skills tested" },
      { id: "eval",     state: "current", stat: "trigger 99.2%" },
      { id: "deploy",   state: "pending", stat: "" },
      { id: "improve",  state: "pending", stat: "" }
    ]                                  // states: done | current | pending
                                       // 9 steps; stepsTotal follows
  },

  // ── Plan tab (present once catalog.json exists) ──────────────────────
  catalog: {
    phases: ["Anytime", "Planning", "Launch", "Wrap"],
    lanes: ["PM", "Comms"],            // optional, may be []
    skills: [{
      slug: "launch-brief",
      title: "Launch Brief",
      phase: "Planning",
      lane: "PM",                       // optional
      type: "document",                 // document | workflow | integration
      summary: "…",
      status: "planned",                // planned…deployed | cut
      success: ["…", "…"],              // optional; must-pass criteria set at plan time
      composes: ["interview"],          // optional
      templates: ["templates/Launch-Brief.docx"],  // optional
      vendor: false,                    // optional
      notes: "…"                        // optional
    }],
    commands: [{ name, summary, status }],
    agents:   [{ name, summary, status }],
    integrations: [{ name, kind, authNotes }]
  },
  openQuestions: [{                     // optional; badge on Plan tab
    skill: "launch-brief",              // "" for project-level
    question: "…",
    status: "open"                      // open | resolved
  }],

  // ── Skills tab (present once skills are built) ───────────────────────
  builtSkills: {
    "launch-brief": {
      files: [{ path: "SKILL.md", content: "…" }],   // SKILL.md first,
                                                     // then references/, evals/
      scores: {                          // from verify; may be null
        fidelity: 9, bestPractices: 9, triggering: 9,
        verdict: "pass"                  // pass | revise | fail
      },
      openQuestions: ["…"]
    }
  },

  // ── Test tab (present once /fde-test has logged a session) ───────────
  test: {
    coverage: [{                       // one row per built skill, always all
      slug: "launch-brief",
      verdict: "pass",                 // pass | issues | untested
      lastSeries: 2                    // omit when untested
    }],
    series: [{ id: 1, date: "2026-07-05", sessions: 2,
               skillsExercised: ["intake"], casesFiled: 3,
               notes: ["tone of voice off in briefs"] }],
    kits: [{ journey: "intake",
             artifact: "test/kits/intake/meeting-transcript.md",
             readme: "…" }],          // full kit README (opening prompt +
                                       // watch-fors); the tab renders it
    liveLoad: "cd <scratch> && claude --plugin-dir <abs plugin path>"
  },

  // ── Evals tab (present once /fde-eval has run) ───────────────────────
  evals: {
    trigger: {
      holdout: { accuracy: 0.992, precision: 1.0, recall: 0.985 },  // headline
      train:   { accuracy: 0.996, precision: 1.0, recall: 0.993 },  // fix target
      agreement: 0.975,                // share of cases where all 3 judge votes matched
      rounds: 3, totalQueries: 412,
      casesAdded: 18, relabeled: 3,    // the ledger: the case set only grows
      perSkill: [{
        slug, tp, fn, tn, fp,
        agree: 0.96,                   // per-skill judge agreement
        failures: ["FN: query …"],     // TRAIN failures only — hold-out details
        holdoutFails: 1                //   are counted, never shown (leakage guard)
      }],
      acceptedMisses: [{ slug, query, reason, replacement }],
      live: {                          // real-harness calibration (run once,
        sample: 30, runsPerQuery: 3,   //   after the judge bar is met)
        live:          { accuracy: 0.97, precision: 1.0, recall: 0.94 },
        judgeOnSample: { accuracy: 1.0,  precision: 1.0, recall: 1.0 },
        delta: 0.03                    // judge minus live — how optimistic
      }                                //   the simulation is vs claude -p
      // Legacy flat shape ({accuracy, precision, recall} at top level, no
      // holdout) still renders — the page falls back to single-score cards.
    },
    output: {
      cases: [{
        skill: "launch-brief", evalId: 2,
        prompt: "…",
        reference: "evals/reference/launch-brief-2.md",   // proves solvability
        withSkill: {
          verdict: "pass",             // pass | fail
          excerpt: "…",                // short output excerpt for the card
          checks: [{ name, passed, evidence }],  // run-checks.py results from the
                                       // FAILING run when there is one;
                                       // evidence = what matched/missing, where
          rubricNote: "…",             // LLM judge on what code can't check
          tokens: 41000, seconds: 130, // medians across runs, from the claude -p
                                       // result events; card hides when absent
          runs: 3, consistent: true,   // same verdict across all runs?
          runVerdicts: ["pass","fail","pass"],
          skillFired: 3,               // runs where the skill actually triggered
          transcripts: [".build/output-runs/launch-brief-2-with-r1.jsonl"]
        },
        baseline: {                    // same task, no skill — the control
          verdict: "fail", excerpt: "…",   // verdict = pass when ≥2/3 runs pass
          checks: [{ name, passed, evidence }],
          runs: 3, passes: 1,
          tokens: 63000, seconds: 220,
          transcripts: [".build/output-runs/launch-brief-2-base-r1.jsonl"]
        }
      }],
      gated: [{ skill, needs }]        // needs live connections; never mocked
    },
    practice: {                        // the graded end-to-end practice run
      fixture: "practice/",
      runbook: [{
        step: 1, title: "…",
        checks: { passed: 5, total: 5 },
        verdict: "pass",               // pass | fail | gated
        filedCase: "press-release eval #3",   // set on fail
        transcript: ".build/practice-run/step-1.jsonl",  // the claude -p
                                       // session's stream-json record
        skillFired: true               // false = routing failure, not output
      }]
    },
    regressions: [{                    // every triaged failure, pinned as a case
      source: "review note R-07",      // review note | trigger round N |
                                       //   practice run · step N | team report
      finding: "…",
      guardedBy: "launch-brief · checks.json #3",
      sinceRound: 1,                   // optional
      status: "passing"                // passing | open
    }],
    reportMarkdown: "…"                // .build/eval-report.md contents
  },

  // ── Deploy tab (present once /fde-deploy starts) ─────────────────────
  deploy: {
    checklist: [{ item: "Marketplace manifest validated", done: true,
                  owner: "…" }],       // owner optional — set on human items
    installSteps: ["…"],
    site: "site.html",                 // the team-facing artifact page
    supportChannel: "#acme-claude",    // optional; the misfire channel
    notes: "…"
  }
};
```

Reviewer state (approve toggles, notes — including per-output-eval-case
feedback keyed `<skill>#<evalId>`) lives in `localStorage`, keyed by plugin
name, with an Export button producing a markdown notes file that
`/fde-review` and `/fde-eval` ingest. Rendering must tolerate missing
optional fields and partial localStorage state.

## Where the generator reads each section

| Section | Source |
| --- | --- |
| `status` | derived: project layout scan + the files below |
| `catalog`, `project` | `catalog.json` |
| `openQuestions` | `.build/open-questions.json` |
| `builtSkills` | `<plugin-name>/skills/*` + `.build/verify-scores.json` |
| `test` | `.build/test-log.json` + `test/kits/*/README.md` |
| `evals.trigger` | `.build/trigger-report.json` |
| `evals.output` | `.build/output-evals.json` |
| `evals.practice` | `.build/practice-report.json` |
| `evals.regressions` | `.build/regressions.json` |
| `evals.reportMarkdown` | `.build/eval-report.md` |
| `deploy` | `.build/deploy.json` |
