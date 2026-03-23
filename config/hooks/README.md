# Hooks

Hooks are event-driven automations that fire before or after Claude Code tool executions. They enforce code quality, catch mistakes early, and automate repetitive checks.

## How Hooks Work

```
User request → Claude picks a tool → PreToolUse hook runs → Tool executes → PostToolUse hook runs
```

- **PreToolUse** hooks run before the tool executes. They can **block** (exit code 2) or **warn** (stderr without blocking).
- **PostToolUse** hooks run after the tool completes. They can analyze output but cannot block.
- **Stop** hooks run after each Claude response.
- **SessionStart/SessionEnd** hooks run at session lifecycle boundaries.
- **PreCompact** hooks run before context compaction, useful for saving state.

## Hooks in This Plugin

### PreToolUse Hooks

| Hook | Matcher | Behavior | Exit Code |
|------|---------|----------|-----------|
| **Dev server blocker** | `Bash` | Blocks `npm run dev` etc. outside tmux — ensures log access | 2 (blocks) |
| **Tmux reminder** | `Bash` | Suggests tmux for long-running commands (npm test, cargo build, docker) | 0 (warns) |
| **Git push reminder** | `Bash` | Reminds to review changes before `git push` | 0 (warns) |
| **Doc file warning** | `Write` | Warns about non-standard `.md`/`.txt` files (allows README, CLAUDE, CONTRIBUTING, CHANGELOG, LICENSE, SKILL, docs/, skills/); cross-platform path handling | 0 (warns) |
| **Strategic compact** | `Edit\|Write` | Suggests manual `/compact` at logical intervals (every ~50 tool calls) | 0 (warns) |
| **InsAIts security monitor (opt-in)** | `Bash\|Write\|Edit\|MultiEdit` | Optional security scan for high-signal tool inputs. Disabled unless `ECC_ENABLE_INSAITS=1`. Blocks on critical findings, warns on non-critical, and writes audit log to `.insaits_audit_session.jsonl`. Requires `pip install insa-its`. [Details](../scripts/hooks/insaits-security-monitor.py) | 2 (blocks critical) / 0 (warns) |

### PostToolUse Hooks

| Hook | Matcher | What It Does |
|------|---------|-------------|
| **PR logger** | `Bash` | Logs PR URL and review command after `gh pr create` |
| **Build analysis** | `Bash` | Background analysis after build commands (async, non-blocking) |
| **Quality gate** | `Edit\|Write\|MultiEdit` | Runs fast quality checks after edits |
| **Prettier format** | `Edit` | Auto-formats JS/TS files with Prettier after edits |
| **TypeScript check** | `Edit` | Runs `tsc --noEmit` after editing `.ts`/`.tsx` files |
| **console.log warning** | `Edit` | Warns about `console.log` statements in edited files |

### Lifecycle Hooks

| Hook | Event | What It Does |
|------|-------|-------------|
| **Session start** | `SessionStart` | Loads previous context and detects package manager |
| **Pre-compact** | `PreCompact` | Saves state before context compaction |
| **Console.log audit** | `Stop` | Checks all modified files for `console.log` after each response |
| **Session summary** | `Stop` | Persists session state when transcript path is available |
| **Pattern extraction** | `Stop` | Evaluates session for extractable patterns (continuous learning) |
| **Cost tracker** | `Stop` | Emits lightweight run-cost telemetry markers |
| **Session end marker** | `SessionEnd` | Lifecycle marker and cleanup log |

## Customizing Hooks

### Disabling a Hook

Remove or comment out the hook entry in `hooks.json`. If installed as a plugin, override in your `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [],
        "description": "Override: allow all .md file creation"
      }
    ]
  }
}
```

### Runtime Hook Controls (Recommended)

Use environment variables to control hook behavior without editing `hooks.json`:

```bash
# minimal | standard | strict (default: standard)
export ECC_HOOK_PROFILE=standard

# Disable specific hook IDs (comma-separated)
export ECC_DISABLED_HOOKS="pre:bash:tmux-reminder,post:edit:typecheck"
```

Profiles:
- `minimal` — keep essential lifecycle and safety hooks only.
- `standard` — default; balanced quality + safety checks.
- `strict` — enables additional reminders and stricter guardrails.

### Writing Your Own Hook

