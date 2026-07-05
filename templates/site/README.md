# Site template

The generic deploy-site template for Auto-FDE. At deploy time, `/fde-deploy`
instantiates this directory into a small static site the team uses to learn
about, install, and get tutorials for **their** plugin.

Three pages, one data file, no build step, no external dependencies
(no CDN fonts or scripts — system font stacks only).

| File | Role |
| --- | --- |
| `index.html` | Overview — hero (plugin name + counts), demo-video placeholder, how-it-works paragraph, skills catalog grouped by phase, then agents and commands |
| `install.html` | Install — video placeholder, numbered steps (marketplace add → install → first command), connections grid with per-integration auth notes |
| `tutorials.html` | Tutorials — sidebar + hash-routed articles, video placeholder atop every article |
| `styles.css` | Shared design system: quiet warm-editorial (oat ground, carbon ink, terracotta accent, serif display + Inter/system sans) |
| `data.js` | `window.SITE_DATA` — the single data source; **generated** from `catalog.json` by `/fde-deploy` |
| `app.js` | Shared renderer (nav, hero, catalog, install steps, connections, copy buttons, reveals) — reads only SITE_DATA |
| `wiki.js` | Tutorials renderer + the generic default articles used when `SITE_DATA.wiki.sections` is empty |

## The SITE_DATA contract

Everything rendered comes from `window.SITE_DATA` in `data.js`. All arrays
may be empty — sections hide themselves when they have nothing to show.

```js
window.SITE_DATA = {
  plugin: { name, displayName, version, tagline, howItWorks },
  counts: { skills, commands, agents },   // optional; computed from arrays if absent
  phases: [{ id, command|null, description }],
  lanes:  [{ id, label, description }],   // or plain strings; tag colors follow lane order
  skills: [{ slug, title, phase, lane, summary, vendor }], // vendor: true (catalog.json's
                                          // boolean) or the providing plugin's name string
  agents:   [{ name, kind, summary }],
  commands: [{ name, summary }],
  integrations: [{ name, kind, authNotes }],
  install: {
    marketplaceStep: { title, description, command },
    installSteps:    [{ title, description, commands: [..], note }],
    firstCommand:    { title, description, command },
  },
  wiki: { sections: [{ title, articles: [{ id, title, lede,
           videoPlaceholder, bodyMarkdown | bodyHtml }] }] },
};
```

Notes:

- **Install steps** render in order: `marketplaceStep`, then each of
  `installSteps`, then `firstCommand` — numbered automatically.
- **Wiki articles** take `bodyHtml` (used as-is, `.prose` conventions from
  `styles.css`) or `bodyMarkdown` (a small built-in converter: `##`/`###`
  headings, fenced code blocks with copy buttons, lists, bold, inline code,
  links). If `wiki.sections` is empty, the generic defaults in `wiki.js`
  render instead — Getting started, Installing, Your first command, How
  skills trigger, Getting help — interpolated from SITE_DATA so they read
  correctly for any plugin.
- **Video placeholders** are styled blocks with a caption slot, marked with
  `VIDEO PLACEHOLDER` comments in `index.html`, `install.html`, and
  `wiki.js`. Replace each block with the real embed when the videos exist
  (they're produced separately, e.g. Ripple / UI Backlot).

## How /fde-deploy instantiates it

1. **Copy this directory** into the team plugin's site location (e.g.
   `docs/` or a `gh-pages` branch of the plugin repo).
2. **Regenerate `data.js` from `catalog.json`** — map catalog fields onto
   the SITE_DATA contract above (plugin → plugin, phases/lanes/skills/
   commands/agents/integrations map directly; write the install block from
   the marketplace URL and plugin name). `data.js` carries a header comment
   saying exactly this; never hand-edit it.
3. **Customize the wiki** — either fill `SITE_DATA.wiki.sections` with
   team-specific articles, or leave it empty and let the generic defaults
   render (customize `defaultSections()` in `wiki.js` if the defaults need
   team flavor). Keep the video placeholder captions in sync with the
   walkthrough videos you plan to record.

No team-specific content belongs anywhere except `data.js` (and, optionally,
wiki articles). The shipped `data.js` contains fictional **Acme Launch Team**
example content mirroring `templates/schemas/catalog.example.json`, so the
template renders out of the box.

## Hosting

Plain static files — GitHub Pages hosts it as-is. Point Pages at the
directory (or push it to a `gh-pages` branch); no build step is needed.
Everything is relative-linked, so it works from a project subpath
(`https://org.github.io/repo/`) as well as from `file://` for local preview.
