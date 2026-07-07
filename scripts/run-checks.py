#!/usr/bin/env python3
"""Deterministic checks.json runner — the mechanical half of Auto-FDE grading.

Usage:
    run-checks.py <checks.json> <artifact-path>... [--plugin-root DIR] [--out FILE]

Each <artifact-path> is a file or a directory (every text file inside is
searched). Mechanical kinds — contains, contains-all, regex, path-resolves —
are executed here, with per-check evidence (what matched or what is missing,
and in which file). Trace kinds — used-tool, ran-command — are graded against
a Claude Code stream-json session transcript passed via --trace (the harness
record of what the agent actually did, not what it claims). "judge" kinds are
returned with passed: null for an LLM judge to rule on. Unknown kinds fail
loudly.

Graders copy this JSON verbatim for mechanical checks; agents never re-decide
them. This script is copied into every built plugin's scripts/ at scaffold
time so the team's evals stay runnable after handoff.

Exit codes: 0 = every mechanical check passed, 1 = at least one failed,
2 = usage or input error. The JSON on stdout is the interface either way.
"""

import argparse
import json
import os
import re
import sys

MAX_FILE_BYTES = 2 * 1024 * 1024
SNIPPET = 120

MECHANICAL = {"contains", "contains-all", "regex", "path-resolves"}
TRACE = {"used-tool", "ran-command"}


def short(s, n=SNIPPET):
    s = str(s).replace("\n", "\\n")
    return s if len(s) <= n else s[: n - 1] + "…"


def collect_files(paths):
    """Return [(relpath-ish label, content)] for every readable text file."""
    out, skipped = [], []
    for p in paths:
        p = os.path.abspath(p)
        if os.path.isfile(p):
            candidates = [(os.path.basename(p), p)]
        elif os.path.isdir(p):
            candidates = []
            for root, dirs, files in os.walk(p):
                dirs[:] = [d for d in dirs if not d.startswith(".git")]
                for f in sorted(files):
                    fp = os.path.join(root, f)
                    candidates.append((os.path.relpath(fp, p), fp))
        else:
            skipped.append(f"{p} (does not exist)")
            continue
        for label, fp in candidates:
            try:
                if os.path.getsize(fp) > MAX_FILE_BYTES:
                    skipped.append(f"{label} (>{MAX_FILE_BYTES // 1024**2}MB)")
                    continue
                with open(fp, encoding="utf-8", errors="replace") as fh:
                    out.append((label, fh.read()))
            except OSError as e:
                skipped.append(f"{label} ({e.strerror})")
    return out, skipped


def find_in_files(files, needle):
    for label, content in files:
        if needle in content:
            return label
    return None


