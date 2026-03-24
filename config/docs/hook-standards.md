<!-- last_updated: 2026-03-24 -->
# Hook Standards

## Baseline
- Add a short timeout guard to stdin-based hooks
- Fail silently instead of blocking the main workflow
- Keep output machine-readable when emitting structured data
- Prefer shared helpers from `hooks/lib/` over inline duplicates

## Visibility
- SessionStart should refresh `~/.claude/cache/hook-health.json`
- `/status` command should summarize the latest hook health snapshot

## Lifecycle
- SessionStart: housekeeping, lightweight health checks, cache refreshes
- PreToolUse and PostToolUse: use sparingly to avoid process churn
