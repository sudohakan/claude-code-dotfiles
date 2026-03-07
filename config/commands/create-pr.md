# Create Pull Request

Create a new branch, commit changes, and submit a pull request.

## Behavior
1. Run `git status` and `git diff` to understand current changes
2. Create a new branch with semantic naming (feat/, fix/, docs/, refactor/, chore/)
3. Stage and commit changes — split into logical commits when appropriate
4. Push branch to remote with `-u` flag
5. Create pull request using `gh pr create` with summary and test plan

## Branch Naming
`<type>/<short-description>` — e.g., `feat/user-auth`, `fix/memory-leak`

## PR Template
```
## Summary
<1-3 bullet points describing what changed and why>

## Test Plan
<checklist of verification steps>
```

## Commit Splitting Guidelines
- Split by feature, component, or concern
- Keep related file changes together
- Separate refactoring from feature additions
- Each commit should be independently understandable

## Rules
- Ask user for target branch if not obvious (default: main)
- Show branch name and commit messages for approval before pushing
- Never force push
- Return the PR URL when done
