# Global Claude Instructions

## 1. Core Rules
- Respond in the user's language. Short, direct, technical.
- Only make changes explicitly requested or clearly necessary. No unrequested features, refactoring, comments, or error handling.
  - Exception: when creating teams/plans/tasks, proactively add edge cases, failure scenarios, and verification areas.
- Always read a file before modifying it.
- Git commands only when user explicitly asks. No auto-commit, auto-push. Applies within teams too.
- Finekra projects: NEVER commit/push to master/main. Always create a `Task-{DevOpsId}` branch first. Personal projects exempt.
- In WSL, use `git.exe` for remote operations (Azure DevOps credential helper).
- Format only on request. Use the project's configured formatter.
- User runs with `--dangerously-skip-permissions`. No plan mode — use superpowers skills. In teams, use tech-lead review instead.
- Unfamiliar tool/service/term → research via web search. Don't ask the user.
- Minimize token consumption: no unnecessary context, redundant spawns, or speculative plugin loads.
- Verify every change before reporting completion. Re-read files, confirm paths, check consistency.
- Actionable problems → fix directly. Only explain if user-side steps are required.
- WSL browser: NEVER open browsers inside WSL/WSLg.
  - URLs for user: `wslview <url>` (`BROWSER=wslview` in `~/.bashrc`).
  - Browser automation: HakanMCP wrappers first (`mcp_browserConnect`, `mcp_browserNavigateExtract`, `mcp_browserProbeLogin`, `mcp_browserCaptureProof`). State in `~/.claude/browser-last.json`. Setup: `~/.claude/docs/browser-cdp-setup.md`.
  - Raw Playwright: only via HakanMCP `mcp_callTool` when wrappers are insufficient.
  - OAuth/login flows: open via `wslview`, let user complete in Windows browser.
