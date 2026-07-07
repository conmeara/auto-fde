#!/usr/bin/env python3
"""Embed the Anthropic fonts into the dashboard and site templates.

Reads templates/fonts/*.woff2 (see templates/fonts/NOTE.md for provenance)
and rewrites the @font-face block between the /*__FONTS_START__*/ /
/*__FONTS_END__*/ markers in both templates as base64 data URIs. The pages
must stay fully self-contained — they open locally and publish as Claude
artifacts, whose CSP blocks requests to external hosts — so embedding is
the only way to ship real fonts with them.

Run after updating any .woff2 file; a no-op otherwise (output is
deterministic).

Usage:
    embed-fonts.py
"""
import base64
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "templates" / "fonts"
TARGETS = [
    ROOT / "templates" / "dashboard" / "dashboard.html",
    ROOT / "templates" / "site" / "site.html",
]
MARK_START = "/*__FONTS_START__*/"
MARK_END = "/*__FONTS_END__*/"

FACES = [
    ("anthropicSans", "anthropic-sans.woff2"),
    ("anthropicSerif", "anthropic-serif.woff2"),
    ("anthropicMono", "anthropic-mono.woff2"),
]


def font_block() -> str:
    rules = []
    for family, filename in FACES:
        path = FONTS / filename
        if not path.is_file():
            sys.exit(f"error: missing font file {path}")
        b64 = base64.b64encode(path.read_bytes()).decode("ascii")
        rules.append(
            "@font-face{"
            f'font-family:"{family}";'
            'font-style:normal;font-weight:300 800;font-display:swap;'
            f'src:url(data:font/woff2;base64,{b64}) format("woff2");'
            "}"
        )
    return "\n" + "\n".join(rules) + "\n"


def main():
    block = font_block()
    for target in TARGETS:
        if not target.is_file():
            sys.exit(f"error: template not found: {target}")
        page = target.read_text(encoding="utf-8")
        if MARK_START not in page or MARK_END not in page:
            sys.exit(f"error: font markers missing from {target}")
        start = page.index(MARK_START) + len(MARK_START)
        end = page.index(MARK_END)
        page = page[:start] + block + page[end:]
        target.write_text(page, encoding="utf-8")
        print(f"embedded {len(FACES)} fonts into {target.relative_to(ROOT)} "
              f"({target.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
