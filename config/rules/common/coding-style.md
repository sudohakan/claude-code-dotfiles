# Coding Style

## Immutability
Always create new objects, never mutate existing ones. Return new copies with changes — never modify in-place.

## File Organization
- Many small files over few large files
- 200-400 lines typical, 800 max
- Extract utilities from large modules
- Organize by feature/domain, not by type

## Error Handling
- Handle errors explicitly at every level
- User-friendly messages in UI-facing code; detailed context server-side
- Never silently swallow errors

## Input Validation
- Validate all input at system boundaries before processing
- Schema-based validation where available
- Fail fast with clear error messages
- Never trust external data (API responses, user input, file content)

## Code Quality Checklist
- [ ] Readable and well-named
- [ ] Functions < 50 lines
- [ ] Files focused (< 800 lines)
- [ ] No deep nesting (> 4 levels)
- [ ] Proper error handling
- [ ] No hardcoded values
- [ ] No mutation
