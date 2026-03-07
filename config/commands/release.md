# Release

Manage a software release: changelog, version bump, and documentation.

## Usage
`/release` — release in cwd or project picker
`/release <project-name>` — fuzzy match project from registry
`/release --path=<dir>` — target specific directory

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

### Step 1: Analyze Changes
1. Check changes since last version tag: `git log $(git describe --tags --abbrev=0)..HEAD --oneline`
2. Analyze the scope of changes to determine version increment:
   - **patch** (x.y.Z): bug fixes, minor changes
   - **minor** (x.Y.0): new features, non-breaking changes
   - **major** (X.0.0): breaking changes

### Step 2: Update Release Files
3. Update CHANGELOG.md with changes since last release (Keep a Changelog format)
4. Review README.md for any necessary updates
5. Update VERSION file (or package.json version) with new version number

### Step 3: Commit & Tag
6. Show all proposed changes for user approval
7. On approval: stage, commit with `vX.Y.Z` in message, create tag

## Rules
- Never auto-commit — show changes and ask for approval
- Follow Keep a Changelog format
- Use semantic versioning
- Commit message format: `release: vX.Y.Z`
- Tag format: `vX.Y.Z`
- Don't push — let the user decide when to push
