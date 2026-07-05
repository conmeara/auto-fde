# Review page template

`review.html` is the single evolving review page for an Auto-FDE engagement.
It is one self-contained file — inline CSS/JS, no external requests — that the
human opens after each phase to review what the agent produced. All content
comes from `window.FDE_DATA`; the template itself contains zero team-specific
content.

## How data.js gets generated

The template loads `<script src="data.js"></script>` from the same directory.
`data.js` is written by `scripts/gen-review-data.py`, which scans the
engagement directory and emits `window.FDE_DATA` in the shape defined by
[`DATA-CONTRACT.md`](DATA-CONTRACT.md). It is regenerated after every phase —
never hand-edited.

If `data.js` is missing, the page shows an empty state pointing at
`/fde-plan`. To preview the template with sample data:

```sh
cp data.example.js data.js   # fictional "Acme Launch Team"
python3 -m http.server       # or just open review.html
```

## Tabs appear as phases complete

Each tab renders only when its section exists in `FDE_DATA`, so the page grows
with the engagement:

| Tab    | Appears when            | Produced by   |
|--------|-------------------------|---------------|
| Plan   | `catalog` exists        | `/fde-plan`   |
| Skills | `builtSkills` has skills| `/fde-build`  |
| Evals  | `evals` exists          | `/fde-eval`   |
| Deploy | `deploy` exists         | `/fde-deploy` |

Engagement-level `openQuestions` render as an amber callout on the Plan tab;
per-skill open questions appear on that skill's page in the Skills tab.

## Reviewer state and export

Approve toggles and notes live in `localStorage`, keyed per plugin
(`fde-review::<pluginName>`), so state survives regeneration of `data.js`.
The **Export review** button downloads a markdown file with a stable
structure — the slug on every heading — grouped catalog-level then per-skill:

```markdown
## Catalog decisions (Plan tab)
### Phase: Planning
#### [catalog] launch-brief — approved
...
## Built-skill decisions (Skills tab)
### [skill] launch-brief — not approved
Note text, if any.
```

That exported file is what `/fde-review` ingests to drive the revision run.
**Reset review** clears all stored decisions for the current plugin.
