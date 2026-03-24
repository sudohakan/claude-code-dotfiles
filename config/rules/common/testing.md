# Testing Requirements

## Minimum Coverage: 80%

Required test types:
- Unit — individual functions, utilities, components
- Integration — API endpoints, database operations
- E2E — critical user flows

## TDD Workflow
1. Write test (RED — must fail)
2. Write minimal implementation (GREEN — must pass)
3. Refactor (IMPROVE)
4. Verify coverage (80%+)

## Troubleshooting Test Failures
1. Use tdd-guide agent
2. Check test isolation
3. Verify mocks are correct
4. Fix implementation, not tests (unless tests are wrong)

Use tdd-guide proactively for new features — enforces write-tests-first.
