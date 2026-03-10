# Global Claude Instructions

## Language & Shortcuts
Respond in the same language the user writes in (Turkish → Turkish, English → English).

### Shortcuts
- **`-bs`** — When user message contains `-bs`, trigger `superpowers:brainstorming` skill immediately.
- **`-ep`** — When user message contains `-ep`, trigger `superpowers:executing-plans` skill immediately.
- If both `-bs` and `-ep` are present, run brainstorming first, then executing-plans.

## Git Rule
**Git commands (commit, push, pull, checkout, branch, merge, rebase, reset, stash, etc.) are ONLY executed when the user explicitly requests them.** No auto-commit, auto-push, or GSD atomic commit — never run git commands without user request.

## Auto-Format Rule
Formatting is only applied when:
1. **User explicitly requests it**
2. **Claude deems it necessary** — asks the user, runs `npx prettier --write "<file>"` upon approval

## Dotfiles Versioning
When `claude-code-dotfiles` (`C:\dev\claude-code-dotfiles`) is updated:
1. Determine version bump using **Semantic Versioning** (`MAJOR.MINOR.PATCH`):
   - **MAJOR** (X.0.0) — Breaking change: removed/renamed commands, incompatible config changes, installer breaking changes
   - **MINOR** (x.Y.0) — New feature: new command, new skill, new hook, new agent, new doc
   - **PATCH** (x.y.Z) — Bug fix, typo, docs update, config tweak, refactor with no behavior change
