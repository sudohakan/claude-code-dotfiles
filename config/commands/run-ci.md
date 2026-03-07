# Run CI Checks

Run project CI/test pipeline locally and fix errors iteratively until all checks pass.

## Behavior
1. Detect project type and find the appropriate test/CI command:
   - Node.js: `npm test` / `npm run lint` / `npm run build`
   - .NET: `dotnet test` / `dotnet build`
   - Python: `pytest` / `python -m pytest`
   - Custom: look for CI scripts (`run-ci.sh`, `.github/workflows/`)
2. Run the detected CI commands
3. If any check fails:
   - Analyze the error output
   - Implement the fix
   - Re-run the failing check
   - Repeat until it passes
4. Run all checks one final time to confirm everything passes
5. Report results summary

## Rules
- Auto-detect project type from files present (package.json, .csproj, requirements.txt, etc.)
- Fix errors iteratively — don't give up after first failure
- Maximum 5 fix iterations per error to prevent infinite loops
- Report each fix applied
- Don't commit fixes — let the user review and decide
