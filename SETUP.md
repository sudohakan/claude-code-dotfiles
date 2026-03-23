# claude-code-dotfiles Setup Guide


**Related projects:** [HakanMCP](https://github.com/sudohakan/HakanMCP), [gtasks-mcp](https://github.com/sudohakan/gtasks-mcp), [infoset-mcp](https://github.com/sudohakan/infoset-mcp), [kali-mcp](https://github.com/sudohakan/kali-mcp-server), [pentest-framework](README.md#portable-local-dependencies)

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

### WSL (Ubuntu):
```bash
# Full WSL setup (Node.js, Claude CLI, symlink, tmux, SSH, Tailscale):
bash /mnt/c/dev/claude-code-dotfiles/setup-wsl-claude.sh
# Note: Edit WINDOWS_CLAUDE_DIR in script if username differs from "Hakan"
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
| 9 | **Bootstrap local MCP/dev projects** | Uses `external-projects.manifest.json` to provision [HakanMCP](https://github.com/sudohakan/HakanMCP), [gtasks-mcp](https://github.com/sudohakan/gtasks-mcp), [infoset-mcp](https://github.com/sudohakan/infoset-mcp), [kali-mcp](https://github.com/sudohakan/kali-mcp-server), and the [`pentest-framework` scaffold](config/commands/pentest.md) |
| 10 | **Install plugins** | 13 official + 11 Trail of Bits + 3 Anthropic = 27 plugins |

**After installation, just run `claude login` and you're ready.**

### Parameters:

```powershell
# Install everything (default)
install.ps1

# Skip plugins
install.ps1 -SkipPlugins

# Run without confirmation prompts
install.ps1 -Force

# Bash version
bash install.sh --skip-plugins --force
```

---

## Software to Install (Automatic)

The script auto-installs missing software (via winget):

| Software | Why Needed | Automatic? |
|----------|-----------|------------|
| **Node.js v20+** | Hooks, Claude CLI, local MCP projects | Yes (winget) |
| **Python 3.8+** | Dippy hook, portable install helpers | Yes (winget) |
| **Git** | Local repo bootstrap, version control | Yes (winget) |
| **jq** | Required by some hooks | Yes (winget) |
| **Bun** | Optional helper for some MCP builds | Best-effort |
| **Claude Code CLI** | Main tool | Yes (npm) |
| **Manifest-defined local projects** | [HakanMCP](https://github.com/sudohakan/HakanMCP) + related local MCP/dev repos | Yes (git clone/update + install/build/validate) |
| **27 Plugins** | Superpowers, GSD, Trail of Bits, etc. | Yes (claude plugins) |

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
├── settings.local.json       # Local permissions template (edit per machine)
├── package.json              # CommonJS setting
├── gsd-file-manifest.json    # GSD file manifest
├── project-registry.json     # Project scan roots + recent projects
├── hooks/                    # 23 hook/support files (excluding dippy/)
│   ├── dippy/                   # Smart bash auto-approve (Python)
│   ├── pretooluse-safety.js     # Credential + destructive + unicode blocker
│   ├── hook-health-check.js     # Hook health verification
│   ├── retention-cleanup.js     # Old data cleanup + storage hygiene report
│   ├── project-alias-hygiene.js # Duplicate project-key consolidation utility
│   ├── file-history-hygiene.js  # Oversized stale history archival utility
│   ├── project-session-hygiene.js # Per-project stale session archival utility
│   ├── mcp-health-check.js      # Periodic MCP verification
│   ├── mcp-reconnect.js         # Session-start MCP reconnect
│   ├── rotate-hook-approvals.js # Hook approval rotation
│   ├── posttooluse-lint-format.js # Post-edit lint/format orchestration
│   ├── task-completed-check.js  # Task completion gate
│   ├── session-end-check.js     # Final verification reminder
│   ├── team-active-reminder.js  # Active team reminder
│   ├── teammate-idle-check.js   # Idle teammate nudge
│   └── desktop-notify.ps1       # Windows notifications
├── docs/                     # 55 reference docs
│   ├── agent-teams.md, mcp-usage-guide.md, claudeignore-templates.md, ...
│   └── pentest-*.md, review guides, workflow specs, ...
├── commands/                 # 125 slash commands
│   ├── status.md                # /status — workspace + hygiene orientation
│   ├── maintenance-status.md    # /maintenance-status — storage, trend, and auto-action summary
│   ├── todo-overview.md         # /todo-overview — pending work overview
│   ├── dotfiles-sync.md         # /dotfiles-sync — live -> repo sync workflow
│   ├── commit.md                # /commit — conventional commit
│   ├── create-pr.md             # /create-pr — branch, commit, push, PR
│   ├── pentest.md               # /pentest — offensive security workflow
│   ├── work-sync.md             # Cross-system task/calendar synchronization
│   └── gsd/                     # /gsd:* command set
├── agents/                   # 37 agent definitions
├── teams/                    # Agent team configuration
│   ├── agents/                  # 26 role definitions
│   │   ├── tech-lead.md, fullstack-dev.md, product-manager.md, ...
│   │   └── launch-ops.md, qa-tester.md, security-engineer.md, ...
│   ├── ACTIVE_AGENTS.md         # Active agent registry
│   ├── ROLE_COMPRESSION_MAP.md  # Role compression reference
│   └── favorites.json           # Favorite team configurations
├── get-shit-done/            # GSD core engine
├── skills/                   # 51 skill sets
│   ├── cc-devops-skills/        # DevOps generators/validators
│   ├── community-skills/        # Shared community packs
│   ├── local-workflows/         # Local workspace hygiene/maintenance
│   ├── trailofbits-security/    # Security/audit packs
│   └── ui-ux-pro-max/           # UI/UX system
├── plugins/                  # Marketplace settings
└── projects/                 # Global memory (6 files)
```

### `home-config/` — Home directory (-> `%USERPROFILE%\`)

```
home-config/
└── .claude.json              # Sanitized portable MCP server template
```

### Repo bootstrap manifest

```
external-projects.manifest.json  # Portable list of local MCP/dev dependencies
scripts/
├── bootstrap_dev_projects.py    # Clone/update/build/validate manifest entries
└── resolve_claude_config.py     # Resolve portable MCP placeholders into ~/.claude.json
```

### NOT Included (private / machine-specific):

| File | Reason |
|------|--------|
| `.credentials.json` | OAuth token — created via `claude login` and never distributed |
| `history.jsonl` | Conversation history |
| `cache/`, `logs/`, `debug/` | Temporary files |
| `plugins/cache/` | Re-downloaded from marketplace |
| `shell-snapshots/`, `session-env/` | Session-specific |
| Raw `~/.claude.json` OAuth/account state | Sync exports a sanitized MCP-only template instead |

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
python "C:\dev\claude-code-dotfiles\scripts\resolve_claude_config.py" --template "C:\dev\claude-code-dotfiles\home-config\.claude.json" --target "%USERPROFILE%\.claude.json" --dev-root "C:/dev" --node-command "node"
```

### Step 3: Fix Paths
Replace `C:/Users/Hakan` with your own username in `settings.json` where needed.

### Step 4: Log In + Plugins
```bash
claude login
claude plugins install superpowers
claude plugins install code-review context7 feature-dev ralph-loop typescript-lsp
claude plugins install frontend-design skill-creator commit-commands code-simplifier
claude plugins install pr-review-toolkit security-guidance claude-md-management
claude plugins add-marketplace trailofbits https://github.com/trailofbits/skills
claude plugins install static-analysis@trailofbits differential-review@trailofbits
claude plugins install insecure-defaults@trailofbits sharp-edges@trailofbits
claude plugins install supply-chain-risk-auditor@trailofbits audit-context-building@trailofbits
```

### Step 5: Bootstrap local projects
```bash
python C:\dev\claude-code-dotfiles\scripts\bootstrap_dev_projects.py --manifest C:\dev\claude-code-dotfiles\external-projects.manifest.json --dev-root C:\dev
```

---

## Verification

Post-installation checks:
```bash
claude --version                              # Is CLI working?
node ~/.claude/hooks/pretooluse-safety.js --test  # Are hooks active? (30/30)
node ~/.claude/hooks/retention-cleanup.js --self-test  # Is storage hygiene hook present?
claude plugins list                           # Are plugins installed?
# Inside Claude: /gsd:help                    # Is GSD working?
```

---

## Post-Installation Setup

After installation, some features require additional configuration:

### MCP Servers

The installer resolves `home-config/.claude.json` into a machine-local `~/.claude.json` and bootstraps the local repos it depends on automatically. The distributed template contains sanitized MCP definitions only; add machine-local auth after install where needed:

| Server | Setup | Reference |
|--------|-------|-----------|
| [HakanMCP](https://github.com/sudohakan/HakanMCP) | Automatic (manifest bootstrap) | — |
| [gtasks-mcp](https://github.com/sudohakan/gtasks-mcp) | Automatic (manifest bootstrap) | — |
| [infoset-mcp](https://github.com/sudohakan/infoset-mcp) | Automatic (manifest bootstrap) | — |
| [kali-mcp](https://github.com/sudohakan/kali-mcp-server) | Repo prepared automatically, service start remains explicit | `docker compose up` in local repo |
| context7 | Automatic (plugin) | — |
| HakanMCP browser bridge | Automatic via [HakanMCP](https://github.com/sudohakan/HakanMCP) bootstrap | Use `/browser` or HakanMCP wrapper tools |
| NotebookLM | `nlm login` (Google auth) | Add to `.claude.json` mcpServers |
| Gmail / Calendar | OAuth via Claude remote MCP | Only when explicitly needed |
| container-use | Copy `container-use.exe` to `~/bin/` | Optional — Docker required |

See `~/.claude/docs/mcp-usage-guide.md` for full MCP configuration details.

### Storage Hygiene

The session-start cleanup hook also produces daily storage reports and trend files at:

```bash
~/.claude/cache/storage-hygiene-report.json
~/.claude/cache/storage-hygiene-trend.json
~/.claude/cache/maintenance-auto-actions-last-run.json
```

Default cleanup windows:

- `file-history`: 21 days
- `projects/*.jsonl`: 14 days
- `tasks`: 21 days
- `storage-hygiene-history`: 120 days

If you need a different local profile, override with environment variables such as `CLAUDE_RETENTION_FILE_HISTORY_DAYS` or `CLAUDE_RETENTION_PROJECT_LOG_DAYS`.

Automatic maintenance defaults:

- stale oversized `file-history` sessions: auto-archive on
- stale oversized project sessions in the heaviest projects: auto-archive on
- duplicate project alias merge: inspect only by default, auto-apply optional via env

For duplicate project-key cleanup, use:

```bash
node ~/.claude/hooks/project-alias-hygiene.js --json
node ~/.claude/hooks/project-alias-hygiene.js --apply --json
```

For oversized stale file-history cleanup, use:

```bash
node ~/.claude/hooks/file-history-hygiene.js --json
node ~/.claude/hooks/file-history-hygiene.js --apply --json
```

For oversized stale per-project session cleanup, use:

```bash
node ~/.claude/hooks/project-session-hygiene.js --project-key "-mnt-c-Users-Hakan" --json
node ~/.claude/hooks/project-session-hygiene.js --project-key "-mnt-c-Users-Hakan" --apply --json
```

### .claudeignore

Create `.claudeignore` in your project root to exclude files from Claude's context:
```bash
# See templates: ~/.claude/docs/claudeignore-templates.md
```

### Agent Teams

Agent Teams are enabled by default (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json).

- 26 role definitions in `~/.claude/teams/agents/`
- Coordination protocol in `~/.claude/docs/agent-teams.md`
- Team commands: `/buildteam`, `/e2eteam`, `/opsteam`, `/growthteam`, `/researchteam`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `claude` command not found | Close/reopen terminal (to refresh PATH) |
| Hook not working | Check paths in `settings.json` |
| Plugin not found | Install individually with `claude plugins install <name>` |
| MCP connection error | Check [HakanMCP](https://github.com/sudohakan/HakanMCP) path in `.claude.json` |
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
