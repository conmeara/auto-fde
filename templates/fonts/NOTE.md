# Anthropic fonts

The three variable fonts the Claude platform ships (weights 300–800, upright
only — italics are skipped to keep the embedded pages smaller):

| File                  | Family          | Source (platform.claude.com)                       |
|-----------------------|-----------------|----------------------------------------------------|
| anthropic-sans.woff2  | anthropicSans   | `/_next/static/media/ab687e273440351c-s.p.woff2`   |
| anthropic-serif.woff2 | anthropicSerif  | `/_next/static/media/b13ce8d734b75fb0-s.p.woff2`   |
| anthropic-mono.woff2  | anthropicMono   | `/_next/static/media/523cf6af84f7ca30-s.p.woff2`   |

Fetched 2026-07-07. These are Anthropic-licensed fonts, used here for
Anthropic field-engineering deliverables.

They are embedded as base64 data URIs into `templates/dashboard/dashboard.html`
and `templates/site/site.html` between the `/*__FONTS_START__*/` /
`/*__FONTS_END__*/` markers — the pages must stay self-contained (they open
locally and publish as Claude artifacts, whose CSP blocks external hosts).
Never hand-edit the blob; regenerate it:

```sh
python3 scripts/embed-fonts.py    # rewrites the font block in both templates
```
