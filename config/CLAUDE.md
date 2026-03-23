# Global Claude Instructions

## 1. Core Rules
- Respond in the user's language. Short, direct, technical.
- Only make changes explicitly requested or clearly necessary. No unrequested features, refactoring, comments, or error handling.
  - **Exception:** When creating teams/plans/tasks, proactively add edge cases, failure scenarios, and verification areas.
- Always read a file before modifying it.
- Git commands only when user explicitly asks. No auto-commit, auto-push. Applies within teams too.
- **Finekra projects:** NEVER commit/push to master/main. Always create a `Task-{DevOpsId}` branch first. This rule does not apply to personal projects.
- In WSL, use `git.exe` for remote operations (Azure DevOps credential helper).
- Format only on request. Use the project's configured formatter.
- User runs with `--dangerously-skip-permissions`. No plan mode — use superpowers skills. In teams, use tech-lead review instead.
- Unfamiliar tool/service/term → research via web search. Don't ask the user.
- Minimize token consumption: no unnecessary context, redundant spawns, or speculative plugin loads.
- Verify every change before reporting completion. Re-read files, confirm paths, check consistency.
- Actionable problems → fix directly. Only explain if user-side steps are required.
- **WSL browser rule:** NEVER open browsers inside WSL/WSLg — the user cannot see them.
  - **URLs for user:** Use `wslview <url>` (from `wslu` package, `BROWSER=wslview` in `~/.bashrc`).
  - **Browser automation:** Use HakanMCP browser wrappers first (`mcp_browserConnect`, `mcp_browserNavigateExtract`, `mcp_browserProbeLogin`, `mcp_browserCaptureProof`). Connect to Windows Chrome via CDP and store state in `~/.claude/browser-last.json`. Setup details: `~/.claude/docs/browser-cdp-setup.md`.
  - **Raw Playwright:** only via HakanMCP `mcp_callTool` when a wrapper does not cover the required action.
  - **OAuth/login flows:** Open URL via `wslview`, let user complete in Windows browser.
- **Fix-it-permanently first:** When encountering any error or obstacle during a task, don't just work around it — first fix the root cause permanently (update config, install missing deps, fix scripts, add error handling to tooling) so the same problem never recurs. Only after the permanent fix is in place, continue with the original task. This applies to: broken auth flows, misconfigured tools, flaky scripts, missing dependencies, incorrect paths, encoding issues, and any repeatable failure. A workaround is acceptable only as a temporary measure while the permanent fix is being applied.
- **Skill creation workflow:** When creating new skills (skills/ directory), use `superpowers:brainstorming` first, then `/skill-create` to generate with proper structure. Commands (commands/ directory) can be written directly after design — they are simpler spec files, not skill packages.
- **Continuous improvement:** When user feedback during execution reveals a gap in any custom skill, command, or hook (missing fields, wrong flow, failed edge case), immediately update the relevant file, verify the fix works, then continue the task. All custom skills, commands, and hooks must self-improve through use.
- **WSL+NTFS encoding:** When creating `.sh` files on Windows/NTFS, always force LF line endings (not CRLF). Add `*.sh text eol=lf` to `.gitattributes`. WSL cannot execute CRLF scripts.
- **WSL large files:** WSL NTFS driver cannot read back files larger than ~1MB that contain shell escape sequences. For large generated files, write to ext4 (`/home/`) and symlink if needed.
- **Dotfiles sync:** Whenever any file under `~/.claude/` is created, modified, or deleted, the dotfiles repo MUST be synchronized before the task is considered complete. Use `/dotfiles-sync` command or follow the workflow in the command definition. This applies to ALL changes under `~/.claude/`.

## 2. Model Selection
- Default: `sonnet`. Always pass `model` explicitly when spawning agents/teammates.
- Research/exploration subagents: `haiku`.
- Complex architectural decisions (2+ services, irreversible): `opus`.
- Team leader (orchestrator): always `opus`.
- Superpowers/Ralph loop: inherit default (`sonnet`).
- Current versions: Haiku 4.5 (fast, cost-effective), Sonnet 4.6 (best coding), Opus 4.6 (deepest reasoning).

## 3. Task Routing

### Shortcuts
- `-bs` → `superpowers:brainstorming`. `-ep` → `superpowers:executing-plans`. Both → brainstorming first.

### Team Creation
User asks to create a team → use `/team`. Individual team commands (`/buildteam`, etc.) are deprecated.

### Routing Signals
Intent-based routing. Read the user's goal, not their exact words. Multiple signals may apply — pick the best fit or combine.

**Structural signals** — always check these first:

