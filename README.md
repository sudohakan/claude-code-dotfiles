<p align="center">
  <h1 align="center">claude-code-dotfiles</h1>
  <p align="center">
    My personal Claude Code CLI configuration — portable, automated, production-ready.
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/version-1.6.0-blue?style=flat-square" alt="Version: 1.6.0">
    <img src="https://img.shields.io/badge/platform-Windows-0078D4?style=flat-square&logo=windows" alt="Platform: Windows">
    <img src="https://img.shields.io/badge/Claude_Code-CLI-7C3AED?style=flat-square" alt="Claude Code CLI">
    <img src="https://img.shields.io/badge/license-MIT-22C55E?style=flat-square" alt="License: MIT">
  </p>
</p>

---

A complete, opinionated Claude Code CLI setup: full project lifecycle workflow (GSD), multi-layer safety hooks, multi-agent coordination, context engineering rules, and 200+ MCP tools — all installable with a single command.

## Quick Start

```powershell
git clone https://github.com/sudohakan/claude-code-dotfiles.git C:\dev\claude-code-dotfiles
PowerShell -ExecutionPolicy Bypass -File "C:\dev\claude-code-dotfiles\install.ps1"
claude login
```

> **Linux/macOS:** Use `install.sh` instead.

## What's Included

| Component | Count | Description |
|-----------|------:|-------------|
| **Global Instructions** | 1 | `CLAUDE.md` — GSD workflow, multi-agent protocol, context engineering, session continuity |
| **Hooks** | 6 | Dippy (bash auto-approve), pretooluse-safety (credential/unicode/destructive blocker), GSD context monitor, statusline, check-update, auto-format |
| **GSD Commands** | 31 | Full lifecycle: new-project, plan-phase, execute-phase, debug, quick, verify-work, and 25 more |
| **Git Workflow Commands** | 7 | `/commit`, `/create-pr`, `/fix-github-issue`, `/fix-pr`, `/release`, `/run-ci`, `/ship` |
| **Utility Commands** | 2 | `/init-hakan` (project scaffolding), `/browser` (Playwright MCP browser launcher) |
| **Agents** | 11 | planner, executor, debugger, verifier, phase-researcher, project-researcher, plan-checker, integration-checker, codebase-mapper, roadmapper, research-synthesizer |
| **Reference Docs** | 5 | Decision matrix, multi-agent protocol, tools reference, UI/UX design system, review/Ralph |
| **Skills** | 3 | cc-devops-skills, trailofbits-security, ui-ux-pro-max |
| **Plugins** | 13 | 7 official + 6 Trail of Bits security plugins |
| **Memory** | 6 files | Cross-project knowledge base: decisions, patterns, solutions, session-continuity, auto-checkpoint |
| **MCP** | 200+ | HakanMCP server (DB, Git, AI, monitoring, orchestration, file system) |

## Installation Steps

| # | Step | Details |
|--:|------|---------|
| 1 | **Dependencies** | Installs Git, Node.js, jq via `winget` if not found |
| 2 | **Claude Code CLI** | `npm install -g @anthropic-ai/claude-code` |
| 3 | **Backup** | Backs up existing `~/.claude/` to `~/.claude-backup-{timestamp}/` |
| 4 | **Copy Config** | Copies all config to `~/.claude/` (hooks, commands, agents, skills, docs, GSD) |
| 5 | **Path Fix** | Replaces hardcoded username references with current `$env:USERNAME` |
| 6 | **Memory** | Creates `memory/` directory with template files for knowledge base |
| 7 | **HakanMCP** | Clones and builds HakanMCP to `C:\dev\HakanMCP` (skip: `-SkipHakanMCP`) |
| 8 | **Plugins** | Installs 13 plugins via `claude plugins install` (skip: `-SkipPlugins`) |

## Project Structure

