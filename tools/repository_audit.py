"""Read-only inventory, duplicate detection, and local Markdown link checks.

Run from any directory: python tools/repository_audit.py --hash --output audit.json
The script never removes files and does not enter embedded Git repositories.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parents[1]
CACHE_NAMES = {"node_modules", "__pycache__", ".venv", "venv", ".gradle", ".pytest_cache", "build"}
TEMP_ROOTS = {"tmp", ".cache", ".codex-build", ".codex-docx-qa"}
LINK = re.compile(r"!?\[[^\]]*\]\((<[^>]+>|[^)]+)\)")


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", "-C", str(ROOT), *args])


def checksum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ignored_path(relative: Path) -> bool:
    return relative.parts[0] in TEMP_ROOTS or any(p in CACHE_NAMES for p in relative.parts)


def inventory() -> tuple[list[dict], list[str], list[str]]:
    files, boundaries, skipped = [], [], []
    for current, directories, names in os.walk(ROOT, followlinks=False):
        here = Path(current)
        if here != ROOT and (here / ".git").exists():
            boundaries.append(here.relative_to(ROOT).as_posix())
            directories[:] = []
            continue
        directories[:] = [name for name in directories if name != ".git"]
        for name in list(directories):
            child = here / name
            if child.is_symlink() or child.is_junction():
                skipped.append(child.relative_to(ROOT).as_posix())
                directories.remove(name)
        for name in names:
            path = here / name
            if name == ".git" or path.is_symlink():
                continue
            relative = path.relative_to(ROOT)
            try:
                size = path.stat().st_size
            except OSError as error:
                skipped.append(f"{relative.as_posix()}: {error}")
                continue
            files.append({"path": relative.as_posix(), "size": size, "temporary": ignored_path(relative)})
    return sorted(files, key=lambda item: item["path"]), sorted(boundaries), sorted(skipped)


def broken_links(files: list[dict]) -> list[dict]:
    broken = []
    for item in files:
        relative = item["path"]
        if item["temporary"] or not relative.lower().endswith(".md"):
            continue
        path = ROOT / relative
        content = path.read_text("utf-8-sig", errors="replace")
        for line_number, line in enumerate(content.splitlines(), 1):
            for match in LINK.finditer(line):
                target = match.group(1).strip()
                if target.startswith("<") and target.endswith(">"):
                    target = target[1:-1]
                target = target.split(' "', 1)[0].split("#", 1)[0]
                if not target or re.match(r"^[a-z][a-z0-9+.-]*:", target, re.I):
                    continue
                resolved = path.parent / unquote(target)
                if not resolved.exists():
                    broken.append({"file": relative, "line": line_number, "target": target})
    return broken


def audit(hashes: bool) -> dict:
    files, boundaries, skipped = inventory()
    by_top, by_directory = defaultdict(lambda: [0, 0]), defaultdict(lambda: [0, 0])
    for item in files:
        parts = Path(item["path"]).parts
        top = parts[0] if len(parts) > 1 else "<root>"
        for key, mapping in [(top, by_top), ("/".join(parts[:-1]), by_directory)]:
            mapping[key][0] += 1
            mapping[key][1] += item["size"]

    candidates = defaultdict(list)
    for item in files:
        if not item["temporary"] and item["size"]:
            candidates[item["size"]].append(item)
    groups = []
    if hashes:
        for size, items in candidates.items():
            if len(items) < 2:
                continue
            by_hash = defaultdict(list)
            for item in items:
                digest = checksum(ROOT / item["path"])
                by_hash[digest].append(item["path"])
            for digest, paths in by_hash.items():
                if len(paths) > 1:
                    groups.append({"sha256": digest, "size": size, "paths": paths,
                                   "redundant_bytes": size * (len(paths) - 1)})

    tracked = [p.decode("utf-8") for p in git("ls-files", "-z").split(b"\0") if p]
    tracked_cache = [p for p in tracked if (ROOT / p).exists() and
                     (ignored_path(Path(p)) or Path(p).name.startswith(("~$", "~WRL"))
                      or Path(p).suffix == ".pyc")]
    gitlinks = []
    for entry in git("ls-files", "--stage", "-z").split(b"\0"):
        if entry.startswith(b"160000 "):
            gitlinks.append(entry.split(b"\t", 1)[1].decode("utf-8"))
    junk = [item["path"] for item in files if item["temporary"] or
            Path(item["path"]).name.startswith(("~$", "~WRL")) or
            Path(item["path"]).suffix == ".pyc"]
    return {
        "root": str(ROOT), "file_count": len(files), "bytes": sum(f["size"] for f in files),
        "top_level": {k: {"files": v[0], "bytes": v[1]} for k, v in sorted(by_top.items())},
        "largest_directories": [{"path": k, "files": v[0], "bytes": v[1]} for k, v in
                                sorted(by_directory.items(), key=lambda pair: -pair[1][1])[:40]],
        "embedded_repositories": boundaries, "gitlinks": gitlinks, "skipped": skipped,
        "tracked_temporary_files": tracked_cache, "temporary_files": junk,
        "duplicate_groups": sorted(groups, key=lambda group: -group["redundant_bytes"]),
        "broken_markdown_links": broken_links(files), "files": files,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hash", action="store_true", help="compare same-sized files using SHA-256")
    parser.add_argument("--output", type=Path, help="save full JSON inventory")
    args = parser.parse_args()
    report = audit(args.hash)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", "utf-8")
    summary = {k: report[k] for k in ("file_count", "bytes", "top_level", "embedded_repositories",
                                     "gitlinks", "broken_markdown_links", "skipped")}
    summary["tracked_temporary_files"] = len(report["tracked_temporary_files"])
    summary["duplicate_groups"] = len(report["duplicate_groups"])
    summary["redundant_bytes"] = sum(g["redundant_bytes"] for g in report["duplicate_groups"])
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