Hooks are shell commands that receive tool input as JSON on stdin and must output JSON on stdout.

**Basic structure:**

```javascript
// my-hook.js
let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  const input = JSON.parse(data);

  // Access tool info
  const toolName = input.tool_name;        // "Edit", "Bash", "Write", etc.
  const toolInput = input.tool_input;      // Tool-specific parameters
  const toolOutput = input.tool_output;    // Only available in PostToolUse

  // Warn (non-blocking): write to stderr
  console.error('[Hook] Warning message shown to Claude');

  // Block (PreToolUse only): exit with code 2
  // process.exit(2);

  // Always output the original data to stdout
  console.log(data);
});
```

**Exit codes:**
- `0` — Success (continue execution)
- `2` — Block the tool call (PreToolUse only)
- Other non-zero — Error (logged but does not block)

### Hook Input Schema

```typescript
interface HookInput {
  tool_name: string;          // "Bash", "Edit", "Write", "Read", etc.
  tool_input: {
    command?: string;         // Bash: the command being run
    file_path?: string;       // Edit/Write/Read: target file
    old_string?: string;      // Edit: text being replaced
    new_string?: string;      // Edit: replacement text
    content?: string;         // Write: file content
  };
  tool_output?: {             // PostToolUse only
    output?: string;          // Command/tool output
  };
}
```

### Async Hooks

For hooks that should not block the main flow (e.g., background analysis):

```json
{
  "type": "command",
  "command": "node my-slow-hook.js",
  "async": true,
  "timeout": 30
}
```

Async hooks run in the background. They cannot block tool execution.

## Common Hook Recipes

### Warn about TODO comments

```json
{
  "matcher": "Edit",
  "hooks": [{
    "type": "command",
    "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const ns=i.tool_input?.new_string||'';if(/TODO|FIXME|HACK/.test(ns)){console.error('[Hook] New TODO/FIXME added - consider creating an issue')}console.log(d)})\""
  }],
  "description": "Warn when adding TODO/FIXME comments"
}
```

### Block large file creation

```json
{
  "matcher": "Write",
  "hooks": [{
    "type": "command",
    "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const c=i.tool_input?.content||'';const lines=c.split('\\n').length;if(lines>800){console.error('[Hook] BLOCKED: File exceeds 800 lines ('+lines+' lines)');console.error('[Hook] Split into smaller, focused modules');process.exit(2)}console.log(d)})\""
  }],
  "description": "Block creation of files larger than 800 lines"
}
```

### Auto-format Python files with ruff

```json
{
  "matcher": "Edit",
  "hooks": [{
    "type": "command",
    "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const p=i.tool_input?.file_path||'';if(/\\.py$/.test(p)){const{execFileSync}=require('child_process');try{execFileSync('ruff',['format',p],{stdio:'pipe'})}catch(e){}}console.log(d)})\""
  }],
  "description": "Auto-format Python files with ruff after edits"
}
```

### Require test files alongside new source files

```json
{
  "matcher": "Write",
  "hooks": [{
    "type": "command",
    "command": "node -e \"const fs=require('fs');let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const p=i.tool_input?.file_path||'';if(/src\\/.*\\.(ts|js)$/.test(p)&&!/\\.test\\.|\\.spec\\./.test(p)){const testPath=p.replace(/\\.(ts|js)$/,'.test.$1');if(!fs.existsSync(testPath)){console.error('[Hook] No test file found for: '+p);console.error('[Hook] Expected: '+testPath);console.error('[Hook] Consider writing tests first (/tdd)')}}console.log(d)})\""
  }],
  "description": "Remind to create tests when adding new source files"
}
```

## Cross-Platform Notes

Hook logic is implemented in Node.js scripts for cross-platform behavior on Windows, macOS, and Linux. A small number of shell wrappers are retained for continuous-learning observer hooks; those wrappers are profile-gated and have Windows-safe fallback behavior.

## Storage Hygiene

`retention-cleanup.js` now does four things on its daily pass:

