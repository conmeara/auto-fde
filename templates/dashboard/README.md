# Dashboard template

`dashboard.html` is the single evolving page an Auto-FDE engagement is
operated from. It lives at the **engagement root** (`<engagement>/dashboard.html`)
and is one fully self-contained file — inline CSS/JS, embedded data, embedded
fonts, no external requests — so it opens locally and publishes as a Claude
artifact for a shareable link. The template contains zero team-specific
content.

The design follows the Claude Console / Platform docs: a left sidebar for
navigation (brand slot shows the team, never "Claude"), serif page titles,
hairline-bordered utility lists and tables, the book-cloth accent used only
for links and active markers. The Anthropic fonts are embedded between the
`/*__FONTS_START__*/` markers by `scripts/embed-fonts.py` (see
`templates/fonts/NOTE.md`).

## Pages

All six pages are always listed in the sidebar so the lifecycle is visible;
a page becomes clickable when its data exists. Each row carries the phase
state (✓ done · ● current · ○ pending) and a small live stat.

| Page     | Appears when             | Produced by             |
|----------|--------------------------|-------------------------|
| Overview | always                   | every phase (generator) |
| Plan     | `catalog` exists         | `/fde-plan`             |
| Skills   | `builtSkills` has skills | `/fde-build`            |
| Test     | `test` exists            | `/fde-test`             |
| Evals    | `evals` exists           | `/fde-eval`             |
| Deploy   | `deploy` exists          | `/fde-deploy`           |

**Overview** is the operating surface: where the engagement stands, the
exact next command (with a copy button), what needs the human's attention,
the nine-step lifecycle (each step expands into a lesson — what happens,
your part, done when), what's in the plugin, and reference links for the
FDE (skills docs, plugin docs, eval guidance). On a fresh engagement the
same page reads as the guided tour — the page that teaches the method is
the page you run it from.

## Review pages

Plan, Skills, and Evals each carry a **review bar** under the page header:
progress for that page's approvals, **Export review**, and **Reset review**.
The export always contains every decision from every page in one markdown
file — `/fde-review` and `/fde-eval` ingest it (format below). Approvals and
notes live in the reviewer's browser localStorage, keyed by plugin name.

## How data gets embedded

`scripts/gen-dashboard.py` scans the engagement directory and injects
`window.FDE_DATA` (shape: [`DATA-CONTRACT.md`](DATA-CONTRACT.md)) between the
`/*__FDE_DATA_START__*/` / `/*__FDE_DATA_END__*/` markers, copying this
template in first if the engagement has no dashboard yet. It regenerates
after every phase — never hand-edit the data block.

```sh
python3 <plugin>/scripts/gen-dashboard.py <engagement-root>   # scan + inject
python3 <plugin>/scripts/gen-dashboard.py --example .         # preview with
                                                              # fictional Acme data
```

## Publishing as an artifact

After regenerating, publish `<engagement>/dashboard.html` with the Artifact
tool — the same file path redeploys to the same URL, so the champion keeps
one stable link.

Note the file deliberately has no `<!DOCTYPE>`/`<html>`/`<head>`/`<body>`
wrapper — the artifact pipeline supplies that skeleton. Browsers render the
bare file fine when opened locally.

## Export format

Stable structure, the slug on every heading, grouped catalog-level →
per-skill → per-eval-case:

```markdown
## Catalog decisions (Plan tab)
### Phase: Planning
#### [catalog] launch-brief — approved
...
## Built-skill decisions (Skills tab)
### [skill] launch-brief — not approved
Note text, if any.
## Eval feedback (Evals tab)
### [eval] press-release#1 — not approved
The boilerplate must never be dropped — make it a hard completion criterion.
```
