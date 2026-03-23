# Browser CDP Setup (Windows → WSL2 → Playwright MCP)

## Architecture
Windows Chrome (port 9222) → netsh portproxy (9223→9222) → WSL2 Playwright MCP

## Setup (one-time, already configured)

### 1. Launch Chrome on Windows (PowerShell)
```powershell
Start-Process chrome.exe --remote-debugging-port=9222 --remote-allow-origins=* --user-data-dir=C:\Users\Hakan\AppData\Local\Temp\chrome-cdp
```

### 2. Port forwarding (already persistent)
```powershell
# Windows netsh portproxy forwards 0.0.0.0:9223 → 127.0.0.1:9222
netsh interface portproxy add v4tov4 listenport=9223 listenaddress=0.0.0.0 connectport=9222 connectaddress=127.0.0.1
```

### 3. Firewall rule (already persistent)
```powershell
# Rule "WSL-CDP" allows inbound TCP 9223
New-NetFirewallRule -DisplayName "WSL-CDP" -Direction Inbound -Protocol TCP -LocalPort 9223 -Action Allow
```

### 4. Verify from WSL
```bash
curl http://$(ip route | grep default | awk '{print $3}'):9223/json/version
```

## Config
Saved in `~/.claude/browser-last.json`
