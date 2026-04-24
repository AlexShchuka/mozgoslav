#!/usr/bin/env python3
"""Parse MSTest TRX files and emit top-N slowest tests plus per-class totals.

Emits GitHub Actions annotations when $GITHUB_STEP_SUMMARY is set, otherwise
prints to stdout.
"""
import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

TRX_NS = "http://microsoft.com/schemas/VisualStudio/TeamTest/2010"


def parse_duration(dur: str) -> float:
    m = re.match(r"(?:(\d+):)?(\d+):(\d+)(?:\.(\d+))?$", dur or "")
    if not m:
        return 0.0
    h, mm, ss, frac = m.group(1) or "0", m.group(2), m.group(3), m.group(4) or "0"
    return int(h) * 3600 + int(mm) * 60 + int(ss) + float("0." + frac)


def gather(paths):
    rows = []
    for trx_path in paths:
        try:
            tree = ET.parse(trx_path)
        except ET.ParseError as exc:
            print(f"warn: cannot parse {trx_path}: {exc}", file=sys.stderr)
            continue
        root = tree.getroot()
        ns = {"t": TRX_NS}

        defs = {}
        for d in root.findall(".//t:UnitTest", ns):
            test_id = d.get("id")
            method = d.find("t:TestMethod", ns)
            cls = (method.get("className") if method is not None else "") or ""
            name = d.get("name") or ""
            defs[test_id] = (cls.split(",")[0].split(".")[-1], name)

        for r in root.findall(".//t:UnitTestResult", ns):
            tid = r.get("testId")
            outcome = r.get("outcome") or ""
            duration_s = parse_duration(r.get("duration") or "")
            cls, name = defs.get(tid, ("?", r.get("testName") or "?"))
            rows.append((duration_s, cls, name, outcome, str(trx_path)))
    return rows


def summarize(rows, top_n=30):
    if not rows:
        return "no TRX results found"

    lines = []
    total = sum(r[0] for r in rows)
    passed = sum(1 for r in rows if r[3] == "Passed")
    failed = sum(1 for r in rows if r[3] == "Failed")
    skipped = sum(1 for r in rows if r[3] not in ("Passed", "Failed"))

    lines.append(f"## Test timings summary")
    lines.append("")
    lines.append(f"- total tests: {len(rows)} (passed {passed}, failed {failed}, skipped/other {skipped})")
    lines.append(f"- total wall: {total:.1f}s")
    lines.append("")

    by_class: dict[str, tuple[float, int]] = {}
    for dur, cls, _name, _outcome, _src in rows:
        cur = by_class.get(cls, (0.0, 0))
        by_class[cls] = (cur[0] + dur, cur[1] + 1)

    lines.append(f"### Top {min(top_n, len(rows))} slowest tests")
    lines.append("")
    lines.append("| duration | test | outcome |")
    lines.append("|---------:|------|---------|")
    for dur, cls, name, outcome, _src in sorted(rows, key=lambda r: -r[0])[:top_n]:
        lines.append(f"| {dur:.2f}s | `{cls}.{name}` | {outcome} |")
    lines.append("")

    lines.append("### Slowest classes")
    lines.append("")
    lines.append("| wall | tests | avg | class |")
    lines.append("|----:|----:|----:|-------|")
    for cls, (wall, count) in sorted(by_class.items(), key=lambda kv: -kv[1][0])[:20]:
        avg = wall / count if count else 0
        lines.append(f"| {wall:.2f}s | {count} | {avg:.2f}s | `{cls}` |")
    lines.append("")

    if failed:
        lines.append("### Failed tests")
        lines.append("")
        for _dur, cls, name, _outcome, _src in [r for r in rows if r[3] == "Failed"]:
            lines.append(f"- `{cls}.{name}`")
        lines.append("")

    return "\n".join(lines)


def main():
    roots = [Path(p) for p in (sys.argv[1:] or ["backend/coverage"])]
    trx_files = []
    for root in roots:
        if root.is_file() and root.suffix == ".trx":
            trx_files.append(root)
        elif root.is_dir():
            trx_files.extend(root.rglob("*.trx"))
    rows = gather(trx_files)
    summary = summarize(rows)

    step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary:
        with open(step_summary, "a", encoding="utf-8") as f:
            f.write(summary + "\n")
    print(summary)


if __name__ == "__main__":
    main()
