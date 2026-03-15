# Run CI Checks

Run project CI/test pipeline locally and fix errors iteratively until all checks pass.

## Usage
`/run-ci` — run CI in cwd or project picker
`/run-ci <project-name>` — fuzzy match project from registry
`/run-ci --path=<dir>` — target specific directory

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

### Step 1: Detect & Run
1. Detect project type and find the appropriate test/CI command:
   - Node.js: `npm test` / `npm run lint` / `npm run build`
   - .NET: `dotnet test` / `dotnet build`
   - Python: `pytest` / `python -m pytest`
   - Custom: look for CI scripts (`run-ci.sh`, `.github/workflows/`)
2. Run the detected CI commands

### Step 2: Fix Loop
3. If any check fails:
   - Analyze the error output
   - Implement the fix
   - Re-run the failing check
   - Repeat until it passes (max 5 iterations)

### Step 3: Report
4. Run all checks one final time to confirm everything passes
5. Report results summary

## Rules
- Auto-detect project type from files present (package.json, .csproj, requirements.txt, etc.)
- Fix errors iteratively — don't give up after first failure
- Maximum 5 fix iterations per error to prevent infinite loops
- Report each fix applied
- Don't commit fixes — let the user review and decide
