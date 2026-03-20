#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
CONFIG_DIR="$SCRIPT_DIR/config"
HOME_CONFIG_DIR="$SCRIPT_DIR/home-config"

DRY_RUN=false
VERBOSE=false

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

step 10 "Home config (.claude.json)"
if [ -f "$HOME/.claude.json" ]; then
    mkdir -p "$HOME_CONFIG_DIR"
    if [ "$DRY_RUN" = true ]; then
        info "Would copy: ~/.claude.json"
    else
        cp "$HOME/.claude.json" "$HOME_CONFIG_DIR/.claude.json"
    fi
    ok ".claude.json"
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
