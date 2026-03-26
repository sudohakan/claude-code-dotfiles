# Hooks System

## Hook Types
- PreToolUse: before tool execution (validation, parameter modification)
- PostToolUse: after tool execution (auto-format, checks)
- Stop: when session ends (final verification)

## Auto-Accept Permissions
- Enable for trusted, well-defined plans
- Disable for exploratory work
- Configure `allowedTools` in `~/.claude.json` for granular tool permissions

## TodoWrite Best Practices
Use TodoWrite to track progress on multi-step tasks, verify understanding, enable real-time steering, and show granular steps. A good todo list reveals out-of-order steps, missing items, wrong granularity, and misinterpreted requirements.
