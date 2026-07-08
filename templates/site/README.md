# site.html data contract

`site.html` is the team-facing counterpart to `dashboard.html`: one
self-contained page the whole client team keeps open, laid out like the
Claude Platform docs — a left sidebar (Overview, Install, then one **Guide**
per wiki article) and a docs-style article view with an "On this page" toc,
demo-video slots, and prev/next links. It renders exclusively from
`window.SITE_DATA`, embedded between the `/*__SITE_DATA_START__*/` and
`/*__SITE_DATA_END__*/` markers by `scripts/gen-site.py` — never
hand-edited. The Anthropic fonts are embedded between the
`/*__FONTS_START__*/` markers by `scripts/embed-fonts.py` (see
`templates/fonts/NOTE.md`). No external requests, no sibling files, so the
same file opens locally and publishes as a Claude artifact.

With `SITE_DATA = null` (the fresh template) the page shows a "not
generated yet" note. Every field below is optional — sections hide
themselves when they have nothing to show.

```js
window.SITE_DATA = {
  generated: "2026-07-07T12:00:00Z",       // stamp from the generator
  plugin: { name, displayName, version, description },
  team: "Acme Launch Team",                // catalog team, else project.md

  // ── Overview page ─────────────────────────────────────────────────────
  phases: ["Anytime", "Planning", …],      // grouping + phase-dot colors
  lanes:  ["PM", "Comms"],                 // lane-tag palette order
  skills: [{                               // ONLY shipped skills: status
    slug, title, phase, lane, type, summary   // built|verified|approved|deployed
  }],
  vendorSkills: [{                         // "Also available" — skills other
    slug, title, summary,                  // plugins ship; not cut
    vendor: true | "plugin-name"           // string names the providing plugin
  }],
  commands: [{ name, summary }],           // also drive the Install smoke tests
  agents:   [{ name, summary }],           // carried for completeness
  integrations: [{ name, kind, authNotes }],  // Overview list + Install
                                              // connection steps

  // ── Install page ──────────────────────────────────────────────────────
  install: {
    marketplace: "acme-launch",            // marketplace name; defaults to
                                           // plugin.name
    marketplaceUrl: "…",                   // optional; fills the add command,
                                           // else "<path-or-git-url>" shows
    steps: ["…", "…"],                     // numbered steps (inline md ok)
    checklist: [{ item, done }]            // rollout status, collapsed
  },
  support: { channel: "#claude-help", notes: "…" },  // misfire callout on
                                                     // Overview + Install

  // ── Guides (wiki) ─────────────────────────────────────────────────────
  wiki: [{
    name: "getting-started",               // filename stem → #wiki/<name>
    title: "Getting started",              // first heading of the article
    markdown: "…",                         // verbatim; rendered by md()
                                           // (frontmatter + first H1 hidden)
    video: null | ".build/video-briefs/getting-started.mp4"
           // null → "demo video coming soon" placeholder block
           // URL/path → a demo-video link block
  }]
};
```

## Generator

```
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/gen-site.py [project-root]   # default: cwd
```

Writes/refreshes `<project>/site.html` (copies this template in on first
run, then re-injects between the markers). Sources:

| Section | Source |
| --- | --- |
| `plugin`, `team`, `phases`, `lanes`, `skills`, `vendorSkills`, `commands`, `agents`, `integrations` | `catalog.json` (team falls back to `project.md`) |
| `install`, `support` | `.build/deploy.json` — `installSteps`, `checklist`, `support`/`supportChannel`, `marketplace` (name or `{name, url}`) |
| `wiki` | `.build/wiki/*.md`, one article per file; `video` from a sibling `.build/video-briefs/<name>.mp4` |

## Publish

Publish `site.html` with the Artifact tool — same file path, same URL, one
stable link for the team. Regenerate + republish after every deploy. The
file also opens locally and from any static host.
