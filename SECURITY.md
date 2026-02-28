# Security Policy

## Overview

This repository contains **configuration files only** — no executable application code that processes external input. The security surface is limited to:

- Shell scripts (`install.ps1`, `install.sh`) that run locally with user privileges
- JavaScript hooks that execute within the Claude Code CLI sandbox
- JSON/Markdown configuration files

## Credential Safety

This repository is designed to be **credential-free**:

| Item | Status |
|------|--------|
| OAuth tokens | **Not included** — generated per-machine via `claude login` |
| API keys | **Not included** — no API keys exist in any file |
| Passwords | **Not included** — no passwords or secrets |
| Personal data | **Sanitized** — memory files contain templates only |

### Intentionally Fake Credentials

Some files within `config/skills/` (third-party skill sets) contain **deliberately fake credentials** used as test fixtures for security scanning tools:

- `sk-1234567890abcdefghijklmnop` — validator test example
- `DATABASE_PASSWORD=super_secret_password` — Dockerfile bad-practice example
- `GITHUB_TOKEN=ghp_xxx` — placeholder in documentation

These are **not real credentials** and exist solely for educational/testing purposes.

## Install Script Security

The install scripts (`install.ps1` / `install.sh`) perform the following operations:

1. **Read-only checks** — verify installed software versions
2. **Package installation** — via `winget` (Windows package manager) and `npm`
3. **File copy** — from package directory to `~/.claude/`
4. **String replacement** — update username in file paths
5. **Git clone** — HakanMCP from public GitHub repository

**No elevated privileges required.** Scripts run entirely in user space.

### Before Running

Review the install script source code before execution:

```powershell
# Read before you run
Get-Content install.ps1 | more
```

## Hooks Security

All hooks run within the Claude Code CLI hook system:

| Hook | Purpose | Risk Level |
|------|---------|------------|
| `pretooluse-safety.js` | **Blocks** dangerous git/shell commands | Protective |
| `gsd-context-monitor.js` | Monitors context window usage | Read-only |
| `gsd-statusline.js` | Displays status information | Read-only |
| `gsd-check-update.js` | Checks GSD version on startup | Read-only |
| `post-autoformat.js` | Auto-formats edited files | File write (edited files only) |
| `post-notify.js` | Windows toast notifications | OS notification API |
| `post-observability.js` | Logs tool usage to JSONL | File write (log file only) |

## Reporting a Vulnerability

If you discover a security issue in this configuration:

1. **Do NOT open a public issue**
2. Email: Open a [private security advisory](https://github.com/sudohakan/claude-code-dotfiles/security/advisories/new) on this repository
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
4. Expected response time: **72 hours**

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest `main` branch | Yes |
| Older commits | No |

## Third-Party Components

This configuration includes third-party skill sets and plugins:

| Component | Source | Security |
|-----------|--------|----------|
| GSD (Get Shit Done) | Claude Code plugin marketplace | Maintained by marketplace authors |
| Trail of Bits skills | [trailofbits/skills](https://github.com/trailofbits/skills) | Maintained by Trail of Bits |
| cc-devops-skills | Claude plugins marketplace | Community maintained |
| ui-ux-pro-max | Claude plugins marketplace | Community maintained |

Report vulnerabilities in third-party components directly to their maintainers.
