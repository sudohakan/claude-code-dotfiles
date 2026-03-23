#!/bin/bash
# ============================================================
# Claude Code Portable Installer - Hakan's Configuration
# ============================================================
# Usage: bash install.sh
# Parameters:
#   --skip-plugins    : Skip plugin installation
#   --force           : Run without confirmation prompts
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
BACKUP_DIR="$HOME/.claude-backup-$(date +%Y%m%d-%H%M%S)"
USERNAME="$(whoami)"
TOTAL_STEPS=10
MANIFEST_PATH="$SCRIPT_DIR/external-projects.manifest.json"
BOOTSTRAP_SCRIPT="$SCRIPT_DIR/scripts/bootstrap_dev_projects.py"
RESOLVE_CLAUDE_CONFIG_SCRIPT="$SCRIPT_DIR/scripts/resolve_claude_config.py"

SKIP_PLUGINS=false
FORCE=false

for arg in "$@"; do
    case $arg in
        --skip-plugins)  SKIP_PLUGINS=true ;;
        --force)         FORCE=true ;;
    esac
done

step() {
    echo ""
    echo -e "\033[33m[$1/$TOTAL_STEPS] $2\033[0m"
}

ok()   { echo -e "  \033[32m[OK] $1\033[0m"; }
warn() { echo -e "  \033[33m[--] $1\033[0m"; }
err()  { echo -e "  \033[31m[!!] $1\033[0m"; }
info() { echo -e "  \033[36m$1\033[0m"; }

repair_stale_hookify_cache() {
    local hookify_root="$CLAUDE_DIR/plugins/cache/claude-plugins-official/hookify"
    local repaired_count=0

    [ -d "$hookify_root" ] || return 0

    while IFS= read -r hooks_dir; do
        [ -f "$hooks_dir/pretooluse.py" ] || continue
        [ -f "$hooks_dir/userpromptsubmit.py" ] && continue
        printf '%s' 'import sys, json; json.dump({}, sys.stdout)' > "$hooks_dir/userpromptsubmit.py"
        repaired_count=$((repaired_count + 1))
    done < <(find "$hookify_root" -type d -name hooks 2>/dev/null)

    if [ "$repaired_count" -gt 0 ]; then
        local entry_label="entries"
        [ "$repaired_count" -eq 1 ] && entry_label="entry"
        ok "Repaired stale hookify userpromptsubmit hook ($repaired_count cache $entry_label)"
    fi
}

install_if_missing() {
    local name="$1" cmd="$2" install_cmd="$3" manual_msg="$4"
    if command -v "$cmd" &>/dev/null; then
        ok "$name : $("$cmd" --version 2>/dev/null || echo 'available')"
        return 0
    fi
    info "$name not found, installing..."
    if eval "$install_cmd" 2>/dev/null; then
        # Refresh PATH (after winget/choco install)
        export PATH="$PATH:/c/Program Files/nodejs:/c/Program Files/Git/bin"
        if command -v "$cmd" &>/dev/null; then
            ok "$name installed"
            return 0
        fi
    fi
    warn "$name automatic installation failed. $manual_msg"
    return 1
}

# ========================================
echo ""
echo -e "\033[36m  ============================================\033[0m"
echo -e "\033[36m   Claude Code Portable Installer\033[0m"
echo -e "\033[36m   Hakan's Full Configuration\033[0m"
echo -e "\033[36m  ============================================\033[0m"
echo ""

# -- STEP 1: Package manager --
step 1 "Checking package manager..."
HAS_WINGET=false
if command -v winget &>/dev/null; then
    ok "winget available"
    HAS_WINGET=true
elif command -v choco &>/dev/null; then
    ok "chocolatey available"
else
    warn "winget/choco not found. Software can be installed manually."
fi

# -- STEP 2: Dependencies --
step 2 "Checking and installing dependencies..."

# Git
if command -v git &>/dev/null; then
    ok "Git : $(git --version)"
else
    if [ "$HAS_WINGET" = true ]; then
        install_if_missing "Git" "git" \
            "winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements" \
            "Manual: https://git-scm.com/downloads"
    else
        warn "Git not found. Install manually: https://git-scm.com/downloads"
    fi
fi

# Node.js
if command -v node &>/dev/null; then
    ok "Node.js : $(node --version)"
