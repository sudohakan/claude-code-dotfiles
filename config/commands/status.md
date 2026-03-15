# Status — Quick Workspace Orientation

When this command is executed, gather and present a compact status snapshot.

## Show
- Current working directory
- Whether the directory is inside a git repository
- Current model / context warning state if visible from hooks or status files
- Latest hook health snapshot if `~/.claude/cache/hook-health.json` exists
- Active Claude teams under `~/.claude/teams/` with their latest config timestamps
- Pending task or inbox counts when available
- Recent project registry entries from `~/.claude/project-registry.json`

## Rules
- Prefer short summaries over raw dumps.
- Read only the files needed for the current directory.
- If a section has no data, say so briefly and move on.
