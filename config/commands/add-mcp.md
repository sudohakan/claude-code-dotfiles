# Add MCP — Universal MCP Server Installer

Add an MCP server to Claude Code, Gemini CLI, and Codex CLI across WSL + Windows in one command.

## Usage
`/add-mcp <name> <transport> <url-or-package> [extra-args...]`

## Examples
```
/add-mcp rube http https://rube.app/mcp
/add-mcp notion http https://mcp.notion.so/mcp
/add-mcp teams npx @floriscornel/teams-mcp@latest
/add-mcp magic-21st npx @21st-dev/magic-mcp@latest
```

## Transport Types
- `http` — HTTP/SSE remote server (needs URL)
- `npx` — npx package (needs package name)

## Execution

Parse arguments: `$ARGUMENTS` → extract `name`, `transport`, and remaining args.

Run ALL steps below. Do NOT ask for confirmation — just execute and report.

### Step 1: Claude Code (WSL + Windows sync)

```bash
# Add to WSL Claude globally
claude mcp add <name> --transport http <url> -s user    # for http
claude mcp add <name> -s user -- npx -y <package>       # for npx
```

Then sync to Windows:
```python
# Read WSL ~/.claude.json, copy the new MCP entry to /mnt/c/Users/Hakan/.claude.json
import json
with open("/home/hakan/.claude.json") as f: wsl = json.load(f)
with open("/mnt/c/Users/Hakan/.claude.json") as f: win = json.load(f)
win.setdefault("mcpServers", {})[name] = wsl["mcpServers"][name]
with open("/mnt/c/Users/Hakan/.claude.json", "w") as f: json.dump(win, f, indent=2)
```

### Step 2: Gemini CLI (settings.json — WSL + Windows)

`gemini mcp add` CLI komutu WSL'de askıda kalabiliyor. Bunun yerine `settings.json` dosyasına doğrudan yaz.

Config dosyaları:
- WSL: `/home/hakan/.gemini/settings.json`
- Windows: `/mnt/c/Users/Hakan/.gemini/settings.json`

```python
import json, os

for path in ["/home/hakan/.gemini/settings.json", "/mnt/c/Users/Hakan/.gemini/settings.json"]:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    config = json.load(open(path)) if os.path.exists(path) else {}
    if name not in config.get("mcpServers", {}):
        config.setdefault("mcpServers", {})[name] = {
            # http transport:
            "url": url, "transport": "sse"
            # npx transport:
            # "command": "npx", "args": ["-y", package]
        }
        json.dump(config, open(path, "w"), indent=2)
```

Format by transport:
- **http**: `{"url": "<url>", "transport": "sse"}`
- **npx**: `{"command": "npx", "args": ["-y", "<package>"]}`

### Step 3: Codex CLI (TOML config — WSL + Windows)

Append to both config files:
- WSL: `/home/hakan/.codex/config.toml`
- Windows: `/mnt/c/Users/Hakan/.codex/config.toml`

Check if entry already exists (grep `mcp_servers."<name>"`) — skip if present.

**For http transport:**
```toml
[mcp_servers."<name>"]
command = "npx"
args = ["-y", "mcp-remote", "<url>"]
startup_timeout_sec = 60
```

**For npx transport (WSL):**
```toml
[mcp_servers."<name>"]
command = "npx"
args = ["-y", "<package>"]
startup_timeout_sec = 60
```

**For npx transport (Windows):**
```toml
[mcp_servers."<name>"]
command = 'C:\Program Files\nodejs\npx.cmd'
args = ["-y", "<package>"]
startup_timeout_sec = 60
```

### Step 4: Report

Print summary table:

```
| Target              | Status |
|---------------------|--------|
| Claude Code (WSL)   | ✅/❌  |
| Claude Code (Win)   | ✅/❌  |
| Gemini CLI          | ✅/❌  |
| Codex CLI (WSL)     | ✅/❌  |
| Codex CLI (Win)     | ✅/❌  |
```

## Error Handling
- Command not found → skip with ⚠️ warning, continue to next
- Entry already exists → skip with "zaten mevcut" note
- Config file missing → skip with ❌ error
- Never stop the entire flow for one tool's failure

## Config Paths
| Tool | WSL | Windows |
|------|-----|---------|
| Claude | `/home/hakan/.claude.json` | `/mnt/c/Users/Hakan/.claude.json` |
| Codex | `/home/hakan/.codex/config.toml` | `/mnt/c/Users/Hakan/.codex/config.toml` |
| Gemini | `gemini mcp list` | Same binary |
