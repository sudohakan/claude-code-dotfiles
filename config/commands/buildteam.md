# Build Team

Use `/buildteam` to create the default software delivery team.

## Best For
- Feature work, bug fixing, refactoring, integration, and regression-safe delivery.
- Existing codebases where the main need is planning, coding, testing, and review.
- Engineering-heavy work that may need GSD execution and a Ralph loop.

## Choose Another Team If
- The task includes launch ownership beyond engineering: use `/e2eteam`.
- The task is mostly infra, deploy, runtime, or observability: use `/opsteam`.
- The task starts with research, UX direction, or product discovery: use `/researchteam`.
- The task is mostly marketing, content, social, or growth analytics: use `/growthteam`.

## Team Composition
- `tech-lead` — shared workspace (review + merge coordination)
- `backend-architect` — **worktree** (code isolation)
- `fullstack-dev` — **worktree** (code isolation)
- `qa-tester` — **worktree** (may write test fixtures/config)

## Workflow
1. **Always** start with `superpowers:brainstorming` to clarify requirements, scope, and architecture before team creation.
2. If the work spans multiple phases or code areas, use GSD planning first.
3. Collect only: feature or bug goal, codebase area, constraints, acceptance criteria.
4. Create 4 teammates, all `sonnet`. Spawn `backend-architect`, `fullstack-dev`, and `qa-tester` with `isolation: "worktree"`.
5. Load role files from `~/.claude/teams/agents/` — do not use inline prompts.
6. Follow mesh workflow (see `~/.claude/docs/agent-teams.md`):
   - Tech Lead breaks requirements into tasks via TaskCreate
   - Backend Architect and Fullstack Dev work in isolated worktrees
   - QA Tester writes and runs tests after implementation
   - Teammates communicate directly via SendMessage
   - Team leader makes intermediate decisions and approvals within the team
7. Finish with `superpowers:verification-before-completion` and a short Ralph loop.

## Token Rules
- Keep tasks file-scoped.
- No duplicate reads across teammates.
- Prefer one final integration pass over repeated review chatter.
- Keep teammates alive until the user explicitly requests shutdown.
