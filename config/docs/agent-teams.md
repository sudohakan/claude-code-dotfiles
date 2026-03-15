# Agent Teams Guide

This file is the local reference for Claude Code Agent Teams. It is aligned with the official documentation at [code.claude.com/docs/en/agent-teams](https://code.claude.com/docs/en/agent-teams) and the token-cost guidance at [code.claude.com/docs/en/agent-team-token-costs](https://code.claude.com/docs/en/agent-team-token-costs).

## When To Use A Team
- Use a team only when teammates need shared coordination, back-and-forth discussion, or tracked parallel work.
- For one-off research, isolated reads, or simple parallel work, prefer a normal subagent.
- Keep the default team size small: 2-5 teammates.

## Official Workflow
1. Create the team.
2. Add teammates with explicit roles.
3. Create tasks with acceptance criteria, role tags, and dependencies — teammates self-claim.
4. Use direct teammate messages for coordination.
5. Shut teammates down when their work is done.
6. Clean up the team after completion.

## Mesh Workflow (Required)
Teams must operate as a mesh — not hub-and-spoke. Teammates communicate directly with each other, not only through the team leader.

### Task Flow Pattern
When a new goal arrives:
1. **Team leader** creates top-level workflow tasks upfront via TaskCreate — PM analysis, tech-lead breakdown, implementation, ops verification — with dependencies (via `TaskUpdate addBlockedBy`), acceptance criteria, and role tags. Then notifies **all relevant teammates** simultaneously.
2. **Teammates** self-claim unblocked tasks matching their role from the shared task list (see Self-Claiming Protocol below).
3. **PM** self-claims the analysis task → writes requirements/acceptance criteria → sends them **directly to tech-lead** (simultaneously sends ops brief to launch-ops).
4. **Tech Lead** breaks engineering tasks into implementation subtasks via TaskCreate, sets dependencies via `TaskUpdate addBlockedBy`, then unblocks dependent dev tasks as prerequisites complete.
5. **Fullstack Dev** self-claims unblocked implementation tasks → implements and reports completion **directly to tech-lead** for review.
6. **Tech Lead** reviews output. If issues found → Fullstack Dev fixes and re-reports. Repeat until clean.
   - Before marking task complete, Fullstack Dev invokes `superpowers:verification-before-completion`
   - Only after a clean verification pass does Tech Lead approve and mark task `completed`
7. **Fullstack Dev** sends `[HANDOFF]` **directly to launch-ops** after tech-lead review approval. **Tech Lead** sends `[TECH HANDOFF]` to launch-ops for technical context. **Launch Ops only receives verified, clean work.**
8. **Team leader** monitors progress, resolves cross-role conflicts, unblocks dependent tasks, and reports to user. **The leader never implements — only delegates and verifies.**

### Peer Communication Rules
- Teammates MUST use SendMessage to talk to each other directly — not relay through team leader
- Each teammate reads `~/.claude/teams/<team-name>/config.json` to discover other teammates
- Team leader initiates by notifying all relevant roles, then steps back to supervise
- Team leader intervenes only for: cross-role conflicts, user-approval items, quality verification

### PM First-Filter Rule
Every incoming goal passes through PM first. PM produces:
1. Objective (one sentence)
2. Scope boundary (in / out)
3. Acceptance criteria (measurable)
4. Constraints (performance, security, compatibility)
5. Priority

No technical work begins until PM delivers this document. Exception: pure-ops emergencies (outage, rollback).

### Concurrent Ops Brief (Universal — All Teams)
When PM sends requirements to Tech Lead, PM also sends an ops brief to Launch Ops simultaneously. This lets Launch Ops prepare checklists in parallel with development.

**This rule applies to ALL team commands** (`/e2eteam`, `/buildteam`, `/opsteam`, `/growthteam`, `/researchteam`, and any future custom team). Parallel kickoff is the default. Sequential kickoff is an anti-pattern.

These parallel execution rules are additive — they layer on top of the mesh workflow and do not change it. The PM first-filter rule, peer communication structure, transfer formats, TaskCreate requirement, and worktree isolation all remain unchanged.

Ops brief format:
```
## Ops Brief: [Feature/Goal]
**Deploy scope:** What is being released
**Success criteria:** How to verify the release is working
**Rollback expectations:** What to revert and how if something breaks
**Estimated timing:** When dev is expected to complete
```

### Task System Required for Implementation
All implementation work MUST go through TaskCreate — not verbal/message-only assignment:
- Team leader creates top-level workflow tasks upfront with dependencies and role tags
- Tech Lead refines implementation tasks with detail, constraints, acceptance criteria, and file scope
- Teammates self-claim unblocked tasks from the shared task list
- This ensures visibility, tracking, and prevents work from being invisible

### Worktree Isolation Rule
Teammates that write/edit project source code must be spawned with `isolation: "worktree"`:
- **Worktree:** fullstack-dev, backend-architect, devops, cloud-architect, security-engineer, qa-tester, observability-engineer, ui-ux-designer (when coding), and any role with a file-write scenario
- **Shared workspace:** product-manager, launch-ops, growth-lead, content-strategist, analytics-optimizer, social-media-operator, business-analyst, research-lead
- **Shared workspace:** tech-lead (reviews in main workspace, coordinates merges, edits Claude config files)

This prevents file conflicts when multiple teammates edit the same codebase in parallel.
Exception: when the task is purely config/documentation (CLAUDE.md, role files, agent-teams.md), all teammates can work in shared workspace.

### Self-Claiming Protocol
Teammates do not wait for explicit assignment. When idle:
1. Run `TaskList` to check the shared task list.
2. Filter for tasks that are: (a) unblocked (all `addBlockedBy` blockers resolved), (b) matching your role tag, (c) status `pending`.
3. Self-claim by running `TaskUpdate` — set yourself as owner and status to `in_progress`.
4. If no matching tasks are available, notify team leader that you are idle.

The team leader creates tasks with role tags (e.g., `[ROLE: fullstack-dev]`, `[ROLE: tech-lead]`). Teammates only claim tasks tagged for their role. If a task has no role tag, ask team leader before claiming.

**Engineering task oversight:** When a dev self-claims an engineering task, they must notify tech-lead via SendMessage. Tech Lead retains review authority over all implementation output regardless of how the task was claimed.

### Task Dependencies
Tasks declare dependencies in two ways — both must be used together:
1. `[DEPENDS: task-id-1, task-id-2]` in the task description (human-readable).
2. `TaskUpdate(addBlockedBy: ["task-id-1", "task-id-2"])` after creation (system-enforced).

**Setup flow:**
1. Create the task via `TaskCreate` with `[DEPENDS: ...]` in the description for readability.
2. Immediately enforce via `TaskUpdate` with `addBlockedBy: [blocking_task_id]` (or `addBlocks: [dependent_task_id]` from the blocker's side).

**Lifecycle:**
- New dependent tasks: status `pending`, with `addBlockedBy` set via TaskUpdate.
- System tracks blocking — blocked tasks remain `pending` but are not eligible for self-claiming until all blockers are `completed`.
- When all blockers complete, the task becomes claimable (still `pending` status, but `addBlockedBy` resolved).

**Team leader responsibility:** When creating tasks upfront, set dependencies via both description convention and `TaskUpdate addBlockedBy` immediately after `TaskCreate`. Monitor task completions and verify dependent tasks become claimable.

### Plan Approval Mode
For risky tasks, teammates can be spawned with `planModeRequired: true` in the team config. This forces the teammate to write a plan before implementing.

**Flow:**
1. Teammate receives/claims a risky task.
2. Teammate writes a plan (what will change, why, risks, rollback).
3. Teammate calls `ExitPlanMode` → system sends `plan_approval_request` to team leader.
4. Team leader reviews and responds with `plan_approval_response` (approve or reject with feedback).
5. On approval: teammate exits plan mode and implements.
6. On rejection: teammate revises plan and re-submits.

**When to use:** Irreversible changes, security-critical code, cross-system modifications, database migrations, breaking API changes.

**Default role configuration:**
- `planModeRequired: true` — fullstack-dev (for DB migrations, security-critical code)
- `planModeRequired: false` — product-manager, launch-ops, tech-lead

Override per-team in `config.json` when spawning teammates.

**Note:** Plan mode is only used within agent teams for teammate oversight. The main session does not use plan mode — superpowers skills are used instead.

### Team Hooks (Native)
Claude Code natively supports `TeammateIdle` and `TaskCompleted` hooks via `settings.json`. These fire automatically — no convention-based workarounds needed.

**Configuration** — add to `~/.claude/settings.json` under `hooks`:
```json
{
  "hooks": {
    "TeammateIdle": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'You have no active task. Run TaskList to find unblocked tasks matching your role, then self-claim one with TaskUpdate.' >&2 && exit 2"
          }
        ]
      }
    ],
    "TaskCompleted": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Task completed. First run superpowers:verification-before-completion to verify your output. Then check if dependent tasks should be unblocked (addBlockedBy).' >&2 && exit 2"
          }
        ]
      }
    ]
  }
}
```

**How it works:**
- **Exit code 2:** Hook message is fed back to the teammate as feedback — teammate continues working (does not idle / does not complete).
- **Exit code 0:** Normal — teammate idles / task completes as usual.
- **`{"continue": false, "stopReason": "..."}`:** Stops the teammate entirely.

**TeammateIdle** — fires when a teammate is about to go idle. Exit code 2 forces the teammate to check `TaskList` for unblocked tasks and self-claim.
- Input fields: `teammate_name`, `team_name`, `session_id`, `cwd`

**TaskCompleted** — fires when a task is about to be marked `completed`. Exit code 2 blocks completion and forces verification.
- Input fields: `task_id`, `task_subject`, `task_description`, `teammate_name`, `team_name`
- Triggers on: (1) explicit `TaskUpdate` to completed, (2) teammate turn ending with in-progress tasks

### No Duplicate Work Rule
Never assign the same work to two teammates. Tasks must be decomposed into distinct, non-overlapping parts. Each part has exactly one owner. The coordinating role (tech-lead or team leader) combines results.

- If two teammates could solve the same sub-problem, split the sub-problem instead
- Holistic tasks must be broken into different segments, not duplicated across roles
- Violation wastes tokens and produces conflicting outputs that must be reconciled

### Anti-Patterns
- Team leader sending all messages and relaying between teammates (hub-and-spoke)
- **Team leader implementing code directly instead of delegating to teammates**
- **Team leader creating tasks one-at-a-time instead of all upfront**
- **Teammates waiting for explicit assignment instead of self-claiming from task list**
- Only one teammate working while others idle
- Skipping PM analysis and sending work directly to engineering
- Fullstack Dev never receiving implementation tasks from Tech Lead
- Implementation work assigned via message only, without TaskCreate
- Launch Ops not briefed until after development is complete
- Two teammates working on the same task or overlapping file areas
- Sequential kickoff (PM writes requirements, waits, then sends ops brief)
- **Ignoring task dependencies — claiming a task whose dependencies are not yet completed**
- **Skipping verification-before-completion when marking tasks done**

### Transfer Formats Reference
All handoffs between teammates use standardized formats. See role files for templates:
- `[OPS BRIEF]` — PM → Launch Ops (in product-manager.md)
- `[HANDOFF]` — Fullstack Dev → Launch Ops (in fullstack-dev.md)
- `[TECH HANDOFF]` — Tech Lead → Launch Ops (see spec)
- `[VERIFY]` — Launch Ops → Team Leader (in launch-ops.md)

### Troubleshooting

**Teammate error recovery:**
- If a teammate crashes or becomes unresponsive, the team leader creates a replacement with the same role and reassigns the teammate's `in_progress` tasks back to `pending`.
- Do NOT attempt to recover a broken teammate — shut it down and spawn a fresh one.

**Orphaned tmux sessions:**
- Run `tmux ls` to list all sessions. Kill orphaned teammate sessions with `tmux kill-session -t <session-name>`.
- Orphaned sessions can occur when a team is shut down without graceful shutdown protocol.

**Premature lead shutdown:**
- If the team leader shuts down before teammates finish, teammates lose coordination. Always shut down teammates first, then the leader.
- If this happens: restart the leader, read `config.json` to rediscover active teammates, and resume supervision.

**Lead implementing instead of delegating:**
- If the leader catches itself reading source code for discovery or editing implementation files → STOP. SendMessage to the right teammate instead. This is the most common anti-pattern.

### Graceful Shutdown
Use the `shutdown_request` / `shutdown_response` SendMessage protocol to shut down teammates cleanly.

**Flow:**
1. Team leader sends: `{"type": "shutdown_request", "reason": "Task complete, wrapping up"}`
2. Teammate responds: `{"type": "shutdown_response", "request_id": "<id>", "approve": true}` → teammate exits.
3. If teammate has unfinished work: `{"type": "shutdown_response", "request_id": "<id>", "approve": false, "reason": "Still working on task #3"}` → teammate continues.
4. Leader retries shutdown after the teammate completes remaining work.

**Rules:**
- Always attempt graceful shutdown before force-killing.
- Shut down teammates in reverse dependency order (dev → tech-lead → PM → ops → leader).
- Never shut down teammates without explicit user request.

### Display Modes
Agent teams support two display modes for teammate output:

**In-process mode:** Teammate output appears inline in the leader's conversation. Simpler but sequential.

**Split-pane mode (tmux):** Each teammate runs in a separate tmux pane. Parallel visibility, navigate with Shift+Down.

**Configuration:**
- `settings.json`: `"teammateMode": "auto"` (auto-selects based on environment), `"in-process"`, or `"tmux"`
- CLI flag: `--teammate-mode <mode>` overrides settings.json
- In tmux mode, use Shift+Down to navigate between panes and interact with individual teammates.

## Local Rules
- Ask the user before creating a team.
- Do not use Agent Teams as a blanket replacement for subagents.
- Assign one clear owner per file or responsibility area.
- Prefer Sonnet-level teammates by default. Escalate only when a stronger model is actually needed.
- Do not force review, worktree, or multi-wave orchestration for every small task.

## Role Loading
- Source teammate behavior from `~/.claude/teams/agents/<role>.md`.
- Treat `~/.claude/teams/ACTIVE_AGENTS.md` as the active catalog and `~/.claude/teams/ROLE_COMPRESSION_MAP.md` as the compression ledger.
- Load only the role files needed for the current team.
- If a desired role name does not match an existing file, choose the closest existing role file or create a properly named role file first.
- Avoid embedding long inline role prompts into team configs when an existing role file already covers the job.

## Token Cost Rules
- Every teammate starts with its own conversation context, so extra teammates multiply token usage.
- Long global instructions increase cost for every teammate. Keep `CLAUDE.md` short and move details to docs.
- Avoid sending large logs or broad code dumps to all teammates.
- Batch related work into a few well-scoped tasks instead of spawning many narrowly different teammates.
- Shut down idle teammates promptly.
- Target 5-6 tasks per teammate for optimal productivity.
- Default custom team commands should use 4 teammates, all `sonnet`, minimal kickoff intake, and only the role files actually needed.
- Prefer superpowers skills as short pre-team helpers: `brainstorming`, `writing-plans`, `dispatching-parallel-agents`, `systematic-debugging`, and `verification-before-completion`.
- Use GSD only for work that is clearly multi-phase, roadmap-like, or too large for a single execution wave.
- Use a short Ralph loop near the end of a team run to tighten quality without reopening the whole team plan.

## Canonical Team Commands
- `/e2eteam`: default end-to-end team for solo product delivery
- `/buildteam`: software planning, coding, testing, and implementation
- `/opsteam`: deployment, runtime, automation, and reliability work
- `/growthteam`: launch, content, social distribution, and metrics
- `/researchteam`: discovery, validation, trade-off analysis, and decision prep

## Subagent vs Team Routing
- Use a normal subagent for isolated research, narrow analysis, and short-lived side tasks.
- Use Agent Teams only when multiple teammates must coordinate over shared tasks or tracked parallel work.
- Start with the fewest agents that can finish the work. Prefer 2-3 teammates first; expand only if the work is truly independent.
- If a task can be handled by one teammate plus the lead, do that instead of creating a full team.
- Do not paste the whole role catalog into task prompts or global rules.

## What To Avoid
- Large default teams "just in case"
- Broadcasting non-critical messages
- Repeating the full role library in prompts
- Running separate teammates on overlapping files without a clear owner
- Keeping old teams alive after work is complete
