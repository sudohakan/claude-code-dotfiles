# Root Documentation Analysis Report


**Related projects:** [HakanMCP](https://github.com/sudohakan/HakanMCP)

**Date:** 2026-03-10
**Scope:** All GitHub-facing markdown files in `claude-code-dotfiles`
**Current version:** 1.13.3

---

## File: README.md

**Purpose:** Main project landing page — overview, quick start, feature showcase, troubleshooting.

### Issues Found

| # | Line | Issue | Severity |
|---|------|-------|----------|
| 1 | 8 | States "29 plugins across 4 marketplaces" — accurate per current config | OK |
| 2 | 24 | "34 commands" — verified: 34 GSD `.md` files exist in `config/commands/gsd/` | OK |
| 3 | 25 | "12 specialized agents" — verified: 12 `.md` files in `config/agents/` | OK |
| 4 | 53 | "7 hooks" — only 6 hook files exist in `config/hooks/` (dippy is gitignored and installed at runtime via `git clone`). The directory listing shows 6 `.js` files + `lib/` + `test/`. Dippy is counted as the 7th but is NOT in the repo tree. | Minor |
| 5 | 75 | Hook execution order diagram omits `dotfiles-check-update.js` (SessionStart) and `post-autoformat.js` (PostToolUse). Only 5 of 7 hooks shown. | Minor |
| 6 | 282 | `.claude/commands/` shows only `sync-dotfiles.md` — but the actual `.claude/commands/` directory also contains `browser.md`. The project structure tree in README is correct (shows repo structure, not installed structure), so this is fine. | OK |
| 7 | 200 | Plugin marketplace `anthropics/claude-plugins-official` — the org name `anthropics` (with 's') should be verified against actual marketplace source. Appears twice: line 200 and 202. | Needs Verification |

### Missing Info

- No link to the GSD Discord community (mentioned in `/gsd:join-discord` command but no URL in README)
- No "What's New" or "Latest Release" section linking to CHANGELOG.md highlights
- The `docs/` project directory (line 222 in structure) is listed but empty except for `plans/` — not mentioned
- `.claude/commands/browser.md` exists in the repo's `.claude/commands/` alongside `sync-dotfiles.md` but the project structure tree only shows `sync-dotfiles.md` (line 282)

### Interactivity Improvements

1. **Add "Back to top" links** after each `</details>` section
2. **Add anchor links in the badges row** — clicking version badge could link to CHANGELOG.md
3. **Add a "Latest Changes" callout** at the top:
   ```markdown
   > **v1.13.3** (2026-03-10) — Context monitor stdin fix. [Full changelog](CHANGELOG.md)
   ```
4. **Mermaid diagram** for hook execution order is good but could add color coding (green for protective, blue for read-only, gray for optional)
5. **Add copy buttons hint** — GitHub automatically adds copy buttons to code blocks, but the Quick Start section could benefit from a single combined command block
6. **Project Structure tree** — consider splitting into a separate `ARCHITECTURE.md` to reduce README length (currently 443 lines)

### Cross-Reference Errors

| Ref | Target | Status |
|-----|--------|--------|
| `[SETUP.md](SETUP.md)` | SETUP.md | OK |
| `[CONTRIBUTING.md](CONTRIBUTING.md)` | CONTRIBUTING.md | OK |
| `[SECURITY.md](SECURITY.md)` | SECURITY.md | OK |
| `[CHANGELOG.md](CHANGELOG.md)` | CHANGELOG.md | OK |
| `[MIT](LICENSE)` | LICENSE | OK (file exists) |
| `[HakanMCP](https://github.com/sudohakan/HakanMCP)` | External | OK |

---

## File: CHANGELOG.md

**Purpose:** Version history in Keep a Changelog format.

### Issues Found

| # | Line | Issue | Severity |
|---|------|-------|----------|
| 1 | - | Format is correct Keep a Changelog with semver | OK |
| 2 | - | All entries from 1.0.0 to 1.13.3 present with dates | OK |
| 3 | - | No `[Unreleased]` section at top (recommended by Keep a Changelog spec) | Minor |
| 4 | - | No footer links mapping version numbers to GitHub compare URLs (e.g., `[1.13.3]: https://github.com/.../compare/v1.13.2...v1.13.3`) — recommended by the spec | Minor |
| 5 | 227 | v1.5.0 mentions `/commit` with "emoji, atomic splitting" but v1.7.0 line 192 says "Removed emoji from commit format" — not an error, just historical, but could confuse readers | Info |
| 6 | 301 | v1.3.0 says "Hook count reduced from 7 to 6 (5 existing + Dippy)" — this is historically accurate but the current count is back to 7 (6 hooks + Dippy) | Info |

### Missing Info

- No `[Unreleased]` section for tracking upcoming changes
- No comparison links at the bottom of the file (Keep a Changelog best practice)

### Interactivity Improvements

1. **Add comparison links** at bottom:
   ```markdown
   [1.13.3]: https://github.com/sudohakan/claude-code-dotfiles/compare/v1.13.2...v1.13.3
   ```
2. **Add collapsible sections** for older versions (e.g., collapse everything before 1.10.0)
3. **Add a "Jump to version" mini-TOC** at the top for quick navigation

### Cross-Reference Errors

None found.

---

## File: CONTRIBUTING.md

**Purpose:** Contributor guidelines — setup, conventions, PR flow, testing.

### Issues Found

| # | Line | Issue | Severity |
|---|------|-------|----------|
| 1 | 26 | States Node.js `>= 18` — README also says `v18+` — however CHANGELOG v1.10.0 mentions "Node.js >= 20 (required by HakanMCP)". The actual requirement may be 20+ if HakanMCP is part of the install. | **Error** |
| 2 | 40 | Fork command uses `user/claude-code-dotfiles` — should be `sudohakan/claude-code-dotfiles` | **Error** |
| 3 | 265 | States hooks are "ESM (.js)" but the actual hooks use `module.exports` (CommonJS pattern) and `require()`. The `pretooluse-safety.js` uses `require.main !== module` guard. This contradicts the "ESM" claim. | **Error** |
| 4 | 272-281 | Example hook structure uses `export default async function(event)` (ESM syntax) — but actual hooks don't use ESM exports. They output JSON to stdout, not return values. | **Error** |
| 5 | 114 | GSD directory says "34 commands" in the structure but the tree lists exactly 34 files — verified correct | OK |
| 6 | 258 | Lists 34 GSD commands inline — verified all 34 match actual files | OK |
| 7 | 256 | Lists 10 top-level commands — verified: 10 `.md` files exist (excluding `gsd/` directory) | OK |

### Missing Info

- No mention of the `test/` directory for hook tests
- No guidance on how to test installer changes safely on Windows specifically (only shows bash `CLAUDE_DIR` approach)
- No mention of the `.claude/commands/` directory in the repo root (contains `sync-dotfiles.md` and `browser.md`)
- No issue/PR templates mentioned (could add `.github/ISSUE_TEMPLATE/` and `.github/PULL_REQUEST_TEMPLATE.md`)

### Interactivity Improvements

1. **Mermaid diagrams** — the install flow and PR flow diagrams are good
2. **Add a "Good First Issues" section** or link to GitHub labels
3. **Add language/framework badges** to Prerequisites table (Node.js logo, Python logo, etc.)
4. **Link each "Existing hooks" table entry** to the actual file in the repo

### Cross-Reference Errors

| Ref | Target | Status |
|-----|--------|--------|
| `[SETUP](SETUP.md)` | SETUP.md | OK |
| `[SECURITY](SECURITY.md)` | SECURITY.md | OK |
| `../../issues` | GitHub Issues | OK (relative GitHub link) |
| `../../discussions` | GitHub Discussions | OK (if enabled on repo) |

---

## File: SECURITY.md

**Purpose:** Security policy — vulnerability reporting, credential safety, hooks security.

### Issues Found

| # | Line | Issue | Severity |
|---|------|-------|----------|
| 1 | - | All 7 hooks listed correctly in the security matrix (including dippy and all 6 JS hooks) | OK |
| 2 | 49 | Response timeline: "Acknowledgment: 48 hours" but line 43 says "Expected response time: 72 hours" — these are different metrics (acknowledgment vs response) but could confuse readers | Minor |
| 3 | - | Security advisory link points to correct repo URL | OK |

### Missing Info

- No mention of the `ALLOWED_DIRS` feature (added in v1.11.0) which auto-allows destructive operations in certain directories — this is security-relevant
- No mention of the session-based allowlist TTL (12 hours) in the hooks security section
- No CVE/disclosure history section (even if empty, good to have)

### Interactivity Improvements

1. **Add a security badge** at the top (e.g., `![Security](https://img.shields.io/badge/security-policy-green)`)
2. **Add a "Quick Report" button** — GitHub supports security advisory creation links
3. **Collapsible sections** are already used well

### Cross-Reference Errors

| Ref | Target | Status |
|-----|--------|--------|
| `[SETUP.md](SETUP.md)` | SETUP.md | OK |
| `[CONTRIBUTING.md](CONTRIBUTING.md)` | CONTRIBUTING.md | OK |
| `[README.md](README.md)` | README.md | OK |
| `[CHANGELOG.md](CHANGELOG.md)` | CHANGELOG.md | OK |
| `[SECURITY.md](SECURITY.md)` | Self-reference | OK |

---

## File: SETUP.md

**Purpose:** Detailed installation guide with manual steps, verification, and troubleshooting.

### Issues Found

| # | Line | Issue | Severity |
|---|------|-------|----------|
| 1 | 1 | Title says "Claude Code Portable Setup Guide" — project was renamed from `claude-code-portable` to `claude-code-dotfiles`. Title is outdated. | **Error** |
| 2 | 3 | Subtitle says "Hakan's Claude Code configuration — portable transfer package" — should be updated to match README branding | Minor |
| 3 | 64 | States "Node.js v18+" — should be v20+ per HakanMCP requirement (CHANGELOG v1.10.0) | **Error** |
| 4 | 114 | GSD subdirectory says "33 commands" but should be "34 commands" (34 files verified in `config/commands/gsd/`) | **Error** |
| 5 | 104 | Parent line says "10 + 34 slash commands" but the GSD count inside says 33 — inconsistent within the same file | **Error** |
| 6 | 12 | Quick Setup PowerShell path hardcoded to `C:\dev\claude-code-dotfiles` — fine for the author but contradicts the "portable" concept. README uses `git clone` approach which is better. | Minor |
| 7 | 17 | Quick Setup Bash path hardcoded to `/c/dev/claude-code-dotfiles` (Git Bash Windows path) — should show generic path like `~/dev/claude-code-dotfiles` | Minor |
| 8 | 169-173 | Manual plugin install commands are incomplete — only shows 6 plugins but README lists 29 total (15 official + 11 ToB + 3 anthropic) | Minor |

### Missing Info

- No mention of `--force` flag behavior details
- No mention of `dotfiles-meta.json` creation (added in v1.7.0)
- Missing `project-registry.json` from the Package Contents tree
- No Linux/macOS package manager alternatives (only mentions winget)
- The `install.sh` flags (`--skip-hakanmcp`, `--skip-plugins`, `--force`) are mentioned but not documented individually

### Interactivity Improvements

1. **Rename the title** to match the project name: "claude-code-dotfiles Setup Guide"
2. **Add a "Prerequisites Check" script block** that users can copy-paste to verify everything at once
3. **Add OS-specific tabs** — GitHub markdown doesn't support tabs natively, but can use `<details>` with OS names
4. **Add verification status indicators** (checkmarks) next to each verification command output
5. **Link the "Parameters" section** to the actual installer source for reference

### Cross-Reference Errors

| Ref | Target | Status |
|-----|--------|--------|
| No explicit links to other docs | - | Should add links to README, CONTRIBUTING, SECURITY |

---

## File: CLAUDE.md (project root)

**Purpose:** Project-level Claude Code instructions for the dotfiles repo itself — tech stack, sync rules, versioning, security notes.

### Issues Found

| # | Line | Issue | Severity |
|---|------|-------|----------|
| 1 | 9 | Lists "34 GSD commands" — verified correct | OK |
| 2 | 21-22 | Hook list mentions 7 hooks correctly | OK |
| 3 | 57 | Test count "30/30" — matches README and CONTRIBUTING | OK |
| 4 | 22 | Commands list says "Slash commands (init-hakan, browser, gsd/*)" — omits 8 other commands (commit, create-pr, dotfiles-update, fix-github-issue, fix-pr, release, run-ci, ship) | Minor |

### Missing Info

- Could list all 10 top-level commands instead of just 2 examples
- No mention of the `.claude/commands/` directory in the repo root (contains `sync-dotfiles.md` and `browser.md`)

### Interactivity Improvements

- This is a machine-readable instruction file, not a user-facing doc. Current format is appropriate. No changes needed.

### Cross-Reference Errors

None found.

---

## File: config/CLAUDE.md (global instructions)

**Purpose:** Global Claude Code instructions installed to `~/.claude/CLAUDE.md` — defines behavior, workflows, context engineering, GSD lifecycle.

### Issues Found

| # | Line | Issue | Severity |
|---|------|-------|----------|
| 1 | - | Section numbering starts at 5 (not 1) — intentional per CHANGELOG v1.9.0 ("Renumbered from 1-9 to 5-15") | OK (intentional) |
| 2 | - | All referenced docs paths use `~/.claude/docs/` format — correct for installed location | OK |
| 3 | - | GSD commands listed (`/gsd:new-project`, `/gsd:discuss-phase`, etc.) — all exist | OK |
| 4 | - | 13 superpowers skills listed in Intent table — matches plugin capability | OK |

### Missing Info

- No mention of the `/dotfiles-update` command (added in v1.7.0)
- No mention of the community skills or plugin marketplaces
- Section 15 (Advanced Toolset) is very thin — just a one-liner pointing to docs file

### Interactivity Improvements

- This is a machine-consumed instruction file. GitHub rendering is secondary. No interactivity changes needed.

### Cross-Reference Errors

| Ref | Target | Status |
|-----|--------|--------|
| `~/.claude/docs/ui-ux.md` | config/docs/ui-ux.md | OK |
| `~/.claude/docs/decision-matrix.md` | config/docs/decision-matrix.md | OK |
| `~/.claude/docs/review-ralph.md` | config/docs/review-ralph.md | OK |
| `~/.claude/docs/multi-agent.md` | config/docs/multi-agent.md | OK |
| `~/.claude/docs/tools-reference.md` | config/docs/tools-reference.md | OK |

---

## Cross-File Consistency Issues

| # | Issue | Files Affected | Severity |
|---|-------|---------------|----------|
| 1 | **Node.js version requirement inconsistency** — README and CONTRIBUTING say "v18+", SETUP says "v18+", but CHANGELOG v1.10.0 added a Node.js >= 20 check for HakanMCP. The actual requirement should be 20+ everywhere. | README.md (L425), CONTRIBUTING.md (L26), SETUP.md (L64) | **Error** |
| 2 | **GSD command count: 33 vs 34** — SETUP.md line 114 says "33 commands" while line 104 says "34". All other files say 34. Actual count is 34. | SETUP.md (L114) | **Error** |
| 3 | **"Claude Code Portable" naming** — SETUP.md still uses the old project name in title and subtitle. All other files use "claude-code-dotfiles". | SETUP.md (L1, L3) | **Error** |
| 4 | **Hook module system** — CONTRIBUTING.md claims hooks are "ESM (.js)" but actual hooks use CommonJS patterns (`require()`, `module.exports`). The example code uses ESM `export default` syntax which doesn't match reality. | CONTRIBUTING.md (L265, L272-281) | **Error** |
| 5 | **Fork URL** — CONTRIBUTING.md uses `user/claude-code-dotfiles` instead of `sudohakan/claude-code-dotfiles` | CONTRIBUTING.md (L40) | **Error** |
| 6 | **Dippy in project tree** — README's project structure shows `dippy/` under hooks, but this directory is gitignored and doesn't exist in the repo. Could confuse contributors who clone and don't find it. | README.md (L334) | Minor |
| 7 | **ALLOWED_DIRS not documented in SECURITY.md** — A security-relevant feature (auto-allowing destructive operations in certain directories) is not mentioned in the security policy. | SECURITY.md | Minor |
| 8 | **Missing `dotfiles-update.md` from SETUP.md commands tree** — SETUP.md's Package Contents tree lists only 9 command files but there are 10 (missing `dotfiles-update.md`). | SETUP.md (L105-113) | Minor |
| 9 | **`.claude/commands/browser.md`** — exists in repo root's `.claude/commands/` alongside `sync-dotfiles.md` but README's project structure tree only mentions `sync-dotfiles.md` | README.md (L282) | Minor |

---

## Summary

### Error Count by File

| File | Errors | Minor | Info | OK |
|------|--------|-------|------|----|
| README.md | 0 | 3 | 0 | 4 |
| CHANGELOG.md | 0 | 2 | 2 | 2 |
| CONTRIBUTING.md | 4 | 0 | 0 | 3 |
| SECURITY.md | 0 | 1 | 0 | 2 |
| SETUP.md | 4 | 4 | 0 | 0 |
| CLAUDE.md (root) | 0 | 1 | 0 | 3 |
| config/CLAUDE.md | 0 | 0 | 0 | 4 |
| **Cross-file** | **5** | **4** | **0** | - |

### Top Priority Fixes

1. **SETUP.md title** — Rename from "Claude Code Portable" to "claude-code-dotfiles"
2. **SETUP.md GSD count** — Change "33 commands" to "34 commands" on line 114
3. **Node.js version** — Update to "v20+" in README, CONTRIBUTING, and SETUP (or clarify v18+ for hooks, v20+ for HakanMCP)
4. **CONTRIBUTING.md fork URL** — Change `user/` to `sudohakan/`
5. **CONTRIBUTING.md hook module system** — Change "ESM" to "CommonJS" or clarify the actual pattern (stdin/stdout JSON, not module exports)

### Verified Counts (all accurate unless noted)

| Item | Documented | Actual | Match |
|------|-----------|--------|-------|
| GSD commands | 34 | 34 | Yes |
| Top-level commands | 10 | 10 | Yes |
| Agents | 12 | 12 | Yes |
| Hooks (in repo) | 7 | 6 + dippy (runtime) | Partial |
| Docs | 5 | 5 | Yes |
| Skills | 4 | 4 | Yes |
| Memory files | 6 | 6 | Yes |
| Plugins | 29 | 29 (per config) | Yes |
| VERSION | 1.13.3 | 1.13.3 | Yes |
| README badge | 1.13.3 | 1.13.3 | Yes |
