#!/usr/bin/env python3
"""Aggregate backend cobertura + frontend jest json-summary into a markdown
block suitable for a GitHub PR sticky comment.

Usage: coverage-summary.py [backend_dir] [frontend_dir]

Defaults: backend/coverage and frontend/coverage relative to CWD.
"""
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def aggregate_cobertura(root: Path):
    files = list(root.rglob("coverage.cobertura.xml"))
    if not files:
        return None
    lines_covered = 0
    lines_total = 0
    branches_covered = 0
    branches_total = 0
    for f in files:
        try:
            tree = ET.parse(f)
        except ET.ParseError:
            continue
        cov = tree.getroot()
        lines_covered += int(cov.get("lines-covered") or 0)
        lines_total += int(cov.get("lines-valid") or 0)
        branches_covered += int(cov.get("branches-covered") or 0)
        branches_total += int(cov.get("branches-valid") or 0)
    return {
        "lines_covered": lines_covered,
        "lines_total": lines_total,
        "branches_covered": branches_covered,
        "branches_total": branches_total,
        "files": len(files),
    }


def load_jest_summary(root: Path):
    path = root / "coverage-summary.json"
    if not path.is_file():
        path = next((p for p in root.rglob("coverage-summary.json")), None)
    if not path:
        return None
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None
    total = data.get("total")
    if not total:
        return None
    return {
        "lines": total.get("lines", {}),
        "statements": total.get("statements", {}),
        "functions": total.get("functions", {}),
        "branches": total.get("branches", {}),
        "source": str(path),
    }


def pct(covered, total):
    if not total:
        return "—", 0.0
    return f"{100.0 * covered / total:.2f}%", 100.0 * covered / total


def render(backend, frontend):
    lines = ["<!-- mozgoslav-coverage -->", "## Coverage", ""]

    lines.append("### Backend")
    if backend is None or backend["lines_total"] == 0:
        lines.append("_no cobertura reports found under `backend/coverage`_")
    else:
        line_pct, _ = pct(backend["lines_covered"], backend["lines_total"])
        branch_pct, _ = pct(backend["branches_covered"], backend["branches_total"])
        lines.append("| metric | covered | total | % |")
        lines.append("|--------|--------:|------:|---:|")
        lines.append(f"| lines | {backend['lines_covered']} | {backend['lines_total']} | {line_pct} |")
        lines.append(f"| branches | {backend['branches_covered']} | {backend['branches_total']} | {branch_pct} |")
        lines.append(f"_aggregated from {backend['files']} cobertura report(s)_")
    lines.append("")

    lines.append("### Frontend")
    if frontend is None:
        lines.append("_no `coverage-summary.json` under `frontend/coverage`_")
    else:
        lines.append("| metric | covered | total | % |")
        lines.append("|--------|--------:|------:|---:|")
        for key in ("statements", "branches", "functions", "lines"):
            m = frontend.get(key) or {}
            covered = m.get("covered", 0)
            total = m.get("total", 0)
            p, _ = pct(covered, total)
            lines.append(f"| {key} | {covered} | {total} | {p} |")
    lines.append("")

    lines.append("_updated on every CI run on this PR._")
    return "\n".join(lines) + "\n"


def main():
    backend_root = Path(sys.argv[1] if len(sys.argv) > 1 else "backend/coverage")
    frontend_root = Path(sys.argv[2] if len(sys.argv) > 2 else "frontend/coverage")
    backend = aggregate_cobertura(backend_root) if backend_root.exists() else None
    frontend = load_jest_summary(frontend_root) if frontend_root.exists() else None
    sys.stdout.write(render(backend, frontend))


if __name__ == "__main__":
    main()
