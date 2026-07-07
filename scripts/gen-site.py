#!/usr/bin/env python3
"""Generate/refresh <engagement>/site.html for an Auto-FDE engagement.

The team-facing counterpart to gen-dashboard.py: scans the engagement
directory (layout: reference/engagement-layout.md), builds the SITE_DATA
object per templates/site/README.md, and injects it into site.html between
the __SITE_DATA__ markers — copying the template in first if the engagement
doesn't have a site yet.

The result is one self-contained file for the whole client team: Overview
(what the plugin does), Install (how each teammate gets it), Wiki (how-to
articles with demo-video slots). Open it locally, or publish it as a Claude
artifact for a shareable link.

Reads:
    catalog.json             plugin identity, phases, lanes, skills
                             (only built/verified/approved/deployed ship;
                             vendor entries land under "also available"),
                             commands, agents, integrations
    engagement.md            team name fallback when catalog.json lacks one
    .build/deploy.json       installSteps, checklist, support channel/notes,
                             marketplace name — all optional
    .build/wiki/*.md         one Wiki article per file (title from the first
                             heading, content verbatim); a sibling
                             .build/video-briefs/<name>.mp4 fills the
                             article's video slot, else it renders the
                             "coming soon" placeholder

Usage:
    gen-site.py [engagement_root]      default: cwd
"""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

TEMPLATE = Path(__file__).resolve().parent.parent / "templates" / "site" / "site.html"
MARK_START = "/*__SITE_DATA_START__*/"
MARK_END = "/*__SITE_DATA_END__*/"

SHIP_STATUS = {"built", "verified", "approved", "deployed"}


def read_json(path: Path):
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        print(f"warning: unreadable {path}: {e}", file=sys.stderr)
        return None


def team_from_engagement(root: Path) -> str:
    """Fallback team name: a 'Team: …' line, else the first heading."""
    p = root / "engagement.md"
    if not p.is_file():
        return ""
    try:
        text = p.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return ""
    m = re.search(r"^[-*\s]*\*{0,2}team\*{0,2}\s*[:—–-]\s*(.+)$", text, re.I | re.M)
    if m:
        return m.group(1).strip().strip("*").strip()
    m = re.search(r"^#{1,6}\s+(.+)$", text, re.M)
    return m.group(1).strip() if m else ""


def skill_entry(s: dict) -> dict:
    entry = {"slug": s.get("slug", "")}
    for k in ("title", "phase", "lane", "type", "summary"):
        if s.get(k):
            entry[k] = s[k]
    return entry


def wiki_articles(root: Path):
    """One article per .build/wiki/*.md; video slot from .build/video-briefs/."""
    articles = []
    wiki_dir = root / ".build" / "wiki"
    if not wiki_dir.is_dir():
        return articles
    for p in sorted(wiki_dir.glob("*.md")):
        try:
            content = p.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as e:
            print(f"warning: skipping {p}: {e}", file=sys.stderr)
            continue
        m = re.search(r"^#{1,6}\s+(.+)$", content, re.M)
        title = m.group(1).strip() if m else p.stem.replace("-", " ").replace("_", " ").capitalize()
        video_path = root / ".build" / "video-briefs" / (p.stem + ".mp4")
        articles.append({
            "name": p.stem,
            "title": title,
            "markdown": content,
            "video": video_path.relative_to(root).as_posix() if video_path.is_file() else None,
        })
    return articles


