<!-- last_updated: 2026-03-13 -->
# Plugin Profiles

This file defines the intended plugin groupings for low-context and specialized sessions.

## Source Of Truth
- Profile definitions live in `~/.claude/plugin-profiles.json`.

## Profiles
- `minimal`: lowest routine context overhead
- `dev`: general engineering work
- `security`: security-heavy review sessions

## Usage
- Use `minimal` for day-to-day coding when security analysis is not the focus.
- Use `dev` when broader engineering tooling is needed.
- Use `security` only for explicit security review or audit tasks.
