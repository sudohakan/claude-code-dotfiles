# Cross-Project Decisions Log

Cross-project architectural and technical decisions. Each decision is stored with its context.

## Format
### [Date] Decision title
**Project:** {project name} or **Global**
**Context:** {why this decision was made}
**Decision:** {what was decided}
**Alternatives:** {other options evaluated}
**Trade-off:** {what we gained, what we lost}

## Decisions

### [Setup] Git commands require user approval
**Project:** Global
**Context:** Automatic commit/push is not desired
**Decision:** Git commands are only executed when explicitly requested by the user
**Alternatives:** Automatic atomic commit (GSD default)
**Trade-off:** Gained manual control, lost automation
