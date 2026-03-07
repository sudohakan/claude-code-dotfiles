# Release

Manage a software release: changelog, version bump, and documentation.

## Behavior
1. Check changes since last version tag: `git log $(git describe --tags --abbrev=0)..HEAD --oneline`
2. Analyze the scope of changes to determine version increment:
   - **patch** (x.y.Z): bug fixes, minor changes
   - **minor** (x.Y.0): new features, non-breaking changes
   - **major** (X.0.0): breaking changes
3. Update CHANGELOG.md with changes since last release (Keep a Changelog format)
4. Review README.md for any necessary updates
5. Update VERSION file (or package.json version) with new version number
6. Show all proposed changes for user approval
7. On approval: stage, commit with `vX.Y.Z` in message, create tag

## Rules
- Never auto-commit — show changes and ask for approval
- Follow Keep a Changelog format
- Use semantic versioning
- Commit message format: `release: vX.Y.Z`
- Tag format: `vX.Y.Z`
- Don't push — let the user decide when to push
