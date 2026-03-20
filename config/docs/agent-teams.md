# Agent Teams Guide

This file is the local reference for Claude Code Agent Teams. It is aligned with the official documentation at [code.claude.com/docs/en/agent-teams](https://code.claude.com/docs/en/agent-teams).

## When To Use A Team
- Use a team only when teammates need shared coordination, back-and-forth discussion, or tracked parallel work.
- For one-off research, isolated reads, or simple parallel work, prefer a normal subagent.
- Keep the default team size small: 3-5 teammates.

## Official Workflow
1. Create the team.
2. Add teammates with explicit roles and natural language prompts.
3. Create tasks with acceptance criteria — teammates self-claim or lead assigns.
4. Teammates communicate directly via SendMessage.
5. Shut teammates down when their work is done.
6. Clean up the team after completion.

## Communication
- Teammates communicate directly via SendMessage — not only through the team leader.
- Each teammate reads `~/.claude/teams/<team-name>/config.json` to discover other teammates.
- Team leader notifies all relevant roles at start, then supervises.
- Team leader intervenes for: cross-role conflicts, user-approval items, quality verification.

## PM First-Filter (Optional)
When PM is on the team, goals can pass through PM first for scoping. PM produces:
1. Objective (one sentence)
2. Scope boundary (in / out)
3. Acceptance criteria (measurable)

This is recommended but not mandatory. For simple tasks or when PM is not on the team, tech-lead or the lead can handle requirements directly.

When PM sends requirements to Tech Lead and Launch Ops is on the team, PM also sends a brief to Launch Ops simultaneously so they can prepare in parallel.

## Task System
All implementation work should go through TaskCreate for visibility and tracking:
- Lead creates tasks with clear descriptions and acceptance criteria.
- Teammates self-claim unblocked tasks or lead assigns explicitly.
- Use `TaskUpdate addBlockedBy` for task dependencies when needed.

## Task Dependencies
When creating task dependencies, analyze **real data dependencies** — not plan/phase ordering:
- Only block Task B on Task A if Task B genuinely needs Task A's output.
- Tasks with no consumption relationship run in parallel.
- Avoid blindly chaining tasks in sequential order.

## Worktree Isolation
Teammates that write/edit project source code should be spawned with `isolation: "worktree"`:
- **Worktree:** fullstack-dev, backend-architect, devops, cloud-architect, security-engineer, qa-tester, observability-engineer
- **Shared workspace:** product-manager, tech-lead, launch-ops, growth-lead, content-strategist, analytics-optimizer, social-media-operator, business-analyst, research-lead
- **ui-ux-designer:** worktree when coding, shared workspace otherwise

## Platform Constraints
- **One team per session:** Clean up the current team before starting a new one.
- **No nested teams:** Teammates cannot spawn their own teams.
- **Lead is fixed:** The session that creates the team is the lead for its lifetime.
- **Permission inheritance:** All teammates start with the lead's permission mode.
- **No session resumption for in-process teammates:** `/resume` and `/rewind` do not restore in-process teammates.

## Lead Role
The team leader coordinates, delegates, and verifies:
- Creates tasks and monitors progress.
- Reviews teammate output for quality.
- Resolves cross-role conflicts.
- Reports results to the user.
- **May do small fixes directly** (config edits, 1-2 line changes) but delegates substantial implementation to teammates.
- Escalates to the user for: git commit/push, deploy, external service changes, irreversible decisions.

## Quality Gates
- Before marking a task `completed`, run verification (tests, build, review).
- Tech Lead reviews implementation output before handoff.
- Use `superpowers:verification-before-completion` for substantial deliverables.

## Hooks
Claude Code supports `TeammateIdle` and `TaskCompleted` hooks via `settings.json`:
- **TeammateIdle:** Fires when a teammate is about to go idle. Exit code 2 sends feedback and keeps the teammate working.
- **TaskCompleted:** Fires when a task is being marked complete. Exit code 2 blocks completion and sends feedback.

## Display Modes
- **In-process:** Teammate output inline in leader's conversation. Use Shift+Down to cycle.
- **Split-pane (tmux):** Each teammate in a separate tmux pane. Parallel visibility.
- Configuration: `"teammateMode"` in settings.json (`"auto"`, `"in-process"`, or `"tmux"`).

## Troubleshooting

**Teammate error recovery:** If a teammate crashes, shut it down and spawn a fresh replacement. Reassign its tasks back to `pending`.

**Orphaned tmux sessions:** Run `tmux ls` to list sessions. Kill orphaned ones with `tmux kill-session -t <name>`.

**Premature lead shutdown:** Always shut down teammates first, then the leader.

## Shutdown
Use natural language to ask teammates to shut down:
- Shut down teammates in reverse dependency order.
- Never shut down teammates without explicit user request.
- After all teammates stop, the lead runs cleanup.
- Only the lead runs cleanup — teammates must never run cleanup.

## Local Rules
- Teams are created only when the user explicitly invokes `/team`. Never auto-create teams.
- Do not use Agent Teams as a blanket replacement for subagents.
- Prefer Sonnet-level teammates by default. Use Haiku for read-only roles to save tokens.
- Start with the fewest agents that can finish the work.
- Keep spawn prompts short: task context + brief role description. Do not embed full workflow rules.
- Target 5-6 tasks per teammate for optimal productivity.

## Role Loading
- Source teammate behavior from `~/.claude/teams/agents/<role>.md`.
- Load only the role files needed for the current team.
- Role files are kept short (~25 lines) to minimize context consumption.

## Canonical Team Command
- `/team`: unified command for all team types — embeds brainstorming, infers configuration, and creates any team.