```
claude-code-dotfiles/
├── install.ps1                                  # Windows installer (PowerShell)
├── install.sh                                   # Linux/macOS installer (Bash)
├── VERSION                                      # Current version (semver)
├── CHANGELOG.md                                 # Release history (Keep a Changelog)
├── CLAUDE.md                                    # Project-level instructions for this repo
├── SETUP.md                                     # Detailed setup guide
├── SECURITY.md                                  # Security policy
├── LICENSE                                      # MIT license
├── .gitignore                                   # Git exclusions
├── .github/
│   └── workflows/
│       └── release.yml                          # Auto-release on version tag push
├── .claude/
│   └── commands/
│       └── sync-dotfiles.md                     # /sync-dotfiles — reverse sync to repo
├── home-config/
│   └── .claude.json                             # → ~/.claude.json (MCP server config)
└── config/                                      # → installs to ~/.claude/
    ├── CLAUDE.md                                # Global instructions (GSD, context, multi-agent)
    ├── settings.json                            # Hooks, MCP servers, permissions, model config
    ├── settings.local.json                      # Local overrides (gitignored)
    ├── package.json                             # GSD npm dependencies
    ├── gsd-file-manifest.json                   # GSD file tracking manifest
    ├── project-registry.json                    # Project discovery config (scan roots, recent)
    ├── agents/                                  # 11 GSD agent definitions
    │   ├── gsd-planner.md                       # Phase planning and task breakdown
    │   ├── gsd-executor.md                      # Code implementation
    │   ├── gsd-debugger.md                      # Bug investigation and root cause
    │   ├── gsd-verifier.md                      # Quality verification and UAT
    │   ├── gsd-phase-researcher.md              # Phase-specific research
    │   ├── gsd-project-researcher.md            # Project-wide context gathering
    │   ├── gsd-plan-checker.md                  # Plan completeness validation
    │   ├── gsd-integration-checker.md           # Cross-component verification
    │   ├── gsd-codebase-mapper.md               # Codebase structure analysis
    │   ├── gsd-roadmapper.md                    # Roadmap generation
    │   └── gsd-research-synthesizer.md          # Multi-source research aggregation
    ├── commands/                                # Slash commands
    │   ├── init-hakan.md                        # /init-hakan — project scaffolding
    │   ├── browser.md                           # /browser — Playwright MCP browser launcher
    │   ├── commit.md                            # /commit — conventional commit with emoji
    │   ├── create-pr.md                         # /create-pr — branch, commit, push, PR
    │   ├── fix-github-issue.md                  # /fix-github-issue — fetch and fix issue
    │   ├── fix-pr.md                            # /fix-pr — fix PR review comments
    │   ├── release.md                           # /release — version bump, changelog, tag
    │   ├── run-ci.md                            # /run-ci — auto-detect and run CI checks
    │   ├── ship.md                              # /ship — end-to-end git workflow
    │   └── gsd/                                 # 31 GSD workflow commands
    │       ├── new-project.md                   # Initialize project (ROADMAP + STATE)
    │       ├── plan-phase.md                    # Create phase plan (PLAN.md)
    │       ├── execute-phase.md                 # Execute with wave parallelization
    │       ├── debug.md                         # Systematic debugging
    │       ├── quick.md                         # Quick task (skip planning)
    │       ├── verify-work.md                   # UAT validation
    │       ├── progress.md                      # Status and next-action routing
    │       └── ... (24 more)                    # discuss, research, resume, pause, etc.
    ├── docs/                                    # 5 reference documents (loaded on-demand)
    │   ├── decision-matrix.md                   # Task → workflow routing rules
    │   ├── multi-agent.md                       # Parallel agent coordination protocol
    │   ├── tools-reference.md                   # External tool integration guide
    │   ├── ui-ux.md                             # UI/UX Pro Max design system
    │   └── review-ralph.md                      # Code review + Ralph Loop
    ├── hooks/                                   # 6 automation hooks
    │   ├── dippy/                               # Smart bash auto-approve (Python, 14K+ tests)
    │   ├── pretooluse-safety.js                 # Credential + destructive + unicode blocker
    │   ├── gsd-context-monitor.js               # Context budget tracking (45–90%)
    │   ├── gsd-statusline.js                    # Status line (profile, phase, context %)
    │   ├── gsd-check-update.js                  # GSD version check on session start
    │   └── post-autoformat.js                   # Code formatting (disabled by default)
    ├── get-shit-done/                           # GSD runtime engine
    │   ├── VERSION                              # GSD version number
    │   ├── bin/                                 # Core libraries (gsd-tools.cjs)
    │   ├── references/                          # 13 workflow reference docs
    │   ├── templates/                           # Project and phase templates
    │   └── workflows/                           # Workflow step definitions
    ├── plugins/                                 # Plugin registry
    │   ├── blocklist.json                       # Blocked plugin list
    │   └── known_marketplaces.json              # Plugin marketplace definitions
    ├── skills/                                  # 3 skill sets
    │   ├── cc-devops-skills/                    # DevOps: IaC, CI/CD, cloud platforms
    │   ├── trailofbits-security/                # Security: static analysis, audit
    │   └── ui-ux-pro-max/                       # UI/UX: 67 styles, 96 palettes, 13 stacks
    └── projects/                                # Per-project config and memory
        └── C--Users-Hakan/
            └── memory/                          # Cross-project knowledge base
                ├── MEMORY.md                    # Main memory index
                ├── session-continuity.md        # Session state for resume
                ├── auto-checkpoint.md           # Auto-checkpoint data
                ├── decisions.md                 # Architectural decisions
                ├── patterns.md                  # Recurring patterns
                └── solutions.md                 # Bug fixes and root causes
```