| Condition | Action |
|-----------|--------|
| Team already active | Route through team leader — don't bypass |
| `.planning/ROADMAP.md` exists | GSD workflow. `gsd:quick` for small tasks |
| Session starting | Consider ECC `/resume-session` if prior session exists |
| Session ending or context growing large | Consider ECC `/save-session` |

**Task complexity signals** — how to approach the work:

| Intent | Action |
|--------|--------|
| Single step, outcome obvious | Handle directly, no workflow needed |
| Quick side question during deep work | ECC `/aside` — don't pollute main context |
| Multiple independent tasks that can run in parallel | `superpowers:dispatching-parallel-agents` |
| Single self-contained task to delegate | Subagent |
| Unclear direction, needs exploration | `superpowers:brainstorming` |
| Clear requirements, multiple steps needed | `superpowers:writing-plans` or ECC `/blueprint` for complex multi-session work |
| Measurable success criterion, automatable verification | Ralph Loop (`ralph-loop:ralph-loop`) |

**Development lifecycle signals** — what phase the work is in:

| Intent | Action |
|--------|--------|
| About to write a new feature or fix a bug | Consider `superpowers:test-driven-development` or ECC `/tdd` |
| Something is broken, behaving unexpectedly, or producing errors | `superpowers:systematic-debugging` |
| Build or compilation fails | ECC `/build-fix` — minimal diffs, get build green |
| Code was just written or modified | Consider code review — `superpowers:requesting-code-review` or `/code-review` |
| Work appears complete, about to report done | `superpowers:verification-before-completion` (always run before claiming done) |
| Removing unused code, consolidating, cleaning up | ECC `/refactor-clean` |
| Need end-to-end or integration tests | ECC `/e2e` — Playwright test generation |
| Documentation or codemaps need updating | ECC `/update-docs` or `/update-codemaps` |
| A prompt or instruction needs to be improved | ECC `/prompt-optimize` |
| Deploying to test/prod | `/deploy` or `/finekra-deploy-test` for Finekra test servers |
| Starting new implementation from scratch | Check `rules/common/development-workflow.md` — Research & Reuse step is mandatory |

**Domain-specific signals** — specialized workflows based on subject area:

| Intent | Action | Reference |
|--------|--------|-----------|
| UI/UX work, visual design, frontend styling, component creation | `ui-ux-pro-max` skill. Component generation via `magic-21st` MCP (`/ui ...`) | `~/.claude/docs/ui-ux.md` |
| Offensive security: testing a site/app/API's defenses, finding weaknesses, red team exercises | `/pentest <url>` command. `kali-mcp` + HakanMCP browser wrappers. Authorized targets only. | `~/.claude/docs/pentest-playbook.md` (hub) |
| Need to understand an unfamiliar library, framework, or API | `context7` MCP — query docs before coding | |

### Ralph Loop
All must be true: measurable criterion in one sentence, automated verification (tests/lint/build), no design decisions needed, max 3-10 iterations.
Args format: `~/.claude/docs/review-ralph.md`.

## 4. Agent Teams
Use for coordinated, long-running work with parallel workstreams.
- Never auto-create teams. Keep alive until user requests shutdown.
- Never send shutdown to teammates when tasks complete — idle teammates are normal. Shutdown only when user explicitly requests it (e.g., "shutdown" or equivalent in any language). Task completion, idle loops, and token concerns are never shutdown triggers.
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
- Session start or `/compact`: read `.memory/session-continuity.md` (primary), then `MEMORY.md`. If `.planning/STATE.md` exists (GSD projects only), read it too.
- Keep compact: latest state only, under 12 lines.
- Write only before `/compact` when context exceeds ~90%.
- Teams: only leader reads/writes session-continuity.

### Project Knowledge Files
- `.memory/solutions.md` — non-obvious recurring fixes
- `.memory/patterns.md` — established project patterns
- `.memory/decisions.md` — architectural/workflow decisions
- Update `MEMORY.md` index on changes.

### Memory File Frontmatter Format
All memory files (except MEMORY.md, decisions.md, patterns.md, solutions.md) must include frontmatter:
```yaml
---
name: <snake_case_identifier>
description: <one-line summary>
type: feedback | reference | user | project
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```
`created` and `updated` are required fields in ISO date format. Set both to the file's creation date on first write; update `updated` on each subsequent edit.

## 6. Plugins & Skills

Available plugins and their capabilities. Use judgment — these are tools, not obligations.

| Plugin | Signals to Consider Using |
|--------|--------------------------|
| **superpowers** | Planning, TDD, verification, code review, debugging, brainstorming, git worktrees. Core workflow engine — consider first for structured development tasks. |
| **ECC** | Session persistence (`/save-session`, `/resume-session`), continuous learning (`/instinct-status`, `/evolve`), harness audit, security scan (`/security-scan`), prompt optimization, quality gates. Consider when session management, learning, or config security matters. |
| **context7** | Library/framework docs needed, API unclear, unfamiliar dependency. Query before writing code — not after. |
| **code-review** | Post-implementation code review. |
| **security-guidance** | Security best practices, vulnerability patterns. |
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
UI component generation. Writes React+Tailwind components directly to the project.
Signal: user asks for UI/component/button/form/navbar/modal with `/ui` prefix.