else
    if [ "$HAS_WINGET" = true ]; then
        install_if_missing "Node.js" "node" \
            "winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements" \
            "Manual: https://nodejs.org"
    else
        err "Node.js not found and automatic installation failed."
        echo "  Install manually: https://nodejs.org"
        echo "  Then run the script again."
        exit 1
    fi
fi

if ! command -v node &>/dev/null; then
    err "Cannot continue without Node.js. Install it and reopen your terminal."
    exit 1
fi

# Check Node.js version (HakanMCP requires >= 20)
NODE_MAJOR=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -n "$NODE_MAJOR" ] && [ "$NODE_MAJOR" -lt 20 ]; then
    err "Node.js v${NODE_MAJOR} detected, but HakanMCP requires >= 20. Please update Node.js."
fi

# npm
if command -v npm &>/dev/null; then
    ok "npm : $(npm --version)"
else
    warn "npm not found. Check your Node.js installation."
fi

# Python (required by Dippy hook)
# Note: On Windows, python3 may exist as MS Store redirect (WindowsApps)
# that doesn't actually work. We verify with --version exit code.
PYTHON_CMD=""
if python3 --version &>/dev/null; then
    PYTHON_CMD="python3"
    ok "Python : $(python3 --version 2>&1)"
elif python --version &>/dev/null; then
    PYTHON_CMD="python"
    ok "Python : $(python --version 2>&1)"
else
    info "Python not found, installing..."
    if [ "$HAS_WINGET" = true ]; then
        if winget install -e --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements 2>/dev/null; then
            export PATH="$PATH:/c/Users/$USERNAME/AppData/Local/Programs/Python/Python312:/c/Users/$USERNAME/AppData/Local/Programs/Python/Python312/Scripts"
            if command -v python &>/dev/null; then
                PYTHON_CMD="python"
                ok "Python installed"
            elif command -v python3 &>/dev/null; then
                PYTHON_CMD="python3"
                ok "Python installed"
            fi
        fi
    elif command -v brew &>/dev/null; then
        if brew install python3 2>/dev/null; then
            PYTHON_CMD="python3"
            ok "Python installed via Homebrew"
        fi
    elif command -v apt-get &>/dev/null; then
        if sudo apt-get install -y python3 2>/dev/null; then
            PYTHON_CMD="python3"
            ok "Python installed via apt"
        fi
    fi
if [ -z "$PYTHON_CMD" ]; then
        warn "Python automatic installation failed. Install manually: https://www.python.org/downloads/"
    fi
fi

if [ -z "$PYTHON_CMD" ]; then
    err "Cannot continue without Python. It is required for Dippy and portable installer helpers."
    exit 1
fi

# jq
if command -v jq &>/dev/null; then
    ok "jq : $(jq --version 2>/dev/null)"
else
    if [ "$HAS_WINGET" = true ]; then
        install_if_missing "jq" "jq" \
            "winget install -e --id jqlang.jq --accept-source-agreements --accept-package-agreements" \
            "Manual: winget install jqlang.jq"
    else
        warn "jq not found. Install: apt install jq / brew install jq"
    fi
fi

# Bun (optional, helps some MCP project builds)
if command -v bun &>/dev/null; then
    ok "Bun : $(bun --version 2>/dev/null)"
else
    info "Bun not found, attempting optional install..."
    if [ "$HAS_WINGET" = true ]; then
        winget install -e --id Oven-sh.Bun --accept-source-agreements --accept-package-agreements 2>/dev/null || warn "Bun install skipped"
    elif command -v brew &>/dev/null; then
        brew install oven-sh/bun/bun 2>/dev/null || warn "Bun install skipped"
    elif command -v apt-get &>/dev/null; then
        curl -fsSL https://bun.sh/install | bash >/dev/null 2>&1 || warn "Bun install skipped"
    else
        warn "Bun not found. Some optional MCP builds may remain best-effort."
    fi
fi

# -- STEP 3: Claude Code CLI --
step 3 "Installing Claude Code CLI..."

if command -v claude &>/dev/null; then
    ok "Claude CLI already installed: $(claude --version 2>/dev/null || echo 'available')"
