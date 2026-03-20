# Active Agents

This file defines the core role set used by Agent Teams. The goal is to keep role selection short, traceable, and token-efficient.

## Rules
- The number of active agents is limited to the core roles used by existing team commands
- When a new need arises, first extend one of the existing core roles before adding a new one
- Compressed specialty mappings are kept in `ROLE_COMPRESSION_MAP.md`

## Active Core Roles
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
- This list is not a favorites list; it defines the active library.
- This list consists of roles actually used by the current team commands (`/e2eteam`, `/buildteam`, `/opsteam`, `/growthteam`, `/researchteam`).
- When building a team, if the exact role is not available, select the closest active role.
- The primary source of role behavior is the `teams/agents/<role>.md` file.
