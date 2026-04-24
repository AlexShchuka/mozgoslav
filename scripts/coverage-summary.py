#!/usr/bin/env python3
"""Aggregate coverage reports from every language and emit a markdown block
for the PR sticky comment:
  - backend .NET: cobertura XML produced by coverlet.collector
  - python: cobertura XML produced by pytest-cov
  - frontend jest: coverage-summary.json produced by the `json-summary` reporter
  - native swift: lcov exported via `xcrun llvm-cov export -format=lcov`

Each source is optional; missing reports degrade to a "no report" line.
"""
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def aggregate_cobertura(root: Path):
    if not root.exists():
        return None
    files = list(root.rglob("coverage.cobertura.xml"))
    if not files:
        files = list(root.rglob("*.cobertura.xml"))
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


def aggregate_lcov(root: Path):
    if not root.exists():
        return None
    files = list(root.rglob("*.lcov"))
    if not files:
        files = list(root.rglob("lcov.info"))
    if not files:
        return None
    lines_covered = 0
    lines_total = 0
    branches_covered = 0
    branches_total = 0
    records = 0
    for f in files:
        try:
            text = f.read_text(errors="ignore")
        except OSError:
            continue
        for line in text.splitlines():
            if line.startswith("LH:"):
                lines_covered += int(line[3:])
            elif line.startswith("LF:"):
                lines_total += int(line[3:])
            elif line.startswith("BRH:"):
                branches_covered += int(line[4:])
            elif line.startswith("BRF:"):
                branches_total += int(line[4:])
            elif line == "end_of_record":
                records += 1
    return {
        "lines_covered": lines_covered,
        "lines_total": lines_total,
        "branches_covered": branches_covered,
        "branches_total": branches_total,
        "files": records,
    }


def load_jest_summary(root: Path):
    if not root.exists():
        return None
    path = root / "coverage-summary.json"
    if not path.is_file():
        path = next((p for p in root.rglob("coverage-summary.json")), None)
    if not path:
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
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
    }


def pct(covered, total):
    if not total:
        return "—"
    return f"{100.0 * covered / total:.2f}%"


def render_rate_table(stats):
    lines = ["| metric | covered | total | % |", "|--------|--------:|------:|---:|"]
    lines.append(f"| lines | {stats['lines_covered']} | {stats['lines_total']} | {pct(stats['lines_covered'], stats['lines_total'])} |")
    lines.append(f"| branches | {stats['branches_covered']} | {stats['branches_total']} | {pct(stats['branches_covered'], stats['branches_total'])} |")
    return lines


def render_jest_table(totals):
    lines = ["| metric | covered | total | % |", "|--------|--------:|------:|---:|"]
    for key in ("statements", "branches", "functions", "lines"):
        m = totals.get(key) or {}
        covered = m.get("covered", 0)
        total = m.get("total", 0)
        lines.append(f"| {key} | {covered} | {total} | {pct(covered, total)} |")
    return lines


def render_section(title, stats, source_note, table_renderer, missing_hint):
    lines = [f"### {title}"]
    if stats is None:
        lines.append(f"_{missing_hint}_")
    else:
        lines.extend(table_renderer(stats))
        if source_note:
            lines.append(source_note)
    lines.append("")
    return lines


def main():
    backend_root = Path(sys.argv[1] if len(sys.argv) > 1 else "backend/coverage")
    frontend_root = Path(sys.argv[2] if len(sys.argv) > 2 else "frontend/coverage")
    python_root = Path(sys.argv[3] if len(sys.argv) > 3 else "python-coverage")
    native_root = Path(sys.argv[4] if len(sys.argv) > 4 else "native-coverage")

    backend = aggregate_cobertura(backend_root)
    python = aggregate_cobertura(python_root)
    native = aggregate_lcov(native_root)
    frontend = load_jest_summary(frontend_root)

    lines = ["<!-- mozgoslav-coverage -->", "## Coverage", ""]
    lines.extend(render_section(
        "Backend (.NET)",
        backend,
        f"_aggregated from {backend['files']} cobertura report(s)_" if backend else "",
        render_rate_table,
        "no cobertura reports found under `backend/coverage`",
    ))
    lines.extend(render_section(
        "Frontend (jest)",
        frontend,
        "",
        render_jest_table,
        "no `coverage-summary.json` under `frontend/coverage`",
    ))
    lines.extend(render_section(
        "Python sidecar (pytest-cov)",
        python,
        f"_aggregated from {python['files']} cobertura report(s)_" if python else "",
        render_rate_table,
        "no cobertura XML under `python-coverage`",
    ))
    lines.extend(render_section(
        "Native helper (swift llvm-cov lcov)",
        native,
        f"_aggregated from {native['files']} lcov record(s)_" if native else "",
        render_rate_table,
        "no `*.lcov` under `native-coverage`",
    ))

    lines.append("_updated on every CI run on this PR._")
    sys.stdout.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