- Prunes generated artifacts with conservative age-based retention.
- Writes `~/.claude/cache/storage-hygiene-report.json` with the largest `projects/` and `file-history/` entries plus duplicate project-key aliases such as `-mnt-c-*` vs `C--*`.
- Appends a historical snapshot to `~/.claude/cache/storage-hygiene-history.jsonl`.
- Writes `~/.claude/cache/storage-hygiene-trend.json` with 7-day and 30-day deltas for the main storage areas.
- Writes `~/.claude/cache/maintenance-auto-actions-last-run.json` with the latest automatic hygiene actions.
- Pairs well with `project-alias-hygiene.js`, a manual consolidation utility for merging duplicate project alias directories into a single canonical key.
- Pairs well with `file-history-hygiene.js`, a manual archival utility for moving oversized old `file-history/` sessions into `~/.claude/archives/`.
- Pairs well with `project-session-hygiene.js`, a manual archival utility for moving oversized stale per-project session artifacts out of `~/.claude/projects/<project-key>/` while leaving `memory/` untouched.

Automatic maintenance behavior:

- `file-history-hygiene.js` is inspected daily and auto-applied when stale oversized candidates exist.
- `project-session-hygiene.js` scans the heaviest projects daily and auto-applies archival when candidates exist.
- `project-alias-hygiene.js` is inspected daily, but auto-apply stays off by default because alias merges are more structural than archival.

Default retention windows:

- `file-history`: 21 days
- `projects/*.jsonl`: 14 days
- `tasks`: 21 days
- `debug`, `telemetry`, `metrics`: 30 days
- `storage-hygiene-history`: 120 days

Optional overrides can be supplied via environment variables such as:

- `CLAUDE_RETENTION_FILE_HISTORY_DAYS`
- `CLAUDE_RETENTION_PROJECT_LOG_DAYS`
- `CLAUDE_RETENTION_TASKS_DAYS`
- `CLAUDE_RETENTION_STORAGE_TREND_DAYS`
- `CLAUDE_AUTO_ARCHIVE_FILE_HISTORY`
- `CLAUDE_AUTO_ARCHIVE_PROJECT_SESSIONS`
- `CLAUDE_AUTO_ARCHIVE_PROJECT_SESSION_SCAN_LIMIT`
- `CLAUDE_AUTO_INSPECT_PROJECT_ALIASES`
- `CLAUDE_AUTO_APPLY_PROJECT_ALIAS_HYGIENE`

Manual alias hygiene workflow:

```bash
# Review duplicate project aliases
node ~/.claude/hooks/project-alias-hygiene.js --json

# Apply safe merges using the largest alias as canonical
node ~/.claude/hooks/project-alias-hygiene.js --apply --json
```

`project-alias-hygiene.js` moves non-conflicting files into the canonical project directory and archives unresolved leftovers under `~/.claude/archives/project-alias-hygiene/`.

Manual file-history hygiene workflow:

```bash
# Review large stale file-history sessions
node ~/.claude/hooks/file-history-hygiene.js --json

# Archive matching sessions
node ~/.claude/hooks/file-history-hygiene.js --apply --json
```

By default it targets sessions older than 5 days and larger than 40 MB, with optional overrides:

- `CLAUDE_FILE_HISTORY_HYGIENE_DAYS`
- `CLAUDE_FILE_HISTORY_HYGIENE_MIN_MB`
- `CLAUDE_FILE_HISTORY_HYGIENE_KEEP_NEWEST`

Manual project session hygiene workflow:

```bash
# Review one heavy project
node ~/.claude/hooks/project-session-hygiene.js --project-key "-mnt-c-Users-Hakan" --json

# Archive stale oversized sessions for that project
node ~/.claude/hooks/project-session-hygiene.js --project-key "-mnt-c-Users-Hakan" --apply --json
```

Defaults:

- archive sessions older than 5 days
- archive sessions larger than 15 MB
- keep the newest 3 session groups

Optional overrides:

- `CLAUDE_PROJECT_SESSION_HYGIENE_PROJECT`
- `CLAUDE_PROJECT_SESSION_HYGIENE_DAYS`
- `CLAUDE_PROJECT_SESSION_HYGIENE_MIN_MB`
- `CLAUDE_PROJECT_SESSION_HYGIENE_KEEP_NEWEST`

## Related

- [rules/common/hooks.md](../rules/common/hooks.md) — Hook architecture guidelines
- [skills/strategic-compact/](../skills/strategic-compact/) — Strategic compaction skill
- [scripts/hooks/](../scripts/hooks/) — Hook script implementations
