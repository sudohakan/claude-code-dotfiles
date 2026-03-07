# Changelog

All notable changes to claude-code-dotfiles will be documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [1.5.1] - 2026-03-07

### Added
- **Opera GX browser support** in `/browser` command — detection paths, fuzzy matching (`opera-gx`, `operagx`, `gx`, `ogx`)

### Fixed
- **Playwright MCP settings** — corrected package name (`@playwright/mcp`) and CLI flag (`--cdp-endpoint`)

## [1.5.0] - 2026-03-07

### Added
- **6 new slash commands** for git workflow automation:
  - `/commit` — Conventional commit with emoji, atomic splitting, diff analysis
  - `/create-pr` — Branch creation, commit, push, and PR submission in one flow
  - `/fix-github-issue` — Fetch issue, analyze, implement fix, commit with reference
  - `/fix-pr` — Fetch unresolved PR review comments and fix them
  - `/release` — Changelog update, version bump, README review, tag creation
  - `/run-ci` — Auto-detect project type, run CI checks, iteratively fix errors
- **Superpowers triggering table** — All 13 superpowers skills now have intent-based trigger rules in CLAUDE.md (previously only 5-6 were actively triggered)

### Changed
- **CLAUDE.md** — Added missing features back: subagent preference, CS triggers, session resume reminder, quality gate reinforcement, knowledge base project-specific context note
- **CLAUDE.md** — All trigger conditions are now intent-based and language-independent (no hardcoded phrases)
- **UI/UX trigger** — Changed from keyword-based to intent-based detection
- **.gitignore** — Added 6 runtime directories (profiles/, statsig/, tasks/, telemetry/, gsd-local-patches/, config/hooks/dippy/)

## [1.4.0] - 2026-03-07

### Added
- **browser.md** — `/browser` slash command: detect, launch, and connect browsers via Playwright MCP CDP
  - Cross-platform browser detection (Windows registry + paths, macOS Applications + mdfind, Linux PATH + snap/flatpak)
  - Fuzzy matching for browser names (typo-tolerant: `chrone`, `ff`, `edg`, etc.)
  - Remote debugging port management with auto-increment (9222-9230)
  - Last-used browser memory (`~/.claude/browser-last.json`)
  - Flags: `--clean` (temp profile), `--port=XXXX` (custom port), `--connect` (attach to existing instance)
  - Firefox CDP warning with fallback option
  - Launch verification and CDP connection retry

## [1.3.3] - 2026-03-07

### Fixed
- **pretooluse-safety.js** — Allowlist session ID now uses stable daily file instead of `process.ppid` which changed on every hook invocation, causing repeated blocks even after user approval

### Changed
- **CLAUDE.md** — Restructured with task classification (direct vs GSD), simplified context budget, Turkish-aligned language rule
- **init-hakan.md** — Full Turkish localization of project initialization command

## [1.3.2] - 2026-03-07

### Fixed
- **install.ps1** — Dippy hook directory was not copied (missing `-Recurse` on hooks copy)
- **install.sh** — Dippy hook directory was not copied (`*.js` glob skipped subdirectories)
- **install.sh** — `check_item` status checks used single quotes preventing variable expansion
- **install.sh** — HakanMCP path hardcoded to `/c/dev/` (Git Bash); now platform-aware for Linux/macOS

### Changed
- **README.md** — Complete rewrite: aligned project structure comments, added hook execution order, safety system table, consolidated sections, removed redundant content
- **install.ps1 / install.sh** — Added Python dependency check (required for Dippy hook)
- **install.ps1 / install.sh** — Removed unused `logs/` directory creation (post-observability removed in v1.3.0)

## [1.3.1] - 2026-03-07

### Changed
- **Project Structure** — Every line now has a descriptive comment explaining its purpose
- **Language preference** — Changed from hardcoded Turkish to auto-detect (responds in user's language)
- **gsd-context-monitor.js** — All Turkish strings translated to English
- **CLAUDE.md** — Updated toolset reference: replaced ccusage with Dippy
- **MEMORY.md** — Updated language preference to auto-detect
- **pretooluse-safety.js** — Upgraded to v1.2.0 with three new security layers:
  - Credential leak detection (10 patterns: AWS, GitHub, OpenAI, Slack, Stripe, SendGrid, HuggingFace, private keys, JWT)
  - Data exfiltration detection (8 patterns, disabled by default via `ENABLE_EXFILTRATION_CHECK` flag)
  - Unicode injection detection (zero-width chars, bidi overrides, Cyrillic/Latin homoglif)
  - Extended self-test suite (19 tests covering all categories)

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
