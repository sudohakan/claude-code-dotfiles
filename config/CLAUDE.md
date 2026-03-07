# Global Claude Instructions

## Language
Respond in the same language as the user.

## Git Rule
**Git commands (commit, push, pull, checkout, branch, merge, rebase, reset, stash, etc.) are ONLY executed when the user explicitly requests them.** This includes automatic commits, auto-push, and GSD's atomic commit rule — do not run any git command without user request.

## Auto-Format Rule
Formatting is only performed when:
1. **User explicitly requests it**
2. **Claude deems it necessary** — asks the user first, runs `npx prettier --write "<file>"` only upon approval

## Dotfiles Versioning
When `claude-code-dotfiles` (`C:\dev\claude-code-dotfiles`) is updated:
1. Update the `VERSION` file with the new version (semver)
2. Add an entry to `CHANGELOG.md` in [Keep a Changelog](https://keepachangelog.com) format
3. Update `README.md` to reflect the changes
4. Include the `vX.Y.Z` version in the commit message

---

## 1. GSD — Development Workflow

**GSD activates automatically in the following situations:**

### New project / new feature
When the user defines a new project, module, or large feature:
1. Create project configuration with `/init-hakan` (CLAUDE.md + session-continuity + .planning/ skeleton)
2. Start with `/gsd:new-project` — create ROADMAP.md and STATE.md
3. For each phase in order: `/gsd:discuss-phase` → `/gsd:plan-phase` → `/gsd:execute-phase` → `/gsd:verify-work`

### Small / one-off task
Specific and limited requests like "fix this", "add this", "write this":
- Use `/gsd:quick` — skips planning phase, executes directly, creates atomic commit

### Bug / debugging
When the user reports an error or asks "why isn't this working?":
- Use `/gsd:debug` — collect symptoms, run gsd-debugger agent

### GSD Profile Selection
At task start, Claude **automatically determines** the profile using the rules below and applies it without asking the user. The active profile is shown in the status line.

| Task Type | Profile |
|-----------|---------|
| New project, critical feature, architectural change | `quality` |
| Normal development, standard feature | `balanced` |
| Quick fix, typo, single-line change | `budget` |

**Auto-detection rule:** Keywords in the task text are scanned:
- **budget →** fix, typo, rename, remove, delete, update (single file)
- **quality →** new project, architecture, refactor, migration, security, performance
- **balanced →** none of the above or ambiguous situation (default)

After the profile is determined, `/gsd:set-profile` runs automatically if the current profile differs.

### Core Rules
- **Never jump to code.** Do not implement before requirements are clear.
- Atomic commit: Notify the user when a work unit is complete; **commit only if user approves**.
- **Verification mandatory:** When code is written, a file is changed, or a setup is done, `superpowers:verification-before-completion` is called. Show evidence before saying "done". This rule applies regardless of task size, including every `/gsd:quick` flow.
- Context management is determined at task start according to the table below:

| Estimated Size | Strategy |
|----------------|----------|
| < 50 line change | Do in main context |
| 50–200 lines | Research → subagent, implement → main context |
| 200+ lines or 3+ file groups | Full multi-agent (research + implement + test parallel) → **CS triggered** |
| Cross-class refactoring | Worktree agents → **CS preferred** |
| Security audit / comprehensive test | **CS background** (main session not blocked) |
| 2+ project directories simultaneously | **CS required** (each project in its own session) |

- **Context budget (applies regardless of task size, hook auto-warns):**
  - **45% (CHECKPOINT)** → Switch to subagent for research and large tasks. Write long outputs to file. Keep only short results in main context.
  - **55% (SUBAGENT-ONLY)** → All new tasks via subagent. Main context for coordination + short responses only.
  - **65% (WARNING)** → Finish current work, do not start new work. Prepare to update session-continuity.md.
  - **75% (CRITICAL)** → Update session-continuity.md IMMEDIATELY. Notify user: can continue with `claude --resume`.
  - **85% (COMPACT-SUGGEST)** → Finish current work, check if session-continuity.md is current, suggest `/compact` to user.
  - **90% (COMPACT-URGENT)** → Update session-continuity.md first, then tell user to run `/compact`. Continue in same session after compact.
- **Subagent preference:** When context is above 45%, use Explore agent instead of Read/Grep/Glob. Large file reads, codebase scans, running tests — context-bloating tasks should always go to subagent.
- STATE.md and ROADMAP.md in `.planning/` directory are always kept up to date.
- **End of session mandatory:** "done/close/continue later" or context CRITICAL → update `memory/session-continuity.md`.
- **Session resume:** Remind user of `claude --resume` (select session) or `claude --continue` (last session).

---

## 2. UI/UX Pro Max — Design System
> Detail: `~/.claude/docs/ui-ux.md`

Triggered when the user says create/fix/improve UI, or asks about style/color/layout. Workflow and pre-delivery checklist are in the docs file.

---

## 3. Decision Table + Integration Matrix
> Detail: `~/.claude/docs/decision-matrix.md` | Review/Ralph: `~/.claude/docs/review-ralph.md`

Which task → which GSD flow + which Superpowers + whether Ralph is appropriate is decided by this table. Research tasks (internal codebase / external web) run in a separate flow.

---

## 4. Multi-Agent Coordination Protocol
> Detail: `~/.claude/docs/multi-agent.md`

Agent roles, parallel agent rules/limits, launch checklist, quality gate, subagent security rules, failure protocol, DAG scheduling, and research parallelization are in the docs file.

---

## 5. Session Continuity (project-based)

Session-continuity is maintained at project scope. Created with `/init-hakan` for new projects.

**Session start (in order):**
1. **Health check:** Run `node ~/.claude/hooks/pretooluse-safety.js --test` (is hook active?), check `jq --version`, if `.planning/` directory exists verify STATE.md consistency
2. **Context restore:** If `memory/session-continuity.md` exists, read it → summarize where it left off, recent decisions, and next step
3. **Status summary:** If `memory/MEMORY.md` + `.planning/STATE.md` exist, read them → present brief summary to user
4. If files do not exist, skip silently (may not be present in every project)

**Session end:** Update `memory/session-continuity.md`:
```
## Last Session — {date}
**Project:** {project name}  **Phase:** {phase number and name}
**Status:** completed / in progress / blocked
**Next step:** {what to do next}
**Decisions:** {important technical decisions}
```

---

## 6. Cross-Project Knowledge Base

Three files are maintained in the global memory directory. The relevant file is updated when a bug is resolved, a pattern is detected, or an architectural decision is made.

| File | Content | When to Update |
|------|---------|----------------|
| `memory/solutions.md` | Bug fixes, root causes | After bug fix |
| `memory/patterns.md` | Recurring architectural patterns | When pattern detected |
| `memory/decisions.md` | Technical decisions and trade-offs | When architectural decision made |

**Project name is noted in every record.** If the same solution applies to multiple projects, add to "Applicable projects" field.
**Project-specific context is preserved** — one project's decision does not bind another, but is offered as a reference in similar situations.

---

## 7. Advanced Toolset
> Detail: `~/.claude/docs/tools-reference.md`

Claude Squad, Trail of Bits, Container Use, Dippy, recall, ClaudeCTX — all tool details and usage examples are in the docs file.

---

## 8. Context Engineering — Token Efficiency

### Core Rules
- **Write to filesystem, not context:** Save long outputs to file, keep only a reference in context
- **Subagent isolation:** Each subagent starts with a clean context — prevents context rot
- **Lazy loading:** MCP tools are loaded via ToolSearch, unnecessary tools are not added to context
- **Progressive disclosure:** Summary first, detail only if needed — read large files in chunks

### Decision Quality
- Generate 3+ alternative hypotheses for critical decisions
- Make evidence-based evaluation for each decision
- Keep an audit trail: why this approach, why not others

### Quality Gate Reinforcement
- Define verification criteria before implementation
- LLM-as-Judge: Score `superpowers:requesting-code-review` results with evidence-based scoring
- Failed review → fix → review again (automatic retry loop)
