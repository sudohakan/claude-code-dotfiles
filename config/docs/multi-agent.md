# Multi-Agent Coordination Protocol

## Agent Roles

| Role | What It Does | When |
|------|-------------|------|
| **Researcher** | Codebase analysis, pattern discovery | Before plan-phase |
| **Implementer** | Code writing, GSD executor | During execute-phase |
| **Tester** | Writing and running tests | After each implementer |
| **Reviewer** | Code review, quality control | Required after each wave |

## Parallel Agent Rules

| Situation | Strategy |
|-----------|----------|
| 2+ tasks on independent file groups | **Parallel** |
| GSD wave contains more than one plan | **Parallel** |
| Multiple domains to research | **Parallel** (research) |
| Tasks have dependencies between them | **Sequential** |
| Same files are affected | **Sequential** or **worktree** |
| 2+ agents writing to different modules | **Worktree** |
| Agents doing read-only work | **Same workspace** |

## Parallel Agent Limits

| Platform | Technical Limit | Recommended | When Exceeded |
|----------|----------------|-------------|---------------|
| **Task tool subagent** | 10 concurrent | 4-6 | Queued (batch) |
| **cs-spawn.sh (tmux)** | OS limit (~unlimited) | 4-6 | Each consumes separate API tokens |
| **Container Use (Docker)** | Docker daemon limit | 3-4 | RAM/CPU pressure |
| **Parallel tool calls in one message** | ~5 reliable | 3-4 | More is inconsistent |

**Default parallel agents:** 4-6 (balance between rate limit + token overhead)
**If 10+ required:** Split into waves — batch queue runs automatically but no dynamic pulling
**Cost warning:** Each agent starts with ~20K token overhead. 10 parallel = 200K instant token consumption

## Agent Launch Checklist
1. Is the task independent? → Can be launched in parallel
2. Are the same files affected? → Use worktree or make sequential
3. Are more than 6 agents needed? → Split into waves
4. Is each agent's output clear? → If not, discuss first
5. **Does the subagent prompt have a verification reminder?** → If not, add: "Verify the result before completing"

## Quality Gate — REQUIRED (after each wave)
1. Check that all agents have completed
2. Apply `superpowers:verification-before-completion`
3. If worktree exists → merge in dependency order + check conflict with `git diff`
4. If conflict → DO NOT auto-resolve → ask user
5. Trigger review with `superpowers:requesting-code-review`
6. If review fails → fix → review again

**No shortcuts.** Even "simple changes" go through review.

## Subagent Security Rules
- **Verification required:** Add this reminder to every subagent prompt: "Verify the result before completing the work — run tests, check syntax, read the output."
- **Project CLAUDE.md check:** When launching an agent with `cs-spawn.sh --dir`, confirm CLAUDE.md exists in the target directory. Warn if missing.
- **Context limit:** Task tool subagents cannot know their own context limits. For large tasks (`200+ lines`) launch the subagent with `cs-spawn.sh` or `Container Use` — these run as independent sessions.
- **Rate limit protection:** With 6+ parallel agents running, 429 errors may occur. Temporary error protocol (2 retries) is applied.

## Agent Failure Protocol

| Error Type | Strategy | Max Retry |
|------------|----------|-----------|
| **Transient** (timeout, network, rate limit) | Automatic retry | 2 |
| **Logical** (wrong plan, missing dependency) | Consult user | 0 |
| **Conflict** (merge conflict, same file) | Switch to worktree or go sequential | 1 |
| **Environment** (build error, missing dependency) | Fix and retry | 2 |

**Recovery:** Error → stop dependent agents → apply strategy → after 2 retries fail → `/gsd:debug`
**Escalation:** 1 agent fail → wave continues | 2+ agents fail → wave stops | Critical path fail → all dependent waves stop

## Parallel Dispatch Trigger
When the user provides 2+ independent tasks, the `dispatching-parallel-agents` skill is automatically called.
Inside GSD, the DAG scheduler takes on this role.

## DAG Scheduling (execute-phase)

`depends_on`-based dynamic scheduling (with `max_concurrent_agents` config for concurrent agent limit, default: 6):

```
Old:  Wave 1: [A, B, C] -> all must finish -> Wave 2: [D, E]
New:  A done -> D starts (D depends only on A)
      B done -> E starts (E depends only on B)
      C done -> (nothing depends on it)
```

### gsd-tools.cjs Commands

- `gsd-tools.cjs phase-plan-dag {phase}` — dependency graph + ready/blocked status
- `gsd-tools.cjs update-dag-status {phase} {plan}` — calculate newly ready plans when a plan completes
- `gsd-tools.cjs analyze-plan-routing {phase}` — Task() vs cs-spawn.sh routing recommendation

### Executor Routing Rules

| Condition | Executor | Reason |
|-----------|----------|--------|
| files_modified >= 5 OR task_count >= 8 | cs-spawn.sh | Large plan, worktree isolation required |
| File collision with another plan running simultaneously | cs-spawn.sh | Conflict prevention |
| All other cases | Task() tool | Lightweight, fast, current behavior |

### Research Parallelization

The research step in plan-phase uses a dynamic number of domains:
- Simple phase: 2-3 domains (stack, patterns, pitfalls)
- Complex phase: 4-8 domains (auth, DB, API, testing, security, caching...)
- Batch limit: 5 agents/batch (rate limit protection)
- Synthesizer merges N domain files into a single RESEARCH.md
