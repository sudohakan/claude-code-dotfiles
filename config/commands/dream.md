---
description: "Dream — memory consolidation, conflict resolution, staleness check, and synthesis"
---

# Dream — Memory Consolidation

Reflective pass over all memory files. Consolidates session learnings, resolves conflicts, prunes stale entries, and synthesizes patterns. Replaces `/memory-compact`.

## Arguments

- (no args): Full dream cycle on current project memory
- `--dry-run`: Analyze and report only, no writes
- `--global`: Also process global memory dirs (all projects under `~/.claude/projects/`)
- `--quick`: Skip verification steps (staleness checks, path/function existence)

## Process

### Phase 1: Inventory and Load

1. Locate project memory dir from MEMORY.md location
2. Read every `.md` file, parse frontmatter (name, type, created, updated)
3. Read CLAUDE.md (project + global), all rules in `~/.claude/rules/`, and settings.json
4. Build a map: `{ file, type, content, lineCount, lastUpdated, age }`
5. Flag files missing frontmatter (except MEMORY.md, decisions.md, patterns.md, solutions.md, session-continuity.md, dream-log.md)

### Phase 2: Staleness Detection

Unless `--quick`, verify claims against current state:

| Claim type | Verification method |
|-----------|---------------------|
| File path | Glob — does it exist? |
| Function/class name | Grep codebase |
| MCP server | Check `.claude.json` mcpServers |
| Command/skill | Check `~/.claude/commands/` |
| Hook reference | Check settings.json hooks |
| Version/date | Compare current state |
| Branch/repo | `git branch -a` or path check |

Mark each claim: `current`, `stale`, `unverifiable`

Priority order for verification:
1. `reference_*` files — always verify (these contain concrete paths/configs)
2. `project_*` files — always verify (these decay fastest)
3. `feedback_*` files — verify only if they mention specific paths/tools/configs
4. `user_*` files — skip verification (stable preferences)

### Phase 3: Conflict Detection

Compare every memory file against:

| Source | Conflict types |
|--------|---------------|
| Other memory files | Contradictory rules, duplicate information |
| CLAUDE.md (project + global) | Memory restating or contradicting CLAUDE.md |
| Rules (`~/.claude/rules/**/*.md`) | Memory duplicating rule content |
| settings.json | Memory about settings that don't match actual config |

Record: `{ fileA, fileB, conflictType, description }`

Types: `contradiction`, `redundant`, `outdated`, `superseded`

### Phase 4: Consolidation

Execute in order. If `--dry-run`, skip all writes and only report.

#### 4a. Delete

- Memory fully redundant with CLAUDE.md or rules
- Stale entries where referenced resource no longer exists AND info has no historical value
- Empty files (< 3 lines content excluding frontmatter)

#### 4b. Merge

Merge candidates:
- Same `type` AND overlapping topic
- Files under 5 lines that share a topic with another file
- Multiple feedback files about the same tool/workflow

Merge rules:
- Keep most specific/actionable version of duplicated content
- Preserve `created` from oldest source
- Set `updated` to today
- New filename: most descriptive of the merged set

#### 4c. Update

- Fix stale paths, tool names, version references
- Add missing frontmatter (with `created` from file mtime, `updated` today)
- Tighten verbose content: tables over prose, bullets over paragraphs
- Cap at 30 lines content per file (excluding frontmatter)
- Remove explanatory prose — keep rule + one-line reason only

#### 4d. Synthesize

Scan session-continuity.md, recent memory additions, and current session for uncaptured patterns:

| Pattern source | Target |
|---------------|--------|
| Recurring workflow | `patterns.md` |
| Problem-solution pair seen 2+ times | `solutions.md` |
| Architectural choice across sessions | `decisions.md` |
| New user preference | `feedback_*.md` |

Only create new memories if:
- Pattern appeared in 2+ sessions, OR
- User explicitly stated the preference, OR
- Info is non-obvious and would be lost without capture

### Phase 5: Rebuild Index

Rewrite MEMORY.md:
- One line per file, under 100 chars
- Group by type: User, Feedback, Project, Reference, Knowledge Files
- Remove deleted entries, add new/merged entries
- Total index under 50 lines

### Phase 6: Report

```
Dream — {date}

Staleness:
  {n} current | {n} stale (fixed) | {n} stale (removed) | {n} unverifiable

Conflicts:
  {n} contradictions resolved | {n} redundancies removed | {n} superseded updated

Operations:
| Action    | File                      | Detail                          |
|-----------|---------------------------|---------------------------------|
| delete    | old_file.md               | Redundant with CLAUDE.md §3     |
| merge     | feedback_a + feedback_b   | → feedback_combined.md          |
| update    | reference_mcp.md          | Fixed 2 stale paths             |
| synthesize| patterns.md               | Added 1 new pattern             |
| keep      | user_profile.md           | Current, no changes needed      |

Memory: {before} lines → {after} lines ({pct}% reduction)
Files: {before} → {after}
```

### Phase 7: History

Append one line to `dream-log.md` in the memory dir:

```
{ISO date} | {files_before}→{files_after} | {lines_before}→{lines_after} | {deletes}d {merges}m {updates}u {synth}s
```

Create file if it doesn't exist. No frontmatter.

## Constraints

- Never delete `feedback_*` without strong evidence it's outdated (user preferences are durable)
- Never delete `decisions.md`, `patterns.md`, `solutions.md` — only append/update
- Never touch `session-continuity.md` (managed by compact cycle)
- Never touch `dream-log.md` content (append-only)
- When in doubt, keep the memory and mark `unverifiable` in report
- All writes preserve existing frontmatter; only add/update `updated` field
- If `--global`, process each project dir independently with its own report
