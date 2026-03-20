# Security Scan — Agent Config Audit

Scan Claude Code configuration for security vulnerabilities using AgentShield.

## Usage
`/security-scan` — full scan of `~/.claude/`
`/security-scan --fix` — auto-fix safe issues
`/security-scan --min-severity medium` — filter by severity

## Execution

Run AgentShield against the Claude config directory:

```bash
npx ecc-agentshield scan --path ~/.claude
```

### With auto-fix:
```bash
npx ecc-agentshield scan --path ~/.claude --fix
```

### With severity filter:
```bash
npx ecc-agentshield scan --path ~/.claude --min-severity medium
```

## What It Checks

| File | Checks |
|------|--------|
| CLAUDE.md | Hardcoded secrets, auto-run instructions, prompt injection |
| settings.json | Overly permissive allow lists, missing deny lists |
| MCP servers | Risky servers, hardcoded env secrets, npx supply chain |
| hooks/ | Command injection, data exfiltration, silent error suppression |
| agents/ | Unrestricted tool access, prompt injection surface |

## Severity Grades

| Grade | Score | Action |
|-------|-------|--------|
| A | 90-100 | Secure |
| B | 75-89 | Minor issues |
| C | 60-74 | Needs attention |
| D | 40-59 | Significant risks |
| F | 0-39 | Critical — fix immediately |

## After Scan

1. Fix CRITICAL findings immediately
2. Fix HIGH findings before production use
3. Review MEDIUM findings
4. INFO findings are awareness only
