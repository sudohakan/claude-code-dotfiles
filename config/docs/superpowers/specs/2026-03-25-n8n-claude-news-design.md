# n8n Integration & Claude News Command — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Scope:** n8n MCP entegrasyonu + /claude-news komutu

---

## 1. n8n Docker Setup

### Infrastructure

| Component | Detail |
|-----------|--------|
| Runtime | Docker Compose on WSL |
| Database | PostgreSQL (production-ready) |
| Bind | `0.0.0.0:5678` (LAN accessible) |
| Auth | Owner account (created on first-run setup wizard) |
| Network | Same-network devices can access n8n UI |

### Docker Compose

```yaml
services:
  n8n:
    image: n8nio/n8n:1.82.1
    restart: always
    ports:
      - "0.0.0.0:5678:5678"
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=${POSTGRES_USER}
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
      - WEBHOOK_URL=http://${HOST_IP}:5678/
      - GENERIC_TIMEZONE=Europe/Istanbul
      - N8N_DEFAULT_LOCALE=en
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d n8n"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  n8n_data:
  postgres_data:
```

### Directory

```
C:\dev\n8n\
  docker-compose.yml
  .env                  # POSTGRES_USER, POSTGRES_PASSWORD, HOST_IP
```

### First-Run Setup

1. `docker compose up -d`
2. Open `http://localhost:5678` in browser
3. Complete owner account setup wizard (username + password)
4. Go to Settings -> API -> Create Personal Access Token
5. Save token as `N8N_API_KEY` in `C:\dev\n8n\.env`

### HOST_IP Note

WSL2 NAT mode: WSL IP changes on every restart. `HOST_IP` must be the Windows LAN IP (from `ipconfig /all` on Windows side), not the WSL IP. Update `.env` when network changes. If webhooks are not used, `WEBHOOK_URL` can be omitted.

---

## 2. n8n MCP Configuration

### .claude.json Entry

Uses env wrapper pattern per `reference_mcp_env_wrapper_pattern.md`:

```json
{
  "mcpServers": {
    "n8n": {
      "type": "stdio",
      "command": "/home/hakan/.claude/scripts/n8n-mcp-wrapper.sh",
      "args": [],
      "env": {},
      "timeout": 60000
    }
  }
}
```

Timeout 60s: npx cold-start downloads n8n-mcp on first run.

### Wrapper Script (`~/.claude/scripts/n8n-mcp-wrapper.sh`)

```bash
#!/bin/bash
ENV_FILE="/mnt/c/dev/n8n/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  while IFS='=' read -r key value; do
    key=$(echo "$key" | tr -d '\r')
    value=$(echo "$value" | tr -d '\r')
    [[ -z "$key" || "$key" == \#* ]] && continue
    export "$key=$value"
  done < "$ENV_FILE"
  set +a
fi
export N8N_API_URL="${N8N_API_URL:-http://localhost:5678}"
export MCP_MODE="stdio"
export DISABLE_CONSOLE_OUTPUT="true"
export LOG_LEVEL="error"
exec npx -y n8n-mcp@latest
```

Save with LF encoding. `N8N_API_URL` sourced from `.env` with localhost fallback.

API key: generated from n8n UI -> Settings -> API -> Personal Access Token, stored in `C:\dev\n8n\.env` as `N8N_API_KEY`.

### .env Template (`C:\dev\n8n\.env`)

```env
POSTGRES_USER=n8n
POSTGRES_PASSWORD=<generate-secure-password>
HOST_IP=192.168.1.x
N8N_API_KEY=<from-n8n-ui-after-first-run>
N8N_API_URL=http://localhost:5678
```

### MCP Capabilities

| Tool | Purpose |
|------|---------|
| n8n_search_nodes | Find n8n nodes by name/category |
| n8n_create_workflow | Build workflow from JSON definition |
| n8n_update_full_workflow | Replace entire workflow |
| n8n_update_partial_workflow | Modify workflow partially |
| n8n_delete_workflow | Remove workflow |
| n8n_get_workflow | Read workflow details |
| n8n_list_workflows | List all workflows |
| n8n_executions | View workflow execution history |
| validate_workflow | AI-powered workflow validation |

---

## 3. /n8n Command

**File:** `~/.claude/commands/n8n.md`

**Purpose:** Shortcut for n8n workflow operations via MCP.

**Subcommands:**

