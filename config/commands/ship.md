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

### Step 2: Branch
- If already on a feature branch, use it
- If on main/master, create a new branch with semantic naming: `<type>/<short-description>`
- Ask user to confirm branch name

### Step 3: CI (skip with --no-ci)
- Auto-detect project type and run appropriate checks
- If checks fail: analyze error, fix, re-run (max 5 iterations)
- If unfixable: inform user, ask whether to continue

### Step 4: Commit
- Analyze diff for logical grouping
- Split into atomic commits if multiple concerns detected
- Generate conventional commit messages
- Show proposed commits for approval

### Step 5: Release (only with --release)
- Determine version increment (patch/minor/major) based on change scope
- Update VERSION file
- Update CHANGELOG.md (Keep a Changelog format)
- Review README.md for necessary updates
- Commit release files: `release: vX.Y.Z`

### Step 6: Push
- Push branch to remote with `-u` flag
- If --release: create annotated tag `vX.Y.Z` and push tag

### Step 7: PR (skip with --no-pr)
- Create PR using `gh pr create`
- Include summary (what changed and why) and test plan
- Use --draft flag if specified
- Target --base branch (default: main)
- Return PR URL

### Step 8: Merge (skip with --no-pr or --draft)
- After PR is created, merge it: `gh pr merge <url> --squash --delete-branch`
- If merge fails (CI required, review required, conflict): inform user and provide the PR URL
- After successful merge, switch local branch back to main/master and pull: `git checkout main && git pull`
- If --release: verify the tag is on the merged commit

## Rules
- Show progress at each step
- Ask for confirmation on branch name and commit messages
- Never use --force or --no-verify
- Never skip hooks
- If any step fails, inform user and ask how to proceed
- Keep output concise — show what matters, not verbose logs
