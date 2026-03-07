# Ship

End-to-end professional git workflow: branch, CI, commit, version bump, push, PR.

## Usage
`/ship` — full flow
`/ship --release` — includes version bump + changelog + tag
`/ship --no-ci` — skip CI checks
`/ship --no-pr` — push only, no PR
`/ship --draft` — create draft PR
`/ship --base=<branch>` — target branch (default: main)

Flags are composable: `/ship --release --draft`

## Behavior

### Step 1: Analyze
- Run `git status` and `git diff` to understand all changes
- Determine change scope (feature, fix, docs, refactor, chore)
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
- Generate conventional commit messages with emoji
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

## Rules
- Show progress at each step
- Ask for confirmation on branch name and commit messages
- Never use --force or --no-verify
- Never skip hooks
- If any step fails, inform user and ask how to proceed
- Keep output concise — show what matters, not verbose logs
