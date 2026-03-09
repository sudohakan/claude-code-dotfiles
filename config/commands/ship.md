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

## Behavior

### Step 0: Resolve Target Project
- If `--path=<dir>` provided, verify it's a git repo and use it
- If a project name/path argument is given, fuzzy-match against `~/.claude/project-registry.json` (case-insensitive partial match on directory name and path across `recent`, scanned `scan_roots`, and `extra_projects`)
- If multiple matches found, show numbered list and ask user to pick
- If single match found, confirm with user
- If cwd is a git repo and NOT the user's home directory, use cwd
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
- **Version detection:** Check if project has `VERSION` file or `CHANGELOG.md`. If found and `--release` was NOT passed, warn user:
  > "This project has versioning files (VERSION, CHANGELOG.md). Did you mean `/ship --release`?"
  - If user confirms → enable release mode
  - If user declines → continue without release
- Show summary to user

### Step 2: File Gate
Review all **untracked files** from `git status` before they are staged.

**Auto-block (never stage, never push):**
- Secrets & credentials: `.env*`, `*.key`, `*.pem`, `*.p12`, `*.pfx`, `credentials*`, `secrets*`, `*password*`, `*.keystore`, `*.jks`
- Build artifacts: `node_modules/`, `dist/`, `build/`, `bin/`, `obj/`, `.vs/`, `.idea/`, `__pycache__/`, `*.pyc`
- Binaries & archives: `*.exe`, `*.dll`, `*.so`, `*.dylib`, `*.zip`, `*.tar.*`, `*.rar`, `*.7z`, `*.jar`, `*.war`
- Logs & temp: `*.log`, `*.tmp`, `*.swp`, `*.bak`, `*.cache`

**Warn (ask user):**
- Files > 1 MB
- Binary files (detected via `file` command or extension)
- Generated files (`*.generated.*`, `*.g.cs`, `*.designer.cs`)
- Database files (`*.db`, `*.sqlite`, `*.mdf`)

**Auto-add (safe to stage):**
- Source code (`*.ts`, `*.js`, `*.cs`, `*.py`, `*.go`, `*.rs`, `*.java`, etc.)
- Config (`*.json`, `*.yaml`, `*.yml`, `*.toml`, `*.xml`, `*.csproj`, `*.sln`)
- Documentation (`*.md`, `*.txt`, `*.rst`)
- Tests, assets (`*.css`, `*.html`, `*.svg`, `*.png` < 500KB)

**Procedure:**
1. Classify each untracked file into the three categories
2. Show a table to user: `File | Size | Decision (add/skip/blocked)`
3. Blocked files are listed with reason — ask user: "Add these patterns to `.gitignore`?"
4. If user approves `.gitignore` update, add patterns and include in the commit
5. Warned files require explicit yes/no per file

### Step 3: Branch
- If already on a feature branch, use it
- If on main/master, create a new branch with semantic naming: `<type>/<short-description>`
- Ask user to confirm branch name

### Step 4: CI (skip with --no-ci)
- Auto-detect project type and run appropriate checks
- If checks fail: analyze error, fix, re-run (max 5 iterations)
- If unfixable: inform user, ask whether to continue

### Step 5: Commit
- Analyze diff for logical grouping
- Split into atomic commits if multiple concerns detected
- Generate conventional commit messages
- Show proposed commits for approval

### Step 5.5: Code Review
- Invoke `superpowers:requesting-code-review` skill to review all staged changes
- Review checks: correctness, security, code quality, adherence to project conventions
- If review finds **critical issues** → fix before proceeding
- If review finds **minor suggestions** → note them, proceed (can address later)
- If review is clean → proceed to next step
- Show review summary to user

### Step 6: Release (only with --release)

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
5. Cross-check with diff scope: if 50%+ of source files changed and no explicit prefix → suggest MINOR, ask user
6. Show recommended bump with reasoning, ask user for confirmation
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

### Step 7: Security Scan (only on MAJOR bump)
When the version bump is **MAJOR**, run security analysis before pushing:

1. **Run Semgrep** — invoke `static-analysis:semgrep` skill with "important only" mode
2. **Run CodeQL** — invoke `static-analysis:codeql` skill with "important only" mode
3. **Evaluate results:**
   - **Critical/High findings** → show details to user, ask: "Continue shipping or fix first?"
   - **Medium/Low findings** → show summary count, informational only
   - **No findings** → report clean scan, continue
4. If user chooses to fix → pause ship, fix issues, then re-run `/ship --release` from the beginning
5. If user chooses to continue → proceed to push

### Step 8: Push
- Push branch to remote with `-u` flag
- If --release: create annotated tag `vX.Y.Z` and push tag

### Step 9: PR (skip with --no-pr)
- Create PR using `gh pr create`
- Include summary (what changed and why) and test plan
- If MAJOR release with security scan results, include scan summary in PR description
- Use --draft flag if specified
- Target --base branch (default: main)
- Return PR URL

### Step 10: Merge (skip with --no-pr or --draft)
- After PR is created, merge it: `gh pr merge <url> --squash --delete-branch`
- If merge fails (CI required, review required, conflict): inform user and provide the PR URL
- After successful merge, switch local branch back to main/master and pull: `git checkout main && git pull`
- If --release: verify the tag is on the merged commit

### Step 11: Cleanup
After ship completes (success or failure):
- Delete any SARIF files generated by security scans (`*.sarif`, `results/*.sarif`)
- Delete CodeQL databases if created (`.codeql/`, `codeql-db/`)
- Delete Semgrep output files (`.semgrep/`, `semgrep-results.*`)
- Remove any temporary scan artifacts
- Do NOT delete project files — only scan-generated artifacts

## Rules
- Show progress at each step
- Ask for confirmation on branch name and commit messages
- Never use --force or --no-verify
- Never skip hooks
- If any step fails, inform user and ask how to proceed
- Keep output concise — show what matters, not verbose logs
- File Gate blocked files are NEVER staged — no exceptions
- Security scans only run on MAJOR bumps to avoid slowing down routine ships
- Cleanup always runs, even if ship fails mid-way
