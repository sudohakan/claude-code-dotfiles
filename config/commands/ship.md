# Ship — End-to-End Git Workflow

Branch, CI, commit, version bump, push, PR — all in one command.

## Usage
`/ship` — full flow (uses cwd or project picker)
`/ship <project-name>` — fuzzy match project from registry
`/ship --path=<dir>` — target specific directory
`/ship --release` — includes version bump + changelog + tag
`/ship --no-ci` — skip CI checks
`/ship --no-pr` — push only, no PR
`/ship --draft` — create draft PR
`/ship --base=<branch>` — target branch (default: main)

Flags are composable: `/ship my-project --release --draft`

## Approval Philosophy

Ship is designed to run autonomously. **Only stop for user input when a decision could cause data loss, wrong versioning, or security risk.** Everything else is auto-decided and reported.

**Requires approval (STOP and ask):**
- Version bump type (MAJOR/MINOR/PATCH) when `--release` is used
- Critical/High security scan findings
- CI failures that can't be auto-fixed
- Merge conflicts or PR merge failures

**Auto-decided (just inform):**
- Project resolution (use cwd, single match auto-confirmed)
- File Gate (auto-add safe files, auto-block dangerous ones, skip warn files with a note)
- Branch naming (auto-generate, just show it)
- Commit messages (auto-generate conventional commits, just show them)
- Code review minor suggestions (note and proceed)
- PR creation details

## Behavior

### Step 0: Resolve Target Project
- If `--path=<dir>` provided, verify it's a git repo and use it
- If a project name/path argument is given, fuzzy-match against `~/.claude/project-registry.json` (case-insensitive partial match on directory name and path across `recent`, scanned `scan_roots`, and `extra_projects`)
- If multiple matches found, show numbered list and ask user to pick
- **If single match found, auto-use it** (just inform: "Shipping from: <path>")
- If cwd is a git repo and NOT the user's home directory, auto-use cwd
- Otherwise, show project picker:
  1. Recent projects from registry (sorted by `last_used`)
  2. Projects found by scanning `scan_roots` directories for `.git` folders (up to `max_scan_depth` levels deep)
  3. Option to enter a new path or add a new scan root
- If `~/.claude/project-registry.json` has empty `scan_roots`, ask user to add at least one root directory
- Once resolved, all subsequent git commands operate in the target directory (use `git -C <path>` or `cd` to target)
- Update `recent` array in registry with `{"path": "<resolved>", "last_used": "<today>"}`

### Step 1: Analyze
- Run `git status` and `git diff` to understand all changes
- Determine change scope (feature, fix, docs, refactor, chore)
- **Version detection:** Check if project has `VERSION` file or `CHANGELOG.md`. If found and `--release` was NOT passed, auto-enable release mode and inform user:
  > "Versioning files detected — release mode enabled. Use `--no-release` to skip."
- Show brief summary (files changed, scope)

### Step 2: File Gate
Review all **untracked files** from `git status` before they are staged. **Runs silently unless action is needed.**

**Auto-block (never stage, never push — silent, just list at end):**
- Secrets & credentials: `.env*`, `*.key`, `*.pem`, `*.p12`, `*.pfx`, `credentials*`, `secrets*`, `*password*`, `*.keystore`, `*.jks`
- Build artifacts: `node_modules/`, `dist/`, `build/`, `bin/`, `obj/`, `.vs/`, `.idea/`, `__pycache__/`, `*.pyc`
- Binaries & archives: `*.exe`, `*.dll`, `*.so`, `*.dylib`, `*.zip`, `*.tar.*`, `*.rar`, `*.7z`, `*.jar`, `*.war`
- Logs & temp: `*.log`, `*.tmp`, `*.swp`, `*.bak`, `*.cache`

**Auto-skip with note (no prompt):**
- Files > 1 MB
- Binary files (detected via `file` command or extension)
- Generated files (`*.generated.*`, `*.g.cs`, `*.designer.cs`)
- Database files (`*.db`, `*.sqlite`, `*.mdf`)

**Auto-add (safe to stage):**
- Source code (`*.ts`, `*.js`, `*.cs`, `*.py`, `*.go`, `*.rs`, `*.java`, etc.)
- Config (`*.json`, `*.yaml`, `*.yml`, `*.toml`, `*.xml`, `*.csproj`, `*.sln`)
- Documentation (`*.md`, `*.txt`, `*.rst`)
- Tests, assets (`*.css`, `*.html`, `*.svg`, `*.png` < 500KB)

**Output:** Show one-line summary: "Staged 12 files, blocked 3 (secrets/binaries), skipped 2 (>1MB)"
- If blocked files are not in `.gitignore`, auto-add them and note it

### Step 3: Branch
- If already on a feature branch, use it
- If on main/master, auto-create branch with semantic naming: `<type>/<short-description>`
- **No approval needed** — just inform: "Created branch: feat/add-auth-system"

### Step 4: CI (skip with --no-ci)
- Auto-detect project type and run appropriate checks
- If checks fail: analyze error, fix, re-run (max 5 iterations)
- **If unfixable after 5 attempts: STOP and ask user** — this is a real decision