## 7. MCP & Tool Integration
Invoke MCP tools only when the task benefits from them. Use judgment — not every task needs MCP.

### New Service Connection — Evaluate All Options
When user wants to connect a new external service, check ALL sources in parallel and pick the best fit:
- **HakanMCP catalog** — auth-free on-demand MCP via `mcp_connectFromCatalog`
- **Rube (Composio)** — 600+ app via `RUBE_SEARCH_TOOLS` (has cost + shared rate limits)
- **Web search** — dedicated MCP servers on npm/GitHub (e.g., "namecheap MCP server")

**Selection priority:** Free dedicated MCP > HakanMCP auth-free > Rube (Rube has cost and shared API limits, prefer free alternatives when available). If Rube is the only option or significantly better featured, use it. Always present options to user with trade-offs.

### MCP Servers
Use when the task benefits from the server's capability. Match by intent, not keywords.

Note: Some capabilities (browser automation, Gmail, LinkedIn) are accessible via multiple routes. For browser work prefer HakanMCP browser wrappers first, then HakanMCP `mcp_callTool`, then other alternatives only if required.

| Server | When the task involves... |
|--------|--------------------------|
| context7 | Understanding a library/framework API, need current docs or examples |
| HakanMCP | Database operations, API testing, system monitoring, backup, on-demand MCP connections, and browser automation through low-token wrappers. Guide: `~/.claude/docs/mcp-usage-guide.md` |
| NotebookLM | Deep research across multiple sources, generating audio/video/slide content |
| Gmail | Reading, searching, or drafting email |
| Google Calendar | Scheduling, finding free time, managing calendar events |
| gtasks-mcp | Managing task lists, creating/updating/searching tasks |
| infoset | Accessing CRM data — tickets, contacts, companies |
| container-use | Managing Docker containers |
| kali-mcp | Offensive security testing, network recon, vulnerability scanning. Tools: nmap, nuclei, feroxbuster, ffuf, katana, sqlmap, hydra, grpcurl + 28 more (36 total). **Ref**: `pentest-playbook.md` (hub) |
| linkedin | Looking up people, companies, or jobs on LinkedIn |
| magic-21st (21st.dev) | Generating UI components (`/ui` prefix) — React+Tailwind |
| Rube (Composio) | Connecting to 600+ apps. Use `RUBE_SEARCH_TOOLS` to discover tools first |

**Rube Connected Apps:** Notion, GitHub, Trello, Slack (Finekraa workspace), Gemini (image gen). Use `RUBE_SEARCH_TOOLS` for full list. For Gmail/LinkedIn prefer native MCP over Rube.

### On-Demand MCP (HakanMCP catalog)
9 auth-free servers via `mcp_connectFromCatalog`. Full list: `~/.claude/docs/mcp-on-demand.md`

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
| Superpowers design docs (archive) | `~/.claude/docs/superpowers/specs/` |
| Dippy hooks | `~/.claude/docs/dippy.md` |
| UI/UX guidance | `~/.claude/docs/ui-ux.md` |
| Decision matrix | `~/.claude/docs/decision-matrix.md` |
| Tools reference | `~/.claude/docs/tools-reference.md` |
| MCP guide | `~/.claude/docs/mcp-usage-guide.md` |
| MCP on-demand guide | `~/.claude/docs/mcp-on-demand.md` |
| Agent teams workflow | `~/.claude/docs/agent-teams.md` |
| Ralph Loop spec | `~/.claude/docs/review-ralph.md` |
| .claudeignore templates | `~/.claude/docs/claudeignore-templates.md` |
| Pentest framework | `~/.claude/docs/pentest-playbook.md` (hub) + `pentest-recon.md` + `pentest-assessment.md` + `pentest-exploitation.md` + `pentest-counter-breach.md` + `pentest-targets/` + `kali-mcp/tool-inventory.md` + `/mnt/c/dev/pentest-framework/` |
| Dotfiles repo | WSL: `/mnt/c/dev/claude-code-dotfiles` |
| Rules (common) | `~/.claude/rules/common/` |
| Hook standards | `~/.claude/docs/hook-standards.md` |
| Agent favorites | `~/.claude/docs/agent-favorites.md` |
| Plan naming | `~/.claude/docs/plan-naming.md` |
| Plugin profiles | `~/.claude/docs/plugin-profiles.md` |
