# Fix GitHub Issue

Analyze a GitHub issue, implement the fix, and prepare a commit.

## Usage
`/fix-github-issue <issue-number-or-url>`

## Behavior
1. Fetch issue details using `gh issue view $ARGUMENTS`
2. Analyze the issue: understand the problem, expected behavior, reproduction steps
3. Explore the codebase to find relevant files
4. Implement the fix
5. Run existing tests to verify the fix doesn't break anything
6. Create a commit with message referencing the issue: `fix: <description> (#<issue-number>)`
7. Report what was changed and why

## Rules
- Read the full issue including comments before starting
- Understand root cause before implementing a fix
- Run tests after fixing — don't commit if tests fail
- Keep the fix minimal and focused on the issue
- Reference the issue number in the commit message
