# Global Claude Instructions

## 1. Core Rules
- Respond in the user's language. Short, direct, technical.
- Only make changes explicitly requested or clearly necessary. No unrequested features, refactoring, comments, or error handling.
  - **Exception:** When creating teams/plans/tasks, proactively add edge cases, failure scenarios, and verification areas.
- Always read a file before modifying it.
- Git commands only when user explicitly asks. No auto-commit, auto-push. Applies within teams too.
- In WSL, use `git.exe` for remote operations (Azure DevOps credential helper).
- Format only on request. Use the project's configured formatter.
- User runs with `--dangerously-skip-permissions`. No plan mode — use superpowers skills. In teams, use tech-lead review instead.
- Unfamiliar tool/service/term → research via web search. Don't ask the user.
- Minimize token consumption: no unnecessary context, redundant spawns, or speculative plugin loads.
- Verify every change before reporting completion. Re-read files, confirm paths, check consistency.
- Actionable problems → fix directly. Only explain if user-side steps are required.
- Browser/GUI setups requiring interaction (login, OAuth, setup) → run directly via WSLg. Install any missing dependencies, fix errors, and retry. Do not leave manual steps for the user.

## 2. Model Selection
- Default: `sonnet`. Always pass `model` explicitly when spawning agents/teammates.
- Research/exploration subagents: `haiku`.
- Complex architectural decisions (2+ services, irreversible): `opus`.
- Team leader (orchestrator): always `opus`.
- Superpowers/Ralph loop: inherit default (`sonnet`).

## 3. Task Routing

### Shortcuts
- `-bs` → `superpowers:brainstorming`. `-ep` → `superpowers:executing-plans`. Both → brainstorming first.

### Team Creation
User asks to create a team → use `/team`. Individual team commands (`/buildteam`, etc.) are deprecated.

### Routing Signals
Use judgment based on these signals. Multiple may apply — pick the best fit or combine.

| Signal | Consider |
|--------|----------|
| Team already active | Route through team leader — don't bypass |
| Single step, obvious | Handle directly, no workflow needed |
| "Bug", error, unexpected behavior | `superpowers:systematic-debugging` |
| Independent, self-contained task | Subagent |
| Vague request, unclear direction | `superpowers:brainstorming` |
| Multi-step, requirements clear | `superpowers:writing-plans` or ECC `/blueprint` for complex multi-session work |
| Several independent tasks | `superpowers:dispatching-parallel-agents` |
| `.planning/ROADMAP.md` exists | GSD workflow. `gsd:quick` for small tasks |
| Measurable, automatable success criterion | Ralph Loop (`ralph-loop:ralph-loop`) |
| Feature implementation starting | Consider `superpowers:test-driven-development` or ECC `/tdd` |
| Work looks done | `superpowers:verification-before-completion` (always run before claiming done) |
| Code just written | Consider code review — `superpowers:requesting-code-review` or `/code-review` |
| Build fails | ECC `/build-fix` — minimal diffs, get build green |
| UI/UX work, design, frontend styling | `ui-ux-pro-max` skill. For component generation use `magic-21st` MCP (`/ui ...`) |
| Dead code, cleanup, refactoring | ECC `/refactor-clean` |
| E2E test needed | ECC `/e2e` — Playwright test generation |
| Docs or codemaps outdated | ECC `/update-docs` or `/update-codemaps` |
| Prompt needs improvement | ECC `/prompt-optimize` |
| Session ending or context growing large | Consider ECC `/save-session` |
| Session starting | Consider ECC `/resume-session` if prior session exists |
| Quick side question during deep work | ECC `/aside` — don't pollute main context |
| Unfamiliar library or API | `context7` MCP — query docs before coding |

### Ralph Loop
All must be true: measurable criterion in one sentence, automated verification (tests/lint/build), no design decisions needed, max 3-10 iterations.
Args format: `~/.claude/docs/review-ralph.md`.

## 4. Agent Teams
Use for coordinated, long-running work with parallel workstreams.
- Never auto-create teams. Keep alive until user requests shutdown.
- Role definitions: `~/.claude/teams/agents/`
- Full workflow: `~/.claude/docs/agent-teams.md`

