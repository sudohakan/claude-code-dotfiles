# Growth Team

Use `/growthteam` to create the default launch, content, and distribution team.

## Best For
- Launch planning, release messaging, landing copy, campaign framing, and channel execution.
- Social media planning, content operations, and lightweight growth analytics.
- Post-release follow-through where the product already exists and the need is distribution.

## Choose Another Team If
- The work is mainly engineering delivery: use `/buildteam`.
- The work spans full product framing through build and launch: use `/e2eteam`.
- The work is mostly infra, deploy, and runtime operations: use `/opsteam`.
- The work is mostly research, validation, prioritization, or UX discovery: use `/researchteam`.

## Team Composition
- `growth-lead` — shared workspace
- `content-strategist` — shared workspace
- `social-media-operator` — shared workspace
- `analytics-optimizer` — shared workspace

No worktree needed — this team does not edit source code.

## Workflow
1. **Always** start with `superpowers:brainstorming` to clarify audience, offer, channels, and launch angle before team creation.
2. Gather only: offer or release, target audience, channels, success metric.
3. Create 4 teammates, all `sonnet`. All shared workspace.
4. Load role files from `~/.claude/teams/agents/` — do not use inline prompts.
5. Follow mesh workflow (see `~/.claude/docs/agent-teams.md`):
   - Teammates communicate directly via SendMessage
   - Team leader makes intermediate decisions and approvals within the team
6. Keep the team focused on output assets, launch plan, and measurement.
7. Finish with `superpowers:verification-before-completion` and a short Ralph loop.

## Token Rules
- Prefer short asset drafts over long strategy essays.
- Do not paste full source material into team chat.
- Stop when launch assets and measurement plan are clear.
- Keep teammates alive until the user explicitly requests shutdown.
