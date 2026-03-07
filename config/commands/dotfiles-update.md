# Dotfiles Update

Update claude-code-dotfiles to the latest version from GitHub.

## Process

### Step 1: Check Current State

Read `~/.claude/dotfiles-meta.json` to get:
- `version` — currently installed version
- `repo_path` — local clone path of the dotfiles repo

If the file does not exist:
> "dotfiles-meta.json not found. This system was not installed via the install script. Please clone the repo and run the install script first."

If `repo_path` does not exist or is not a git repo:
> "Dotfiles repo not found at {repo_path}. Please update the path in ~/.claude/dotfiles-meta.json or re-clone the repo."

### Step 2: Check for Updates

Read the cached update check from `~/.claude/cache/dotfiles-update-check.json`:
- If `update_available` is true, show:
  > "Update available: v{installed} -> v{latest}"
- If no update available, show:
  > "Already on latest version: v{installed}"
  - Ask: "Force update anyway?" — if no, exit

### Step 3: Pull Latest

Run in the dotfiles repo directory:
```bash
git -C "{repo_path}" pull origin main
```

If pull fails (merge conflict, detached HEAD, etc.):
> "Git pull failed. You may need to resolve conflicts manually in {repo_path}."
- Do NOT force pull or reset

### Step 4: Read New Version

```bash
cat "{repo_path}/VERSION"
```

Show the new version to the user.

### Step 5: Run Install

Ask the user which install method to use based on their platform:

**Windows (PowerShell):**
```bash
powershell -ExecutionPolicy Bypass -File "{repo_path}/install.ps1" -Force
```

**Windows (Git Bash) / Linux / macOS:**
```bash
bash "{repo_path}/install.sh" --force
```

### Step 6: Show Changelog

Read `{repo_path}/CHANGELOG.md` and show the entries between the old version and the new version.

### Step 7: Clear Cache

Delete the update check cache so the statusline notification disappears:
```bash
rm -f ~/.claude/cache/dotfiles-update-check.json
```

Inform the user:
> "Dotfiles updated: v{old} -> v{new}"
> "Restart Claude Code to apply all changes."

## Notes

- This command can be run from any directory
- Never force-push, reset, or modify the dotfiles repo — only pull
- The install script handles backup, path fixes, and file copying
- After update, a terminal restart may be needed for hook changes to take effect
