#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
CONFIG_DIR="$SCRIPT_DIR/config"
HOME_CONFIG_DIR="$SCRIPT_DIR/home-config"

DRY_RUN=false
VERBOSE=false

find_python() {
    for candidate in python3 python py; do
        if command -v "$candidate" >/dev/null 2>&1; then
            echo "$candidate"
            return 0
        fi
    done
    return 1
}

sanitize_home_claude_json() {
    local source_json="$1"
    local target_json="$2"
    local python_bin

    python_bin="$(find_python)" || return 1

    "$python_bin" - "$source_json" "$target_json" <<'PY'
import json
import os
import re
import sys

source_path, target_path = sys.argv[1], sys.argv[2]
with open(source_path, "r", encoding="utf-8") as handle:
    source = json.load(handle)

sensitive_key = re.compile(r"(token|secret|pass(word)?|api[_-]?key|auth)", re.IGNORECASE)
skip_keys = {"oauthAccount", "mcpOAuth", "claudeAiOauth", "accessToken", "refreshToken"}


def placeholder(name: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_").upper()
    return f"YOUR_{normalized}_HERE"


def normalize_string(value: str) -> str:
    normalized = value
    normalized = re.sub(r"^[A-Za-z]:[/\\\\]dev[/\\\\]", "__DEV_ROOT__/", normalized)
    normalized = re.sub(r"^/mnt/[a-zA-Z]/dev/", "__DEV_ROOT_POSIX__/", normalized)
    normalized = re.sub(r"^/[a-zA-Z]/dev/", "__DEV_ROOT_POSIX__/", normalized)
    normalized = re.sub(r"^\$HOME/dev/", "__DEV_ROOT__/", normalized)
    normalized = re.sub(r"^/home/[^/]+/dev/", "__DEV_ROOT_POSIX__/", normalized)

    basename = os.path.basename(normalized.replace("\\", "/")).lower()
    if basename in {"node", "node.exe"}:
        return "__NODE_COMMAND__"
    if basename in {"uvx", "uvx.exe"}:
        return "uvx"
    if basename in {"notebooklm-mcp", "notebooklm-mcp-cli"}:
        return "notebooklm-mcp"

    return normalized.replace("\\", "/")


def redact(value):
    if isinstance(value, dict):
        cleaned = {}
        for key, nested in value.items():
            if key in skip_keys:
                continue
            if sensitive_key.search(key):
                cleaned[key] = placeholder(key)
            else:
                cleaned[key] = redact(nested)
        return cleaned
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, str):
        return normalize_string(value)
    return value


template = {"mcpServers": redact(source.get("mcpServers", {}))}

with open(target_path, "w", encoding="utf-8", newline="\n") as handle:
    json.dump(template, handle, indent=2)
    handle.write("\n")
PY
}

for arg in "$@"; do
    case $arg in
        --dry-run)  DRY_RUN=true ;;
        --verbose)  VERBOSE=true ;;
        --help|-h)
            echo "Usage: bash sync.sh [options]"
            echo ""
            echo "Syncs live ~/.claude/ configuration into the dotfiles repo."
            echo ""
            echo "Options:"
            echo "  --dry-run   Show what would be synced without making changes"
            echo "  --verbose   Show detailed rsync output"
            echo ""
            echo "Source: $CLAUDE_DIR"
            echo "Target: $CONFIG_DIR"
            exit 0
            ;;
    esac
done

ok()   { echo -e "  \033[32m[OK] $1\033[0m"; }
warn() { echo -e "  \033[33m[--] $1\033[0m"; }
info() { echo -e "  \033[36m$1\033[0m"; }
step() { echo -e "\n\033[33m[$1/10] $2\033[0m"; }

RSYNC_FLAGS="-a --delete"
[ "$DRY_RUN" = true ] && RSYNC_FLAGS="$RSYNC_FLAGS --dry-run"
[ "$VERBOSE" = true ] && RSYNC_FLAGS="$RSYNC_FLAGS -v"

if [ ! -d "$CLAUDE_DIR" ]; then
    echo "Error: $CLAUDE_DIR not found"
    exit 1
fi

echo "============================================"
echo " Claude Code Dotfiles — Reverse Sync"
echo "============================================"
echo " Source: $CLAUDE_DIR"
echo " Target: $CONFIG_DIR"
[ "$DRY_RUN" = true ] && echo " Mode:   DRY RUN (no changes)"
echo "============================================"

step 1 "Core config files"
for f in CLAUDE.md settings.json package.json gsd-file-manifest.json project-registry.json; do
    if [ -f "$CLAUDE_DIR/$f" ]; then
        if [ "$DRY_RUN" = true ]; then
            info "Would copy: $f"
        else
            cp "$CLAUDE_DIR/$f" "$CONFIG_DIR/$f"
        fi
        ok "$f"
    else
        warn "Not found: $f (skipped)"
    fi
done

step 2 "Agents"
rsync $RSYNC_FLAGS \
    --include='*.md' --exclude='*' \
    "$CLAUDE_DIR/agents/" "$CONFIG_DIR/agents/"
