# Site spec

Informational site for the Creative Studio plugin (hosted on GitHub Pages).
Not a SaaS pitch — just what it is, how to install it, and how to use it.
Design: clean HTML with a quiet Claude flavor — oat ground, carbon ink,
terracotta accent, serif display + Inter. No Anthropic branding, no
partnership claims, no manifesto copy ("80% / work around the work" is out).

Pages (three only):

- **Overview** (`index.html`)
  - Short hero: what it is + 41 skills · 6 commands · 3 agents
  - Demo video placeholder
  - One-paragraph "how it works"
  - The skills catalog grouped by phase (like the review page's library
    view): Anytime · Intake · Pre-Production · Production · Post-Production ·
    Wrap, each card with name + description + PM/Creative tag, then Agents
- **Install** (`install.html`)
  - Video placeholder, 3 steps (marketplace add → 4 plugins → `/cs`),
    connections (OneDrive none, Airtable + Figma sign-in, Frame.io token)
- **Tutorials** (`tutorials.html`) — the wiki
  - Sidebar + hash-routed articles from `assets/wiki.js`
  - Sections: Getting started · The pipeline · Everyday workflows ·
    Integrations · Agents & review · Help
  - Video placeholder at the top of every article

Data source of truth: `assets/data.js` mirrors `SKILLS_LOCAL` in
`spec/review.html` (41 built skills + 4 from the Figma plugin, 3 agents).
