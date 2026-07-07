#!/usr/bin/env python3
"""Generate/refresh <engagement>/dashboard.html for an Auto-FDE engagement.

Scans the engagement directory (layout: reference/engagement-layout.md),
builds the FDE_DATA object per templates/dashboard/DATA-CONTRACT.md, and
injects it into dashboard.html between the __FDE_DATA__ markers — copying
the template in first if the engagement doesn't have a dashboard yet.

The result is one self-contained file: open it locally, or publish it as a
Claude artifact for a shareable link. Sections are omitted when their inputs
don't exist yet; the Overview page always renders (as the guided tour on a fresh
engagement, as live state after).

Usage:
    gen-dashboard.py [engagement_root]            default: cwd
    gen-dashboard.py --example [engagement_root]  inject the fictional
                                                  Acme example data instead
                                                  of scanning (for previews)
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "dashboard"
MARK_START = "/*__FDE_DATA_START__*/"
MARK_END = "/*__FDE_DATA_END__*/"

TEXT_EXT = {".md", ".txt", ".json", ".js", ".py", ".sh", ".yaml", ".yml", ".html", ".css", ".csv"}
MAX_FILE_BYTES = 400_000  # guard against a stray huge file bloating the page

PHASE_ORDER = ["setup", "discover", "plan", "build", "review", "test", "eval", "deploy", "improve"]
PHASE_CMD = {
    "setup": "/fde",
    "discover": "/fde-discover",
    "plan": "/fde-plan",
    "build": "/fde-build",
    "review": "/fde-review",
    "test": "/fde-test",
    "eval": "/fde-eval",
    "deploy": "/fde-deploy",
    "improve": "/fde-improve",
}


def read_json(path: Path):
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        print(f"warning: unreadable {path}: {e}", file=sys.stderr)
        return None


def skill_files(skill_dir: Path):
    files = []

    def rank(p: Path):
        # contract order: SKILL.md, then references/, then evals/, then the rest
        top = p.relative_to(skill_dir).parts[0]
        return ({"references": 0, "evals": 1}.get(top, 2), p.as_posix())

    ordered = [skill_dir / "SKILL.md"] + sorted(
        (p for p in skill_dir.rglob("*") if p.is_file() and p.name != "SKILL.md"),
        key=rank,
    )
    for p in ordered:
        if not p.is_file():
            continue
        rel = p.relative_to(skill_dir).as_posix()
        if p.suffix.lower() not in TEXT_EXT:
            files.append({"path": rel, "content": f"(binary asset: {p.stat().st_size} bytes)"})
            continue
        if p.stat().st_size > MAX_FILE_BYTES:
            files.append({"path": rel, "content": f"(file too large for the dashboard: {p.stat().st_size} bytes)"})
            continue
        try:
            files.append({"path": rel, "content": p.read_text(encoding="utf-8")})
        except (OSError, UnicodeDecodeError) as e:
            files.append({"path": rel, "content": f"(unreadable: {e})"})
    return files


def latest_mtime(paths):
    mt = 0.0
    for p in paths:
        try:
            mt = max(mt, p.stat().st_mtime)
        except OSError:
            pass
    return mt


def trigger_targets_met(trigger):
    """The eval bar: hold-out (or legacy flat) accuracy >= 0.99 at precision 1.0."""
    if not isinstance(trigger, dict):
        return False
    scored = trigger.get("holdout") if isinstance(trigger.get("holdout"), dict) else trigger
    try:
        return float(scored.get("accuracy", 0)) >= 0.99 and float(scored.get("precision", 0)) >= 1.0
    except (TypeError, ValueError):
        return False


def derive_status(root: Path, catalog, data):
    """Everything the Overview page needs: spine states, next command, gates, attention."""
    build = root / ".build"
    digests = sorted((root / "discovery" / "digests").glob("*.md")) if (root / "discovery" / "digests").is_dir() else []
    plugin_name = (catalog or {}).get("plugin", {}).get("name", "")
    plugin_dir = root / plugin_name if plugin_name else None
    skills_dir = plugin_dir / "skills" if plugin_dir else None

    cat_skills = [s for s in (catalog or {}).get("skills", []) if isinstance(s, dict)]
    buildable = [s for s in cat_skills if not s.get("vendor") and s.get("status") != "cut"]
    built_dirs = (
        sorted(d for d in skills_dir.iterdir() if (d / "SKILL.md").is_file())
        if skills_dir and skills_dir.is_dir()
        else []
    )
    approved = [s for s in buildable if s.get("status") in ("approved", "deployed")]

    trigger = read_json(build / "trigger-report.json")
    output_evals = read_json(build / "output-evals.json")
    practice = read_json(build / "practice-report.json")
    deploy = read_json(build / "deploy.json")
    test_log = read_json(build / "test-log.json")
    coverage = test_log.get("coverage", {}) if isinstance(test_log, dict) else {}
    tested = [d.name for d in built_dirs if d.name in coverage] if built_dirs else []

    feedback_files = (
        sorted(p for p in (root / "feedback").iterdir() if p.is_file() and not p.name.startswith("."))
        if (root / "feedback").is_dir()
        else []
    )
    feedback_log = read_json(build / "feedback-log.json") or {}
    converted = set(feedback_log.get("converted", [])) if isinstance(feedback_log, dict) else set()
    feedback_queue = len([p for p in feedback_files if p.name not in converted])

    # A trigger score only counts while no description changed after it was measured.
    stale_trigger = False
    if trigger and built_dirs:
        report_mtime = latest_mtime([build / "trigger-report.json"])
        skills_mtime = latest_mtime([d / "SKILL.md" for d in built_dirs])
        stale_trigger = skills_mtime > report_mtime

    deploy_done = bool(deploy) and all(c.get("done") for c in deploy.get("checklist", []) if isinstance(c, dict))

    done = {
        "setup": (root / "engagement.md").is_file(),
        "discover": len(digests) > 0,
        "plan": bool(catalog) and (len(built_dirs) > 0 or any(s.get("status") != "planned" for s in buildable)),
        "build": len(built_dirs) > 0 and len(built_dirs) >= len(buildable) > 0,
        "review": len(approved) > 0 or bool(trigger),
        # the human's phase: done when every built skill has a coverage row
        "test": len(built_dirs) > 0 and len(tested) >= len(built_dirs),
        "eval": trigger_targets_met(trigger) and not stale_trigger,
        "deploy": deploy_done,
        "improve": False,  # the flywheel never finishes
    }

    stat = {
        "setup": "engagement.md" if done["setup"] else "",
        "discover": f"{len(digests)} digests" if digests else "",
        "plan": f"{len(cat_skills)} skills planned" if catalog else "",
        "build": f"{len(built_dirs)}/{len(buildable)} built" if built_dirs else "",
        "review": f"{len(approved)}/{len(buildable)} approved" if approved else ("notes pending" if done["build"] else ""),
        "test": f"{len(tested)}/{len(built_dirs)} skills tested" if test_log and built_dirs else "",
        "eval": "",
        "deploy": "checklist done" if deploy_done else ("in progress" if deploy else ""),
        "improve": f"{feedback_queue} reports queued" if feedback_queue else "",
    }
    if trigger:
        scored = trigger.get("holdout") if isinstance(trigger.get("holdout"), dict) else trigger
        acc = scored.get("accuracy")
        if isinstance(acc, (int, float)):
            stat["eval"] = f"trigger {round(acc * 1000) / 10}%" + (" · stale" if stale_trigger else "")

    current = next((p for p in PHASE_ORDER if not done[p]), "improve")
    spine = []
    for p in PHASE_ORDER:
        state = "done" if done[p] else ("current" if p == current else "pending")
        spine.append({"id": p, "state": state, "stat": stat[p]})

    # Next command + why. Setup has no command of its own — /fde only
    # regenerates this page; the kickoff interview lives in /fde-discover,
    # so pointing at /fde here would be a self-loop.
    next_cmd = PHASE_CMD["discover"] if current == "setup" else PHASE_CMD[current]
    reasons = {
        "setup": "Nothing exists yet — the kickoff interview starts the engagement.",
        "discover": "No digests yet — discovery turns team materials and interviews into the knowledge everything else builds from.",
        "plan": "Digests exist but there's no approved catalog — planning proposes what to build.",
        "build": "The catalog is set — build authors every approved skill with evals and checks.",
        "review": "Skills are built — read them on the Skills page and export your notes.",
        "test": "Reviewed skills need real usage — test them live with the kits, correct in chat, and harvest the cases before formal evals.",
        "eval": "Testing seeded the cases — now the benchmarks prove routing and outputs hold at scale.",
        "deploy": "Evals pass — package the plugin, generate the site, prep the rollout.",
        "improve": "The plugin is live — turn field reports into eval cases and fixes.",
    }
    reason = reasons[current]
    if current == "eval" and stale_trigger:
        next_cmd = "/fde-eval trigger"
        reason = "Descriptions changed since the last benchmark — the trigger score is stale and must be re-run."
    if current == "improve" and feedback_queue:
        reason = f"{feedback_queue} field report{'s' if feedback_queue != 1 else ''} in feedback/ await conversion into eval cases and fixes."

    # Gates awaiting the human
    gates = []
    if catalog and not built_dirs and not approved:
        gates.append({"id": 1, "label": "Gate 1 · approve the plan", "waiting": len(buildable)})
    if built_dirs and len(approved) < len(buildable):
        gates.append({"id": 2, "label": "Gate 2 · review the skills", "waiting": len(built_dirs) - len(approved)})
    if output_evals and isinstance(output_evals, dict) and output_evals.get("cases") and current == "eval":
        gates.append({"id": 3, "label": "Gate 3 · review eval outputs", "waiting": len(output_evals["cases"])})

    open_qs = data.get("openQuestions") or []
    eval_debt = [
        d.name for d in built_dirs
        if not (d / "evals" / "trigger-evals.json").is_file()
    ]
    attention = {}
    unresolved = len([q for q in open_qs if isinstance(q, dict) and q.get("status") != "resolved"])
    if unresolved:
        attention["openQuestions"] = unresolved
    if eval_debt:
        attention["evalDebt"] = eval_debt
    if stale_trigger:
        attention["staleTrigger"] = True
    if feedback_queue:
        attention["feedbackQueue"] = feedback_queue

    # Output-eval scores only count while no skill content changed after the
    # run (evals/ edits don't count — cases growing is normal).
    stale_output = False
    if output_evals and built_dirs:
        report_mtime = latest_mtime([build / "output-evals.json"])
        content_mtime = latest_mtime([
            p for d in built_dirs for p in d.rglob("*")
            if p.is_file() and (p.relative_to(d).parts or ("",))[0] != "evals"
        ])
        stale_output = content_mtime > report_mtime
    if stale_output:
        attention["staleOutput"] = True

    # One-line summary for the Home header
    bits = []
    if digests:
        bits.append(f"{len(digests)} digests")
    if built_dirs:
        bits.append(f"{len(built_dirs)} skills built")
    if tested:
        bits.append(f"{len(tested)}/{len(built_dirs)} tested")
    if stat["eval"]:
        bits.append(stat["eval"])
    if practice and isinstance(practice, dict) and practice.get("runbook"):
        steps = practice["runbook"]
        ok = len([s for s in steps if isinstance(s, dict) and s.get("verdict") == "pass"])
        bits.append(f"practice {ok}/{len(steps)}")

    return {
        "phase": current,
        "stepsDone": sum(1 for p in PHASE_ORDER if done[p]),
        "stepsTotal": len(PHASE_ORDER),
        "summary": " · ".join(bits),
        "next": {"command": next_cmd, "reason": reason},
        "gates": gates,
        "attention": attention,
        "spine": spine,
    }


def build_data(root: Path):
    build = root / ".build"
    data = {"generated": datetime.now(timezone.utc).isoformat(timespec="seconds")}

    catalog = read_json(root / "catalog.json")
    if catalog:
        data["engagement"] = {
            "team": catalog.get("team", ""),
            "pluginName": catalog.get("plugin", {}).get("name", ""),
            "version": catalog.get("plugin", {}).get("version", ""),
        }
        data["catalog"] = {
            "phases": catalog.get("phases", []),
            "lanes": catalog.get("lanes", []),
            "skills": catalog.get("skills", []),
            "commands": catalog.get("commands", []),
            "agents": catalog.get("agents", []),
            "integrations": catalog.get("integrations", []),
        }

    oq = read_json(build / "open-questions.json")
    if oq:
        data["openQuestions"] = oq

    # Built skills: plugin dir named by the catalog
    if catalog:
        plugin_dir = root / catalog.get("plugin", {}).get("name", "")
        skills_dir = plugin_dir / "skills"
        if skills_dir.is_dir():
            scores = read_json(build / "verify-scores.json") or {}
            built = {}
            for d in sorted(skills_dir.iterdir()):
                if not (d / "SKILL.md").is_file():
                    continue
                entry = {"files": skill_files(d)}
                s = scores.get(d.name)
                if s:
                    entry["scores"] = {
                        "fidelity": s.get("scores", {}).get("fidelity"),
                        "bestPractices": s.get("scores", {}).get("bestPractices"),
                        "triggering": s.get("scores", {}).get("triggering"),
                        "verdict": s.get("verdict"),
                    }
                    entry["openQuestions"] = s.get("openQuestions", [])
                built[d.name] = entry
            if built:
                data["builtSkills"] = built

    # Test phase: coverage/series from the log, kits from test/kits/
    test_log = read_json(build / "test-log.json")
    kits_dir = root / "test" / "kits"
    if test_log or kits_dir.is_dir():
        test = {}
        cov = test_log.get("coverage", {}) if isinstance(test_log, dict) else {}
        slugs = sorted(data.get("builtSkills", {}).keys()) or sorted(cov.keys())
        if slugs:
            rows = []
            for s in slugs:
                row = {"slug": s, "verdict": "untested"}
                c = cov.get(s)
                if isinstance(c, dict):
                    row["verdict"] = c.get("verdict", "issues")
                    if c.get("lastSeries") is not None:
                        row["lastSeries"] = c["lastSeries"]
                rows.append(row)
            test["coverage"] = rows
        if isinstance(test_log, dict) and test_log.get("series"):
            test["series"] = test_log["series"]
        if kits_dir.is_dir():
            kits = []
            for d in sorted(kits_dir.iterdir()):
                if not d.is_dir():
                    continue
                readme = d / "README.md"
                arts = [p for p in sorted(d.iterdir()) if p.is_file() and p.name != "README.md"]
                kits.append({
                    "journey": d.name,
                    "artifact": arts[0].relative_to(root).as_posix() if arts else "",
                    "readme": readme.read_text(encoding="utf-8") if readme.is_file() else "",
                })
            if kits:
                test["kits"] = kits
        if catalog and catalog.get("plugin", {}).get("name"):
            test["liveLoad"] = f"cd <scratch dir> && claude --plugin-dir {(root / catalog['plugin']['name']).as_posix()}"
        if test:
            data["test"] = test

    trigger = read_json(build / "trigger-report.json")
    output_evals = read_json(build / "output-evals.json")
    practice = read_json(build / "practice-report.json")
    regressions = read_json(build / "regressions.json")
    report_md = build / "eval-report.md"
    if trigger or output_evals or practice or regressions or report_md.is_file():
        evals = {}
        if trigger:
            evals["trigger"] = trigger
        if output_evals:
            evals["output"] = output_evals
        if practice:
            evals["practice"] = practice
        if regressions:
            evals["regressions"] = regressions
        if report_md.is_file():
            evals["reportMarkdown"] = report_md.read_text(encoding="utf-8")
        data["evals"] = evals

    deploy = read_json(build / "deploy.json")
    if deploy:
        data["deploy"] = deploy

    data["status"] = derive_status(root, catalog, data)
    return data


def inject(root: Path, data):
    """Write data into dashboard.html between the markers.

    Always seeds from the template: the page is never hand-edited (reviewer
    state lives in the browser's localStorage, not the file), so re-seeding
    is lossless — and reusing an existing page would freeze an engagement on
    whatever template version first generated it.
    """
    target = root / "dashboard.html"
    template = TEMPLATE_DIR / "dashboard.html"
    if template.is_file():
        page = template.read_text(encoding="utf-8")
    elif target.is_file():
        print(f"warning: template missing at {template}; re-injecting into the existing page", file=sys.stderr)
        page = target.read_text(encoding="utf-8")
    else:
        sys.exit(f"error: dashboard template not found at {template}")
    if MARK_START not in page or MARK_END not in page:
        sys.exit(f"error: data markers missing from {template if template.is_file() else target}")
    start = page.index(MARK_START) + len(MARK_START)
    end = page.index(MARK_END)
    # "</" must not appear raw inside a script element (it would end the tag
    # mid-JSON when skill files contain markup) — escape it the standard way.
    payload = json.dumps(data, indent=2, ensure_ascii=False).replace("</", "<\\/")
    page = page[:start] + "\nwindow.FDE_DATA = " + payload + ";\n" + page[end:]
    target.write_text(page, encoding="utf-8")
    return target


def main():
    argv = [a for a in sys.argv[1:]]
    example = "--example" in argv
    argv = [a for a in argv if a != "--example"]
    root = Path(argv[0]).resolve() if argv else Path.cwd()

    if example:
        sample = TEMPLATE_DIR / "data.example.json"
        if not sample.is_file():
            sys.exit(f"error: {sample} not found")
        data = json.loads(sample.read_text(encoding="utf-8"))
        data["generated"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    else:
        data = build_data(root)

    target = inject(root, data)
    tabs = ["home"] + [t for t in ("catalog", "builtSkills", "test", "evals", "deploy") if t in data]
    nxt = data.get("status", {}).get("next", {}).get("command", "")
    print(f"wrote {target} ({target.stat().st_size:,} bytes) — tabs: {', '.join(tabs)}"
          + (f" — next: {nxt}" if nxt else ""))


if __name__ == "__main__":
    main()
