---
description: "Claude Code update tracker — version comparison, changelog, integration suggestions"
---

# Claude News — Update Tracker

Check for Claude Code updates, show changelog, and suggest integrating new features into the current setup.

## Execution Steps

### 1. Get current version

```bash
claude --version 2>/dev/null | head -1 || npm list -g @anthropic-ai/claude-code 2>/dev/null | grep claude-code
```

### 2. Check cache

Cache file: `~/.claude/cache/claude-news.json`

If cache exists and `fetched_at` is less than 1 hour old AND `--refresh` was NOT passed, use cached data. Otherwise fetch fresh.

### 3. Fetch latest version and changelog

**Primary: GitHub Releases API**

```bash
curl -s -H "Accept: application/vnd.github+json" \
  ${GITHUB_TOKEN:+-H "Authorization: Bearer $GITHUB_TOKEN"} \
  "https://api.github.com/repos/anthropics/claude-code/releases?per_page=10"
```

If HTTP 403 (rate limited), **fallback to npm registry**:

```bash
curl -s "https://registry.npmjs.org/@anthropic-ai/claude-code" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['dist-tags']['latest'])"
```

### 4. Fetch feature flags and system prompt changes (optional enrichment)

```bash
curl -s "https://raw.githubusercontent.com/marckrenn/claude-code-changelog/main/cc-flags.md"
curl -s "https://raw.githubusercontent.com/marckrenn/claude-code-changelog/main/cc-prompt.md"
```

### 5. Write cache

Write results to `~/.claude/cache/claude-news.json`:

```json
{
  "fetched_at": "<ISO timestamp>",
  "github_releases": ["<raw release objects>"],
  "npm_latest": "<version>",
  "local_version": "<version>"
}
```

### 6. Compare and report

Parse releases between current and latest version. Categorize each change:
- **Yeni ozellikler** (feat commits)
- **Bug fixes** (fix commits)
- **Breaking changes** (BREAKING CHANGE or ! in commit type)

### 7. Generate integration suggestions

For each new feature, check if it can benefit the current setup:

| Feature type | Check against | Suggestion |
|-------------|---------------|------------|
| New MCP transport | `.claude.json` mcpServers | Suggest updating config |
| New hook type | `~/.claude/settings.json` hooks | Suggest creating hook script |
| New CLI flag | `~/.claude/commands/` | Suggest updating relevant commands |
| New model | `~/.claude/CLAUDE.md` model table | Suggest updating model selection |
| New skill/plugin API | `~/.claude/plugins/` | Suggest enabling |

Present suggestions as numbered list. On user approval (y), execute the change directly. On decline (n), skip.

### 8. Show upgrade command

```
Upgrade: npm update -g @anthropic-ai/claude-code
```

## Output Format

When updates available:

```
Claude Code v{current} -> v{latest} ({n} surum geride, {date} yayinlandi)

Yeni ozellikler:
  - {description}

Bug fixes:
  - {description}

Breaking changes:
  - {description} (migration note)

Oneriler:
  [1] {Feature} — {benefit to your setup} -> uygula? (y/n)
  [2] {Feature} — {benefit to your setup} -> uygula? (y/n)

Upgrade: npm update -g @anthropic-ai/claude-code
```

When up to date:

```
Claude Code v{current} — Guncel (son kontrol: {date})
```

## Arguments
- (no args): Check for updates (use cache if fresh)
- `--refresh`: Force fresh fetch, ignore cache

## Output Language
Technical terms (Bug fixes, Breaking changes) stay English. Descriptions in Turkish.
