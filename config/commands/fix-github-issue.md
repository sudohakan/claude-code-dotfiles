# Fix GitHub Issue

Analyze a GitHub issue, implement the fix, and prepare a commit.

## Usage
`/fix-github-issue <issue-number-or-url>` — fix in cwd or project picker
`/fix-github-issue <issue-number-or-url> --path=<dir>` — target specific directory
`/fix-github-issue <issue-number-or-url> <project-name>` — fuzzy match project

## Behavior

### Step 0: Resolve Target Project
- If `--path=<dir>` provided, verify it's a git repo and use it
- If a project name/path argument is given (not the issue number/URL), fuzzy-match against `~/.claude/project-registry.json` (case-insensitive partial match on directory name and path across `recent`, scanned `scan_roots`, and `extra_projects`)
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

### Step 1: Understand
1. Fetch issue details using `gh issue view <issue>`
2. Analyze the issue: understand the problem, expected behavior, reproduction steps

### Step 2: Fix
3. Explore the codebase to find relevant files
4. Implement the fix

### Step 3: Verify & Commit
5. Run existing tests to verify the fix doesn't break anything
6. Create a commit with message referencing the issue: `fix: <description> (#<issue-number>)`
7. Report what was changed and why

## Rules
- Read the full issue including comments before starting
- Understand root cause before implementing a fix
- Run tests after fixing — don't commit if tests fail
- Keep the fix minimal and focused on the issue
- Reference the issue number in the commit message