### Step 5: Security Scan (only on MAJOR bump)
When the version bump is **MAJOR**, run security analysis **before committing** so scan artifacts never enter git history:

1. **Run Semgrep** — invoke `static-analysis:semgrep` skill with "important only" mode
2. **Run CodeQL** — invoke `static-analysis:codeql` skill with "important only" mode
3. **Evaluate results:**
   - **Critical/High findings → STOP and ask user:** "Found 2 critical issues. Fix first or continue shipping?"
   - **Medium/Low findings** → show summary count, proceed automatically
   - **No findings** → report clean scan, continue
4. If user chooses to fix → pause ship, fix issues, then re-run `/ship --release` from the beginning
5. If user chooses to continue → proceed

### Step 6: Cleanup
**Immediately after security scan (before any commit),** remove all scan-generated artifacts:
- Delete any SARIF files (`*.sarif`, `results/*.sarif`)
- Delete CodeQL databases (`.codeql/`, `codeql-db/`)
- Delete Semgrep output files (`.semgrep/`, `semgrep-results.*`)
- Remove any temporary scan artifacts
- Do NOT delete project files — only scan-generated artifacts
- **Also runs at end of ship if it fails mid-way** (safety net)

### Step 7: Commit
- Analyze diff for logical grouping
- Split into atomic commits if multiple concerns detected
- Auto-generate conventional commit messages
- **No approval needed** — just show the commits made: "Committed: feat: add user auth (3 files), fix: resolve token expiry (1 file)"

### Step 7.5: Code Review
- Invoke `superpowers:requesting-code-review` skill to review all staged changes
- Review checks: correctness, security, code quality, adherence to project conventions
- **If review finds critical issues → auto-fix and re-commit** (no prompt unless fix fails)
- If review finds minor suggestions → note them in output, proceed
- If review is clean → proceed silently

### Step 8: Release (only with --release)

#### Version Standard (Semantic Versioning)
Version format: `MAJOR.MINOR.PATCH` — strictly follows [semver.org](https://semver.org).

| Bump | Trigger | Examples |
|------|---------|----------|
| **MAJOR** (X.0.0) | Breaking change, API contract change, major architectural overhaul | `feat!:`, `BREAKING CHANGE:` in commit, removed/renamed public API, database schema migration |
| **MINOR** (x.Y.0) | New feature, new endpoint, new command, backward-compatible addition | `feat:` commit, new file/module added, new CLI flag, new tool registered |
| **PATCH** (x.y.Z) | Bug fix, typo, docs update, refactor with no behavior change, dependency bump | `fix:`, `docs:`, `refactor:`, `chore:`, `style:`, `perf:` commits |

**Decision process:**
1. Scan all commit messages (since last tag) for conventional commit prefixes
2. `feat!:` or body contains `BREAKING CHANGE` → **MAJOR**
3. `feat:` → **MINOR**
4. Everything else → **PATCH**
5. Cross-check with diff scope: if 50%+ of source files changed and no explicit prefix → suggest MINOR
6. **STOP and ask user to confirm version bump** — show: "Recommended: MINOR (x.Y.0) — reason: new feat commits. Override? [patch/minor/major]"
7. User can override (e.g., choose MAJOR when auto-detected MINOR)

**Release steps:**
- Update VERSION file (if exists)
- Update CHANGELOG.md (Keep a Changelog format, if exists)
- **Scan all root-level markdown files** (`*.md` in project root) for version references, badges, or content that may need updating based on the changes. Common examples:
  - `README.md` — version badges, feature lists, component counts
  - `SECURITY.md` — hook tables, component lists
  - `SETUP.md` — installation steps, file trees
  - Project-level `CLAUDE.md` — tech stack, directory structure
  - Any other `.md` file that references versions, counts, or components
- For each file with outdated content, update it
- Commit all release files together: `release: vX.Y.Z`

### Step 9: Push
- Push branch to remote with `-u` flag
- If --release: create annotated tag `vX.Y.Z` and push tag

### Step 10: PR (skip with --no-pr)
- Auto-create PR using `gh pr create`
- Include summary (what changed and why) and test plan
- If MAJOR release with security scan results, include scan summary in PR description
- Use --draft flag if specified
- Target --base branch (default: main)
- Show PR URL

### Step 11: Merge (skip with --no-pr or --draft)
- After PR is created, auto-merge: `gh pr merge <url> --squash`
- **If merge fails (CI required, review required, conflict): STOP and inform user** with PR URL
- Ask before deleting the remote or local branch after merge.
- After successful merge, switch local branch back to main/master and pull: `git checkout main && git pull`
- If --release: verify the tag is on the merged commit

## Rules
- Show progress at each step — one-liner per step, not verbose
- **Only 4 approval points:** version bump, critical security findings, unfixable CI, merge failure
- Never use --force or --no-verify
- Never skip hooks
- If any step fails unexpectedly, inform user and ask how to proceed
- File Gate blocked files are NEVER staged — no exceptions
- Security scans only run on MAJOR bumps to avoid slowing down routine ships
- Cleanup always runs, even if ship fails mid-way
