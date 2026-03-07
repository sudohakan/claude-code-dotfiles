# claude-code-dotfiles

## About
Portable distribution package for Claude Code CLI configuration. Not a standalone application — consists of hooks, commands, agents, skills, and GSD workflow files installed to `~/.claude/` via install.ps1/install.sh.

## Tech Stack
- **Installer:** PowerShell (Windows), Bash (Linux/macOS)
- **Hooks:** Node.js (JavaScript, .js)
- **Commands:** Markdown (.md) — `/init-hakan`, `/browser`, `/dotfiles-update`, 7 git workflow commands (`/commit`, `/create-pr`, `/fix-github-issue`, `/fix-pr`, `/release`, `/run-ci`, `/ship`), 33 GSD commands
- **Agents:** Markdown (.md)
- **GSD Runtime:** Node.js (CommonJS, .cjs) + npm
- **Skills:** Python + Markdown
- **Versioning:** Semver (VERSION file + git tags + CHANGELOG.md)
- **CI:** GitHub Actions (tag push → auto-release)

## Directory Structure
```
config/           → Copied to ~/.claude/ (install.ps1)
  CLAUDE.md       → Global Claude Code instructions
  settings.json   → Hook, MCP, permission settings
  hooks/          → 7 hooks (Dippy, safety, context monitor, statusline, GSD check-update, dotfiles check-update, auto-format)
  commands/       → Slash commands (init-hakan, browser, gsd/*)
  agents/         → 11 agent definitions
  skills/         → 3 skill sets (cc-devops, trailofbits, ui-ux-pro-max)
  docs/           → 5 reference documents
  get-shit-done/  → GSD runtime (workflows, templates, bin, references)
home-config/      → Copied to ~/ (.claude.json)
install.ps1       → Windows installer (10 steps)
install.sh        → Linux/macOS installer
```

## Versioning Rules
The following files must be updated together on every release:
1. `VERSION` — new version number
2. `CHANGELOG.md` — entry in [Keep a Changelog](https://keepachangelog.com) format
3. `README.md` — version badge and content update
4. Commit message must include `vX.Y.Z` version

## Sync Rules
This repo is the source copy of the active configuration under `~/.claude/`.

**Active → Repo sync:**
- Use the AI-driven sync command (`/sync-dotfiles` in project directory)
- Credentials, cache, log, and session files must NEVER be added to the repo

**Repo → Active sync:**
- Use `install.ps1` (existing config is backed up, then overwritten)

## Security
- `.gitignore` excludes credentials, sessions, cache, and plugin-cache files
- Secrets in skill test files are intentionally fake/example values
- install.ps1 replaces hardcoded usernames with the current user (path auto-fix)
- Patterns in hook files (rm -rf, DROP TABLE, etc.) are for security purposes, not dangerous

## Build & Test
- **Build:** None (configuration package, no compilation needed)
- **Test:** `node config/hooks/pretooluse-safety.js --test` (hook self-test, 19/19)
- **Install:** `PowerShell -ExecutionPolicy Bypass -File install.ps1`
- **Lint:** None (Markdown + JSON, editor formatting is sufficient)
