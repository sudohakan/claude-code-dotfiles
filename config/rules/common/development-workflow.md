# Development Workflow

Extends `git-workflow.md` with the full pipeline that happens before git operations.

## Feature Implementation Workflow

0. **Research & Reuse** (mandatory before any new implementation)
   - `gh search repos` and `gh search code` for existing implementations first
   - Context7 or vendor docs for API behavior and version details
   - Exa only when the above two are insufficient
   - Search npm/PyPI/crates.io before writing utility code
   - Prefer adopting a proven approach over writing net-new code

1. **Plan First**
   - Use planner agent — generate PRD, architecture, system_design, tech_doc, task_list before coding
   - Identify dependencies and risks; break into phases

2. **TDD Approach**
   - Use tdd-guide agent
   - RED → GREEN → IMPROVE
   - Verify 80%+ coverage

3. **Commit & Push**
   - Conventional commits format
   - See `git-workflow.md`
