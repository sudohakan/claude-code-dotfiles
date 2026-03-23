# Status — Quick Workspace Orientation

When this command is executed, gather and present a compact status snapshot.

## Show
- Current working directory
- Whether the directory is inside a git repository
- Current model / context warning state if visible from hooks or status files
- Latest hook health snapshot if `~/.claude/cache/hook-health.json` exists
- Latest storage hygiene snapshot if `~/.claude/cache/storage-hygiene-report.json` exists
- Latest alias hygiene snapshot if `~/.claude/cache/project-alias-hygiene-last-run.json` exists
- Latest file-history hygiene snapshot if `~/.claude/cache/file-history-hygiene-last-run.json` exists
- Latest project-session hygiene snapshot if `~/.claude/cache/project-session-hygiene-last-run.json` exists
- Active Claude teams under `~/.claude/teams/` with their latest config timestamps
- Pending task or inbox counts when available
- Recent project registry entries from `~/.claude/project-registry.json`

## Rules
- Prefer short summaries over raw dumps.
- Read only the files needed for the current directory.
- If storage hygiene data exists, highlight only the heaviest 3 top-level areas, the heaviest 3 projects, and whether duplicate project-key aliases remain.
- If hygiene snapshots exist, summarize them as `clean` / `needs attention` with exact candidate counts and archive path when recent apply runs exist.
- If deeper workspace maintenance detail is useful, point to `/maintenance-status` for trend and auto-action history.
- If a section has no data, say so briefly and move on.
