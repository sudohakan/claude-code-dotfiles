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

## 2. Model Selection

| Model | Use |
|-------|-----|
| `sonnet` (default) | Main development, orchestration, complex coding |
| `haiku` | Research/exploration subagents, read-only roles |
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

### ECC-Only Capabilities
- `/save-session` `/resume-session` — session persistence
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

ECC hook profile: `strict` (all hooks active including continuous learning).

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
| kali-mcp | Offensive security, recon, vuln scanning (36 tools). Ref: `pentest-playbook.md` |
| linkedin | People, companies, jobs on LinkedIn |
| magic-21st | UI components (`/ui` prefix) — React+Tailwind |
| Rube (Composio) | 600+ apps. Use `RUBE_SEARCH_TOOLS` first |

Rube connected: Notion, GitHub, Trello, Slack (Finekraa), Gemini (image gen). Gmail/LinkedIn prefer native MCP.

On-demand MCP: 9 auth-free servers via `mcp_connectFromCatalog`. Full list: `~/.claude/docs/mcp-on-demand.md`

MCP errors: investigate and retry within same MCP first. Fall back only after resolution fails.

Config: `/home/hakan/.claude.json` (WSL) and `/mnt/c/Users/Hakan/.claude.json` (Windows). Keep in sync. Changes: `/add-mcp` or `~/.claude/docs/mcp-usage-guide.md`.

## 8. References
`~/.claude/` → WSL: `/home/hakan/.claude/` | Windows: `C:\Users\Hakan\.claude\`

| Resource | Path |
|----------|------|
| GSD workflow | `~/.claude/get-shit-done/` and `~/.claude/commands/gsd/` |
| Superpowers specs (archive) | `~/.claude/docs/superpowers/specs/` |
| Dippy hooks | `~/.claude/docs/dippy.md` |
| UI/UX guidance | `~/.claude/docs/ui-ux.md` |
| Decision matrix | `~/.claude/docs/decision-matrix.md` |
| Tools reference | `~/.claude/docs/tools-reference.md` |
| MCP guide | `~/.claude/docs/mcp-usage-guide.md` |
| MCP on-demand | `~/.claude/docs/mcp-on-demand.md` |
| Agent teams | `~/.claude/docs/agent-teams.md` |
| Ralph Loop | `~/.claude/docs/review-ralph.md` |
| .claudeignore templates | `~/.claude/docs/claudeignore-templates.md` |
| Pentest playbook | `~/.claude/docs/pentest-playbook.md` + `/playbook` + `/mnt/c/dev/pentest-framework/` |
| Dotfiles repo | `/mnt/c/dev/claude-code-dotfiles` |
| Rules (common) | `~/.claude/rules/common/` |
| Hook standards | `~/.claude/docs/hook-standards.md` |
| Agent favorites | `~/.claude/docs/agent-favorites.md` |
| Plan naming | `~/.claude/docs/plan-naming.md` |
| Plugin profiles | `~/.claude/docs/plugin-profiles.md` |