else
    info "Installing Claude CLI (npm global)..."
    if npm install -g @anthropic-ai/claude-code 2>/dev/null; then
        # Add npm global bin to PATH
        NPM_BIN="$(npm config get prefix 2>/dev/null)/bin"
        export PATH="$PATH:$NPM_BIN"
        if command -v claude &>/dev/null; then
            ok "Claude CLI installed"
        else
            warn "Claude CLI installed but not visible in PATH. Reopen your terminal."
        fi
    else
        err "Claude CLI installation failed."
        echo "       Manual: npm install -g @anthropic-ai/claude-code"
    fi
fi

# -- STEP 4: Backup --
step 4 "Backing up existing configuration..."

if [ -d "$CLAUDE_DIR" ]; then
    if [ "$FORCE" = true ]; then
        cp -r "$CLAUDE_DIR" "$BACKUP_DIR"
        ok "Backup: $BACKUP_DIR"
    else
        read -p "  Existing $CLAUDE_DIR found. Create backup? (Y/N) " answer
        if [ "$answer" != "N" ]; then
            cp -r "$CLAUDE_DIR" "$BACKUP_DIR"
            ok "Backup: $BACKUP_DIR"
        fi
    fi
else
    ok "Fresh install, no backup needed."
fi

# -- STEP 5: Directory structure --
step 5 "Creating directory structure..."

mkdir -p "$CLAUDE_DIR"/{hooks/lib,docs,commands/gsd,agents,get-shit-done,skills,plugins,projects,profiles,cache,teams/agents}
ok "Directories created."

# -- STEP 6: Copy configuration --
step 6 "Copying configuration files..."

CONFIG_DIR="$SCRIPT_DIR/config"

for f in CLAUDE.md settings.json settings.local.json package.json gsd-file-manifest.json; do
    [ -f "$CONFIG_DIR/$f" ] && cp "$CONFIG_DIR/$f" "$CLAUDE_DIR/$f"
done
echo "  + Core files"

