# Git Commit

Create well-structured commits with conventional commit messages.

## Usage
`/commit` — commit in cwd or project picker
`/commit <project-name>` — fuzzy match project from registry
`/commit --path=<dir>` — target specific directory

## Behavior

### Step 0: Resolve Target Project
- If `--path=<dir>` provided, verify it's a git repo and use it
- If a project name/path argument is given, fuzzy-match against `~/.claude/project-registry.json` (case-insensitive partial match on directory name and path across `recent`, scanned `scan_roots`, and `extra_projects`)
- Require a reasonable match threshold before auto-selecting a fuzzy match. If confidence is weak or two candidates are close, ask the user instead of guessing.
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

### Step 1: Analyze & Stage
1. Run `git status` to check staged files
2. If no files are staged, show modified files and ask which to stage
3. Run `git diff --staged` to analyze changes
4. Determine if changes should be split into multiple logical commits

### Step 2: Commit
5. Generate conventional commit message based on the diff
6. Show the proposed commit message and ask for confirmation
7. Create the commit

## Commit Message Format
`<type>: <description>`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Tests
- `chore`: Tooling, configuration
- `style`: Formatting/style
- `revert`: Reverting changes
- `release`: Version bump and release

## Rules
- Present tense, imperative mood
- First line under 72 characters
- If multiple distinct concerns detected, suggest splitting into separate commits
- Each commit should be atomic — one logical change
- Never skip hooks (no --no-verify) unless user explicitly requests
- Show the diff summary before proposing the message
