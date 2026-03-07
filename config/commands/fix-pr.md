# Fix PR Comments

Fetch unresolved review comments on the current branch's PR and fix them.

## Behavior
1. Detect current branch with `git branch --show-current`
2. Find associated PR using `gh pr view --json number,url,reviewDecision`
3. Fetch unresolved review comments using `gh api repos/{owner}/{repo}/pulls/{number}/comments`
4. For each unresolved comment:
   - Read the referenced file and line
   - Understand the reviewer's feedback
   - Implement the fix
   - Mark as addressed
5. Run tests to verify fixes don't break anything
6. Create a commit: `fix: address PR review comments`
7. Push to the same branch

## Rules
- Read ALL unresolved comments before starting fixes
- Group related comments and fix them together
- Don't blindly apply suggestions — evaluate if they make sense
- If a comment is unclear or questionable, ask the user before implementing
- Never force push
