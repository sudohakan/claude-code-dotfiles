# Security Guidelines

## Pre-Commit Checklist
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized HTML)
- [ ] CSRF protection enabled
- [ ] Authentication/authorization verified
- [ ] Rate limiting on all endpoints
- [ ] Error messages don't leak sensitive data

## Secret Management
- Never hardcode secrets in source code
- Always use environment variables or a secret manager
- Validate required secrets are present at startup
- Rotate any secrets that may have been exposed

## Security Response Protocol
1. Stop immediately
2. Use security-reviewer agent
3. Fix CRITICAL issues before continuing
4. Rotate any exposed secrets
5. Review codebase for similar issues
