# E2E Team

Use `/e2eteam` to create the default 4-person team for solo end-to-end delivery.

## Best For
- New product, MVP, or feature stream that spans framing, build, release, and launch follow-through.
- Ambiguous requests where one compact team must own the full path.
- Work that may need GSD planning, implementation, release coordination, and a final Ralph loop.

## Choose Another Team If
- The task is mostly implementation and testing inside an existing codebase: use `/buildteam`.
- The task is mostly deploy, runtime, automation, or incident work: use `/opsteam`.
- The task is mostly launch, content, social, and metrics: use `/growthteam`.
- The task is mostly discovery, analysis, or decision preparation: use `/researchteam`.

## Team Composition
- `product-manager` — shared workspace
- `tech-lead` — shared workspace (review + merge coordination)
- `fullstack-dev` — **worktree** (code isolation)
- `launch-ops` — shared workspace

## Workflow
1. **Always** start with `superpowers:brainstorming` to clarify objective, scope, and constraints before team creation.
2. If the work is multi-phase or large, route into GSD before team creation.
3. Collect only: objective, deliverable, constraints, done criteria.
4. Create 4 teammates, all `sonnet`. Spawn `fullstack-dev` with `isolation: "worktree"`.
5. Load role files from `~/.claude/teams/agents/` — do not use inline prompts.
6. Follow mesh workflow (see `~/.claude/docs/agent-teams.md`):
   - PM first-filter: PM analyzes scope and writes requirements before tech work begins
   - PM sends requirements to Tech Lead AND ops brief to Launch Ops simultaneously
   - Tech Lead assigns implementation tasks via TaskCreate to Fullstack Dev
   - Teammates communicate directly via SendMessage — team leader does not relay
   - Team leader makes intermediate decisions and approvals within the team
7. Use direct messages only; no broad broadcasts unless all teammates are blocked.
8. Run `superpowers:verification-before-completion` before reporting completion.

## Token Rules
- Keep kickoff under 8 bullets.
- No sub-teams.
- No repeated re-briefing.
- Keep teammates alive until the user explicitly requests shutdown.
