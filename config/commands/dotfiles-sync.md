# Dotfiles Sync — Live Config to Repo

Synchronize the active `~/.claude/` configuration into the dotfiles repository, review changes, and optionally commit.

## Usage

```
/dotfiles-sync              Full sync with diff review
/dotfiles-sync --dry-run    Preview only, no file changes
/dotfiles-sync --quick      Sync + auto-commit without interactive review
```

## Prerequisites

- Dotfiles repo location is read from `~/.claude/dotfiles-meta.json` (`repoPath` field)
- Falls back to `C:\dev\claude-code-dotfiles` (Windows) or `~/dev/claude-code-dotfiles` (Linux/macOS)
- `sync.sh` must exist in the repo root

## Process

### Step 1: Locate Repo

```bash
REPO=$(cat ~/.claude/dotfiles-meta.json 2>/dev/null | jq -r '.repoPath // empty')
[ -z "$REPO" ] && REPO="${HOME}/dev/claude-code-dotfiles"
[ ! -d "$REPO" ] && REPO="/mnt/c/dev/claude-code-dotfiles"
```

Verify `$REPO/sync.sh` exists. If not, abort with error.

### Step 2: Run Sync

Execute the sync script:

```bash
bash "$REPO/sync.sh" $FLAGS
```

Where `$FLAGS` is `--dry-run` if the user passed it, or `--verbose` for standard runs.

If `--dry-run` was passed, show the output and stop here.

### Step 3: Review Changes

Run `git -C "$REPO" diff --stat` to show what changed.

If no changes detected, report "Already in sync" and exit.

If changes exist, show a summary table:

```
| Type     | Changed | Added | Deleted |
|----------|---------|-------|---------|
| Agents   |    3    |   1   |    0    |
| Commands |    0    |   2   |    1    |
| ...      |         |       |         |
```

### Step 4: Security Scan

Before committing, scan changed files for credential patterns:

```bash
git -C "$REPO" diff --cached --name-only | xargs grep -l -i 'password\|api_key\|secret\|token' 2>/dev/null
```

Exclude known safe patterns (`YOUR_PASSWORD`, `YOUR_API_KEY`, `process.env.`, `$INFOSET_PASSWORD`).

If real credentials found, list them and abort. Do not commit.

### Step 5: Version Decision

Check `$REPO/VERSION` for current version. Analyze changes to suggest bump type:

| Change Type | Bump |
|-------------|------|
| New agents, commands, skills, rules added | MINOR |
| Config updates, hook changes, doc fixes | PATCH |
| Breaking changes to install script or settings structure | MAJOR |

Ask user to confirm version bump (or skip with `--quick`).

### Step 6: Commit

If `--quick` flag: auto-commit with generated message, auto-bump PATCH.

Otherwise, present the commit plan:

```
Version: 3.0.0 → 3.0.1
Files: 12 changed, 3 added, 1 deleted

Proposed commit: "chore: sync from live — 3 new commands, settings update"

[Confirm / Edit message / Skip commit]
```

On confirmation:
1. Update `VERSION` file
2. Add CHANGELOG entry
3. Update version badge in `README.md`
4. Stage all changes: `git -C "$REPO" add -A`
5. Commit with conventional message
6. Report success with commit hash

Do NOT push automatically. Inform the user: "Committed locally. Push when ready: `git -C $REPO push origin main`"

## What Gets Synced

| # | Source (`~/.claude/`) | Destination (`config/`) | Method |
|---|----------------------|------------------------|--------|
| 1 | `CLAUDE.md`, `settings.json`, `package.json`, `gsd-file-manifest.json`, `project-registry.json` | Root config files | File copy |
| 2 | `agents/*.md` | `agents/` | rsync --delete |
| 3 | `commands/*.md`, `commands/gsd/*.md`, `commands/deprecated/*.md` | `commands/` | rsync per subdir |
| 4 | `docs/` (excluding `plans/`) | `docs/` | rsync |
| 5 | `hooks/` (excluding `dippy/`, `memory-persistence/`) | `hooks/` | rsync --delete |
| 6 | `rules/` | `rules/` | rsync --delete |
| 7 | `skills/` (excluding `learned/`, `__pycache__/`, `.git/`, `node_modules/`) | `skills/` | rsync --delete |
| 8 | `teams/agents/*.md`, `teams/favorites.json`, `teams/*.md` | `teams/` | Selective copy |
| 9 | `mcp-configs/` | `mcp-configs/` | rsync |
| 10 | `plugins/known_marketplaces.json`, `plugins/blocklist.json` | `plugins/` | File copy |
| 11 | `~/.claude.json` | `home-config/.claude.json` | File copy |

## Never Sync

- `plugins/cache/`, `plugins/marketplaces/`, `plugins/installed_plugins.json`
- `projects/`, `sessions/`, `cache/`, `logs/`, `debug/`, `backups/`
- `history.jsonl`, `shell-snapshots/`, `session-env/`, `paste-cache/`
- `tasks/`, `todos/`, `metrics/`, `telemetry/`, `ecc/`, `archive/`
- `hooks/dippy/` (cloned separately by installer)
- `node_modules/`, `__pycache__/`, `*.pyc`
- Any file matching `*.credential*`, `*.secret*`, `*.token*`, `.env*`
