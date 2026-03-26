# Dotfiles Sync — Live Config to Repo

Synchronize the active `~/.claude/` configuration into the dotfiles repository, review changes, and optionally commit.

## Usage

```
/dotfiles-sync              Full sync with diff review
/dotfiles-sync --dry-run    Preview only, no file changes
/dotfiles-sync --quick      Sync + auto-commit without interactive review
```

## Process

### Step 1: Locate Repo

```bash
REPO=$(python3 -c "import json; print(json.load(open('$HOME/.claude/dotfiles-meta.json')).get('repo_path',''))" 2>/dev/null)
[ -z "$REPO" ] && REPO="/mnt/c/dev/claude-code-dotfiles"
```

Verify `$REPO/sync.sh` exists. If not, abort with error.

### Step 2: Run Sync

```bash
bash "$REPO/sync.sh" $FLAGS
```

Where `$FLAGS` is `--dry-run` if the user passed it, or `--verbose` for standard runs.

If `--dry-run` was passed, show the output and stop here.

### Step 3: Review Changes

Run `git -C "$REPO" diff --stat` to show what changed.

If no changes detected, report "Already in sync" and exit.

### Step 4: Security Scan

Before committing, scan changed files for credential patterns:

```bash
git -C "$REPO" diff --name-only | xargs grep -l -i 'password\|api_key\|secret\|token' 2>/dev/null
```

Exclude known safe patterns (`YOUR_PASSWORD`, `YOUR_API_KEY`, `process.env.`, `$INFOSET_PASSWORD`, `placeholder`).

Verify `home-config/.claude.json` contains only the sanitized MCP template, not raw account state (`oauthAccount`, `mcpOAuth`, `accessToken`, `refreshToken`).

If real credentials found, list them and abort. Do not commit.

### Step 5: Commit

Read `$REPO/VERSION` for current version. Determine bump type from changes:

| Change Type | Bump |
|-------------|------|
| New agents, commands, skills, rules | MINOR |
| Config updates, hook changes, doc fixes | PATCH |
| Breaking changes to install script or settings structure | MAJOR |

If `--quick` flag: auto-bump PATCH, auto-commit.

Otherwise: show proposed version + commit message, confirm with user.

On confirmation:
1. Update `VERSION` file
2. Stage all changes: `git -C "$REPO" add -A`
3. Commit with conventional message: `chore: sync from live — {summary}`
4. Report success with commit hash

Do NOT push automatically. Inform: "Committed locally. Push when ready: `git -C $REPO push origin main`"

## What Gets Synced

| # | Source (`~/.claude/`) | Destination (`config/`) | Method |
|---|----------------------|------------------------|--------|
| 1 | `CLAUDE.md`, `settings.json`, `settings.local.json`, `package.json`, `gsd-file-manifest.json`, `project-registry.json`, `plugin-profiles.json` | Root config files | File copy |
| 2 | `agents/*.md` | `agents/` | rsync --delete |
| 3 | `commands/*.md`, `commands/gsd/*.md`, `commands/deprecated/*.md` | `commands/` | rsync per subdir |
| 4 | `docs/` (excluding `plans/`, `superpowers/plans/`) | `docs/` | rsync |
| 5 | `hooks/` (excluding `dippy/`, `memory-persistence/`) | `hooks/` | rsync --delete |
| 6 | `rules/` | `rules/` | rsync --delete |
| 7 | `skills/` (excluding `learned/`, `__pycache__/`, `.git/`, `node_modules/`) | `skills/` | rsync --delete |
| 8 | `teams/agents/*.md`, `teams/favorites.json`, `teams/*.md` | `teams/` | Selective copy |
| 9 | `mcp-configs/` | `mcp-configs/` | rsync |
| 10 | `plugins/known_marketplaces.json`, `plugins/blocklist.json` | `plugins/` | File copy |
| 11 | `profiles/*.md` | `profiles/` | rsync --delete |
| 12 | `scripts/` (excluding `__pycache__/`) | `scripts/` | rsync --delete |
| 13 | `get-shit-done/` | `get-shit-done/` | rsync --delete |
| 14 | `~/.claude.json` | `home-config/.claude.json` | Sanitized MCP template export |

## Never Sync

- `plugins/cache/`, `plugins/marketplaces/`, `plugins/installed_plugins.json`
- `projects/`, `sessions/`, `cache/`, `logs/`, `debug/`, `backups/`, `archives/`
- `history.jsonl`, `shell-snapshots/`, `session-env/`, `paste-cache/`, `session-data/`
- `tasks/`, `todos/`, `metrics/`, `telemetry/`, `ecc/`, `archive/`, `homunculus/`
- `hooks/dippy/` (cloned separately by installer)
- `rules-archive/` (historical, not active)
- `node_modules/`, `__pycache__/`, `*.pyc`, `.codex/`
- Any file matching `*.credential*`, `*.secret*`, `*.token*`, `.env*`
- Raw `~/.claude.json` account state (`oauthAccount`, `mcpOAuth`, access/refresh tokens)
