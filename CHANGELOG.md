# Changelog

All notable changes to claude-code-dotfiles will be documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [1.3.1] - 2026-03-07

### Changed
- **Project Structure** — Every line now has a descriptive comment explaining its purpose
- **Language preference** — Changed from hardcoded Turkish to auto-detect (responds in user's language)
- **gsd-context-monitor.js** — All Turkish strings translated to English
- **CLAUDE.md** — Updated toolset reference: replaced ccusage with Dippy
- **MEMORY.md** — Updated language preference to auto-detect

## [1.3.0] - 2026-03-07

### Added
- **Dippy** — Smart bash auto-approve hook. Safe commands (`ls`, `git status`, `npm test`, etc.) are auto-approved, dangerous commands require user confirmation. Python-based with 14,000+ tests and a custom bash parser. Installed at `~/.claude/hooks/dippy/`

### Removed
- **CC Notify** (`post-notify.js`) — Windows toast notifications were not visible due to OS notification settings. Hook and file removed
- **post-observability.js** — JSONL tool activity logging was collecting data but never consumed. Hook, file, and `~/.claude/logs/` directory removed
- **ccusage** — Global npm package uninstalled. Was never actively used for usage monitoring

### Changed
- Hook count reduced from 7 to 6 (5 existing + Dippy)
- `settings.json` updated: Dippy added as first PreToolUse hook (runs before pretooluse-safety.js), CC Notify and observability hooks removed from PostToolUse

## [1.2.1] - 2026-03-06

### Changed
- **Auto-format hook disabled by default** — `post-autoformat.js` removed from `settings.json` PostToolUse hooks. Formatting now requires explicit user request or user approval when Claude suggests it. Hook file remains available for manual use.
- Auto-format rule added to `CLAUDE.md` global instructions

## [1.2.0] - 2026-03-05

### Added
- **Project-level CLAUDE.md** for the dotfiles repo itself (tech stack, sync rules, versioning rules)
- **AI-driven sync command** (`/sync-dotfiles`) — reverse sync from active config to repo with credential scanning, diff reporting, and selective apply
- **GSD Eager Wave Execution** — custom `execute-phase.md` workflow replacing strict wave boundaries with dependency-driven eager start + cs-spawn hybrid routing
- **GSD Multi-Domain Parallel Research** — custom `plan-phase.md` workflow spawning multiple `gsd-phase-researcher` agents per domain instead of single researcher

### Changed
- README.md version badge switched from GitHub Release API (broken on private/no-release repos) to static badge
- README.md safety hooks section updated with session-based allowlist description
- README.md fully audited: fixed install steps table (10 steps matching install.ps1), memory system count (3→6), agent list (all 11 named), plugin command syntax, project structure tree (added missing root files), multi-agent section (DAG→eager wave), added HakanMCP troubleshooting entry
- `.gitignore` expanded with `.claude/`, `node_modules/`, `__pycache__/` exclusions
- HakanMCP `startup_timeout_sec: 60` added to MCP server config

## [1.1.3] - 2026-03-05

### Fixed
- Remove unused `Optional` and `Tuple` imports from PromQL validator (`validate_syntax.py`)
- Remove unused `os` import from UI/UX design system generator (`design_system.py`)

### Note
- Jules flagged `sys` in `script_analyzers.py` as unused — verified as false positive (`sys.stderr` used on 3 lines)
- Jules flagged `readFileSync` in GSD `.cjs` files — these are CLI tools where synchronous I/O is standard practice, not a server context

## [1.1.2] - 2026-03-02

### Fixed
- HakanMCP `cwd` field added to MCP server configs (`settings.json`, `.claude.json`) to prevent logs, .cache, and backup folders from being created in the working directory instead of HakanMCP's own directory

## [1.1.1] - 2026-03-01

### Added
- GitHub Actions auto-release workflow (tag push → GitHub Release with changelog notes)
- Version badge in README.md

### Changed
- Dotfiles versioning rule now requires README.md updates alongside CHANGELOG.md

## [1.1.0] - 2026-03-01

### Added
- **Session-based allowlist for safety hook** — `pretooluse-safety.js` now remembers approved dangerous commands within the same session. First block prompts user approval; subsequent identical commands pass automatically. Allowlist files are stored in OS temp directory with 12-hour TTL and automatic cleanup.
- `--approve` CLI flag for manual allowlist management
- Allowlist self-test case in `--test` mode (9/9 tests)

### Changed
- Safety hook version bumped to v1.1.0
- Block message now indicates that approval persists for the session

## [1.0.0] - 2026-02-27

### Added
- Initial release of claude-code-dotfiles
- `CLAUDE.md` — Global Claude Code instructions (GSD workflow, multi-agent coordination, context engineering)
- `settings.json` — Hook configurations, MCP servers, permission settings
- **7 hooks**: pretooluse-safety, gsd-context-monitor, gsd-statusline, gsd-check-update, post-autoformat, post-notify, post-observability
- **31 GSD slash commands** for project management workflow
- **11 agent definitions** for GSD multi-agent orchestration
- **5 reference docs**: decision-matrix, multi-agent, review-ralph, tools-reference, ui-ux
- **Skills**: cc-devops-skills, trailofbits-security, ui-ux-pro-max
- `install.ps1` (Windows) and `install.sh` (Linux/macOS) installers
- `SECURITY.md` — Security policy and vulnerability reporting
- `SETUP.md` — Detailed setup guide
