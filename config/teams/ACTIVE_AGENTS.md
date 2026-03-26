# Active Agents

Defines the core role set for Agent Teams. Purpose: keep role selection short, traceable, and token-efficient.

## Rules
- Active agent count is limited to core roles used by team commands.
- Expand an existing core role before adding a new one.
- Compressed specialty mappings live in `ROLE_COMPRESSION_MAP.md`.

## Core Roles
- `backend-architect`
- `business-analyst`
- `cloud-architect`
- `content-strategist`
- `devops`
- `fullstack-dev`
- `growth-lead`
- `launch-ops`
- `observability-engineer`
- `analytics-optimizer`
- `product-manager`
- `qa-tester`
- `research-lead`
- `security-engineer`
- `social-media-operator`
- `tech-lead`
- `ui-ux-designer`

## Notes
- This is the active library, not a favorites list.
- Use `/team` command for team creation (individual team commands deprecated).
- Pick the nearest active role if an exact match is unavailable.
- Role behavior is defined in `teams/agents/<role>.md`.