### Team Leader
- Delegates work, supervises, reviews, makes routine decisions autonomously.
- May do small fixes directly (config, 1-2 lines). Delegates substantial work.
- Creates tasks via TaskCreate with dependencies and acceptance criteria.
- Escalates to user only for: git commit/push, deploy, external services, irreversible decisions.

### User Role
- Directs goals, makes final decisions. Delegates to team leader when team is active.
- No approval needed for: internal code, dependencies, refactoring, test strategy, file structure.

### Task Flow
- User → Team Leader → creates tasks → teammates self-claim
- PM (if present) → scopes → Tech Lead → refines → Dev implements → Tech Lead reviews
- Direct peer communication via SendMessage. No duplicate work — one owner per task.

## 5. Context And Memory
Memory path: `~/.claude/projects/<project-key>/memory/`

### Session Continuity
- Session start or `/compact`: read `.memory/session-continuity.md` (primary), then `MEMORY.md` / `.planning/STATE.md` if needed.
- Keep compact: latest state only, under 12 lines.
- Write only before `/compact` when context exceeds ~90%.
- Teams: only leader reads/writes session-continuity.

### Project Knowledge Files
- `.memory/solutions.md` — non-obvious recurring fixes
- `.memory/patterns.md` — established project patterns
- `.memory/decisions.md` — architectural/workflow decisions
- Update `MEMORY.md` index on changes.

## 6. Plugins & Skills

Available plugins and their capabilities. Use judgment — these are tools, not obligations.

| Plugin | Signals to Consider Using |
|--------|--------------------------|
| **superpowers** | Planning, TDD, verification, code review, debugging, brainstorming, git worktrees. Core workflow engine — consider first for structured development tasks. |
| **ECC** | Session persistence (`/save-session`, `/resume-session`), continuous learning (`/instinct-status`, `/evolve`), harness audit, security scan (`/security-scan`), prompt optimization, quality gates. Consider when session management, learning, or config security matters. |
| **context7** | Library/framework docs needed, API unclear, unfamiliar dependency. Query before writing code — not after. |
| **code-review** | Post-implementation code review. |
| **security-guidance** | Security best practices, vulnerability patterns. |
| **playwright** | UI testing, browser interaction, web scraping, visual verification needed. |
| **typescript-lsp** | TypeScript type checking, language server features needed. |
| **claude-md-management** | User asks to audit or improve CLAUDE.md files. |

### ECC-Only Capabilities
These have no superpowers equivalent:
- `/save-session` `/resume-session` — session persistence across restarts
- `/aside` — side question without context pollution
- `/security-scan` — AgentShield config audit (102 rules)
- `/instinct-status` `/evolve` `/learn` — continuous learning system
- `/blueprint` — multi-session adversarial planning
- `/harness-audit` `/quality-gate` — config scoring, quality pipeline
- `/prompt-optimize` — prompt analysis + ECC component matching
- Language-specific agents (go-reviewer, python-reviewer, rust-reviewer, etc.)

### When Both Offer Similar Capability
| Capability | Superpowers | ECC | Preference |
|-----------|-------------|-----|------------|
| Planning | `writing-plans` | `/blueprint` | Superpowers for single-session, ECC for multi-session |
| TDD | `test-driven-development` | `/tdd` | Either — ECC uses language-specific agents |
| Code review | `requesting-code-review` | `/code-review` | Either — choose based on context |
| Verification | `verification-before-completion` | `/verify` | Superpowers — always mandatory |

### ECC Hook Profile
`ECC_HOOK_PROFILE` in settings.json — current: `strict` (all hooks active including continuous learning).

### 21st.dev Magic MCP
UI component generation. Writes React+Tailwind components directly into the project.
Signal: when the user requests a UI/component/button/form/navbar/modal, use the `/ui` prefix.

## 7. MCP & Tool Integration
Invoke MCP tools only when the task benefits from them. Use judgment — not every task needs MCP.

### New Service Connection — Evaluate All Options
When user wants to connect a new external service, check ALL sources in parallel and pick the best fit:
- **HakanMCP catalog** — auth-free on-demand MCP via `mcp_connectFromCatalog`
- **Rube (Composio)** — 600+ app via `RUBE_SEARCH_TOOLS` (has cost + shared rate limits)
- **Web search** — dedicated MCP servers on npm/GitHub (e.g., "namecheap MCP server")

