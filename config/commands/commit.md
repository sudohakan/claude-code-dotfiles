# Git Commit

Create well-structured commits with conventional commit messages.

## Behavior
1. Run `git status` to check staged files
2. If no files are staged, show modified files and ask which to stage
3. Run `git diff --staged` to analyze changes
4. Determine if changes should be split into multiple logical commits
5. Generate conventional commit message based on the diff
6. Show the proposed commit message and ask for confirmation
7. Create the commit

## Commit Message Format
`<emoji> <type>: <description>`

Types and emojis:
- ✨ `feat`: New feature
- 🐛 `fix`: Bug fix
- 📝 `docs`: Documentation
- ♻️ `refactor`: Code refactoring
- ⚡️ `perf`: Performance improvement
- ✅ `test`: Tests
- 🔧 `chore`: Tooling, configuration
- 💄 `style`: Formatting/style
- 🔒️ `fix`: Security fix
- 🚑️ `fix`: Critical hotfix
- 🗑️ `revert`: Reverting changes
- 🏗️ `refactor`: Architectural change
- 🔥 `fix`: Remove code or files

## Rules
- Present tense, imperative mood
- First line under 72 characters
- If multiple distinct concerns detected, suggest splitting into separate commits
- Each commit should be atomic — one logical change
- Never skip hooks (no --no-verify) unless user explicitly requests
- Show the diff summary before proposing the message