def build_data(root: Path):
    catalog = read_json(root / "catalog.json") or {}
    deploy = read_json(root / ".build" / "deploy.json") or {}
    plugin = catalog.get("plugin", {}) if isinstance(catalog.get("plugin"), dict) else {}

    all_skills = [s for s in catalog.get("skills", []) if isinstance(s, dict)]
    shipped = [s for s in all_skills if not s.get("vendor") and s.get("status") in SHIP_STATUS]
    vendor = [s for s in all_skills if s.get("vendor") and s.get("status") != "cut"]

    def named(items):
        return [
            {"name": c.get("name", ""), "summary": c.get("summary", "")}
            for c in items
            if isinstance(c, dict) and c.get("name") and c.get("status") != "cut"
        ]

    # deploy.json tolerance: support may be {channel, notes}, a bare string,
    # or a flat supportChannel key; marketplace may be a name or {name, url}.
    support = deploy.get("support")
    if isinstance(support, str):
        support = {"channel": support}
    if not isinstance(support, dict):
        support = {}
    if not support.get("channel") and deploy.get("supportChannel"):
        support = {**support, "channel": deploy["supportChannel"]}

    marketplace = deploy.get("marketplace")
    mk_name, mk_url = "", ""
    if isinstance(marketplace, dict):
        mk_name = marketplace.get("name", "")
        mk_url = marketplace.get("url", "")
    elif isinstance(marketplace, str):
        mk_name = marketplace

    install = {
        "marketplace": mk_name or plugin.get("name", ""),
        "steps": [s for s in deploy.get("installSteps", []) if isinstance(s, str) and s.strip()],
        "checklist": [c for c in deploy.get("checklist", []) if isinstance(c, dict) and c.get("item")],
    }
    if mk_url:
        install["marketplaceUrl"] = mk_url

    articles = wiki_articles(root)

    data = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "plugin": {
            "name": plugin.get("name", ""),
            "displayName": plugin.get("displayName", ""),
            "version": plugin.get("version", ""),
            "description": plugin.get("description", ""),
        },
        "team": catalog.get("team", "") or team_from_engagement(root),
        "phases": [p for p in catalog.get("phases", []) if isinstance(p, str)],
        "lanes": [l for l in catalog.get("lanes", []) if isinstance(l, str)],
        "skills": [skill_entry(s) for s in shipped],
        "vendorSkills": [
            {**skill_entry(s), "vendor": s["vendor"] if isinstance(s["vendor"], str) else True}
            for s in vendor
        ],
        "commands": named(catalog.get("commands", []) if isinstance(catalog.get("commands"), list) else []),
        "agents": named(catalog.get("agents", []) if isinstance(catalog.get("agents"), list) else []),
        "integrations": [
            {"name": t.get("name", ""), "kind": t.get("kind", ""), "authNotes": t.get("authNotes", "")}
            for t in (catalog.get("integrations", []) if isinstance(catalog.get("integrations"), list) else [])
            if isinstance(t, dict) and t.get("name")
        ],
        "install": install,
        "support": support,
        "wiki": articles,
    }
    return data, len(articles), len(shipped)


def inject(root: Path, data):
    """Write data into site.html between the markers.

    Always seeds from the template — the page is never hand-edited, so
    re-seeding is lossless, and reusing an existing page would freeze the
    site on whatever template version first generated it.
    """
    target = root / "site.html"
    if TEMPLATE.is_file():
        page = TEMPLATE.read_text(encoding="utf-8")
    elif target.is_file():
        print(f"warning: template missing at {TEMPLATE}; re-injecting into the existing page", file=sys.stderr)
        page = target.read_text(encoding="utf-8")
    else:
        sys.exit(f"error: site template not found at {TEMPLATE}")
    if MARK_START not in page or MARK_END not in page:
        sys.exit(f"error: data markers missing from {TEMPLATE if TEMPLATE.is_file() else target}")
    start = page.index(MARK_START) + len(MARK_START)
    end = page.index(MARK_END)
    # "</" must not appear raw inside a script element (wiki markdown can
    # contain markup) — escape it the standard way.
    payload = json.dumps(data, indent=2, ensure_ascii=False).replace("</", "<\\/")
    page = page[:start] + "\nwindow.SITE_DATA = " + payload + ";\n" + page[end:]
    target.write_text(page, encoding="utf-8")
    return target


def main():
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
    data, n_articles, n_skills = build_data(root)
    target = inject(root, data)
    print(
        f"wrote {target} ({target.stat().st_size:,} bytes) — "
        f"{n_skills} skill{'s' if n_skills != 1 else ''}, "
        f"{n_articles} wiki article{'s' if n_articles != 1 else ''}"
    )


if __name__ == "__main__":
    main()
