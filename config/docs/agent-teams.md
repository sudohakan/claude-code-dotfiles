<!-- last_updated: 2026-03-24 -->
# Agent Teams Guide

Reference for Claude Code Agent Teams. Aligned with [code.claude.com/docs/en/agent-teams](https://code.claude.com/docs/en/agent-teams).

## When to Use a Team
- Use only when teammates need shared coordination, back-and-forth, or tracked parallel work.
- For one-off research or simple parallel work, prefer a normal subagent.
- Default team size: 3-5 teammates.

## Official Workflow
1. Create the team.
2. Add teammates with explicit roles and natural language prompts.
3. Create tasks with acceptance criteria — teammates self-claim or lead assigns.
4. Teammates communicate directly via SendMessage.
5. Shut down teammates when work is done.
6. Clean up the team.

## Communication
- Teammates communicate directly via SendMessage — not only through the leader.
- Each teammate reads `~/.claude/teams/<team-name>/config.json` to discover others.
- Leader notifies all relevant roles at start, then supervises.
- Leader intervenes for: cross-role conflicts, user-approval items, quality verification.

## PM First-Filter (Optional)
PM produces: objective (one sentence), scope boundary (in/out), acceptance criteria (measurable). Not mandatory — tech-lead can handle requirements directly. When PM sends to Tech Lead and Launch Ops is on the team, PM briefs Launch Ops simultaneously.

## Task System
- Lead creates tasks with descriptions and acceptance criteria.
- Teammates self-claim unblocked tasks or lead assigns explicitly.
- Use `TaskUpdate addBlockedBy` for dependencies.

## Task Dependencies
Block Task B on Task A only if B genuinely needs A's output. Tasks with no consumption relationship run in parallel. Don't blindly chain tasks sequentially.

## Worktree Isolation
Teammates writing/editing source code: `isolation: "worktree"`.

- Worktree: fullstack-dev, backend-architect, devops, cloud-architect, security-engineer, qa-tester, observability-engineer
- Shared workspace: product-manager, tech-lead, launch-ops, growth-lead, content-strategist, analytics-optimizer, social-media-operator, business-analyst, research-lead
- ui-ux-designer: worktree when coding, shared otherwise

## Platform Constraints
- One team per session. Clean up before starting a new one.
- No nested teams. Teammates cannot spawn their own teams.
- Lead is fixed for the team's lifetime.
- Permission inheritance: all teammates start with lead's permission mode.
- `/resume` and `/rewind` do not restore in-process teammates.

## Lead Role
- Creates tasks, monitors progress, reviews output, resolves conflicts, reports to user.
- Small fixes directly (config, 1-2 lines). Delegates substantial work.
- Escalates to user for: git commit/push, deploy, external service changes, irreversible decisions.

## Quality Gates
- Verify before marking task completed (tests, build, review).
- Tech Lead reviews before handoff.
- Use `superpowers:verification-before-completion` for substantial deliverables.

## Hooks
- `TeammateIdle`: fires when teammate goes idle. Exit code 2 sends feedback and keeps working.
- `TaskCompleted`: fires when task being marked complete. Exit code 2 blocks completion.

## Display Modes
- In-process: teammate output inline. Shift+Down to cycle.
- Split-pane (tmux): each teammate in separate pane.
- Config: `"teammateMode"` in settings.json (`"auto"`, `"in-process"`, or `"tmux"`).

## Troubleshooting
- Teammate crash: shut down, spawn fresh replacement, reassign tasks to `pending`.
- Orphaned tmux: `tmux ls` to list, `tmux kill-session -t <name>` to kill.
- Shutdown order: teammates first (reverse dependency), then leader. Only leader runs cleanup.

## Local Rules
- Create teams only via `/team` on explicit user request. Never auto-create.
- Don't use Agent Teams as a blanket replacement for subagents.
- Default: Sonnet teammates. Haiku for read-only roles.
- Start with fewest agents that can finish the work.
- Keep spawn prompts short: task context + brief role description.
- Target 5-6 tasks per teammate.
- Load role files from `~/.claude/teams/agents/<role>.md` as needed.
