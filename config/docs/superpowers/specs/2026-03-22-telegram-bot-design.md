# Claude Telegram Bot — SSH Tunnel + Remote Claude Access

**Date:** 2026-03-22
**Status:** Approved
**Project dir:** `/mnt/c/dev/claude-telegram-bot`

## Overview

Multi-user Telegram bot providing:
1. SSH tunnel management via ngrok with monitoring and auto-recovery
2. Remote Claude Code CLI access with session management and file operations
3. Full system monitoring with anomaly detection and alerting
4. WSL fallback watchdog via Windows Task Scheduler

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Telegram    │────▶│  Bot Core        │────▶│  Claude CLI │
│  Users       │◀────│  (Python)        │◀────│  (sessions) │
└─────────────┘     │                  │     └─────────────┘
                    │  ┌────────────┐  │     ┌─────────────┐
                    │  │ Auth       │  │────▶│  ngrok      │
                    │  │ Manager    │  │◀────│  (SSH tunnel)│
                    │  └────────────┘  │     └─────────────┘
                    │  ┌────────────┐  │     ┌─────────────┐
                    │  │ System     │  │────▶│  Metrics    │
                    │  │ Monitor    │  │◀────│  (psutil)   │
                    │  └────────────┘  │     └─────────────┘
                    │  ┌────────────┐  │
                    │  │ Fallback   │  │
                    │  │ Watchdog   │  │
                    │  └────────────┘  │
                    └──────────────────┘
```

## Tech Stack

- **Language:** Python 3.12+
- **Telegram:** python-telegram-bot (async)
- **System monitoring:** psutil
- **Database:** SQLite (aiosqlite)
- **Process management:** asyncio subprocess
- **Tunnel:** ngrok CLI + localhost:4040 API
- **Service:** systemd user service (WSL)
- **Fallback:** PowerShell watchdog (Windows Task Scheduler)

## Module 1: Auth Manager

### User Roles

| Role | How created | Claude access | SSH info | System stats | Commands |
|------|------------|---------------|----------|-------------|----------|
| Admin | Config (Telegram ID) | Full access (any dir) | Yes | Yes | All + user management |
| User | Invite token | Sandbox initially, admin upgrades (sandbox → project → full) | Yes | Basic | Claude, SSH, status |
| Viewer | Admin assigns | None | No | View only | /status, /ping |

### Access Levels (for Claude Bridge)

| Level | Working directory | Claude flags |
|-------|-----------------|-------------|
| Sandbox | `/tmp/claude-sandbox/{user_id}/` | `claude -p` (stateless, no file access) |
| Project | `/home/hakan/claude-users/{username}/` | `claude -p --cwd {dir}` (isolated dir) |
| Full | Any directory | `claude -p --cwd {dir}` (admin sets) |

### Invite Flow

1. Admin sends `/invite` → bot generates 8-char single-use token (24h expiry)
2. New user sends `/start TOKEN123` → bot validates, registers as sandbox user
3. Admin sends `/promote @user project` or `/promote @user full` to upgrade
4. Admin sends `/revoke @user` to remove access

### Database Schema

```sql
-- users.db at ~/.claude-telegram-bot/data/users.db

CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    telegram_id INTEGER UNIQUE NOT NULL,
    username TEXT,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    access_level TEXT NOT NULL DEFAULT 'sandbox' CHECK (access_level IN ('sandbox', 'project', 'full')),
    invited_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP
);

