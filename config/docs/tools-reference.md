<!-- last_updated: 2026-03-24 -->
# Advanced Toolset

## Claude Squad — Multi-Agent Orchestration
TUI via `cs` command. Programmatic spawn via `cs-spawn.sh`.

```bash
cs-spawn.sh --name "security-audit" --prompt "..." --dir /path/to/repo
cs-spawn.sh --list          # List active sessions
cs-spawn.sh --log "name"    # Read session output
cs-spawn.sh --kill "name"   # Terminate session
```

### When to Use Claude Squad

| Scenario | Trigger |
|----------|---------|
| 200+ line change | Needs own context window |
| Security audit / static analysis | Long-running background task |
| Simultaneous work in 2+ directories | Each project in its own session |
| Comprehensive test suite (30+ tests or 5+ min) | Large output |
| Deep codebase analysis (20+ files) | Subagent turn limit insufficient |
| GSD research with 3+ domains | Each domain in full context |

Not triggered: single file fix, simple search/read, tasks < 2 min, short tasks in same directory.

Each spawned agent works on its own git branch. Results written to file, main context stays clean.

## Trail of Bits — Security Audit
11 skills active: `static-analysis`, `differential-review`, `insecure-defaults`, `sharp-edges`, `supply-chain-risk-auditor`, `audit-context-building`, `property-based-testing`, `variant-analysis`, `spec-to-code-compliance`, `git-cleanup`, `workflow-skill-design`.

Fintech projects: `static-analysis` + `insecure-defaults` after each phase.

## Container Use — Sandbox
Connected as MCP server. Run code in isolated Docker containers. Each agent in its own container + git branch. `container-use.exe stdio`.

## Pre/PostToolUse Hooks

| Hook | Type | Function |
|------|------|----------|
| `dippy/` | PreToolUse | Smart bash auto-approve |
| `pretooluse-safety.js` | PreToolUse | Blocks dangerous commands and credential leaks |
| `gsd-context-monitor.js` | PostToolUse | Context budget monitoring |
| `post-autoformat.js` | PostToolUse | Prettier/biome format (disabled by default) |
| `gsd-statusline.js` | StatusLine | GSD status in status line |

## MCP Servers

| Server | Command | Purpose |
|--------|---------|---------|
| `container-use` | `container-use.exe stdio` | Isolated Docker sandbox |
| `HakanMCP` | `node HakanMCP/dist/src/index.js` | Custom tools and utilities |
| HakanMCP browser bridge | `mcp_browserConnect` → wrappers | Low-token browser automation |

## recall — Session Search
```bash
recall search "error fix"
recall list
```

## ClaudeCTX — Config Profile Management
```bash
claudectx -n finekra-backend   # Create profile
claudectx finekra-backend      # Switch to profile
claudectx -l                   # List profiles
claudectx -                    # Previous profile
```
When project changes, config switches automatically with `claudectx <profile>`.