| Usage | Action |
|-------|--------|
| `/n8n list` | List all workflows with status |
| `/n8n create <description>` | Create workflow from natural language description |
| `/n8n run <id>` | Execute workflow via n8n REST API (`POST /api/v1/workflows/{id}/run`) |
| `/n8n status` | Show n8n instance health + active workflow count |
| `/n8n logs <id>` | Show recent executions for a workflow |

---

## 4. /claude-news Command

**File:** `~/.claude/commands/claude-news.md`

### Data Sources

| Source | URL/Method | Data |
|--------|-----------|------|
| GitHub Releases API | `GET /repos/anthropics/claude-code/releases` | Release notes, tags, dates |
| npm Registry | `GET registry.npmjs.org/@anthropic-ai/claude-code` | Latest version, publish date (fallback if GitHub rate-limited) |
| marckrenn flags | `GET raw.githubusercontent.com/marckrenn/claude-code-changelog/main/cc-flags.md` | Feature flags, CLI flags |
| marckrenn prompt | `GET raw.githubusercontent.com/marckrenn/claude-code-changelog/main/cc-prompt.md` | System prompt changes |
| Local version | `claude --version` | Currently installed version |

### Rate Limit Handling

- GitHub unauthenticated: 60 req/hour. If `GITHUB_TOKEN` env var present, 5000/hour.
- On HTTP 403 (rate limited): fall back to npm registry only.
- npm registry: no rate limit.

### Output Format

```
Claude Code v{current} → v{latest} ({n} sürüm geride, {date} yayınlandı)

Yeni özellikler:
  - Feature 1 description
  - Feature 2 description

Bug fixes:
  - Fix 1
  - Fix 2

Breaking changes:
  - Change 1 (migration note)

Öneriler:
  [1] {Feature} — {how it benefits your setup} → uygula? (y/n)
  [2] {Feature} — {how it benefits your setup} → uygula? (y/n)

Upgrade: npm update -g @anthropic-ai/claude-code
```

### Integration Suggestions Logic

When a new feature is detected:
1. Check if it maps to an existing skill, command, hook, or MCP config
2. If yes: suggest how to leverage it in existing setup
3. If no: suggest adding new skill/command/config
4. On user approval: execute the change (edit config, create command, update hook)

Examples:
- New MCP transport type → suggest updating .claude.json
- New hook type → suggest creating hook script
- New CLI flag → suggest updating relevant commands
- New model available → suggest updating model selection table in CLAUDE.md

### Output Language

Command output follows user's language (Turkish). Mixed-language is intentional: technical terms (Bug fixes, Breaking changes) stay English, descriptions in Turkish.

### Caching

- GitHub API: cache raw response for 1 hour (avoid rate limits)
- Cache file: `~/.claude/cache/claude-news.json` (persistent across WSL restarts)
- Force refresh: `/claude-news --refresh`

Cache schema:
```json
{
  "fetched_at": "2026-03-25T10:00:00Z",
  "github_releases": [...],
  "npm_latest": "2.2.0",
  "local_version": "2.1.81"
}
```

---

## 5. File Changes Summary

| File | Action | Purpose |
|------|--------|---------|
| `C:\dev\n8n\docker-compose.yml` | Create | n8n + PostgreSQL Docker setup |
| `C:\dev\n8n\.env` | Create | Credentials (not committed) |
| `~/.claude/scripts/n8n-mcp-wrapper.sh` | Create | Env wrapper for n8n MCP |
| `~/.claude.json` (both WSL + Windows) | Edit | Add n8n MCP server |
| `~/.claude/commands/n8n.md` | Create | /n8n command |
| `~/.claude/commands/claude-news.md` | Create | /claude-news command |
| `~/.claude/cache/` | Create dir | Cache directory for claude-news |
| `~/CLAUDE.md` (global) | Edit | Add n8n and /claude-news to reference tables |
| `~/.claude/projects/-mnt-c-Users-Hakan/memory/MEMORY.md` | Edit | Add n8n reference |

---

## 6. Dependencies

| Dependency | Status |
|------------|--------|
| Docker + Docker Compose | Already installed (WSL) |
| npx | Already available |

---

## 7. Success Criteria

- [ ] n8n Docker running on WSL, accessible from LAN
- [ ] n8n owner account created, API token generated
- [ ] n8n MCP connected in Claude Code via env wrapper, workflow CRUD works
- [ ] /n8n command functional (list, create, run, status, logs)
- [ ] /claude-news --refresh fetches live data, shows version diff matching `claude --version`
- [ ] /claude-news shows changelog and integration suggestions when updates available
- [ ] /claude-news integration suggestions apply changes on user approval
- [ ] /claude-news exits cleanly with "Güncel" message when no updates available
