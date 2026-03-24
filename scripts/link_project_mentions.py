#!/usr/bin/env python3
import argparse
import os
import re
from pathlib import Path


PROJECTS = {
    "HakanMCP": "https://github.com/sudohakan/HakanMCP",
    "gtasks-mcp": "https://github.com/sudohakan/gtasks-mcp",
    "infoset-mcp": "https://github.com/sudohakan/infoset-mcp",
    "kali-mcp": "https://github.com/sudohakan/kali-mcp-server",
    "pentest-framework": "__README_PORTABLE_LOCAL_DEPENDENCIES__",
}


def resolve_link(markdown_path: Path, name: str) -> str:
    raw = PROJECTS[name]
    if raw != "__README_PORTABLE_LOCAL_DEPENDENCIES__":
        return raw
    repo_root = markdown_path.parent
    while not (repo_root / "README.md").exists() and repo_root != repo_root.parent:
        repo_root = repo_root.parent
    readme_path = repo_root / "README.md"
    relative_path = Path(os.path.relpath(readme_path, markdown_path.parent))
    return f"{relative_path.as_posix()}#portable-local-dependencies"


def strip_code_fences(text: str) -> str:
    lines = text.splitlines()
    clean_lines = []
    in_fence = False
    for line in lines:
        if line.strip().startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence:
            clean_lines.append(line)
    return "\n".join(clean_lines)


def detect_projects(text: str) -> list[str]:
    cleaned = strip_code_fences(text)
    found = []
    for name in PROJECTS:
        if re.search(rf"\b{re.escape(name)}\b", cleaned):
            found.append(name)
    return found


def build_related_line(markdown_path: Path, names: list[str]) -> str:
    links = [f"[{name}]({resolve_link(markdown_path, name)})" for name in names]
    return f"**Related projects:** {', '.join(links)}"


def insert_or_replace_related_line(text: str, related_line: str) -> str:
    lines = text.splitlines()
    if not lines:
        return related_line + "\n"

    for index, line in enumerate(lines[:12]):
        if line.startswith("**Related projects:**"):
            lines[index] = related_line
            return "\n".join(lines) + ("\n" if text.endswith("\n") else "")

    insert_at = 0
    if lines and lines[0].strip() == "---":
        for index in range(1, len(lines)):
            if lines[index].strip() == "---":
                insert_at = index + 1
                break

    while insert_at < len(lines) and not lines[insert_at].startswith("#"):
        insert_at += 1

    if insert_at < len(lines):
        insert_at += 1
    while insert_at < len(lines) and lines[insert_at].strip() == "":
        insert_at += 1

    new_lines = lines[:insert_at] + ["", related_line, ""] + lines[insert_at:]
    return "\n".join(new_lines) + ("\n" if text.endswith("\n") else "")


def main() -> int:
    parser = argparse.ArgumentParser(description="Insert Related projects link blocks into markdown files.")
    parser.add_argument("--root", required=True, help="Repository root to scan")
    parser.add_argument("--check", action="store_true", help="Check only, do not modify files")
    args = parser.parse_args()

    root = Path(args.root)
    changed = []

    for path in root.rglob("*.md"):
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        projects = detect_projects(text)
        if not projects:
            continue
        updated = insert_or_replace_related_line(text, build_related_line(path, projects))
        if updated != text:
            changed.append(path)
            if not args.check:
                path.write_text(updated, encoding="utf-8")

    for path in changed:
        print(path)

    return 1 if args.check and changed else 0


if __name__ == "__main__":
    raise SystemExit(main())