- Fix-it-permanently first: fix root cause before continuing (update config, install deps, fix scripts). Workaround only as temporary measure.
- Skill creation: use `superpowers:brainstorming` first, then `/skill-create`. Commands in `commands/` can be written directly.
- Continuous improvement: when user feedback reveals a gap in a skill/command/hook, update the file, verify, then continue.
- WSL+NTFS `.sh` files: force LF endings. Add `*.sh text eol=lf` to `.gitattributes`.
- WSL large files: NTFS driver cannot read back files >~1MB with shell escape sequences. Write to `/home/` and symlink.
- Dotfiles sync: after any `~/.claude/` change, sync the dotfiles repo before task is complete. Use `/dotfiles-sync`.
- Writing style for all directive files (CLAUDE.md, rules, docs, commands, skills, agent definitions):
  - No emoji, no decorative separators (===, ***), no "NOTE/IMPORTANT/CRITICAL" prefixes
  - Tables/lists over verbose prose. Plain markdown only (##/### headers, bullets, tables, code blocks)
  - Every line must be actionable. Applies to new files and edits to existing files.

## 2. Model Selection

| Model | Use |
|-------|-----|
| `sonnet` (default) | Main development, orchestration, complex coding |
| `haiku` | Research/exploration subagents, read-only roles, worker agents in multi-agent systems |
| `opus` | Team leader, complex architectural decisions (2+ services, irreversible) |

Current versions: Haiku 4.5, Sonnet 4.6, Opus 4.6. Always pass `model` explicitly when spawning agents.

## 3. Task Routing

Shortcuts: `-bs` → `superpowers:brainstorming`. `-ep` → `superpowers:executing-plans`. Both → brainstorming first.

Team creation: user asks for a team → use `/team`. Individual team commands are deprecated.

### Structural signals (check first)

| Condition | Action |
|-----------|--------|
| Team already active | Route through team leader — don't bypass |
| `.planning/ROADMAP.md` exists | GSD workflow. `gsd:quick` for small tasks |
| Session starting | Consider ECC `/resume-session` |
| Context growing large | Consider ECC `/save-session` |

### Task complexity signals

| Intent | Action |
|--------|--------|
| Single step, obvious outcome | Handle directly |
| Quick side question | ECC `/aside` |
| Multiple independent parallel tasks | `superpowers:dispatching-parallel-agents` |
| Single delegatable task | Subagent |
| Unclear direction | `superpowers:brainstorming` |
| Clear requirements, multiple steps | `superpowers:writing-plans` or ECC `/blueprint` (multi-session) |
| Measurable + automatable verification | Ralph Loop (`ralph-loop:ralph-loop`) |

### Development lifecycle signals

| Intent | Action |
|--------|--------|
| New feature or bug fix | `superpowers:test-driven-development` or ECC `/tdd` |
| Something broken/unexpected | `superpowers:systematic-debugging` |
| Build fails | ECC `/build-fix` |
| Code just written | `superpowers:requesting-code-review` or `/code-review` |
| About to report done | `superpowers:verification-before-completion` (always) |
| Dead code / cleanup | ECC `/refactor-clean` |
| E2E / integration tests | ECC `/e2e` |
| Docs / codemaps update | ECC `/update-docs` or `/update-codemaps` |
| Prompt improvement | ECC `/prompt-optimize` |
| Deploy | `/deploy` or `/finekra-deploy-test` |
| New implementation from scratch | Research & Reuse step mandatory — see `rules/common/development-workflow.md` |

### Domain-specific signals

| Intent | Action | Reference |
|--------|--------|-----------|
| UI/UX, frontend styling, component creation | `ui-ux-pro-max` skill. `/ui ...` via `magic-21st` MCP | `~/.claude/docs/ui-ux.md` |
| Offensive security, red team | `/playbook <url>`. `kali-mcp` + HakanMCP browser. Authorized targets only. | `~/.claude/docs/pentest-playbook.md` |
| Unfamiliar library/framework/API | `context7` MCP — query before coding | |

### Ralph Loop
All must be true: measurable criterion in one sentence, automated verification, no design decisions, max 3-10 iterations.
Args: `~/.claude/docs/review-ralph.md`.

## 4. Agent Teams
- Never auto-create teams. Keep alive until user explicitly requests shutdown.
- Never shut down teammates on task completion — idle is normal. Shutdown only on explicit user request.
- Role definitions: `~/.claude/teams/agents/`
- Full workflow: `~/.claude/docs/agent-teams.md`

### Team Leader
- Delegates work, supervises, reviews, makes routine decisions autonomously.
- Small fixes directly (config, 1-2 lines). Delegates substantial work.
- Creates tasks via TaskCreate with dependencies and acceptance criteria.
- Escalates to user for: git commit/push, deploy, external services, irreversible decisions.

### User Role
- Directs goals, makes final decisions. Delegates to team leader when team is active.
- No approval needed for: internal code, dependencies, refactoring, test strategy, file structure.

### Task Flow
- User → Team Leader → creates tasks → teammates self-claim
- PM (if present) → scopes → Tech Lead → refines → Dev implements → Tech Lead reviews
- Direct peer communication via SendMessage. One owner per task.

## 5. Context and Memory
Memory path: `~/.claude/projects/<project-key>/memory/`

### Session Continuity
- Session start or `/compact`: read `.memory/session-continuity.md`, then `MEMORY.md`. GSD projects: also `STATE.md`.
- Keep compact: latest state only, under 12 lines.
- Write only before `/compact` when context exceeds ~90%.
- Teams: only leader reads/writes session-continuity.

### Project Knowledge Files
- `.memory/solutions.md` — non-obvious recurring fixes
- `.memory/patterns.md` — established project patterns
- `.memory/decisions.md` — architectural/workflow decisions
- Update `MEMORY.md` index on changes.

### Memory File Frontmatter
All memory files (except MEMORY.md, decisions.md, patterns.md, solutions.md) must include:
```yaml
---
name: <snake_case_identifier>
description: <one-line summary>
type: feedback | reference | user | project
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

## 6. Plugins and Skills

| Plugin | When to Use |
|--------|-------------|
| superpowers | Planning, TDD, verification, code review, debugging, brainstorming. Core workflow engine. |
| ECC | Session persistence, continuous learning, security scan, prompt optimization, quality gates. |
| context7 | Library/framework docs needed. Query before writing code. |
| code-review | Post-implementation code review. |
| security-guidance | Security best practices, vulnerability patterns. |
| typescript-lsp | TypeScript type checking. |
| claude-md-management | Audit or improve CLAUDE.md files. |

### ECC and Standalone Commands
- `/save-session` `/resume-session` — session persistence (standalone)
- `/build-fix` — build error resolution (standalone)
- `/aside` — side question without context pollution
- `/security-scan` — AgentShield config audit (102 rules)
- `/instinct-status` `/evolve` `/learn` — continuous learning
- `/blueprint` — multi-session adversarial planning
- `/harness-audit` `/quality-gate` — config scoring, quality pipeline
- `/prompt-optimize` — prompt analysis
- Language-specific agents (go-reviewer, python-reviewer, rust-reviewer, etc.)

### Superpowers vs ECC

| Capability | Superpowers | ECC | Preference |
|-----------|-------------|-----|------------|
| Planning | `writing-plans` | `/blueprint` | Superpowers single-session, ECC multi-session |
| TDD | `test-driven-development` | `/tdd` | Either |
| Code review | `requesting-code-review` | `/code-review` | Either |
| Verification | `verification-before-completion` | `/verify` | Superpowers — always mandatory |

### 21st.dev Magic MCP
UI component generation. React+Tailwind. Signal: `/ui ...` prefix.

## 7. MCP and Tool Integration

New service: check all in parallel — HakanMCP catalog (free), Rube/Composio (600+ apps, has cost), web search for dedicated servers. Priority: free dedicated > HakanMCP auth-free > Rube.

Browser: HakanMCP wrappers first → HakanMCP `mcp_callTool` → alternatives only if required.

| Server | When the task involves... |
|--------|--------------------------|
| context7 | Third-party library/framework API docs |
| HakanMCP | DB ops, API testing, monitoring, backup, on-demand MCP, browser automation. Guide: `~/.claude/docs/mcp-usage-guide.md` |
| NotebookLM | Deep research synthesis, audio/video/slide generation |
| Gmail | Reading, searching, drafting email |
| Google Calendar | Scheduling, availability, calendar events |
| gtasks-mcp | Task lists |
| infoset | CRM data — tickets, contacts, companies |
| container-use | Docker containers |
| kali-mcp | Offensive security, recon, vuln scanning (50+ tools). Ref: `docs/pentest-playbook.md` |
| n8n | Workflow automation, event-driven pipelines, scheduled tasks. Docker on WSL :5678 |
| linkedin | People, companies, jobs on LinkedIn |
| magic-21st | UI components (`/ui` prefix) — React+Tailwind |
| Rube (Composio) | 600+ apps. Use `RUBE_SEARCH_TOOLS` first |

Rube connected: Notion, GitHub, Trello, Slack (Finekraa), Gemini (image gen). Gmail/LinkedIn prefer native MCP.

On-demand MCP: 9 auth-free servers via `mcp_connectFromCatalog`. Full list: `~/.claude/docs/mcp-on-demand.md`

MCP errors: investigate and retry within same MCP first. Fall back only after resolution fails.

Config: `/home/hakan/.claude.json` (WSL) and `/mnt/c/Users/Hakan/.claude.json` (Windows). Keep in sync. Changes: `/add-mcp` or `~/.claude/docs/mcp-usage-guide.md`.

## 8. References

`~/.claude/` → WSL: `/home/hakan/.claude/` | Windows: `C:\Users\Hakan\.claude\`

When you need to find a doc, use this table. Each row points directly to the file you need — no intermediate indexes.

| I need to... | Read this |
|--------------|-----------|
| Run a pentest | `docs/pentest-playbook.md` (hub — loads all sub-docs) |
| Use `/playbook` command | `commands/playbook.md` (routes to recon/assessment/exploit/reporting) |
| Check OPSEC rules | `docs/pentest-operations.md` (preflight, profiles, tool usage by phase) |
| Find a kali-mcp tool | `docs/kali-mcp/tool-inventory.md` |
| Create an agent team | `commands/team.md` → `docs/agent-teams.md` + `teams/agents/` |
| Set up MCP server | `docs/mcp-usage-guide.md` |
| Connect on-demand MCP | `docs/mcp-on-demand.md` (9 auth-free servers) |
| Do GSD project | `get-shit-done/` and `commands/gsd/` |
| Use Ralph Loop | `docs/review-ralph.md` |
| Configure hooks | `docs/hook-standards.md` |
| Browser automation | `docs/browser-cdp-setup.md` |
| UI/UX component | `docs/ui-ux.md` |
| Ignore patterns | `docs/claudeignore-templates.md` |
| Resume prior session | `commands/resume-session.md` |
| Resume prior pentest | `docs/pentest-targets/<domain>.md` (per-target state) |
| Find engagement data | `/mnt/c/dev/pentest-framework/data/<domain>/` |
| Use OPSEC scripts | `docs/pentest-operations.md` (per-phase tool usage table) |
| Deploy to test server | `commands/finekra-deploy-test.md` |
| Work sync (Infoset/DevOps) | `commands/work-sync.md` |
| Investigate a Finekra task | `commands/finekra-task.md` |
| Create a new skill | `commands/skill-create.md` |
| Sync dotfiles | `commands/dotfiles-sync.md` → `/mnt/c/dev/claude-code-dotfiles` |
| Manage n8n workflows | `commands/n8n.md` |
| Check Claude Code updates | `commands/claude-news.md` |
| Full structure map | `docs/INDEX.md` (cross-reference of all 160+ files) |
