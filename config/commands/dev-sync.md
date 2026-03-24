# Dev Sync — Project Health & Improvement Tracker

Analyze all projects in `C:\dev\`, identify real issues from source code, and sync findings to Google Tasks as parent tasks with subtasks.

**Standard:** `C:\dev\CLAUDE.md`
**Task list:** "Dev - Projects" in Google Tasks
**WSL path:** `/mnt/c/dev/`

## Usage

Parse `<args>`:
- `--status` → Jump to **Status Mode**
- `--check` → Run full analysis but skip Google Tasks writes (dry run)
- (none) → Full sync

---

## Status Mode

1. List tasks in "Dev - Projects" via `mcp__gtasks-mcp__list`
2. Group by parent (🟢 prefix = project, indented = subtask)
3. Show table:
   ```
   | Project | Open | Done | Top Issue |
   |---------|------|------|-----------|
   | HakanMCP | 2 | 1 | [HIGH] CI tests silenced |
   ```
4. Done — stop here.

---

## Full Sync Pipeline

### Step 1: Discover Projects

```bash
ls -d /mnt/c/dev/*/.git 2>/dev/null | sed 's|/\.git||;s|.*/||'
```

For each project directory, collect:
- **Repo name:** directory name
- **Remote:** `git remote get-url origin` → extract `sudohakan/<repo>` (may differ from dir name)
- **Language:** detect from package.json (Node), pyproject.toml (Python), Dockerfile (Docker)
- **Version:** read VERSION file, or package.json `version`, or pyproject.toml `version`
- **CI status:** `gh run list --repo sudohakan/<repo-name> --limit 1` (use extracted repo name, not dir name)
- **Docs:** check existence of: README.md, CHANGELOG.md, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, LICENSE, VERSION, .gitignore

**Repo name mapping** (dir name → GitHub repo name):
Build mapping dynamically from `git remote get-url origin` for each project. Do NOT hardcode.

Skip directories without `.git/`.

### Step 2: Deep Code Analysis

**Use parallel subagents** — dispatch one Explore agent per project (max 4 concurrent) to read source code. This is critical for performance.

Each agent receives:
- Project path
- Language
- Checklist below

**Analysis checklist (agent reads actual code, cites file:line):**

**CI/CD:**
- Tests enforced? (check for `continue-on-error`, `|| true`, `--ignore`, skipped test files)
- Full test suite runs in CI, not just lint?
- Coverage threshold configured and meaningful? (not 0% or aspirational-only)

**Code Quality:**
- TODO/FIXME/HACK in source code
- Bare `except:` or empty `catch` blocks
- Hardcoded absolute paths, credentials, magic numbers
- Unused imports (`F401`), dead code
- Duplicate or conflicting config fields
- `print()` to stdout in MCP stdio servers (corrupts JSON-RPC stream)

**Security:**
- Plaintext credentials in config or data files
- Missing input validation or path traversal protection
- Unsanitized user input reaching shell commands

**Testing:**
- Modules with zero test coverage
- Tests that assert nothing meaningful (mock-only, no real assertions)
- Integration-critical paths untested

**Dependencies:**
- Packages >5 major versions behind
- Dev dependencies in production deps
- Committed build artifacts (dist/, build/) with machine-specific paths

**Output format per finding:**
```
FILE: exact/path/to/file.ext:line_number
ISSUE: one-line description
IMPACT: HIGH | MEDIUM | LOW
FIX: specific action with exact files to change
ACCEPTANCE: how to verify the fix worked
```

**Rules:**
- ONLY report issues verifiable by reading the code — never guess
- Cite file path and line number for EVERY finding
- MAX 3 findings per project — pick the most impactful
- HIGH = blocks correctness/security, MEDIUM = maintainability risk, LOW = code quality
- If a project has no issues, report "Clean — no actionable findings"

### Step 3: Sync to Google Tasks

**Prerequisite check:**
1. Try `mcp__gtasks-mcp__list-tasklists` to get "Dev - Projects" list ID
2. Try Rube `GOOGLETASKS_INSERT_TASK` — if `googletasks` toolkit not connected:
   - Call `RUBE_MANAGE_CONNECTIONS(toolkits=["googletasks"])`
   - Present the OAuth link to user
   - Wait for confirmation before proceeding
3. If Rube unavailable, fall back to `mcp__gtasks-mcp__create` (no subtask support — note this in output)

**Sync process:**

1. **List existing tasks** in "Dev - Projects" via Rube `GOOGLETASKS_LIST_TASKS` or `mcp__gtasks-mcp__list`
2. **For each project:**
   a. Find existing parent task by title match (`🟢 <project-name>`)
   b. If exists: delete it and all its subtasks
   c. Create new parent task via Rube:
      ```
      GOOGLETASKS_INSERT_TASK:
        tasklist_id: <list_id>
        title: "🟢 <project-name> — <one-line description>"
        notes: |
          Repo: https://github.com/sudohakan/<repo-name>
          Tech: <language/framework>
          Version: <version> | CI: <Green/Red>

          <2-3 sentence purpose description>

          3 verified improvements below as subtasks.
      ```
   d. Create 3 subtasks via Rube (using returned parent task ID):
      ```
      GOOGLETASKS_INSERT_TASK:
        tasklist_id: <list_id>
        task_parent: <parent_task_id>
        title: "[HIGH|MED|LOW] <issue summary>"
        notes: |
          File: <path>:<line> — <what's wrong>
          <2-3 sentences explaining the issue and why it matters>

          Fix: <exact steps to resolve>
          Acceptance: <how to verify the fix>
      ```

**If `--check`:** Skip all Google Tasks writes, show findings table only.

### Step 3.5: Ship & CI Gate

After analysis, for each project with a remote:

**A. Ship check — detect uncommitted/unpushed changes:**

```bash
for dir in /mnt/c/dev/*/; do
  [ -d "$dir/.git" ] || continue
  cd "$dir"
  branch=$(git branch --show-current)
  remote=$(git remote get-url origin 2>/dev/null)
  [ -z "$remote" ] && continue
  changes=$(git status --porcelain | wc -l)
  unpushed=$(git log origin/$branch..$branch --oneline 2>/dev/null | wc -l)
  [ "$changes" -gt 0 ] || [ "$unpushed" -gt 0 ] && echo "SHIP_NEEDED: $(basename $dir)"
done
```

For each project with pending changes:
1. Show summary: `<project> [$branch] → $changes uncommitted, $unpushed unpushed`
2. Invoke `/ship --path=<dir>` automatically — no confirmation needed for clean ships
3. Report results in final table

**B. CI verification — ensure all projects pass CI:**

```bash
for repo in <all remote repos>; do
  ci=$(gh.exe run list --repo "$repo" --limit 1 --json conclusion -q '.[0].conclusion' 2>/dev/null)
  echo "$repo: $ci"
done
```

For each project with CI failure:
1. Fetch failure logs: `gh.exe run view <run_id> --repo <repo> --log-failed | tail -30`
2. Analyze the root cause from logs
3. **Auto-fix if possible** — common fixes:
   - Symlink issues → remove symlink, replace with real file or delete
   - Download URL broken → update URL or switch to package manager
   - Test failures from new code → fix the code
   - Dependency issues → update lockfile
4. Commit fix on a `fix/ci-*` branch, push, create PR, merge
5. Verify CI passes on the merge commit: `gh.exe run list --repo <repo> --limit 1`
6. If auto-fix fails after 2 attempts → report as unresolved in final table

**CI must be green for ALL projects before Step 4.** If any project is red after auto-fix attempts, flag it as `❌ UNRESOLVED` in the report.

### Step 4: Report

Show formatted summary:

```
Dev Sync complete — <n> projects analyzed, <m> issues found

| Project | Version | CI | Ship | Docs | #1 | #2 | #3 |
|---------|---------|:--:|:----:|:----:|----|----|----|
| HakanMCP | 2.1.1 | ✅ | — | 8/8 | [HIGH] ... | [MED] ... | [LOW] ... |
| kali-mcp | 1.1.0 | ✅ | shipped | 8/8 | [HIGH] ... | [HIGH] ... | [MED] ... |
| ... | | | | | | | |

Ship: <n> projects shipped
CI: <n>/<total> green (list any red with reason)
Google Tasks: <n> parent tasks, <m> subtasks synced to "Dev - Projects"
```

---

## Important Rules

- **Read code, don't guess** — every finding must cite file:line
- **Parallel analysis** — use subagents for speed, max 4 concurrent
- **Idempotent** — running twice produces same result, old tasks replaced
- **Rube for subtasks** — `mcp__gtasks-mcp__create` cannot create subtasks, Rube required
- **Repo name from git remote** — never assume dir name = repo name
- **WSL paths** — all file operations use `/mnt/c/dev/`, display uses `C:\dev\`
