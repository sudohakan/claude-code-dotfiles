# Fix PR Comments

Fetch unresolved review comments on the current branch's PR and fix them.

## Usage
`/fix-pr` — fix in cwd or project picker
`/fix-pr <project-name>` — fuzzy match project from registry
`/fix-pr --path=<dir>` — target specific directory

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

### Step 1: Detect PR
1. Detect current branch with `git branch --show-current`
2. Find associated PR using `gh pr view --json number,url,reviewDecision`

### Step 2: Analyze Comments
3. Fetch unresolved review comments using `gh api repos/{owner}/{repo}/pulls/{number}/comments`

### Step 3: Fix & Push
4. For each unresolved comment:
   - Read the referenced file and line
   - Understand the reviewer's feedback
   - Implement the fix
   - Mark as addressed
5. Run tests to verify fixes don't break anything
6. Create a commit: `fix: address PR review comments`
7. Push to the same branch

## Rules
- Read ALL unresolved comments before starting fixes
- Group related comments and fix them together
- Don't blindly apply suggestions — evaluate if they make sense
- If a comment is unclear or questionable, ask the user before implementing
- Never force push
