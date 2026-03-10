# claude-code-dotfiles Setup Guide

> Hakan's Claude Code configuration — portable transfer package for other machines.
> Created: 2026-03-01

---

## Quick Setup (Single Command — Installs Everything Automatically)

### PowerShell (Windows):
```powershell
PowerShell -ExecutionPolicy Bypass -File "C:\dev\claude-code-dotfiles\install.ps1"
```

### Git Bash:
```bash
bash /c/dev/claude-code-dotfiles/install.sh
```

### What the Script Does (10 Steps):

| Step | Action | Details |
|------|--------|---------|
| 1 | Check package manager | Is winget available? |
| 2 | **Install dependencies** | Git, Node.js, Python, jq — auto-installs via winget if missing |
| 3 | **Install Claude Code CLI** | `npm install -g @anthropic-ai/claude-code` — auto if missing |
| 4 | Back up existing config | `.claude-backup-YYYYMMDD-HHMMSS` |
| 5 | Create directory structure | Hooks, docs, commands, agents, GSD, skills directories |
| 6 | Copy configuration | All config files, commands, hooks, agents, skills, plugins |
| 7 | Fix paths | Auto-updates if username differs |
| 8 | **Transfer memory** | Cross-project knowledge base files |
| 9 | **Install HakanMCP** | `git clone` + `npm install` + `npm run build` |
| 10 | **Install plugins** | 15 official + 11 Trail of Bits + 3 Anthropic = 29 plugins |

**After installation, just run `claude login` and you're ready.**

### Parameters:

```powershell
# Install everything (default)
install.ps1

# Skip HakanMCP
install.ps1 -SkipHakanMCP

# Skip plugins
install.ps1 -SkipPlugins

# Run without confirmation prompts
install.ps1 -Force

# Bash version
bash install.sh --skip-hakanmcp --skip-plugins --force
```

---

## Software to Install (Automatic)

The script auto-installs missing software (via winget):

| Software | Why Needed | Automatic? |
|----------|-----------|------------|
| **Node.js v20+** | Hooks, Claude CLI, HakanMCP | Yes (winget) |
| **Python 3.8+** | Dippy hook | Yes (winget) |
| **Git** | HakanMCP clone, version control | Yes (winget) |
| **jq** | Required by some hooks | Yes (winget) |
| **Claude Code CLI** | Main tool | Yes (npm) |
| **HakanMCP** | Comprehensive MCP server | Yes (git clone + build) |
| **29 Plugins** | Superpowers, GSD, Trail of Bits, etc. | Yes (claude plugins) |

### Optional (Manual install):

| Software | Description | Installation |
|----------|-------------|-------------|
| **Go** | For Claude Squad | `winget install GoLang.Go` |
| **Docker Desktop** | For Container Use | `winget install Docker.DockerDesktop` |
| **tmux** | For Claude Squad TUI | msys2 or manual |
| **Claude Squad** | Multi-session TUI | `go install github.com/anthropics/claude-squad@latest` |
| **container-use** | Sandbox container | Copy `~/bin/container-use.exe` |

---

## Package Contents

### `config/` — Main configuration (-> `%USERPROFILE%\.claude\`)

