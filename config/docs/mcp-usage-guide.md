<!-- last_updated: 2026-03-24 -->
# MCP Usage Guide

## context7
Query before writing code with any third-party library or API.
- Trigger: third-party library, framework, or API; unclear signature, config option, or best practice
- Not for: standard language built-ins (Array.map, string methods, etc.)

## Gmail
- Trigger: writing/drafting email, reading/researching threads, searching email history
- Not for: tasks unrelated to communication

## Google Calendar
- Trigger: scheduling, checking availability, creating events, responding to invitations
- Not for: non-calendar time management

## HakanMCP Browser Bridge
- Trigger: browser automation, login probing, screenshot proof, JS-heavy page inspection
- Preferred tools: `mcp_browserConnect`, `mcp_browserNavigateExtract`, `mcp_browserProbeLogin`, `mcp_browserCaptureProof`
- Raw actions only via `mcp_callTool` when wrappers are insufficient
- Not for: static HTML analysis (use Read tool)

## HakanMCP (112 tools)

| Category | Example Tools | When to Use |
|----------|--------------|-------------|
| Git/GitHub | branch, PR, commit analysis | Code review, history, repo ops |
| MongoDB | query, monitor, aggregate | DB inspection, data analysis |
| API Testing | Postman runner | Endpoint validation, regression |
| System Monitoring | performance, health | Infra diagnostics |
| Scheduler | manage tasks | Job scheduling, cron ops |
| Knowledge Graph | query, relate | Entity lookup, semantic search |
| AI/Swarm | provider, orchestration | AI workflow coordination |
| Backup | create, restore | File/DB backup operations |

Not for: simple file reads or text processing.

## notebooklm-mcp-cli (35 tools)
- Trigger: deep research synthesis across multiple sources, NotebookLM notebooks, audio/video/slide generation
- Not for: single-document reading (use Read tool)

## When to Minimize MCP Usage
- Pure code editing in a single file
- Narrow-scope project work — only use project-relevant MCPs
- Context window under pressure — disable inactive MCPs
