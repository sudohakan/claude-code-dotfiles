# Browser Launch — CDP Connection for HakanMCP Browser Bridge

When this command is executed, follow the steps below in order.

Usage: `/browser [chrome|edge|firefox|brave|opera|opera-gx|vivaldi] [--clean] [--port=XXXX] [--connect]`

Argument variable: `$ARGUMENTS`

---

## 1. Argument Parsing

Parse `$ARGUMENTS`:
- **Positional (first word):** Browser name (optional)
- **`--clean`:** Launch with temporary profile
- **`--port=XXXX`:** Custom debug port (default: 9222)
- **`--connect`:** Connect to existing instance, skip launch
- If no arguments or empty → go to Step 5

---

## 2. Platform Detection

```bash
uname -s 2>/dev/null || echo "Windows"
```
`MINGW*`/`MSYS*`/`CYGWIN*`/`Windows` → **Windows** | `Darwin` → **macOS** | `Linux` → **Linux**

Store as `PLATFORM` for all subsequent steps.

---

## 3. Detect Installed Browsers

**Windows** — check with `test -f` (also try x86 variants):
- Chrome: `/c/Program Files/Google/Chrome/Application/chrome.exe`
- Edge: `/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`
- Firefox: `/c/Program Files/Mozilla Firefox/firefox.exe`
- Brave: `/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe`
- Opera: `$LOCALAPPDATA/Programs/Opera/opera.exe`
- Opera GX: `$LOCALAPPDATA/Programs/Opera GX/opera.exe` or `/c/Program Files/Opera GX/opera.exe`
- Vivaldi: `$LOCALAPPDATA/Vivaldi/Application/vivaldi.exe`
- Chromium: `/c/Program Files/Chromium/Application/chrome.exe`

Registry fallback: `powershell Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\<browser>.exe'`

**macOS** — `ls /Applications/` + `mdfind "kMDItemKind == 'Application'"` filtered by browser names.

**Linux** — `command -v` for: `google-chrome chromium-browser chromium firefox brave-browser microsoft-edge opera vivaldi`. Snap/Flatpak paths as fallback.

If none found: `"No supported browser found. Please install Chrome, Edge, or Firefox."`

---

## 4. Fuzzy Matching

If user provided a browser name, match case-insensitively:
- `chrome`/`chro`/`gc` → Chrome | `edge`/`edg`/`eg` → Edge | `firefox`/`ff`/`fox` → Firefox
- `brave`/`bra` → Brave | `opera`/`opr` → Opera | `opera-gx`/`gx`/`ogx` → Opera GX
- `vivaldi`/`viv` → Vivaldi | `chromium`/`chrm` → Chromium

No match → ask: `"'{input}' was not recognized. Did you mean: {closest}?"`
Matched but not installed → inform user and list installed browsers.

---

## 5. Browser Selection Flow

1. Read `~/.claude/browser-last.json` via bash
2. If exists and browser is installed: ask to reuse or pick a different one
3. Otherwise: show numbered list of installed browsers and ask

---

## 6. Port Management

Default: 9222. Use `--port` value if provided.

Check port availability (Windows: `New-Object Net.Sockets.TcpClient`; macOS/Linux: `lsof -i`).

| Port Free | `--connect`? | Action |
|-----------|-------------|--------|
| Yes | No | Launch on this port |
| Yes | Yes | Warn: no browser listening on this port |
| No | Yes | Connect to existing (→ Step 8) |
| No | No | Increment 9222→9223→…→9230; all occupied → error |

---

## 7. Launch Browser

**Firefox first:** warn about limited CDP support; ask to continue or switch.

Use **full path** from Step 3. Commands:

**Windows (Chromium-based):**
```bash
powershell -Command "Start-Process '{path}' -ArgumentList '--remote-debugging-port={port}'"
# --clean: add --user-data-dir=$env:TEMP\{browser}-clean-{timestamp}
```

**macOS (Chromium-based):** `open -a "{app_name}" --args --remote-debugging-port={port} [--user-data-dir=/tmp/{browser}-clean-{ts}]`

**Linux (Chromium-based):** `{command} --remote-debugging-port={port} [--user-data-dir=/tmp/...] &`

**Firefox (all platforms):** `--remote-debugging-port {port} [-profile {tmpdir} -no-remote]`

After launch: verify process is running (1s delay). On failure: report install/profile lock issue.

---

## 8. Verify CDP Connection

1. Wait 2 seconds
2. `curl -s http://localhost:{port}/json/version`
3. On failure: retry after 3s. Still fails → error.
4. On success: extract `webSocketDebuggerUrl` → Step 8.1

---

## 8.1. HakanMCP Browser Bridge Connection

Preferred path: call `mcp__HakanMCP__mcp_browserConnect`:
- `cdpEndpoint`: `{webSocketDebuggerUrl}`
- `extension`: `true` if user requested attaching to a live browser extension session
- `headless`: `false` for an existing desktop browser
- Save returned `connectionId`. Retry once after 5s on failure.

Success message:
> Browser: {Browser} | Port: {port} | HakanMCP Bridge: Connected ({connectionId})
> Ready low-token wrappers: `mcp_browserNavigateExtract`, `mcp_browserProbeLogin`, `mcp_browserCaptureProof`

Preferred browser calls via:
- `mcp__HakanMCP__mcp_browserNavigateExtract`
- `mcp__HakanMCP__mcp_browserProbeLogin`
- `mcp__HakanMCP__mcp_browserCaptureProof`

Fallback to `mcp__HakanMCP__mcp_callTool({ connectionId, toolName, toolArguments })` only for browser actions not covered by the wrappers.

---

## 8.2. Tab Isolation

Immediately after MCP connection: `mcp_browserNavigateExtract → about:blank` (new tab). Informs user existing tabs are unaffected.

---

## 9. Save State

```bash
printf '{"browser":"%s","port":%d,"connectionId":"%s"}\n' "{browser}" {port} "{connectionId}" > ~/.claude/browser-last.json
```

---

## 10. Error Summary

| Condition | Message |
|-----------|---------|
| No browser found | "No supported browser found. Please install Chrome, Edge, or Firefox." |
| Launch failed | "Failed to launch. Verify installation and check for profile locks." |
| Ports exhausted | "All ports 9222-9230 occupied. Use --connect or close browsers." |
| CDP failed | "Could not connect to debug port. Verify browser launched correctly." |
| Firefox CDP limit | "Firefox has limited CDP support. Chrome/Edge recommended." |
| Unknown browser | "'{input}' was not recognized. Did you mean: {suggestion}?" |
| Clean profile note | "Temporary profile created: {path}. Delete manually when done." |
