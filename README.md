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
    <img src="https://img.shields.io/badge/version-1.3.1-blue?style=flat-square" alt="Version: 1.3.0">
  </p>
</p>

---

A complete, opinionated Claude Code CLI setup that includes a full project lifecycle workflow (GSD), safety hooks, multi-agent coordination, context engineering rules, and 200+ MCP tools — all installable with a single command.

## Versioning & Releases

This project uses [Semantic Versioning](https://semver.org/). Releases are published automatically on [GitHub Releases](https://github.com/sudohakan/claude-code-dotfiles/releases) when a version tag is pushed.

![Version](https://img.shields.io/badge/version-1.3.1-blue)

## What's Included

| Component | Count | Description |
|-----------|-------|-------------|
| **CLAUDE.md** | 1 | Global instructions: GSD workflow, multi-agent coordination, context engineering, session continuity |
| **Hooks** | 6 | `dippy` (smart bash auto-approve), `pretooluse-safety` (destructive command protection), `gsd-context-monitor`, `gsd-statusline`, `gsd-check-update`, `post-autoformat` |
| **GSD Commands** | 31 | Full Get Shit Done workflow — `/gsd:new-project`, `/gsd:plan-phase`, `/gsd:execute-phase`, `/gsd:debug`, `/gsd:quick`, and 26 more |
| **Agent Definitions** | 11 | planner, executor, debugger, verifier, phase-researcher, project-researcher, plan-checker, integration-checker, codebase-mapper, roadmapper, research-synthesizer |
| **Reference Docs** | 5 | Decision matrix, multi-agent protocol, tools reference, UI/UX system, review/Ralph |
| **Skill Sets** | 3 | `cc-devops-skills`, `trailofbits-security`, `ui-ux-pro-max` |
| **Plugins** | 13 | 7 official + 6 Trail of Bits security plugins |
| **Memory System** | 6 files | Cross-project knowledge base: decisions, patterns, solutions, session-continuity, auto-checkpoint |
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
| 1 | **Package Manager** | Checks for `winget` availability |
| 2 | **Dependencies** | Installs Git, Node.js, jq via `winget` if not found |
| 3 | **Claude Code CLI** | `npm install -g @anthropic-ai/claude-code` |
| 4 | **Config Backup** | Backs up existing `~/.claude/` to `~/.claude-backup-{timestamp}/` |
| 5 | **Directory Structure** | Creates required directories under `~/.claude/` |
| 6 | **Configuration Files** | Copies all config to `~/.claude/` (hooks, commands, agents, skills, docs, GSD runtime) |
| 7 | **Path Auto-Fix** | Replaces hardcoded username references with current `$env:USERNAME` |
| 8 | **Memory Templates** | Creates `memory/` directory with template files for cross-project knowledge base |
| 9 | **HakanMCP** | Clones and builds HakanMCP server to `C:\dev\HakanMCP` (skippable with `-SkipHakanMCP`) |
| 10 | **Plugins** | Installs all 13 plugins via `claude plugins install` (skippable with `-SkipPlugins`) |

## Project Structure

```
claude-code-dotfiles/
├── install.ps1                # Windows installer (PowerShell)
├── install.sh                 # Linux/macOS installer (Bash)
├── CLAUDE.md                  # Project-level instructions for this repo
├── VERSION                    # Current version number (semver)
├── CHANGELOG.md               # Release history (Keep a Changelog format)
├── SECURITY.md                # Security policy and vulnerability reporting
├── SETUP.md                   # Detailed setup and configuration guide
├── LICENSE                    # MIT license
├── config/                    # All Claude Code configuration files
│   ├── CLAUDE.md              # Global instructions (GSD, context engineering, multi-agent)
│   ├── settings.json          # Hooks, plugins, MCP servers, model selection
│   ├── settings.local.json    # Local overrides (not synced)
│   ├── package.json           # GSD npm package dependencies
│   ├── gsd-file-manifest.json # GSD file tracking manifest
│   ├── agents/                # 11 GSD agent definitions
│   │   ├── gsd-planner.md             # Phase planning and task breakdown
│   │   ├── gsd-executor.md            # Code implementation and execution
│   │   ├── gsd-debugger.md            # Bug investigation and root cause analysis
│   │   ├── gsd-verifier.md            # Quality verification and UAT
│   │   ├── gsd-phase-researcher.md    # Phase-specific technical research
│   │   ├── gsd-project-researcher.md  # Project-wide context gathering
│   │   ├── gsd-plan-checker.md        # Plan quality and completeness validation
│   │   ├── gsd-integration-checker.md # Cross-component integration verification
│   │   ├── gsd-codebase-mapper.md     # Codebase structure analysis
│   │   ├── gsd-roadmapper.md          # Roadmap generation from requirements
│   │   └── gsd-research-synthesizer.md # Multi-source research aggregation
│   ├── commands/              # Slash commands
│   │   ├── init-hakan.md              # Project scaffolding (/init-hakan)
│   │   └── gsd/                       # 31 GSD workflow commands
│   │       ├── new-project.md         # Initialize new project with ROADMAP + STATE
│   │       ├── plan-phase.md          # Create detailed phase plan (PLAN.md)
│   │       ├── execute-phase.md       # Execute phase with wave-based parallelization
│   │       ├── debug.md               # Systematic debugging with persistent state
│   │       ├── quick.md               # Quick task execution (skip planning)
│   │       └── ... (26 more)          # progress, verify, resume, pause, etc.
│   ├── docs/                  # 5 reference documents (loaded on-demand)
│   │   ├── decision-matrix.md         # Task → workflow routing rules
│   │   ├── multi-agent.md             # Parallel agent coordination protocol
│   │   ├── tools-reference.md         # External tool integration guide
│   │   ├── ui-ux.md                   # UI/UX Pro Max design system
│   │   └── review-ralph.md            # Code review + Ralph Loop integration
│   ├── hooks/                 # 6 automation hooks
│   │   ├── dippy/                     # Smart bash auto-approve (Python, 14K+ tests)
│   │   ├── pretooluse-safety.js       # Destructive command blocker (session allowlist)
│   │   ├── gsd-context-monitor.js     # Context budget tracking (45-90% thresholds)
│   │   ├── gsd-statusline.js          # Status line renderer (profile, phase, context %)
│   │   ├── gsd-check-update.js        # GSD version check on session start
│   │   └── post-autoformat.js         # Optional code formatting (disabled by default)
│   ├── get-shit-done/         # GSD runtime engine
│   │   ├── VERSION                    # GSD version number
│   │   ├── bin/                       # Core libraries and CLI utilities
│   │   ├── references/                # Workflow reference materials
│   │   ├── templates/                 # Project and phase templates
│   │   └── workflows/                 # Custom workflow overrides
│   ├── plugins/               # Plugin registry and configurations
│   ├── skills/                # 3 skill sets
│   │   ├── cc-devops-skills/          # DevOps: IaC, CI/CD, cloud platforms
│   │   ├── trailofbits-security/      # Security: static analysis, vulnerability audit
│   │   └── ui-ux-pro-max/            # UI/UX: 67 styles, 96 palettes, 13 stacks
│   └── projects/              # Per-project configuration and memory
│       └── C--Users-Hakan/            # Default project scope
│           └── memory/                # Session continuity and knowledge base
├── home-config/               # Home directory config files
│   └── .claude.json                   # ~/.claude.json (project-independent settings)
└── README.md                  # This file
```

## Customization

### Edit Global Instructions

`config/CLAUDE.md` is the brain of the system. Key sections to personalize:

- **Language preference** — Responds in whatever language the user speaks (auto-detect)
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
claude plugins install "plugin-name"
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

- **Smart auto-approve** — Dippy automatically approves safe bash commands (`ls`, `git status`, `npm test`, etc.) while flagging dangerous ones. 14,000+ test suite with custom bash parser
- **Destructive command protection** — `pretooluse-safety` blocks force pushes, hard resets, recursive deletes, DROP TABLE, credential leaks (AWS/GitHub/OpenAI keys), and unicode injection. Optional exfiltration detection (disabled by default). Session-based allowlist remembers approved commands (12h TTL)
- **Context budget monitoring** — Automatic warnings at 45%, 55%, 65%, 75%, 85%, 90% context usage

### Multi-Agent Protocol

Structured rules for parallel agent coordination:

- Agent role definitions with clear boundaries
- Dependency-driven eager wave execution for task scheduling
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
| Plugin install fails | Run `claude plugins install "plugin-name"` manually. Check network connectivity |
| `CLAUDE.md` not loading | Must be in `~/.claude/CLAUDE.md` (global) or project root (project-level) |
| Session continuity missing | Run `/init-hakan` in your project to create the memory structure |
| HakanMCP failed | Check `C:\dev\HakanMCP` exists and is built. Re-run `install.ps1` or use `-SkipHakanMCP` |

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
