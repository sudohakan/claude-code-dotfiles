# Claude Memory — {username}


**Related projects:** [HakanMCP](https://github.com/sudohakan/HakanMCP)

## User Preferences
- Language: Responds in whatever language the user speaks (auto-detect)
- Model: Opus
- Workflow: GSD + Superpowers + Ralph Loop integrated
- **Git rule:** Git commands are ONLY executed when explicitly requested by the user
- **Subagent model selection (automatic):**
  - `haiku` → Simple/fast lookups
  - `sonnet` → Standard research
  - `opus` → Deep analysis
- **Session-continuity rule:** Fully rewrite each time

## Active Projects
(updated per session)

## Known Infrastructure
- **HakanMCP:** `C:\dev\HakanMCP` — MCP server (if configured)
- **Knowledge base:** `.memory/solutions.md`, `.memory/patterns.md`, `.memory/decisions.md`
- **Trail of Bits:** 6 security skills active
- **PostToolUse hooks:** auto-format, observability, CC Notify

## Important Decisions
(populated by Claude after setup)
