# Research Team

Use `/researchteam` to create the default discovery and decision-support team.

## Best For
- Product discovery, market validation, tool selection, architectural comparison, and UX framing.
- Early-stage planning before code is written.
- Unclear problems where evidence, options, and decision quality matter most.

## Choose Another Team If
- The task is already approved and mainly implementation work: use `/buildteam`.
- The task is mostly deploy, runtime, or operational debugging: use `/opsteam`.
- The task is mainly launch, content, social, or measurement: use `/growthteam`.
- The task needs one team to carry work from idea to shipped result: use `/e2eteam`.

## Team Composition
- `research-lead` — shared workspace
- `product-manager` — shared workspace
- `business-analyst` — shared workspace
- `ui-ux-designer` — shared workspace

No worktree needed — this team does not edit source code.

## Workflow
1. **Always** start with `superpowers:brainstorming` to clarify the research problem, decision scope, and constraints before team creation.
2. If the outcome should feed a larger delivery stream, write the output in GSD-friendly form.
3. Gather only: problem, decision to make, constraints, decision deadline.
4. Create 4 teammates, all `sonnet`. All shared workspace.
5. Load role files from `~/.claude/teams/agents/` — do not use inline prompts.
6. Follow mesh workflow (see `~/.claude/docs/agent-teams.md`):
   - Teammates communicate directly via SendMessage
   - Team leader makes intermediate decisions and approvals within the team
7. Finish once a clear recommendation, trade-off view, and next-step path exist.
8. Use a short Ralph loop if the output will drive build or launch work.

## Token Rules
- Keep summaries short and comparative.
- Prefer options with trade-offs over long raw notes.
- Stop after a decision-ready output is produced.
- Keep teammates alive until the user explicitly requests shutdown.
