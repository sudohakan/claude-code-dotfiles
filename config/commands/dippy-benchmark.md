# Dippy Benchmark — Measure PreToolUse Overhead

When this command is executed, benchmark the local Dippy hook startup path.

## Behavior
- Check whether `~/.claude/hooks/dippy/bin/dippy-hook` exists
- If the local runtime can execute it, measure a few cold-start runs and report the rough startup time
- If the runtime is unavailable, report that clearly and stop without failing the session
- Save or print only a compact timing summary
