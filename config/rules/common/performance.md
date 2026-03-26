# Performance Optimization

## Context Window Management
Avoid last 20% of context for: large-scale refactoring, multi-file feature implementation, debugging complex interactions.

Lower sensitivity: single-file edits, independent utility creation, docs, simple bug fixes.

## Extended Thinking
Enabled by default (up to 31,999 tokens). Controls:
- Toggle: Alt+T (Windows/Linux)
- Config: `alwaysThinkingEnabled` in `~/.claude/settings.json`
- Budget cap: `export MAX_THINKING_TOKENS=10000`
- Verbose: Ctrl+O

