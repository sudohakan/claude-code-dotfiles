# Create Pull Request

Create a new branch, commit changes, and submit a pull request.

## Usage
`/create-pr` — create PR in cwd or project picker
`/create-pr <project-name>` — fuzzy match project from registry
`/create-pr --path=<dir>` — target specific directory

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

### Step 1: Analyze & Branch
1. Run `git status` and `git diff` to understand current changes
2. Create a new branch with semantic naming (feat/, fix/, docs/, refactor/, chore/)

### Step 2: Commit & Push
3. Stage and commit changes — split into logical commits when appropriate
4. Push branch to remote with `-u` flag

### Step 3: Create PR
5. Create pull request using `gh pr create` with summary and test plan

## Branch Naming
`<type>/<short-description>` — e.g., `feat/user-auth`, `fix/memory-leak`

## PR Template
```
## Summary
<1-3 bullet points describing what changed and why>

## Test Plan
<checklist of verification steps>
```

## Commit Splitting Guidelines
- Split by feature, component, or concern
- Keep related file changes together
- Separate refactoring from feature additions
- Each commit should be independently understandable

## Rules
- Ask user for target branch if not obvious (default: main)
- Show branch name and commit messages for approval before pushing
- Never force push
- Return the PR URL when done
