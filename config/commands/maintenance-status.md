# Maintenance Status — Storage And Hygiene Snapshot

When this command is executed, gather and present a compact maintenance report for the local Claude workspace.

## Read
- `~/.claude/cache/storage-hygiene-report.json`
- `~/.claude/cache/storage-hygiene-trend.json`
- `~/.claude/cache/maintenance-auto-actions-last-run.json`
- `~/.claude/cache/project-alias-hygiene-last-run.json`
- `~/.claude/cache/file-history-hygiene-last-run.json`
- `~/.claude/cache/project-session-hygiene-last-run.json`

## Show
- Current date/time and whether each hygiene snapshot exists
- Top-level storage hotspots from the latest storage hygiene report
- Heaviest 3 project directories and heaviest 3 file-history entries when available
- Duplicate project alias status with exact duplicate-group and alias counts
- Latest file-history hygiene result with candidate count, reclaimable size, and last archive path
- Latest project-session hygiene result with project key, candidate count, reclaimable size, and last archive path
- 7-day and 30-day storage deltas when the trend file exists
- Latest automatic maintenance actions and whether they actually applied changes
- One short verdict line for each area: `clean`, `watch`, or `needs action`
- One shortest-next-step recommendation only if action is needed

## Rules
- Prefer summary tables or short bullets over raw JSON.
- Convert byte counts into MB or GB where useful.
- If a last-run snapshot came from an apply run, mention the archive path.
- If trend data exists, summarize only the 7-day and 30-day deltas for `projects`, `file-history`, and `plugins`.
- If auto-actions data exists, distinguish `inspected only` from `applied`.
- If a snapshot is missing, say `no snapshot`.
- Do not speculate; only report what the cache files show.
- End with a 3-line summary: storage, alias hygiene, archival hygiene.