ok "$(find "$CONFIG_DIR/agents/" -name '*.md' 2>/dev/null | wc -l) agent definitions"

step 3 "Commands"
mkdir -p "$CONFIG_DIR/commands/gsd" "$CONFIG_DIR/commands/deprecated"
rsync $RSYNC_FLAGS \
    --include='*.md' --exclude='*/' --exclude='*' \
    "$CLAUDE_DIR/commands/" "$CONFIG_DIR/commands/"
rsync $RSYNC_FLAGS \
    --include='*.md' --exclude='*' \
    "$CLAUDE_DIR/commands/gsd/" "$CONFIG_DIR/commands/gsd/"
[ -d "$CLAUDE_DIR/commands/deprecated" ] && rsync $RSYNC_FLAGS \
    --include='*.md' --exclude='*' \
    "$CLAUDE_DIR/commands/deprecated/" "$CONFIG_DIR/commands/deprecated/"
ok "$(find "$CONFIG_DIR/commands/" -name '*.md' 2>/dev/null | wc -l) commands"

step 4 "Docs"
rsync $RSYNC_FLAGS \
    --exclude='plans/' \
    "$CLAUDE_DIR/docs/" "$CONFIG_DIR/docs/"
ok "$(find "$CONFIG_DIR/docs/" -type f 2>/dev/null | wc -l) doc files"

step 5 "Hooks (excluding dippy/)"
rsync $RSYNC_FLAGS \
    --exclude='dippy/' \
    --exclude='memory-persistence/' \
    --exclude='__pycache__/' \
    "$CLAUDE_DIR/hooks/" "$CONFIG_DIR/hooks/"
ok "$(find "$CONFIG_DIR/hooks/" -type f 2>/dev/null | wc -l) hook files"

step 6 "Rules"
rsync $RSYNC_FLAGS \
    "$CLAUDE_DIR/rules/" "$CONFIG_DIR/rules/"
ok "$(find "$CONFIG_DIR/rules/" -type f 2>/dev/null | wc -l) rule files"

step 7 "Skills"
rsync $RSYNC_FLAGS \
    --exclude='learned/' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    --exclude='.git/' \
    --exclude='node_modules/' \
    "$CLAUDE_DIR/skills/" "$CONFIG_DIR/skills/"
ok "$(ls -d "$CONFIG_DIR/skills/"*/ 2>/dev/null | wc -l) skill sets"

step 8 "Teams (role definitions only)"
mkdir -p "$CONFIG_DIR/teams/agents"
rsync $RSYNC_FLAGS \
    --include='*.md' --exclude='*' \
    "$CLAUDE_DIR/teams/agents/" "$CONFIG_DIR/teams/agents/"
for f in favorites.json ACTIVE_AGENTS.md ROLE_COMPRESSION_MAP.md; do
    [ -f "$CLAUDE_DIR/teams/$f" ] && cp "$CLAUDE_DIR/teams/$f" "$CONFIG_DIR/teams/$f"
done
ok "$(find "$CONFIG_DIR/teams/agents/" -name '*.md' 2>/dev/null | wc -l) role definitions"

step 9 "MCP configs & plugins"
mkdir -p "$CONFIG_DIR/mcp-configs"
[ -d "$CLAUDE_DIR/mcp-configs" ] && rsync $RSYNC_FLAGS \
    "$CLAUDE_DIR/mcp-configs/" "$CONFIG_DIR/mcp-configs/"
for f in known_marketplaces.json blocklist.json; do
    [ -f "$CLAUDE_DIR/plugins/$f" ] && cp "$CLAUDE_DIR/plugins/$f" "$CONFIG_DIR/plugins/$f"
done
ok "MCP configs and plugin metadata"

step 10 "Home config (.claude.json template)"
if [ -f "$HOME/.claude.json" ]; then
    mkdir -p "$HOME_CONFIG_DIR"
    if [ "$DRY_RUN" = true ]; then
        info "Would generate sanitized MCP template: ~/.claude.json -> home-config/.claude.json"
    else
        if ! sanitize_home_claude_json "$HOME/.claude.json" "$HOME_CONFIG_DIR/.claude.json"; then
            echo "Error: unable to sanitize ~/.claude.json (python not found or script failed)"
            exit 1
        fi
        if grep -Eq '"(oauthAccount|mcpOAuth|accessToken|refreshToken)"' "$HOME_CONFIG_DIR/.claude.json"; then
            echo "Error: sanitized home-config/.claude.json still contains credential-bearing keys"
            exit 1
        fi
    fi
    ok "sanitized .claude.json template"
else
    warn "~/.claude.json not found (skipped)"
fi

echo ""
echo "============================================"
if [ "$DRY_RUN" = true ]; then
    echo " Dry run complete — no files were changed"
else
    echo " Sync complete!"
fi
echo "============================================"
echo ""
echo "Next steps:"
echo "  cd $(basename "$SCRIPT_DIR")"
echo "  git diff --stat"
echo "  git add -A && git commit -m 'chore: sync from live'"
