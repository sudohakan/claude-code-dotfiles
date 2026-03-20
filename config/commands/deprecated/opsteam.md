# Ops Team

Use `/opsteam` to create a 4-person operations and runtime team.

## Best For
- Deployments, CI/CD, environment setup, observability, and runtime issues.
- Production hardening, monitoring, release verification, and automation work.
- Incidents, reliability problems, platform-level changes, and tool orchestration.

## Choose Another Team If
- The work is mainly coding a product feature: use `/buildteam`.
- The work needs product strategy, research, or UX direction first: use `/researchteam`.
- The work spans discovery through build and launch in one stream: use `/e2eteam`.
- The work is mostly content, launch distribution, social, or metrics: use `/growthteam`.

## Team Composition
- `devops` — **worktree** (edits config/scripts)
- `cloud-architect` — **worktree** (edits infra code)
- `observability-engineer` — **worktree** (may write config)
- `security-engineer` — **worktree** (may edit security config)

## Workflow
1. If the issue is incident-like, start with `superpowers:systematic-debugging`.
2. **Always** start with `superpowers:brainstorming` to clarify the operational goal, scope, and constraints before team creation.
3. If the operational change is multi-phase, use GSD planning first.
4. Gather only: environment, operational problem or deployment goal, constraints, success signal.
5. Create 4 teammates, all `sonnet`. Spawn all 4 teammates with `isolation: "worktree"` (all may edit config/scripts).
6. Load role files from `~/.claude/teams/agents/` — do not use inline prompts.
7. Follow mesh workflow (see `~/.claude/docs/agent-teams.md`):
   - Teammates communicate directly via SendMessage
   - Team leader makes intermediate decisions and approvals within the team
   - DevOps and Cloud Architect work in isolated worktrees
8. Finish with `superpowers:verification-before-completion` and a short Ralph loop.

## Token Rules
- Prefer concrete config/runtime evidence over long discussion.
- Keep infra reads targeted.
- No broad retrospectives while the team is active.
- Keep teammates alive until the user explicitly requests shutdown.