cp "$CONFIG_DIR"/hooks/*.js "$CLAUDE_DIR/hooks/"
# Copy PowerShell hook scripts if present
for ps1file in "$CONFIG_DIR"/hooks/*.ps1; do
    [ -f "$ps1file" ] && cp "$ps1file" "$CLAUDE_DIR/hooks/"
done
# Copy hook shared libraries
if [ -d "$CONFIG_DIR/hooks/lib" ]; then
    cp "$CONFIG_DIR"/hooks/lib/* "$CLAUDE_DIR/hooks/lib/"
fi
# Install Dippy (Python-based bash auto-approve hook) via git clone
if [ -d "$CLAUDE_DIR/hooks/dippy" ]; then
    ok "Dippy already installed"
else
    if command -v git &>/dev/null; then
        git clone https://github.com/ldayton/Dippy "$CLAUDE_DIR/hooks/dippy" 2>/dev/null && ok "Dippy cloned" || warn "Dippy clone failed (optional)"
    else
        warn "Git not available, skipping Dippy"
    fi
fi
echo "  + hooks/ (js + ps1 + lib/ + dippy/)"

cp -r "$CONFIG_DIR"/docs/* "$CLAUDE_DIR/docs/"
echo "  + docs/ (with subdirectories)"

cp "$CONFIG_DIR"/commands/*.md "$CLAUDE_DIR/commands/"
cp "$CONFIG_DIR"/commands/gsd/*.md "$CLAUDE_DIR/commands/gsd/"
echo "  + commands/"

# Copy project-registry.json (only if not existing — preserves user config)
if [ ! -f "$CLAUDE_DIR/project-registry.json" ]; then
    cp "$CONFIG_DIR/project-registry.json" "$CLAUDE_DIR/project-registry.json"
    echo "  + project-registry.json (new)"
else
    echo "  + project-registry.json (existing preserved)"
fi

cp "$CONFIG_DIR"/agents/*.md "$CLAUDE_DIR/agents/"
echo "  + agents/"

# Teams - Agent role definitions and team configuration
if [ -d "$CONFIG_DIR/teams" ]; then
    cp -r "$CONFIG_DIR"/teams/* "$CLAUDE_DIR/teams/"
    echo "  + teams/ (agent roles + team config)"
fi

cp -r "$CONFIG_DIR"/get-shit-done/* "$CLAUDE_DIR/get-shit-done/"
echo "  + get-shit-done/"

cp -r "$CONFIG_DIR"/skills/* "$CLAUDE_DIR/skills/"
echo "  + skills/"

cp "$CONFIG_DIR"/plugins/known_marketplaces.json "$CLAUDE_DIR/plugins/"
cp "$CONFIG_DIR"/plugins/blocklist.json "$CLAUDE_DIR/plugins/"
echo "  + plugins/"

ok "All files copied."

# -- STEP 7: Fix paths --
step 7 "Fixing file paths..."

if [ "$USERNAME" != "Hakan" ]; then
    # Escape backslashes in USERNAME for sed (handles domain usernames like CORP\user)
    USERNAME_ESC="$(printf '%s\n' "$USERNAME" | sed 's/[\\|&/]/\\&/g')"
    sed -i'' -e"s|C:/Users/Hakan|C:/Users/${USERNAME_ESC}|g" "$CLAUDE_DIR/settings.json"
    sed -i'' -e"s|C:\\\\Users\\\\Hakan|C:\\\\Users\\\\${USERNAME_ESC}|g" "$CLAUDE_DIR/settings.json"
    ok "Paths updated: Hakan -> ${USERNAME}"
else
    ok "Same username, no changes needed."
fi

# .claude.json
if [ -d "/c/" ]; then
    DEV_ROOT="/c/dev"
else
    DEV_ROOT="$HOME/dev"
fi
NODE_COMMAND="$(command -v node || echo node)"
"$PYTHON_CMD" "$RESOLVE_CLAUDE_CONFIG_SCRIPT" \
    --template "$SCRIPT_DIR/home-config/.claude.json" \
    --target "$HOME/.claude.json" \
    --dev-root "$DEV_ROOT" \
    --node-command "$NODE_COMMAND"
ok ".claude.json resolved from portable template."

# -- STEP 8: Memory --
step 8 "Transferring memory files..."

PROJECT_KEY="C--Users-${USERNAME}"
MEM_DST="$CLAUDE_DIR/projects/$PROJECT_KEY/.memory"
mkdir -p "$MEM_DST"
cp "$CONFIG_DIR"/projects/C--Users-Hakan/.memory/*.md "$MEM_DST/"

if [ "$USERNAME" != "Hakan" ]; then
    for mdfile in "$MEM_DST"/*.md; do
        sed -i'' -e"s|C:\\\\Users\\\\Hakan|C:\\\\Users\\\\${USERNAME}|g" "$mdfile"
        sed -i'' -e"s|C:/Users/Hakan|C:/Users/${USERNAME}|g" "$mdfile"
    done
fi
ok "Memory copied (${PROJECT_KEY})."

# -- STEP 9: Local MCP and dev projects --
step 9 "Bootstrapping local MCP and dev projects..."

if [ -d "$CLAUDE_DIR/hooks/dippy" ]; then
    ok "Dippy already installed"
else
    if command -v git &>/dev/null; then
        git clone https://github.com/ldayton/Dippy "$CLAUDE_DIR/hooks/dippy" 2>/dev/null && ok "Dippy cloned" || warn "Dippy clone failed (optional)"
    else
        warn "Git not available, skipping Dippy"
    fi
fi

mkdir -p "$DEV_ROOT"
"$PYTHON_CMD" "$BOOTSTRAP_SCRIPT" --manifest "$MANIFEST_PATH" --dev-root "$DEV_ROOT"
ok "Local MCP and dev project bootstrap complete."

# -- STEP 10: Plugins --
step 10 "Installing plugins..."

if [ "$SKIP_PLUGINS" = true ]; then
    warn "Plugin installation skipped (--skip-plugins)."
else
    if command -v claude &>/dev/null; then
        info "Installing official plugins..."

        for plugin in superpowers code-review context7 feature-dev ralph-loop playwright typescript-lsp frontend-design skill-creator commit-commands code-simplifier pr-review-toolkit security-guidance claude-md-management; do
            if claude plugins install "$plugin" 2>/dev/null; then
                ok "$plugin"
            else
                warn "$plugin (will auto-install on first launch)"
            fi
        done

        info "Adding Trail of Bits marketplace..."
        if claude plugins add-marketplace trailofbits https://github.com/trailofbits/skills 2>/dev/null; then
            for plugin in static-analysis differential-review insecure-defaults sharp-edges supply-chain-risk-auditor audit-context-building property-based-testing variant-analysis spec-to-code-compliance git-cleanup workflow-skill-design; do
                if claude plugins install "${plugin}@trailofbits" 2>/dev/null; then
                    ok "$plugin@trailofbits"
                else
                    warn "$plugin@trailofbits (can be installed manually later)"
                fi
            done
        fi

        info "Adding Anthropic Agent Skills marketplace..."
        if claude plugins add-marketplace anthropic-agent-skills https://github.com/anthropics/skills 2>/dev/null; then
            for plugin in document-skills example-skills claude-api; do
                if claude plugins install "${plugin}@anthropic-agent-skills" 2>/dev/null; then
                    ok "$plugin@anthropic-agent-skills"
                else
                    warn "$plugin@anthropic-agent-skills (can be installed manually later)"
                fi
            done
        fi

        ok "Plugin installation complete."
    else
        warn "Claude CLI not yet in PATH."
        echo "    Plugins will auto-install after reopening the terminal."
    fi
fi

repair_stale_hookify_cache

# -- Dotfiles Meta (version tracking for auto-update) --
DOTFILES_VERSION=$(tr -d '[:space:]' < "$SCRIPT_DIR/VERSION")
cat > "$CLAUDE_DIR/dotfiles-meta.json" << EOF
{
  "version": "$DOTFILES_VERSION",
  "repo_path": "$SCRIPT_DIR",
  "installed_at": "$(date +%Y-%m-%d)"
}
EOF
ok "dotfiles-meta.json created (v$DOTFILES_VERSION)"

# -- SUMMARY --
echo ""
echo -e "\033[32m  ============================================\033[0m"
echo -e "\033[32m   INSTALLATION COMPLETE\033[0m"
echo -e "\033[32m  ============================================\033[0m"
echo ""

echo -e "\033[36m  Status Summary:\033[0m"
check_item() {
    if [ "$2" = true ]; then echo -e "    \033[32m[OK] $1\033[0m"; else echo -e "    \033[33m[--] $1\033[0m"; fi
}
check_item "Node.js"    "$(command -v node &>/dev/null && echo true || echo false)"
check_item "Git"        "$(command -v git &>/dev/null && echo true || echo false)"
check_item "Python"     "$( (command -v python3 &>/dev/null || command -v python &>/dev/null) && echo true || echo false)"
check_item "jq"         "$(command -v jq &>/dev/null && echo true || echo false)"
check_item "Claude CLI" "$(command -v claude &>/dev/null && echo true || echo false)"
if [ -d "/c/" ]; then DEV_ROOT="/c/dev"; else DEV_ROOT="$HOME/dev"; fi
check_item "HakanMCP"   "$([ -f "$DEV_ROOT/HakanMCP/dist/src/index.js" ] && echo true || echo false)"
check_item "gtasks-mcp" "$([ -f "$DEV_ROOT/gtasks-mcp/dist/index.js" ] && echo true || echo false)"
check_item "infoset-mcp" "$([ -f "$DEV_ROOT/infoset-mcp/src/mcp-server.mjs" ] && echo true || echo false)"
check_item "kali-mcp"   "$([ -f "$DEV_ROOT/kali-mcp/docker-compose.yml" ] && echo true || echo false)"
check_item "pentest-framework" "$([ -d "$DEV_ROOT/pentest-framework/templates" ] && echo true || echo false)"
check_item "Config"     "$([ -f "$CLAUDE_DIR/settings.json" ] && echo true || echo false)"
check_item "Hooks"      "$([ -f "$CLAUDE_DIR/hooks/pretooluse-safety.js" ] && echo true || echo false)"
check_item "GSD"        "$([ -f "$CLAUDE_DIR/get-shit-done/VERSION" ] && echo true || echo false)"

echo ""
echo -e "\033[36m  Next steps:\033[0m"
if ! command -v claude &>/dev/null; then
    echo "    1. Close and reopen terminal (to refresh PATH)"
fi
echo "    -> claude login   (log in with your account)"
echo "    -> claude         (run and test)"
echo ""
echo "  Detailed guide: $SCRIPT_DIR/SETUP.md"
echo ""