```
config/
├── CLAUDE.md                 # Global instructions
├── settings.json             # Hooks, plugins, MCP, model preferences
├── settings.local.json       # Local permissions
├── package.json              # CommonJS setting
├── gsd-file-manifest.json    # GSD file manifest
├── hooks/                    # 7 hooks
│   ├── dippy/                   # Smart bash auto-approve (Python)
│   ├── pretooluse-safety.js     # Credential + destructive + unicode blocker
│   ├── gsd-context-monitor.js   # Context budget monitoring
│   ├── gsd-statusline.js        # Status line
│   ├── gsd-check-update.js      # GSD update check
│   ├── dotfiles-check-update.js # Dotfiles update check
│   └── post-autoformat.js       # Auto format (disabled by default)
├── docs/                     # 5 reference documents
├── commands/                 # 11 + 34 slash commands
│   ├── init-hakan.md            # /init-hakan — project scaffolding
│   ├── browser.md               # /browser — Playwright MCP browser launcher
│   ├── commit.md                # /commit — conventional commit
│   ├── create-pr.md             # /create-pr — branch, commit, push, PR
│   ├── fix-github-issue.md      # /fix-github-issue — fetch and fix issue
│   ├── fix-pr.md                # /fix-pr — fix PR review comments
│   ├── release.md               # /release — version bump, changelog, tag
│   ├── run-ci.md                # /run-ci — auto-detect and run CI
│   ├── ship.md                  # /ship — end-to-end git workflow
│   ├── dotfiles-update.md       # /dotfiles-update — auto-update from GitHub
│   └── gsd/                     # /gsd:* (34 commands)
├── agents/                   # 12 GSD agent definitions
├── get-shit-done/            # GSD core engine
├── skills/                   # 4 skill sets
│   ├── cc-devops-skills/
│   ├── community-skills/
│   ├── trailofbits-security/
│   └── ui-ux-pro-max/
├── plugins/                  # Marketplace settings
└── projects/                 # Global memory (6 files)
```

### `home-config/` — Home directory (-> `%USERPROFILE%\`)

```
home-config/
└── .claude.json              # MCP server settings (HakanMCP)
```

### NOT Included (private / machine-specific):

| File | Reason |
|------|--------|
| `.credentials.json` | OAuth token — created via `claude login` |
| `history.jsonl` | Conversation history |
| `cache/`, `logs/`, `debug/` | Temporary files |
| `plugins/cache/` | Re-downloaded from marketplace |
| `shell-snapshots/`, `session-env/` | Session-specific |

---

## Manual Installation (Without Script)

### Step 1: Install Software
```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.12
winget install jqlang.jq
npm install -g @anthropic-ai/claude-code
```

### Step 2: Copy Files
```powershell
xcopy /E /Y "C:\dev\claude-code-dotfiles\config\*" "%USERPROFILE%\.claude\"
copy "C:\dev\claude-code-dotfiles\home-config\.claude.json" "%USERPROFILE%\.claude.json"
```

### Step 3: Fix Paths
Replace `C:/Users/Hakan` with your own username in `settings.json` and `.claude.json`.

### Step 4: Log In + Plugins
```bash
claude login
claude plugins install superpowers
claude plugins install code-review context7 feature-dev ralph-loop playwright typescript-lsp
claude plugins add-marketplace trailofbits https://github.com/trailofbits/skills
claude plugins install static-analysis@trailofbits differential-review@trailofbits
claude plugins install insecure-defaults@trailofbits sharp-edges@trailofbits
claude plugins install supply-chain-risk-auditor@trailofbits audit-context-building@trailofbits
```

### Step 5: HakanMCP
```bash
git clone https://github.com/sudohakan/HakanMCP.git C:\dev\HakanMCP
cd C:\dev\HakanMCP && npm install && npm run build
```

---

## Verification

Post-installation checks:
```bash
claude --version                              # Is CLI working?
node ~/.claude/hooks/pretooluse-safety.js --test  # Are hooks active? (30/30)
claude plugins list                           # Are plugins installed?
# Inside Claude: /gsd:help                    # Is GSD working?
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `claude` command not found | Close/reopen terminal (to refresh PATH) |
| Hook not working | Check paths in `settings.json` |
| Plugin not found | Install individually with `claude plugins install <name>` |
| MCP connection error | Check HakanMCP path in `.claude.json` |
| GSD commands missing | Check files in `~/.claude/commands/gsd/` |
| Credential error | Log in again with `claude login` |
| winget not found | Install "App Installer" from Microsoft Store |

---

## Single-File Transfer via Zip

```powershell
# On this machine — create zip
Compress-Archive -Path "C:\dev\claude-code-dotfiles\*" -DestinationPath "C:\dev\claude-code-dotfiles.zip"

# On target machine — extract and install
Expand-Archive -Path "claude-code-dotfiles.zip" -DestinationPath "C:\dev\claude-code-dotfiles"
PowerShell -ExecutionPolicy Bypass -File "C:\dev\claude-code-dotfiles\install.ps1"
# Then: claude login
```
