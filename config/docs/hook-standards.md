<!-- last_updated: 2026-03-13 -->
# Hook Standards

Use these standards for local Claude hooks.

## Baseline
- Add a short timeout guard to stdin-based hooks
- Fail silently instead of blocking the main workflow
- Keep output machine-readable when a hook emits structured data
- Prefer shared helpers from `hooks/lib/` instead of inline duplicates

## Visibility
- SessionStart should refresh `~/.claude/cache/hook-health.json`
- Operator-facing commands such as `/status` should summarize the latest hook health snapshot

## Lifecycle
- Use SessionStart for housekeeping, lightweight health checks, and cache refreshes
- Use PreToolUse and PostToolUse sparingly to avoid unnecessary process churn
