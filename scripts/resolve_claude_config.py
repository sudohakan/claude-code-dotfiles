#!/usr/bin/env python3
import argparse
import json
import os
import re
from pathlib import Path


def to_posix_dev_root(dev_root: str) -> str:
    normalized = dev_root.replace("\\", "/")
    drive_match = re.match(r"^([A-Za-z]):/(.*)$", normalized)
    if drive_match:
        drive_letter = drive_match.group(1).lower()
        remainder = drive_match.group(2)
        return f"/{drive_letter}/{remainder}".rstrip("/")
    return normalized.rstrip("/")


def replace_placeholders(value, dev_root, dev_root_posix, node_command):
    if isinstance(value, dict):
        return {
            key: replace_placeholders(nested, dev_root, dev_root_posix, node_command)
            for key, nested in value.items()
        }
    if isinstance(value, list):
        return [replace_placeholders(item, dev_root, dev_root_posix, node_command) for item in value]
    if isinstance(value, str):
        return (
            value
            .replace("__DEV_ROOT_POSIX__", dev_root_posix)
            .replace("__DEV_ROOT__", dev_root)
            .replace("__NODE_COMMAND__", node_command)
        )
    return value


def resolve_magic_21st_api_key(server_config):
    env = dict(server_config.get("env", {}))
    key = os.environ.get("MAGIC_21ST_API_KEY") or os.environ.get("API_KEY")
    if key:
        env["API_KEY"] = key
    elif env.get("API_KEY") in {"", "YOUR_API_KEY_HERE", "__MAGIC_21ST_API_KEY__"}:
        env.pop("API_KEY", None)
    if env:
        server_config["env"] = env
    else:
        server_config.pop("env", None)
    return server_config


def main():
    parser = argparse.ArgumentParser(description="Resolve portable placeholders in the sanitized .claude.json template.")
    parser.add_argument("--template", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--dev-root", required=True)
    parser.add_argument("--node-command", default="node")
    args = parser.parse_args()

    template = json.loads(Path(args.template).read_text(encoding="utf-8"))
    resolved = replace_placeholders(
        template,
        args.dev_root,
        to_posix_dev_root(args.dev_root),
        args.node_command,
    )
    magic_21st = resolved.get("mcpServers", {}).get("magic-21st")
    if isinstance(magic_21st, dict):
        key = os.environ.get("MAGIC_21ST_API_KEY") or os.environ.get("API_KEY")
        if key:
            resolved["mcpServers"]["magic-21st"] = resolve_magic_21st_api_key(magic_21st)
        else:
            resolved["mcpServers"].pop("magic-21st", None)

    target_path = Path(args.target)
    if target_path.exists():
        existing = json.loads(target_path.read_text(encoding="utf-8"))
    else:
        existing = {}

    merged = dict(existing)
    merged.setdefault("mcpServers", {})
    for server_name, server_config in resolved.get("mcpServers", {}).items():
        merged["mcpServers"][server_name] = server_config

    target_path.write_text(json.dumps(merged, indent=2) + "\n", encoding="utf-8")
    print(f"Resolved MCP template into {target_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