**Selection priority:** Free dedicated MCP > HakanMCP auth-free > Rube (Rube has cost and shared API limits, prefer free alternatives when available). If Rube is the only option or significantly better featured, use it. Always present options to user with trade-offs.

### MCP Servers
| Server | Signals to Consider Using |
|--------|--------------------------|
| context7 | Unfamiliar library, need API reference, version-specific examples |
| HakanMCP | DB queries, API testing, system monitoring, backup, on-demand MCP catalog. Guide: `~/.claude/docs/mcp-usage-guide.md` |
| NotebookLM | Deep research, multi-source synthesis, audio/video/slide generation |
| Playwright | Browser automation, UI testing, web scraping |
| Gmail | User explicitly asks about email |
| Google Calendar | User explicitly asks about scheduling |
| gtasks-mcp | User explicitly asks about tasks |
| infoset | CRM data needed (tickets, contacts, companies) |
| coupler-io | Dataflow or data integration queries |
| container-use | Docker container operations |
| magic-21st (21st.dev) | UI component generation via `/ui` — React+Tailwind, written directly into the project |
| Rube (Composio) | 600+ app. Prefer Rube over separate MCP for connected apps. Use `RUBE_SEARCH_TOOLS` first to discover tools. |

**Rube Connected Apps:**
| App | Signals to Use |
|-----|---------------|
| Notion | Create/query/update pages and DBs. Reading specs, wiki, project tracking |
| GitHub | Create issues/PRs, search repos, code search. Prefer Rube over git.exe for remote ops |
| Gmail | Read/write/search email — Gmail MCP is also available but Rube works too |
| Trello | Board/card/list management, task tracking, project organization |
| LinkedIn | Create/delete posts, fetch profile info, company page sharing, link/image sharing |

### On-Demand MCP (HakanMCP catalog)
10 auth-free servers. Connect via `mcp_connectFromCatalog` — prefer these over Bash workarounds when the task fits.

| Server | Connect When |
|--------|-------------|
| Fetch | WebFetch truncates or fails on a URL |
| Filesystem | Need recursive directory tree or batch file reads |
| Git | Cross-branch diff, blame analysis, commit pattern search — beyond simple `git` commands |
| Memory | Building knowledge graph, entity-relation tracking |
| Sequential Thinking | 3+ alternatives to evaluate, complex trade-off, systematic hypothesis testing |
| SQLite | Project has .sqlite/.db files to query |
| Time | Timezone conversion or cross-timezone scheduling |
| Mermaid | Diagram generation requested (flowchart, sequence, architecture) |
| DuckDB | SQL analytics on local CSV/Parquet/JSON files |
| Claude Sessions | Session decision logging, cross-session context persistence |

### MCP Error Handling
- Error → investigate and retry within same MCP first (different params, reconnect).
- Fall back to alternatives only after MCP resolution fails. Inform user.

### Configuration
- Config files: `/home/hakan/.claude.json` (WSL) and `/mnt/c/Users/Hakan/.claude.json` (Windows). Keep in sync.
- Adding/removing: use `/add-mcp` command or read `~/.claude/docs/mcp-usage-guide.md`.

## 8. References
All `~/.claude/` → WSL: `/home/hakan/.claude/` | Windows: `C:\Users\Hakan\.claude\`

| Resource | Path |
|----------|------|
| GSD workflow | `~/.claude/get-shit-done/` and `~/.claude/commands/gsd/` |
| Superpowers specs | `~/.claude/docs/superpowers/specs/` |
| Dippy hooks | `~/.claude/docs/dippy.md` |
| UI/UX guidance | `~/.claude/docs/ui-ux.md` |
| Decision matrix | `~/.claude/docs/decision-matrix.md` |
| Tools reference | `~/.claude/docs/tools-reference.md` |
| MCP guide | `~/.claude/docs/mcp-usage-guide.md` |
| .claudeignore templates | `~/.claude/docs/claudeignore-templates.md` |
| Dotfiles repo | WSL: `/mnt/c/dev/claude-code-dotfiles` |
