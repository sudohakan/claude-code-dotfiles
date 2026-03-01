# Changelog

All notable changes to claude-code-dotfiles will be documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

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
