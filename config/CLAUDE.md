# Global Claude Instructions

## Language
Respond in the same language the user writes in (Turkish → Turkish, English → English).

## Git Rule
**Git commands (commit, push, pull, checkout, branch, merge, rebase, reset, stash, etc.) are ONLY executed when the user explicitly requests them.** No auto-commit, auto-push, or GSD atomic commit — never run git commands without user request.

## Auto-Format Rule
Formatting is only applied when:
1. **User explicitly requests it**
2. **Claude deems it necessary** — asks the user, runs `npx prettier --write "<file>"` upon approval

## Dotfiles Versioning
When `claude-code-dotfiles` (`C:\dev\claude-code-dotfiles`) is updated:
1. Update `VERSION` file with new version (semver)
2. Add entry to `CHANGELOG.md` in [Keep a Changelog](https://keepachangelog.com) format
3. Update `README.md` to reflect changes
4. Include `vX.Y.Z` version in commit message
5. **After push, create and push tag:** `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z` (triggers GitHub Release automatically)

---

## 1. Task Classification

Every user request is classified first. **Class determines approach:**

### Direct Task (no GSD required)
GSD is NOT used — execute directly in these cases:
- User says exactly what to do ("edit this file", "add this", "commit")
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

## 2. GSD — Development Workflow

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

### Context management

| Estimated Size | Strategy |
|----------------|----------|
| < 50 lines changed | Work in main context |
| 50–200 lines | Research → subagent, implement → main context |
| 200+ lines or 3+ file groups | Multi-agent (research + implement + test parallel) → **CS triggered** |
| Cross-class refactoring | Worktree agents → **CS preferred** |
| Security audit / comprehensive test | **CS background** (main session not blocked) |
| 2+ project directories simultaneously | **CS required** (each project in its own session) |

### Subagent preference
- When context is above 45%, use Explore agent instead of Read/Grep/Glob
- Large file reads, codebase scans, running tests — context-bloating tasks should always go to subagent

### Context budget (hook warns automatically)
- **45%** → Switch to subagent for research and large tasks
- **55%** → All new tasks via subagent only
- **65%** → Complete current work, don't start new tasks
- **75%** → Update session-continuity.md, inform user: can continue with `claude --resume`
- **85%** → Suggest `/compact`
- **90%** → Update session-continuity.md, tell user to run `/compact`

---

## 3. UI/UX Pro Max — Design System
> Details: `~/.claude/docs/ui-ux.md`

Triggered when user asks to create/fix/improve UI or asks about style/color/layout.

---

## 4. Decision Table + Integration Matrix
> Details: `~/.claude/docs/decision-matrix.md` | Review/Ralph: `~/.claude/docs/review-ralph.md`

Which task → which workflow + which Superpowers + is Ralph appropriate — decided by this table.

---

## 5. Multi-Agent Coordination Protocol
> Details: `~/.claude/docs/multi-agent.md`

Agent roles, parallel agent rules, quality gates, failure protocol in docs file.

---

## 6. Session Continuity (project-scoped)

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

## 7. Cross-Project Knowledge Base

| File | Content | When to Update |
|------|---------|----------------|
| `memory/solutions.md` | Bug fixes, root causes | After bug fix |
| `memory/patterns.md` | Recurring architectural patterns | When pattern detected |
| `memory/decisions.md` | Technical decisions and trade-offs | When architectural decision made |

Project name is included in every entry. **Project-specific context is preserved** — one project's decision does not bind another, but is offered as a reference in similar situations.

---

## 8. Advanced Toolset
> Details: `~/.claude/docs/tools-reference.md`

Claude Squad, Trail of Bits, Container Use, Dippy, recall, ClaudeCTX — tool details in docs file.

---

## 9. Context Engineering — Token Efficiency

- **Write to filesystem, not context:** Save long outputs to files
- **Subagent isolation:** Each subagent starts with clean context
- **Lazy loading:** MCP tools loaded via ToolSearch
- **Progressive disclosure:** Summary first, details if needed
- Generate 3+ alternative hypotheses for critical decisions
- Keep audit trail: why this approach, why not the others

### Quality Gate Reinforcement
- Define verification criteria before implementation
- LLM-as-Judge: Score `superpowers:requesting-code-review` results with evidence-based scoring
- Failed review → fix → review again (automatic retry loop)
