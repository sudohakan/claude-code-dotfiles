<p align="center">
  <h1 align="center">claude-code-dotfiles</h1>
  <p align="center">
    My personal Claude Code CLI configuration — portable, automated, production-ready.
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/platform-Windows-0078D4?style=flat-square&logo=windows" alt="Platform: Windows">
    <img src="https://img.shields.io/badge/Claude_Code-CLI-7C3AED?style=flat-square" alt="Claude Code CLI">
    <img src="https://img.shields.io/badge/license-MIT-22C55E?style=flat-square" alt="License: MIT">
    <img src="https://img.shields.io/badge/tools-200+-F59E0B?style=flat-square" alt="200+ Tools">
    <img src="https://img.shields.io/badge/version-1.2.0-blue?style=flat-square" alt="Version: 1.2.0">
  </p>
</p>

---

A complete, opinionated Claude Code CLI setup that includes a full project lifecycle workflow (GSD), safety hooks, multi-agent coordination, context engineering rules, and 200+ MCP tools — all installable with a single command.

## Versioning & Releases

This project uses [Semantic Versioning](https://semver.org/). Releases are published automatically on [GitHub Releases](https://github.com/sudohakan/claude-code-dotfiles/releases) when a version tag is pushed.

![Version](https://img.shields.io/badge/version-1.2.0-blue)

## What's Included

| Component | Count | Description |
|-----------|-------|-------------|
| **CLAUDE.md** | 1 | Global instructions: GSD workflow, multi-agent coordination, context engineering, session continuity |
| **Hooks** | 7 | `pretooluse-safety` (git protection), `gsd-context-monitor`, `gsd-statusline`, `gsd-check-update`, `post-autoformat`, `post-observability`, `post-notify` |
| **GSD Commands** | 31 | Full Get Shit Done workflow — `/gsd:new-project`, `/gsd:plan-phase`, `/gsd:execute-phase`, `/gsd:debug`, `/gsd:quick`, and 26 more |
| **Agent Definitions** | 11 | Planner, debugger, executor, researcher, verifier, codebase-mapper, integration-checker, and more |
| **Reference Docs** | 5 | Decision matrix, multi-agent protocol, tools reference, UI/UX system, review/Ralph |
| **Skill Sets** | 3 | `cc-devops-skills`, `trailofbits-security`, `ui-ux-pro-max` |
| **Plugins** | 13 | 7 official + 6 Trail of Bits security plugins |
| **Memory System** | 3 files | Cross-project knowledge base: decisions, patterns, solutions |
| **MCP Integration** | 200+ | HakanMCP server support (DB, Git, AI, monitoring, orchestration) |

## Quick Start

```powershell
# Clone and install — that's it
git clone https://github.com/sudohakan/claude-code-dotfiles.git C:\dev\claude-code-dotfiles
PowerShell -ExecutionPolicy Bypass -File "C:\dev\claude-code-dotfiles\install.ps1"

# Authenticate (one-time per machine)
claude login
```

> **Linux/macOS:** Use `install.sh` instead. The scripts handle platform differences automatically.

## What Gets Installed

The install script performs these steps automatically:

| # | Step | Details |
|---|------|---------|
| 1 | **Node.js** | Installs via `winget` if not found |
| 2 | **Git** | Installs via `winget` if not found |
| 3 | **jq** | Installs via `winget` if not found |
| 4 | **Claude Code CLI** | `npm install -g @anthropic-ai/claude-code` |
| 5 | **Config Backup** | Backs up existing `~/.claude/` to `~/.claude.backup-{timestamp}/` |
| 6 | **Configuration Files** | Copies all config to `~/.claude/` (hooks, commands, agents, skills, docs, GSD runtime) |
| 7 | **Path Auto-Fix** | Replaces hardcoded username references with current `$env:USERNAME` |
| 8 | **Home Config** | Installs `.claude.json` to user home directory |
| 9 | **Memory Templates** | Creates `memory/` directory with template files for cross-project knowledge base |
| 10 | **Plugins** | Installs all 13 plugins (7 official + 6 security) |

## Project Structure

```
claude-code-dotfiles/
├── install.ps1              # Windows installer
├── install.sh               # Linux/macOS installer
├── config/
│   ├── CLAUDE.md            # Global instructions
│   ├── settings.json        # Claude Code settings
│   ├── settings.local.json  # Local overrides
│   ├── package.json         # GSD npm package config
│   ├── gsd-file-manifest.json
│   ├── agents/              # 11 agent definitions
│   │   ├── gsd-planner.md
│   │   ├── gsd-executor.md
│   │   ├── gsd-debugger.md
│   │   ├── gsd-verifier.md
│   │   └── ... (7 more)
│   ├── commands/
│   │   ├── init-hakan.md    # Project initialization
│   │   └── gsd/             # 31 GSD slash commands
│   │       ├── new-project.md
│   │       ├── plan-phase.md
│   │       ├── execute-phase.md
│   │       ├── debug.md
│   │       ├── quick.md
│   │       └── ... (26 more)
│   ├── docs/                # 5 reference documents
│   │   ├── decision-matrix.md
│   │   ├── multi-agent.md
│   │   ├── tools-reference.md
│   │   ├── ui-ux.md
│   │   └── review-ralph.md
│   ├── hooks/               # 7 hooks
│   │   ├── pretooluse-safety.js
│   │   ├── gsd-context-monitor.js
│   │   ├── gsd-statusline.js
│   │   ├── gsd-check-update.js
│   │   ├── post-autoformat.js
│   │   ├── post-observability.js
│   │   └── post-notify.js
│   ├── get-shit-done/       # GSD runtime
│   │   ├── VERSION
│   │   ├── bin/             # GSD binaries & libraries
│   │   ├── references/      # Reference materials
│   │   ├── templates/       # Project templates
│   │   └── workflows/       # Workflow definitions
│   ├── plugins/             # Plugin registry
│   ├── skills/              # 3 skill sets
│   │   ├── cc-devops-skills/
│   │   ├── trailofbits-security/
│   │   └── ui-ux-pro-max/
│   └── projects/            # Per-project config & memory
│       └── C--Users-Hakan/
│           └── memory/
├── home-config/
│   └── .claude.json         # Home directory config
├── LICENSE
└── README.md
```

## Customization

### Edit Global Instructions

`config/CLAUDE.md` is the brain of the system. Key sections to personalize:

- **Language preference** — Change response language (default: Turkish + English technical terms)
- **GSD profile rules** — Adjust which keywords trigger `budget` / `balanced` / `quality` profiles
- **Context budget thresholds** — Tune the checkpoint percentages (45%, 55%, 65%, etc.)
- **Subagent model selection** — Set which model handles which complexity level

### Add Custom Hooks

Drop a `.js` file into `config/hooks/`. Hooks are auto-discovered by Claude Code. Available hook points:

- **PreToolUse** — Runs before any tool execution (use for safety gates)
- **PostToolUse** — Runs after tool execution (use for formatting, logging, notifications)

### Modify GSD Workflow

- **Add commands:** Create a new `.md` file in `config/commands/gsd/`
- **Add agents:** Create a new `.md` file in `config/agents/`
- **Change profiles:** Edit the profile selection table in `config/CLAUDE.md`
- **Adjust templates:** Modify files in `config/get-shit-done/templates/`

### Add or Remove Plugins

Edit the plugin installation section in `install.ps1`. Plugins are installed via:

```powershell
claude plugin add "plugin-name"
```

## Key Features

### GSD Workflow

A full project lifecycle management system with 31 commands covering:

- **Project creation** — `/gsd:new-project` scaffolds ROADMAP.md and STATE.md
- **Phase management** — Plan, discuss, research, execute, and verify each phase
- **Quick tasks** — `/gsd:quick` skips planning for small fixes
- **Debugging** — `/gsd:debug` with dedicated debugger agent
- **Progress tracking** — `/gsd:progress` shows real-time status

### Safety Hooks

- **Git protection** — All git commands (commit, push, reset, etc.) require explicit user approval. Session-based allowlist remembers approved commands (12h TTL)
- **Context budget monitoring** — Automatic warnings at 45%, 55%, 65%, 75%, 85%, 90% context usage
- **Observability** — JSONL logging of all tool invocations for audit trails

### Multi-Agent Protocol

Structured rules for parallel agent coordination:

- Agent role definitions with clear boundaries
- DAG scheduling for dependent tasks
- Quality gates between agent handoffs
- Failure protocols and recovery procedures

### Context Engineering

Token efficiency rules built into every workflow:

- **Write to filesystem, not context** — Large outputs go to files
- **Subagent isolation** — Each subagent starts with clean context
- **Lazy loading** — MCP tools loaded on-demand via ToolSearch
- **Progressive disclosure** — Summary first, details on request

## Security

- **No credentials included** — OAuth tokens are generated per-machine via `claude login`
- **No secrets in repo** — All API keys, tokens, and passwords are excluded
- **Fake test data** — Any secrets in skill test files are intentionally fake/example values
- **Path auto-fix** — Install script replaces hardcoded paths with the current username
- **Git safety hook** — Prevents accidental commits/pushes without explicit approval

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `claude: command not found` | Run `npm install -g @anthropic-ai/claude-code` or restart your terminal |
| Hooks not running | Check `~/.claude/settings.json` has correct hook paths. Run `node ~/.claude/hooks/pretooluse-safety.js --test` |
| GSD commands not appearing | Verify `~/.claude/commands/gsd/` directory exists and contains `.md` files |
| Path errors after install | Re-run `install.ps1` — it auto-fixes paths for your username |
| Context monitor not working | Ensure `jq` is installed: `jq --version` |
| Plugin install fails | Run `claude plugin add "plugin-name"` manually. Check network connectivity |
| `CLAUDE.md` not loading | Must be in `~/.claude/CLAUDE.md` (global) or project root (project-level) |
| Session continuity missing | Run `/init-hakan` in your project to create the memory structure |

## Requirements

- **OS:** Windows 10/11 (Linux/macOS supported via `install.sh`)
- **Node.js:** v18+ (auto-installed if missing)
- **Git:** Any recent version (auto-installed if missing)
- **Claude Code:** Installed automatically by the script

## License

[MIT](LICENSE) -- 2026 Hakan

---

<p align="center">
  Built with <a href="https://docs.anthropic.com/en/docs/claude-code">Claude Code</a>
</p>