2. Update `VERSION` file with new version
3. Add entry to `CHANGELOG.md` in [Keep a Changelog](https://keepachangelog.com) format
4. Update `README.md` to reflect changes
5. Include `vX.Y.Z` version in commit message
6. **After push, create and push tag:** `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z` (triggers GitHub Release automatically)

---

## 5. Subagent & Model Selection

These rules apply in ALL conversations — GSD and non-GSD alike.

### Model Selection

Agent tool subagents get automatic model selection based on task complexity:

| Task Type | Model | Examples |
|-----------|-------|----------|
| Simple search/lookup | haiku | File search, single file read, simple grep, variable name search |
| Standard research/analysis | sonnet | Codebase exploration, multi-file analysis, refactoring plan, test writing |
| Deep analysis/architecture | opus | Security audit, architectural decision, complex debug, cross-module analysis |

### Delegation Rules

**Always delegate to subagent (regardless of context level):**
- Codebase research requiring 5+ file reads
- Test suite execution
- Large file reads (500+ lines)

**Delegate at context 45%+:**
- All research (Explore agent instead of Read/Grep/Glob)
- New task initiation
- File read operations

**Keep in main context:**
- Direct user communication
- Small edits in single file
- Git commands
- Short, known file reads (<100 lines)

### Work Size Strategy

| Estimated Size | Strategy |
|----------------|----------|
| < 50 lines changed | Work in main context |
| 50–200 lines | Research → subagent, implement → main context |
| 200+ lines or 3+ file groups | Multi-agent (research + implement + test parallel) |
| Cross-class refactoring | Worktree agents |
| Security audit / comprehensive test | Background subagent (main session not blocked) |
| 2+ project directories simultaneously | Separate sessions per project |

---

## 6. Context Engineering

These rules apply in ALL conversations — GSD and non-GSD alike.

### Context Budget (hook warns automatically)

| Threshold | Action |
|-----------|--------|
| **45%** | Route research and large tasks to subagents |
| **55%** | All new tasks via subagent only |
| **65%** | Complete current work, don't start new tasks |
| **75%** | Update session-continuity.md, inform user: can continue with `claude --resume` |
| **85%** | Suggest `/compact` |
| **90%** | Update session-continuity.md, tell user to run `/compact` |

### Token Efficiency Principles

- **Write to filesystem, not context** — save long outputs to files
- **Subagent isolation** — each subagent starts with clean context
- **Lazy loading** — MCP tools loaded via ToolSearch
- **Progressive disclosure** — summary first, details if needed
- Generate 3+ alternative hypotheses for critical decisions
- Keep audit trail: why this approach, why not the others

### Quality Gate Reinforcement

- Define verification criteria before implementation
- LLM-as-Judge: Score `superpowers:requesting-code-review` results with evidence-based scoring
- Failed review → fix → review again (automatic retry loop)

---

## 7. Task Classification

Every user request is classified first. **Class determines approach.**

### Direct Task (no GSD required)
GSD is NOT used — execute directly in these cases:
- User states exactly what to do (specific action request)
- Simple changes in one or a few files
- Config/dotfiles edits
- Git operations (commit, push, tag)
- Information questions, research requests
- Work in non-project directories (no `.planning/` present)

**Direct task rules:**
1. Do it
2. Verify (prove it works — run tests, show output, check files)
3. Inform user, commit only if user requests

### GSD Task (workflow required)
GSD kicks in for these cases:
- **New project / major feature** → `/gsd:new-project` → phase cycle
- **Uncertain debug** → `/gsd:debug`
- **3+ file groups, 200+ lines, work requiring planning** → `/gsd:quick` or full phase flow
- **Working in a project with `.planning/` directory** → GSD active

**GSD trigger rule:** If `.planning/ROADMAP.md` exists → GSD active. Otherwise → direct task.

---

## 8. Superpowers Triggering (intent-based, language-independent)

### Brainstorming (creative/ambiguous work)
`superpowers:brainstorming` skill is triggered when user intent matches any of these:
- Asking for ideas, suggestions, or alternatives (language-independent intent detection)
- New feature, command, tool, or architectural design to be created
- Multiple approaches possible and the best one is unclear
- User is not requesting direct action, but exploring/questioning

### Intent → Skill Table
The following skills are automatically triggered when matching intent is detected:

| Intent | Skill | When |
|--------|-------|------|
| Creative/exploratory question | `brainstorming` | Ideas, suggestions, alternatives requested; unclear approach |
| Bug, error, unexpected behavior | `systematic-debugging` | Problem report, error analysis |
| Plan/spec ready, moving to implementation | `executing-plans` | Written plan exists, step-by-step execution needed |
| Multiple independent tasks | `dispatching-parallel-agents` | 2+ independent tasks can run simultaneously |
| New feature/major change planning | `writing-plans` | Multi-step task, spec/requirements available |
| Test writing / TDD approach | `test-driven-development` | User requests tests or TDD is appropriate |
| Isolated work requirement | `using-git-worktrees` | Feature isolation, parallel branch work |
| Independent tasks within plan | `subagent-driven-development` | Parallel implementation in current session |
| Branch/feature completed | `finishing-a-development-branch` | Merge/PR/cleanup decision needed |
| Work completion claim | `verification-before-completion` | Prove it works before claiming completion |
| Code review request/delivery | `requesting-code-review` | Major feature/milestone completed |
| Review feedback received | `receiving-code-review` | Evaluate feedback with rigor, don't blindly accept |
| New skill creation/editing | `writing-skills` | Skill file being written or modified |

---

## 9. GSD — Development Workflow

> GSD only works project-scoped. Active in projects with `.planning/` infrastructure.

### Starting a new project
1. Create project configuration with `/init-hakan`
2. Create ROADMAP.md and STATE.md with `/gsd:new-project`
3. For each phase: `/gsd:discuss-phase` → `/gsd:plan-phase` → `/gsd:execute-phase` → `/gsd:verify-work`

### Small task (within project)
- `/gsd:quick` — skips planning phase, executes directly

### Bug / debugging
- `/gsd:debug` — collect symptoms, run gsd-debugger agent

### Core rules
- **Never jump to code.** Don't implement before requirements are clear.
- **Git user approval:** Inform when work is done, commit only if user approves.
- **Verification:** When code is written, prove it works. Run tests, show output, report results. Formal skill invocation only mandatory for 200+ line changes.
- `.planning/` STATE.md and ROADMAP.md are always kept up to date.

---

## 10. UI/UX Pro Max — Design System
> Details: `~/.claude/docs/ui-ux.md`

Triggered when user intent is visual interface design/modification (UI creation, styling, colors, layout, typography, etc.).

---

## 11. Decision Table + Integration Matrix
> Details: `~/.claude/docs/decision-matrix.md` | Review/Ralph: `~/.claude/docs/review-ralph.md`

Which task → which workflow + which Superpowers + is Ralph appropriate — decided by this table.

---

## 12. Multi-Agent Coordination Protocol
> Details: `~/.claude/docs/multi-agent.md`

Agent roles, parallel agent rules, quality gates, failure protocol in docs file.

---

## 13. Session Continuity (project-scoped)

Session-continuity is kept project-scoped. Created with `/init-hakan` for new projects.

**Session start:**
- If `memory/session-continuity.md` exists → read it, summarize where it left off, last decisions, and next step
- If `memory/MEMORY.md` + `.planning/STATE.md` exist → present short summary
- If files don't exist, skip silently

**Session resume:** Remind user of `claude --resume` (select session) or `claude --continue` (last session).

**Session end (if project work was done):**
Update `memory/session-continuity.md` (fully rewrite, don't append):
```
## Last Session — {date}
**Project:** {project name}  **Phase:** {phase number and name}
**Status:** completed / in progress / blocked
**Next step:** {what should be done}
**Decisions:** {important technical decisions}
```

---

## 14. Cross-Project Knowledge Base

| File | Content | When to Update |
|------|---------|----------------|
| `memory/solutions.md` | Bug fixes, root causes | After bug fix |
| `memory/patterns.md` | Recurring architectural patterns | When pattern detected |
| `memory/decisions.md` | Technical decisions and trade-offs | When architectural decision made |

Project name is included in every entry. **Project-specific context is preserved** — one project's decision does not bind another, but is offered as a reference in similar situations.

---

## 15. Advanced Toolset
> Details: `~/.claude/docs/tools-reference.md`

Claude Squad, Trail of Bits, Container Use, Dippy, recall, ClaudeCTX — tool details in docs file.

---

## 16. HakanMCP Tool Error Handling

When any `mcp__HakanMCP__*` tool returns an error, **do NOT immediately fall back to alternative methods** (native tools, Bash commands, etc.). Instead, follow this protocol:

1. **Diagnose the root cause** — Analyze the error message, check the tool's expected inputs, and identify why it failed (path issue, permission, config, CRLF, missing dependency, etc.)
2. **Attempt at least 2 fix paths** — Identify and try a minimum of 2 different approaches to fix the HakanMCP tool issue directly:
   - **Fix Path 1:** Address the most likely root cause (e.g., fix input parameters, correct paths, resolve environment issues)
   - **Fix Path 2:** Alternative fix targeting a different hypothesis (e.g., restart/reconnect MCP, repair config, fix file permissions)
3. **Fall back only after both fixes fail** — If both fix paths are unsuccessful, then switch to alternative methods (Bash, native tools, etc.) and inform the user that HakanMCP tool could not be repaired

**Priority:** HakanMCP tools are the preferred toolset. Keeping them functional is more valuable than working around them.