## How It Works

### Hook Execution Order

Every tool call passes through this pipeline:

```
SessionStart  →  gsd-check-update.js             GSD version check
PreToolUse    →  dippy                            Auto-approve safe bash commands
              →  pretooluse-safety.js             Block dangerous commands / credentials / unicode
PostToolUse   →  gsd-context-monitor.js           Track context budget %
StatusLine    →  gsd-statusline.js                Render profile + phase + context %
```

### GSD Workflow

Full project lifecycle management with 31 slash commands:

| Stage | Command | Description |
|-------|---------|-------------|
| **Init** | `/gsd:new-project` | Scaffold ROADMAP.md and STATE.md |
| **Plan** | `/gsd:discuss-phase` → `/gsd:plan-phase` | Gather context, create phase plan |
| **Execute** | `/gsd:execute-phase` | Run with wave-based agent parallelization |
| **Verify** | `/gsd:verify-work` | Conversational UAT validation |
| **Quick** | `/gsd:quick` | Skip planning for small tasks |
| **Debug** | `/gsd:debug` | Systematic debugging with dedicated agent |
| **Track** | `/gsd:progress` | Status check and next-action routing |

**Profile auto-selection:** `budget` (fix/typo) · `balanced` (standard dev) · `quality` (architecture/new project)

### Safety System

| Layer | Hook | What It Catches |
|------:|------|-----------------|
| 1 | **Dippy** | Auto-approves safe commands (`ls`, `git status`, `npm test`), flags risky ones |
| 2 | **pretooluse-safety.js** | Destructive git/fs/db commands, credential leaks (AWS, GitHub, OpenAI, Slack, Stripe, SendGrid, HuggingFace, private keys, JWT), unicode injection (zero-width, bidi override, Cyrillic homoglif) |
| 3 | *(optional)* | Data exfiltration detection (curl POST, scp, netcat, rsync) — disabled by default via `ENABLE_EXFILTRATION_CHECK` |

- Session-based allowlist remembers approved dangerous commands (12h TTL)
- Credentials and unicode injection are always hard-blocked (no allowlist bypass)
- Self-test: `node ~/.claude/hooks/pretooluse-safety.js --test` (19 tests)

### Multi-Agent Protocol

11 specialized agents with structured coordination:

- **Dependency-driven eager wave execution** for parallel task scheduling
- **Quality gates** between agent handoffs
- **Context-aware model routing:** haiku (simple search) → sonnet (standard) → opus (deep analysis)
- **Failure protocols** and automatic recovery

### Context Engineering

Token efficiency rules enforced across all workflows:

- **Write to filesystem, not context** — large outputs go to files
- **Subagent isolation** — each subagent starts with clean context
- **Lazy loading** — MCP tools loaded on-demand via ToolSearch
- **Budget thresholds** — automatic checkpoints at 45%, 55%, 65%, 75%, 85%, 90%

## Security

- No credentials in repo — OAuth tokens generated per-machine via `claude login`
- Credential detection hook — blocks accidental exposure of API keys in commands
- Path auto-fix — install script replaces hardcoded paths with current username
- Git safety — commits and pushes require explicit user approval

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `claude: command not found` | `npm install -g @anthropic-ai/claude-code` or restart terminal |
| Hooks not running | Check `~/.claude/settings.json` paths. Run `node ~/.claude/hooks/pretooluse-safety.js --test` |
| GSD commands missing | Verify `~/.claude/commands/gsd/` exists with `.md` files |
| Path errors | Re-run `install.ps1` — auto-fixes paths for your username |
| Context monitor broken | Ensure `jq` is installed: `jq --version` |
| Plugin install fails | Run `claude plugins install "plugin-name"` manually |
| `CLAUDE.md` not loading | Must be in `~/.claude/CLAUDE.md` (global) or project root (project-level) |
| Session continuity missing | Run `/init-hakan` in project to create memory structure |
| HakanMCP failed | Check `C:\dev\HakanMCP`. Re-run `install.ps1` or use `-SkipHakanMCP` |
| Safety hook false positive | `node ~/.claude/hooks/pretooluse-safety.js --approve "command"` |

## Requirements

- **OS:** Windows 10/11 (Linux/macOS via `install.sh`)
- **Node.js:** v18+ (auto-installed)
- **Python:** 3.8+ (required for Dippy hook)
- **Git:** Any recent version (auto-installed)
- **Claude Code:** Installed automatically by the script

## License

[MIT](LICENSE) — 2026 Hakan

---

<p align="center">
  Built with <a href="https://docs.anthropic.com/en/docs/claude-code">Claude Code</a>
</p>
