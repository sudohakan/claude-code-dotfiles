# Dippy Hook

`dippy-hook` runs before Bash tool usage as the first command-layer guard in your Claude setup.

## Purpose
- Inspect Bash invocations before execution
- Provide an additional control layer before `pretooluse-safety.js`
- Act as a low-level command hygiene and policy gate

## Local Placement
- Hook path: `~/.claude/hooks/dippy/bin/dippy-hook`
- Trigger: `PreToolUse` for `Bash`

## Operational Note
- Dippy is part of the Bash path, not a general Claude rule system.
- Keep behavior-specific documentation here so `CLAUDE.md` can stay short.
