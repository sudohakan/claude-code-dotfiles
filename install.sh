#!/bin/bash
# ============================================================
# Claude Code Portable Installer - Hakan's Configuration
# ============================================================
# Usage: bash install.sh
# Parameters:
#   --skip-plugins    : Skip plugin installation
#   --skip-hakanmcp   : Skip HakanMCP installation
#   --force           : Run without confirmation prompts
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
BACKUP_DIR="$HOME/.claude-backup-$(date +%Y%m%d-%H%M%S)"
USERNAME="$(whoami)"
TOTAL_STEPS=10

SKIP_PLUGINS=false
SKIP_HAKANMCP=false
FORCE=false

for arg in "$@"; do
    case $arg in
        --skip-plugins)  SKIP_PLUGINS=true ;;
        --skip-hakanmcp) SKIP_HAKANMCP=true ;;
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

install_if_missing() {
    local name="$1" cmd="$2" install_cmd="$3" manual_msg="$4"
    if command -v "$cmd" &>/dev/null; then
        ok "$name : $($cmd --version 2>/dev/null || echo 'available')"
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
    if $HAS_WINGET; then
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
    if $HAS_WINGET; then
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

# npm
if command -v npm &>/dev/null; then
    ok "npm : $(npm --version)"
else
    warn "npm not found. Check your Node.js installation."
fi

# jq
if command -v jq &>/dev/null; then
    ok "jq : $(jq --version 2>/dev/null)"
else
    if $HAS_WINGET; then
        install_if_missing "jq" "jq" \
            "winget install -e --id jqlang.jq --accept-source-agreements --accept-package-agreements" \
            "Manual: winget install jqlang.jq"
    else
        warn "jq not found. Install: apt install jq / brew install jq"
    fi
fi

# Python (required for Dippy hook)
if command -v python3 &>/dev/null; then
    ok "Python : $(python3 --version 2>/dev/null)"
elif command -v python &>/dev/null; then
    ok "Python : $(python --version 2>/dev/null)"
else
    warn "Python not found. Required for Dippy hook. Install: apt install python3 / brew install python"
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
    if $FORCE; then
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

mkdir -p "$CLAUDE_DIR"/{hooks,docs,commands/gsd,agents,get-shit-done,skills,plugins,projects,profiles,cache}
ok "Directories created."

# -- STEP 6: Copy configuration --
step 6 "Copying configuration files..."

CONFIG_DIR="$SCRIPT_DIR/config"

for f in CLAUDE.md settings.json settings.local.json package.json gsd-file-manifest.json; do
    [ -f "$CONFIG_DIR/$f" ] && cp "$CONFIG_DIR/$f" "$CLAUDE_DIR/$f"
done
echo "  + Core files"

cp "$CONFIG_DIR"/hooks/*.js "$CLAUDE_DIR/hooks/"
# Copy dippy subdirectory (Python-based bash auto-approve hook)
if [ -d "$CONFIG_DIR/hooks/dippy" ]; then
    cp -r "$CONFIG_DIR/hooks/dippy" "$CLAUDE_DIR/hooks/"
fi
echo "  + hooks/ (js files + dippy/)"

cp "$CONFIG_DIR"/docs/*.md "$CLAUDE_DIR/docs/"
echo "  + docs/"

cp "$CONFIG_DIR/commands/init-hakan.md" "$CLAUDE_DIR/commands/"
cp "$CONFIG_DIR"/commands/gsd/*.md "$CLAUDE_DIR/commands/gsd/"
echo "  + commands/"

cp "$CONFIG_DIR"/agents/*.md "$CLAUDE_DIR/agents/"
echo "  + agents/"

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
    sed -i "s|C:/Users/Hakan|C:/Users/$USERNAME|g" "$CLAUDE_DIR/settings.json"
    sed -i "s|C:\\\\Users\\\\Hakan|C:\\\\Users\\\\$USERNAME|g" "$CLAUDE_DIR/settings.json"
    ok "Paths updated: Hakan -> $USERNAME"
else
    ok "Same username, no changes needed."
fi

# .claude.json
if [ -f "$HOME/.claude.json" ]; then
    warn "Existing .claude.json preserved."
else
    cp "$SCRIPT_DIR/home-config/.claude.json" "$HOME/.claude.json"
    if [ "$USERNAME" != "Hakan" ]; then
        sed -i "s|C:\\\\Users\\\\Hakan|C:\\\\Users\\\\$USERNAME|g" "$HOME/.claude.json"
    fi
    ok ".claude.json created."
fi

# -- STEP 8: Memory --
step 8 "Transferring memory files..."

PROJECT_KEY="C--Users-$USERNAME"
MEM_DST="$CLAUDE_DIR/projects/$PROJECT_KEY/memory"
mkdir -p "$MEM_DST"
cp "$CONFIG_DIR"/projects/C--Users-Hakan/memory/*.md "$MEM_DST/"

if [ "$USERNAME" != "Hakan" ]; then
    for mdfile in "$MEM_DST"/*.md; do
        sed -i "s|C:\\\\Users\\\\Hakan|C:\\\\Users\\\\$USERNAME|g" "$mdfile"
        sed -i "s|C:/Users/Hakan|C:/Users/$USERNAME|g" "$mdfile"
    done
fi
ok "Memory copied ($PROJECT_KEY)."

# -- STEP 9: HakanMCP --
step 9 "HakanMCP setup..."

if $SKIP_HAKANMCP; then
    warn "HakanMCP skipped (--skip-hakanmcp)."
else
    # Platform-aware path: /c/dev on Git Bash Windows, ~/dev on Linux/macOS
    if [ -d "/c/" ]; then
        MCP_DIR="/c/dev/HakanMCP"
    else
        MCP_DIR="$HOME/dev/HakanMCP"
    fi
    if [ -d "$MCP_DIR" ]; then
        ok "HakanMCP already exists: $MCP_DIR"
    else
        if command -v git &>/dev/null; then
            info "Cloning HakanMCP..."
            mkdir -p "$(dirname "$MCP_DIR")"
            if git clone https://github.com/sudohakan/hakanmcp.git "$MCP_DIR" 2>/dev/null; then
                cd "$MCP_DIR"
                info "Running npm install..."
                npm install 2>/dev/null
                info "Running npm run build..."
                npm run build 2>/dev/null
                cd "$SCRIPT_DIR"
                ok "HakanMCP installed: $MCP_DIR"
            else
                err "HakanMCP clone failed."
                echo "       Manual: git clone https://github.com/sudohakan/hakanmcp.git /c/dev/HakanMCP"
            fi
        else
            warn "Git not available, cannot clone HakanMCP."
        fi
    fi
fi

# -- STEP 10: Plugins --
step 10 "Installing plugins..."

if $SKIP_PLUGINS; then
    warn "Plugin installation skipped (--skip-plugins)."
else
    if command -v claude &>/dev/null; then
        info "Installing official plugins..."

        for plugin in superpowers code-review context7 feature-dev ralph-loop playwright typescript-lsp; do
            if claude plugins install "$plugin" 2>/dev/null; then
                ok "$plugin"
            else
                warn "$plugin (will auto-install on first launch)"
            fi
        done

        info "Adding Trail of Bits marketplace..."
        if claude plugins add-marketplace trailofbits https://github.com/trailofbits/skills 2>/dev/null; then
            for plugin in static-analysis differential-review insecure-defaults sharp-edges supply-chain-risk-auditor audit-context-building; do
                if claude plugins install "${plugin}@trailofbits" 2>/dev/null; then
                    ok "$plugin@trailofbits"
                else
                    warn "$plugin@trailofbits (can be installed manually later)"
                fi
            done
        fi

        ok "Plugin installation complete."
    else
        warn "Claude CLI not yet in PATH."
        echo "    Plugins will auto-install after reopening the terminal."
    fi
fi

# -- SUMMARY --
echo ""
echo -e "\033[32m  ============================================\033[0m"
echo -e "\033[32m   INSTALLATION COMPLETE\033[0m"
echo -e "\033[32m  ============================================\033[0m"
echo ""

echo -e "\033[36m  Status Summary:\033[0m"
check_item() {
    if $2; then echo -e "    \033[32m[OK] $1\033[0m"; else echo -e "    \033[33m[--] $1\033[0m"; fi
}
check_item "Node.js"    "$(command -v node &>/dev/null && echo true || echo false)"
check_item "Git"        "$(command -v git &>/dev/null && echo true || echo false)"
check_item "jq"         "$(command -v jq &>/dev/null && echo true || echo false)"
check_item "Claude CLI" "$(command -v claude &>/dev/null && echo true || echo false)"
if [ -d "/c/" ]; then _MCP_CHECK="/c/dev/HakanMCP/dist/src/index.js"; else _MCP_CHECK="$HOME/dev/HakanMCP/dist/src/index.js"; fi
check_item "HakanMCP"   "$([ -f "$_MCP_CHECK" ] && echo true || echo false)"
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
