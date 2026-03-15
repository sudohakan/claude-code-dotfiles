# MCP Usage Guide

## When to Use Which MCP

### context7
**Always query before writing code with third-party libraries/APIs.**
- Trigger: Third-party library, framework, or API in use
- Trigger: API signature, config option, or best practice unclear
- Example: "Using React Query — what is the `invalidateQueries` signature?"
- Example: "Setting up Prisma relations for the first time"
- Do NOT use: for standard language built-ins (Array.map, string methods, etc.)

### Gmail
- Trigger: Writing or drafting an email
- Trigger: Reading/researching past threads related to a task
- Trigger: Searching for context in email history
- Example: "Draft a follow-up to the API integration discussion"
- Do NOT use: for tasks unrelated to communication

### Google Calendar
- Trigger: Scheduling a meeting or checking availability
- Trigger: Creating an event or responding to an invitation
- Example: "Find a free slot this week for a 30-minute sync"
- Example: "Create a recurring standup on Tuesdays at 10:00"
- Do NOT use: for non-calendar time management

### Playwright
- Trigger: Browser automation task
- Trigger: UI testing or end-to-end test execution
- Trigger: Web scraping or live site inspection
- Example: "Take a screenshot of the dashboard after login"
- Example: "Fill and submit the registration form"
- Do NOT use: for static HTML analysis (use Read instead)

### HakanMCP (131 tools)
- Trigger: Any task in the categories below

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

- Do NOT use: for simple file reads or text processing

### notebooklm-mcp-cli (35 tools)
- Trigger: Deep research synthesis across multiple sources
- Trigger: Creating or querying a NotebookLM notebook
- Trigger: Generating audio/video/slide output from research

| Category | When to Use |
|----------|-------------|
| Notebook CRUD | Create, open, delete notebooks |
| Source ingestion | Add URL, file, Google Drive doc |
| Query/chat | Ask questions across sources |
| Media generation | Audio overview, briefing doc |
| Cross-notebook | Search across multiple notebooks |

- Example: "Summarize these 3 API docs into a comparison table"
- Do NOT use: for single-document reading (use Read tool instead)

---

## When to Disable / Minimize MCP Usage
- Pure code editing in a single file — no MCP needed
- Narrow-scope project work (working inside `source/repos/X`) — only use project-relevant MCPs
- When context window is under pressure — disable inactive MCPs