def load_trace(paths):
    """Parse stream-json transcript(s) into a flat list of tool_use records."""
    tools = []

    def scan(node):
        if isinstance(node, dict):
            if node.get("type") == "tool_use" and "name" in node:
                tools.append({"name": node["name"], "input": node.get("input", {})})
            for v in node.values():
                scan(v)
        elif isinstance(node, list):
            for v in node:
                scan(v)

    for p in paths:
        try:
            with open(p, encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        scan(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        except OSError:
            return None
    return tools


def run_trace_check(check, kind, name, row, tools):
    if tools is None:
        row["passed"] = False
        row["evidence"] = f"'{kind}' check but no readable --trace transcript was provided"
        return row
    value = check.get("value")
    if not isinstance(value, str):
        row["passed"], row["evidence"] = False, f"malformed check: '{kind}' needs a string 'value'"
        return row
    if kind == "used-tool":
        hits = [t for t in tools if t["name"] == value]
        row["passed"] = bool(hits)
        row["evidence"] = (
            f"tool '{value}' used {len(hits)}× (first input: {short(json.dumps(hits[0]['input'], ensure_ascii=False), 80)})"
            if hits
            else f"tool '{value}' never used ({len(tools)} tool calls in trace)"
        )
        return row
    # ran-command: substring match over Bash tool command inputs
    cmds = [t["input"].get("command", "") for t in tools if t["name"] == "Bash" and isinstance(t.get("input"), dict)]
    hit = next((c for c in cmds if value in c), None)
    row["passed"] = hit is not None
    row["evidence"] = (
        f"ran: {short(hit, 100)}" if hit else f"no Bash command containing '{short(value, 60)}' ({len(cmds)} commands in trace)"
    )
    return row


def run_check(check, files, artifact_dirs, plugin_root, trace_tools):
    kind = check.get("kind")
    name = check.get("name", "(unnamed)")
    row = {"name": name, "kind": kind}
    if check.get("why"):
        row["why"] = check["why"]

    if kind == "judge":
        row["passed"] = None
        row["evidence"] = "judge kind — an LLM judge rules on this, not the checker"
        return row

    if kind in TRACE:
        return run_trace_check(check, kind, name, row, trace_tools)

    if kind not in MECHANICAL:
        row["passed"] = False
        row["evidence"] = f"unknown check kind '{kind}' — fix checks.json (validator should flag this)"
        return row

    if kind == "contains":
        value = check.get("value")
        if not isinstance(value, str):
            row["passed"], row["evidence"] = False, "malformed check: 'contains' needs a string 'value'"
            return row
        hit = find_in_files(files, value)
        row["passed"] = hit is not None
        row["evidence"] = (
            f"found '{short(value)}' in {hit}" if hit else f"'{short(value)}' not found in {len(files)} file(s)"
        )
        return row

    if kind == "contains-all":
        values = check.get("values")
        if not isinstance(values, list) or not values:
            row["passed"], row["evidence"] = False, "malformed check: 'contains-all' needs a non-empty 'values' list"
            return row
        found, missing = [], []
        for v in values:
            hit = find_in_files(files, v)
            (found if hit else missing).append((v, hit))
        row["passed"] = not missing
        if missing:
            row["evidence"] = (
                f"missing {len(missing)}/{len(values)}: "
                + "; ".join(f"'{short(v, 60)}'" for v, _ in missing)
            )
        else:
            row["evidence"] = f"all {len(values)} found (" + "; ".join(
                f"'{short(v, 40)}' in {hit}" for v, hit in found[:4]
            ) + ("; …" if len(found) > 4 else "") + ")"
        return row

    if kind == "regex":
        pattern = check.get("value")
        if not isinstance(pattern, str):
            row["passed"], row["evidence"] = False, "malformed check: 'regex' needs a string 'value'"
            return row
        try:
            rx = re.compile(pattern, re.MULTILINE)
        except re.error as e:
            row["passed"], row["evidence"] = False, f"invalid regex: {e}"
            return row
        for label, content in files:
            m = rx.search(content)
            if m:
                row["passed"] = True
                row["evidence"] = f"matched '{short(m.group(0), 80)}' in {label}"
                return row
        row["passed"] = False
        row["evidence"] = f"regex '{short(pattern, 60)}' matched nothing in {len(files)} file(s)"
        return row

    # path-resolves
    value = check.get("value")
    if not isinstance(value, str):
        row["passed"], row["evidence"] = False, "malformed check: 'path-resolves' needs a string 'value'"
        return row
    path = value
    if "${CLAUDE_PLUGIN_ROOT}" in path:
        if not plugin_root:
            row["passed"], row["evidence"] = False, "path uses ${CLAUDE_PLUGIN_ROOT} but --plugin-root was not given"
            return row
        path = path.replace("${CLAUDE_PLUGIN_ROOT}", plugin_root)
    candidates = (
        [path]
        if os.path.isabs(path)
        else [os.path.join(d, path) for d in artifact_dirs] + ([os.path.join(plugin_root, path)] if plugin_root else [])
    )
    for cand in candidates:
        if os.path.exists(cand):
            row["passed"] = True
            row["evidence"] = f"resolves: {os.path.abspath(cand)}"
            return row
    row["passed"] = False
    row["evidence"] = f"does not resolve: tried {', '.join(os.path.abspath(c) for c in candidates)}"
    return row


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("checks", help="path to checks.json")
    ap.add_argument("artifacts", nargs="+", help="artifact file(s) or director(ies) to grade")
    ap.add_argument("--plugin-root", help="directory ${CLAUDE_PLUGIN_ROOT} resolves to")
    ap.add_argument("--trace", action="append", default=[], help="stream-json session transcript (repeatable) for used-tool / ran-command checks")
    ap.add_argument("--out", help="also write the JSON report to this file")
    args = ap.parse_args()
    if args.plugin_root:
        args.plugin_root = os.path.abspath(args.plugin_root)

    try:
        with open(args.checks, encoding="utf-8") as fh:
            checks = json.load(fh)
    except (OSError, json.JSONDecodeError) as e:
        print(json.dumps({"error": f"cannot read checks file: {e}"}), file=sys.stdout)
        return 2
    if not isinstance(checks, list):
        print(json.dumps({"error": "checks.json must be a JSON array of checks"}))
        return 2

    files, skipped = collect_files(args.artifacts)
    artifact_dirs = [os.path.abspath(p) for p in args.artifacts if os.path.isdir(p)]
    if not artifact_dirs:
        artifact_dirs = [os.path.dirname(os.path.abspath(p)) for p in args.artifacts]

    trace_tools = load_trace(args.trace) if args.trace else None
    rows = [run_check(c, files, artifact_dirs, args.plugin_root, trace_tools) for c in checks]
    report = {
        "checksFile": os.path.abspath(args.checks),
        "artifacts": [os.path.abspath(p) for p in args.artifacts],
        "filesSearched": len(files),
        "skippedFiles": skipped,
        "total": len(rows),
        "passed": sum(1 for r in rows if r["passed"] is True),
        "failed": sum(1 for r in rows if r["passed"] is False),
        "judge": sum(1 for r in rows if r["passed"] is None),
        "checks": rows,
    }
    text = json.dumps(report, indent=2, ensure_ascii=False)
    print(text)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(text + "\n")
    return 1 if report["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