CREATE TABLE invites (
    id INTEGER PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    created_by INTEGER NOT NULL,
    used_by INTEGER,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE claude_sessions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    working_dir TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE command_log (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    command TEXT NOT NULL,
    response_length INTEGER,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Retention: keep last 30 days, purge older rows daily
-- DB init: PRAGMA journal_mode=WAL (concurrent read safety)
-- All writes serialized through async queue
-- Daily backup: users.db → users.db.bak
```

## Module 2: Claude Bridge

### Message Flow

1. User sends message via Telegram
2. Bot checks auth (role + access_level)
3. Runs `subprocess.run(['claude', '-p', message], ...)` — never shell interpolation, always list form
4. Long responses split into 4096-char chunks (Telegram limit)
5. Code blocks sent with syntax highlighting (Markdown)

### Commands

| Command | Access | Description |
|---------|--------|-------------|
| `/claude <msg>` or direct message | User+ | Send message to Claude CLI |
| `/new` | User+ | Start new Claude session |
| `/file <path>` | Project+ | Show file contents from working dir |
| `/upload` | Project+ | Send file via Telegram, save to working dir |
| `/download <path>` | Project+ | Get file from working dir |
| `/cwd <path>` | Full only | Change working directory |
| `/history` | User+ | Show last 10 messages |

### Safety

- Each subprocess: max 120s timeout
- Max 3 concurrent Claude processes (queue system with asyncio.Semaphore)
- Sandbox users cannot use `--dangerously-skip-permissions`
- Output credential pattern detection → automatic masking
- Rate limit: 20 messages/minute per user for Claude, 5/min for commands, 3/hour for /invite
- Path traversal protection: all user-supplied paths resolved with `Path.resolve()` and validated to stay within permitted working directory
- Upload limits: max 10 MB, allowlisted extensions only (.py, .js, .ts, .json, .md, .txt, .yaml, .yml, .csv, .sql, .sh, .css, .html)
- On bot restart: mark all sessions with no activity within timeout as terminated, notify affected users

## Module 3: Tunnel Manager

### Behavior

- Starts ngrok TCP tunnel on port 22
- Polls ngrok API (`http://localhost:4040/api/tunnels`) every 30s
- Auto-restart on failure (max 5 retries, exponential backoff: 5s, 10s, 20s, 40s, 80s)

### Notifications (admin only)

```
🟢 SSH Tunnel active: tcp://5.tcp.eu.ngrok.io:10955
   ssh hakan@5.tcp.eu.ngrok.io -p 10955

🔴 SSH Tunnel down — restarting...

🟢 SSH Tunnel reconnected: tcp://2.tcp.eu.ngrok.io:12345
   ssh hakan@2.tcp.eu.ngrok.io -p 12345

⚠️ 5 retries failed — manual intervention needed
```

### SSH Info Storage

Tunnel URL stored in `~/.claude-telegram-bot/data/tunnel.json`:
```json
{
    "url": "tcp://5.tcp.eu.ngrok.io:10955",
    "host": "5.tcp.eu.ngrok.io",
    "port": 10955,
    "started_at": "2026-03-22T10:00:00Z",
    "restarts": 0
}
```

## Module 4: System Monitor

### Metrics Collection

Every 60s, collect:
- CPU usage (per-core + average)
- RAM usage (used/total)
- Disk usage (used/total)
- Active SSH sessions (who, from where, duration)
- Active Claude sessions (count, queries in last hour)
- ngrok tunnel status + uptime
- Network I/O (bytes sent/received)

### Hourly Report (admin)

```
📊 System Status (14:00)
CPU: 23% | RAM: 4.2/8 GB (52%) | Disk: 45/120 GB (37%)
SSH: 1 active (hakan, 2h 15m)
Tunnel: 🟢 uptime 6h 23m
Claude: 3 sessions, 12 queries (1h)
Net: ↑ 45MB ↓ 120MB
```

### Anomaly Alerts (instant)

| Condition | Threshold | Message |
|-----------|-----------|---------|
| High CPU | >90% for 5min | `⚠️ CPU at 95% for 5 minutes` |
| High RAM | >85% | `⚠️ RAM usage 87% (7.0/8.0 GB)` |
| Disk full | >90% | `🔴 Disk usage 92% — free space critical` |
| SSH brute force | 5+ failed logins in 1min (via `journalctl -u ssh` polling) | `🚨 SSH brute force detected: 8 failed attempts from 192.168.1.x` |
| Tunnel instability | 3+ drops in 10min | `⚠️ Tunnel dropped 4 times in 10 minutes` |

### Monitor Commands

| Command | Access | Description |
|---------|--------|-------------|
| `/status` | All | Current system status snapshot |
| `/ssh` | User+ | Active tunnel info + connection command |
| `/sessions` | Admin | Active SSH and Claude sessions |
| `/stats` | Admin | Last 24h metric summary |
| `/alerts on/off` | User+ | Toggle notification preferences |
| `/tunnel restart` | Admin | Reset retry counter and restart ngrok tunnel |

## Module 5: Fallback Watchdog

### WSL Primary

```ini
# ~/.config/systemd/user/claude-telegram-bot.service
[Unit]
Description=Claude Telegram Bot
After=network-online.target

[Service]
Type=simple
WorkingDirectory=/mnt/c/dev/claude-telegram-bot
ExecStart=/usr/bin/python3 -m claude_telegram_bot
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=default.target
```

### Windows Fallback

PowerShell watchdog at `C:\Users\Hakan\scripts\wsl-watchdog.ps1`:

```
[2min interval] → Is WSL running? (wsl -l --running)
  → Yes → Is bot process alive? (wsl -e pgrep -f claude_telegram_bot)
    → Yes → OK
    → No → wsl -e systemctl --user start claude-telegram-bot
  → No → Send Telegram notification via HTTP API (no Python needed)
    → Try WSL restart (wsl --shutdown; wsl -d Ubuntu)
    → Success → bot auto-starts via systemd
    → Failure → retry in 5min, notify admin again
```

Windows Task Scheduler: "Claude Bot Watchdog" — every 2min, SYSTEM account.

**Watchdog credential storage:** Bot token and admin chat ID stored as Windows user environment variables (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`) — accessible even when WSL is down.

## General Commands

| Command | Access | Description |
|---------|--------|-------------|
| `/help` | All | List all commands filtered by user's access level, with descriptions |
| `/about` | All | Bot info: version, architecture, active modules, connection status, uptime |
| `/start [TOKEN]` | Public | Register with invite token or see welcome message |
| `/ping` | All | Bot alive check with latency |

### Admin-Only Commands

| Command | Access | Description |
|---------|--------|-------------|
| `/invite` | Admin | Generate 8-char single-use invite token (24h expiry) |
| `/promote @user <level>` | Admin | Upgrade user: sandbox → project → full |
| `/demote @user <level>` | Admin | Downgrade user: full → project → sandbox. Cannot demote below sandbox. |
| `/revoke @user` | Admin | Remove user access entirely |
| `/users` | Admin | List all registered users with roles and last active |
| `/broadcast <msg>` | Admin | Send message to all registered users |

## Project Structure

```
claude-telegram-bot/
├── claude_telegram_bot/
│   ├── __init__.py
│   ├── __main__.py          # Entry point
│   ├── config.py             # Settings, env vars
│   ├── bot.py                # Telegram bot setup, command routing
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── manager.py        # User CRUD, invite logic
│   │   ├── decorators.py     # @require_role, @require_access
│   │   └── models.py         # SQLite schema, queries
│   ├── claude/
│   │   ├── __init__.py
│   │   ├── bridge.py         # Claude CLI subprocess wrapper
│   │   ├── session.py        # Per-user session management
│   │   └── sanitizer.py      # Credential masking in output
│   ├── tunnel/
│   │   ├── __init__.py
│   │   ├── manager.py        # ngrok lifecycle management
│   │   └── notifier.py       # Tunnel status notifications
│   ├── monitor/
│   │   ├── __init__.py
│   │   ├── collector.py      # psutil metrics collection
│   │   ├── reporter.py       # Hourly reports, /status formatting
│   │   └── alerts.py         # Anomaly detection, thresholds
│   └── utils/
│       ├── __init__.py
│       ├── telegram.py        # Message splitting, formatting helpers
│       └── logging.py         # Structured logging
├── scripts/
│   ├── wsl-watchdog.ps1       # Windows fallback watchdog
│   └── install.sh             # Setup script (systemd, deps, DB init)
├── data/                      # Runtime data (gitignored)
│   ├── users.db               # User registrations, sessions, command log
│   ├── users.db.bak           # Daily auto-backup
│   ├── tunnel.json            # Current tunnel URL, uptime, restarts
│   └── metrics.json           # Rolling 24h buffer of system snapshots (used by /stats and hourly reporter)
├── .env.example
├── pyproject.toml
├── README.md
└── CLAUDE.md
```

## Configuration

`.env` file at project root:
```
TELEGRAM_BOT_TOKEN=<from @BotFather>
ADMIN_TELEGRAM_ID=<your numeric Telegram ID>
NGROK_AUTHTOKEN=<your_ngrok_authtoken>
SSH_PORT=22
CLAUDE_TIMEOUT=120
MAX_CONCURRENT_CLAUDE=3
RATE_LIMIT_PER_MINUTE=20
MONITOR_INTERVAL=60
HOURLY_REPORT=true
```

## Security Checklist

- [ ] Bot token only in .env, never in code
- [ ] ngrok authtoken only in .env
- [ ] SQLite DB in gitignored data/ directory
- [ ] Credential patterns masked in Claude output
- [ ] Sandbox users: no file system access
- [ ] Rate limiting per user
- [ ] Subprocess timeout on all Claude calls
- [ ] SSH brute force detection
- [ ] Invite tokens: single-use, 24h expiry, cryptographically random
