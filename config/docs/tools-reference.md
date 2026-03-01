# Advanced Toolset

## Claude Squad — Multi-Agent Orchestration
**TUI:** Interactive agent management with the `cs` command (used by the user).
**Programmatic spawn:** Agents can launch isolated Claude Code instances via `cs-spawn.sh`.

```bash
cs-spawn.sh --name "security-audit" --prompt "Scan this project for security vulnerabilities" --dir /path/to/repo
cs-spawn.sh --list          # List active sessions
cs-spawn.sh --log "name"    # Read session output
cs-spawn.sh --kill "name"   # Terminate session
```

### Claude Squad Trigger Rules

| Scenario | Why CS | Example |
|----------|--------|---------|
| 200+ line change | Needs its own context window | Large refactor, migration |
| Security audit / static analysis | Long-running, should run in background | End-of-phase Trail of Bits scan |
| Simultaneous work in 2+ different project directories | Each project in its own session | Frontend + Backend parallel |
| Comprehensive test suite (30+ tests or 5+ min) | Large output, bloats main context | HakanMCP full test, E2E suite |
| Deep codebase analysis (20+ files) | Subagent turn limit insufficient | Entering new project, architecture analysis |
| GSD research phase with 3+ domains | Each domain in its own full context | Auth + DB + API parallel research |

### Claude Squad is NOT triggered
- Single file fix/edit
- Simple search/read (Explore agent is enough)
- Tasks that take < 2 minutes
- Short tasks running in the same directory (Agent tool is enough)

Each spawned agent works on its own git branch. Results are written to file, main context stays clean.

## ccusage — Token Usage Tracking
```bash
npx ccusage daily --json              # Daily usage (JSON)
npx ccusage session --json            # Session-based usage
npx ccusage blocks --json             # 5-hour billing blocks
```

## Trail of Bits — Security Audit
6 security skills active. Triggered automatically or called explicitly:
- `static-analysis` — CodeQL/Semgrep integration
- `differential-review` — Security-focused code review
- `insecure-defaults` — Insecure default config detection
- `sharp-edges` — Dangerous pattern detection
- `supply-chain-risk-auditor` — Dependency security analysis
- `audit-context-building` — Deep architectural context building

**Required for fintech projects:** `static-analysis` + `insecure-defaults` run after each phase.

## Container Use (Dagger) — Sandbox Environment
Connected as MCP server. Agents can use it as a tool:
- Run code in isolated Docker container
- Each agent in its own container + git branch
- MCP protocol via `container-use.exe stdio`

## PostToolUse Hooks (Automatic)
| Hook | Trigger | Function |
|------|---------|---------|
| `post-autoformat.js` | Edit/Write/MultiEdit | Project-based prettier/biome format |
| `post-observability.js` | All tools | Log to `~/.claude/logs/tool-activity-{date}.jsonl` |
| `post-notify.js` | AskUserQuestion/Task/Bash | Windows toast notification (long task + waiting for input) |

**Agent log query:** `cat ~/.claude/logs/tool-activity-$(date +%Y-%m-%d).jsonl | jq '.tool_name'`

## recall — Session Search
```bash
recall search "error fix"   # Search across all sessions
recall list                  # List recent sessions
```

## ClaudeCTX — Config Profile Management
```bash
claudectx -n finekra-backend   # Create profile from current config
claudectx finekra-backend      # Switch to profile
claudectx -l                   # List profiles
claudectx -                    # Switch to previous profile
```

**Agent rule:** When project changes, config is automatically switched with `claudectx <profile>`.
