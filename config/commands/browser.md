# Browser Launch — CDP Connection for Playwright MCP

When this command is executed, follow the steps below in order.

Usage: `/browser [chrome|edge|firefox|brave|opera|opera-gx|vivaldi] [--clean] [--port=XXXX] [--connect]`

Argument variable: `$ARGUMENTS`

---

## 1. Argument Parsing

Parse the `$ARGUMENTS` value:

- **Positional (first word):** Browser name (optional). E.g.: `chrome`, `edge`, `firefox`
- **`--clean`:** Launch with a clean/temporary profile
- **`--port=XXXX`:** Custom debug port (default: 9222)
- **`--connect`:** Do not launch a new browser, connect to an existing instance
- If no arguments or empty → Go to Step 5 (selection flow)

---

## 2. Platform Detection

Detect the platform via Bash:

```bash
uname -s 2>/dev/null || echo "Windows"
```

- `MINGW*`, `MSYS*`, `CYGWIN*` or `Windows` → **Windows**
- `Darwin` → **macOS**
- `Linux` → **Linux**

Store the result as `PLATFORM`. Use this value for all subsequent steps to select the appropriate commands.

---

## 3. Detect Installed Browsers

Find installed browsers based on the platform. **Record the full path for each found browser** (will be used in Step 7).

### Windows

Check the following paths (use `test -f` in bash):

| Browser | Check Paths |
|---------|-------------|
| Chrome | `"/c/Program Files/Google/Chrome/Application/chrome.exe"`, `"/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"` |
| Edge | `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"`, `"/c/Program Files/Microsoft/Edge/Application/msedge.exe"` |
| Firefox | `"/c/Program Files/Mozilla Firefox/firefox.exe"`, `"/c/Program Files (x86)/Mozilla Firefox/firefox.exe"` |
| Brave | `"/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe"` |
| Opera | `"${LOCALAPPDATA:-$HOME/AppData/Local}/Programs/Opera/opera.exe"`, `"/c/Program Files/Opera/opera.exe"` |
| Opera GX | `"/c/Program Files/Opera GX/opera.exe"`, `"/c/Program Files (x86)/Opera GX/opera.exe"`, `"${LOCALAPPDATA:-$HOME/AppData/Local}/Programs/Opera GX/opera.exe"` |
| Vivaldi | `"${LOCALAPPDATA:-$HOME/AppData/Local}/Vivaldi/Application/vivaldi.exe"` |
| Chromium | `"/c/Program Files/Chromium/Application/chrome.exe"` |

If not found via file path, check the registry:
```bash
powershell -Command "Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -ErrorAction SilentlyContinue | Select -ExpandProperty '(default)'"
```
(Similarly try for `msedge.exe`, `firefox.exe`.)

### macOS

```bash
ls /Applications/ | grep -iE "chrome|firefox|edge|brave|opera|vivaldi|chromium"
mdfind "kMDItemKind == 'Application'" 2>/dev/null | grep -iE "chrome|firefox|edge|brave|opera|vivaldi|chromium"
```

### Linux

```bash
# Commands in PATH
for cmd in google-chrome chromium-browser chromium firefox brave-browser microsoft-edge opera vivaldi; do command -v "$cmd" 2>/dev/null; done

# Snap and Flatpak paths (fallback)
for p in /snap/bin/chromium /snap/bin/firefox /var/lib/flatpak/exports/bin/com.google.Chrome /var/lib/flatpak/exports/bin/org.mozilla.firefox /var/lib/flatpak/exports/bin/com.brave.Browser /var/lib/flatpak/exports/bin/com.opera.Opera; do test -f "$p" && echo "$p"; done
```

Keep a list of found browsers and their **full paths**. If none are found, inform the user:
> "No supported browser found. Please install Chrome, Edge, or Firefox."

---

## 4. Fuzzy Matching

If the user provided a browser name (from Step 1), match it using the table below:

| Input | Target |
|-------|--------|
| `chrome`, `chro`, `chrom`, `chrone`, `crhome`, `gc` | Chrome |
| `edge`, `edg`, `msedge`, `eg` | Edge |
| `firefox`, `fire`, `ff`, `fox`, `fireofx` | Firefox |
| `brave`, `brav`, `bra` | Brave |
| `opera`, `oper`, `opr` | Opera |
| `opera-gx`, `operagx`, `gx`, `ogx` | Opera GX |
| `vivaldi`, `viv`, `viva` | Vivaldi |
| `chromium`, `chrm` | Chromium |

Matching is case-insensitive. For inputs not in the table, use language understanding to find the closest match (e.g., `chorme` → Chrome).

- If a match is found → this becomes the selected browser
- If no match is found → ask the user: "'{input}' was not recognized. Did you mean: {closest match}?"
- If the matched browser is not installed → inform the user and list the installed browsers

---

## 5. Browser Selection Flow

If the user did not provide a browser name:

1. Read the `~/.claude/browser-last.json` file (via bash `cat`)
2. If the file exists and the browser within it is installed:
   - Show the following message and ask for the user's preference:
   > "Last used browser: **{browser}** (port: {port}). Would you like to continue with it, or select a different browser?"
   - If the user confirms → proceed with that browser
3. If the file does not exist or the user wants to select a different one:
   - Show a numbered list of installed browsers to the user
   - Ask which one they prefer

---

## 6. Port Management

Determine the port to use:

1. If `--port=XXXX` was provided → use that port
2. If not provided → default to `9222`

Check whether the port is occupied:

### Windows
```bash
powershell -Command "try { (New-Object Net.Sockets.TcpClient).Connect('localhost', {port}); Write-Output 'True' } catch { Write-Output 'False' }"
```

### macOS / Linux
```bash
lsof -i :{port} 2>/dev/null || ss -tlnp 2>/dev/null | grep {port}
```

**Decision table:**

| Port Status | `--connect` Present? | Action |
|-------------|----------------------|--------|
| Free | No | Use this port, launch the browser |
| Free | Yes | Warn: "No browser is listening on this port. Would you like to launch one?" |
| Occupied | Yes | Do not launch a new browser, connect to the existing instance (go to Step 8) |
| Occupied | No | Auto-increment: 9222 → 9223 → ... → 9230 |

If all ports from 9222-9230 are occupied:
> "All ports from 9222-9230 are occupied. You can connect to an existing instance with `--connect` or close some browsers."

---

## 7. Launch the Browser

**Special notice for Firefox:**
If Firefox is selected, first inform the user:
> "Firefox has limited CDP support. Playwright features may work with restrictions. Using Chrome or Edge is recommended. Do you still want to proceed?"
- No → return to browser selection screen
- Yes → proceed

**Important:** Use the **full path** detected in Step 3 for all launch commands. The `{path}` placeholder in the examples below should be replaced with the actual path.

### Windows

For Chromium-based browsers:
```bash
# Standard launch (with full path)
powershell -Command "Start-Process '{path}' -ArgumentList @('--remote-debugging-port={port}')"

# Launch with --clean (temporary profile)
powershell -Command "Start-Process '{path}' -ArgumentList @('--remote-debugging-port={port}', '--user-data-dir=' + (Join-Path $env:TEMP '{browser}-clean-' + (Get-Date -Format yyyyMMddHHmmss)))"
```

For Firefox:
```bash
# Standard
powershell -Command "Start-Process '{firefox_path}' -ArgumentList @('--remote-debugging-port', '{port}')"

# --clean (Firefox uses -profile)
powershell -Command "$p = Join-Path $env:TEMP ('firefox-clean-' + (Get-Date -Format yyyyMMddHHmmss)); New-Item -ItemType Directory -Path $p -Force | Out-Null; Start-Process '{firefox_path}' -ArgumentList @('--remote-debugging-port', '{port}', '-profile', $p, '-no-remote')"
```

### macOS

For Chromium-based browsers:
```bash
# Standard
open -a "{app_name}" --args --remote-debugging-port={port}

# --clean
open -a "{app_name}" --args --remote-debugging-port={port} --user-data-dir="/tmp/{browser}-clean-$(date +%s)"
```

Applications: `"Google Chrome"`, `"Microsoft Edge"`, `"Brave Browser"`, `"Opera"`, `"Vivaldi"`, `"Chromium"`

For Firefox:
```bash
# Standard
open -a "Firefox" --args --remote-debugging-port {port}

# --clean
TMPDIR=$(mktemp -d /tmp/firefox-clean-XXXXXX) && open -a "Firefox" --args --remote-debugging-port {port} -profile "$TMPDIR" -no-remote
```

### Linux

For Chromium-based browsers:
```bash
# Standard
{command} --remote-debugging-port={port} &

# --clean
{command} --remote-debugging-port={port} --user-data-dir="/tmp/{browser}-clean-$(date +%s)" &
```

Commands: `google-chrome`, `microsoft-edge`, `brave-browser`, `opera`, `vivaldi`, `chromium-browser`

For Firefox:
```bash
# Standard
firefox --remote-debugging-port {port} &

# --clean
TMPDIR=$(mktemp -d /tmp/firefox-clean-XXXXXX) && firefox --remote-debugging-port {port} -profile "$TMPDIR" -no-remote &
```

### Launch Verification

After the browser is launched, check whether the process is running:

**Windows:**
```bash
powershell -Command "Start-Sleep 1; if (Get-Process -Name '{process_name}' -ErrorAction SilentlyContinue) { 'Running' } else { 'Failed' }"
```

**macOS / Linux:**
```bash
sleep 1 && pgrep -f "{browser_binary}" > /dev/null && echo "Running" || echo "Failed"
```

If it fails, inform the user:
> "Failed to launch the browser. Verify that the installation is correct and that another instance is not locking the profile."

---

## 8. Verify CDP Connection

After the browser is launched (or in `--connect` mode):

1. Wait 2 seconds (for a fresh launch)
2. Check the CDP endpoint:
```bash
curl -s http://localhost:{port}/json/version
```
3. If it fails → wait 3 more seconds and retry
4. If it still fails:
   > "Could not connect to the browser debug port. Verify that the browser was launched correctly."
5. If successful → parse the JSON output, extract the `webSocketDebuggerUrl` value, and proceed to Step 8.1.

---

## 8.1. Playwright MCP Connection (HakanMCP Bridge)

After CDP is verified, connect Playwright MCP via HakanMCP:

1. Call the `mcp__HakanMCP__mcp_connect` tool:
   - `command`: `"npx"`
   - `args`: `["-y", "@playwright/mcp@latest", "--cdp-endpoint", "{webSocketDebuggerUrl}"]`
   - `{webSocketDebuggerUrl}` → the `webSocketDebuggerUrl` value from the `curl` output in Step 8
2. If successful → save the `connectionId` value (will be used in subsequent steps)
3. If it fails → wait 5 seconds and retry. If it still fails:
   > "Could not establish Playwright MCP connection. Verify that HakanMCP is running."

Successful connection message:
> "Browser connection successful!"
> - Browser: {Browser}
> - Port: {port}
> - CDP Endpoint: ws://localhost:{port}/...
> - Playwright MCP: Connected (connectionId: {connectionId})
>
> Playwright MCP tools are ready to use:
> - `browser_navigate` — Navigate to a page
> - `browser_click` — Click an element
> - `browser_snapshot` — Take a page snapshot
> - `browser_fill_form` — Fill a form
> - `browser_take_screenshot` — Take a screenshot
> - `browser_evaluate` — Execute JavaScript
> - `browser_press_key` — Press a key

**Important:** All Playwright tool calls are made through `mcp__HakanMCP__mcp_callTool`:
```
mcp__HakanMCP__mcp_callTool({
  connectionId: "{connectionId}",
  toolName: "browser_navigate",
  toolArguments: { url: "..." }
})
```

---

## 8.2. Tab Isolation (Opening a New Tab)

**CRITICAL:** When connecting to an existing browser via CDP, open tabs may be affected. Therefore:

1. Immediately after the Playwright MCP connection is established, **open a new tab:**
```
mcp_callTool → toolName: "browser_navigate", toolArguments: { url: "about:blank" }
```

This isolates the tab controlled by Playwright. Existing open tabs will not be affected.

2. From this point on, all `browser_navigate` calls will operate in this new tab.

3. Inform the user:
> "A new tab has been opened. Your existing tabs will not be affected."

---

## 9. Save State

After a successful connection, write to `~/.claude/browser-last.json`:

```bash
printf '{"browser": "%s", "port": %d, "connectionId": "%s"}\n' "{selected_browser}" {port} "{connectionId}" > ~/.claude/browser-last.json
```

---

## 10. Error Scenarios Summary

| Condition | Message |
|-----------|---------|
| Browser not found | "No supported browser found. Please install Chrome, Edge, or Firefox." |
| Browser failed to launch | "Failed to launch the browser. Verify that the installation is correct and check for profile locks." |
| Ports exhausted | "All ports from 9222-9230 are occupied. Connect to an existing instance with `--connect` or close some browsers." |
| CDP connection failed | "Could not connect to the browser debug port. Verify that the browser was launched correctly." |
| Firefox CDP limitation | "Firefox has limited CDP support. For full Playwright features, try using Chrome or Edge." |
| Unrecognized browser name | "'{input}' was not recognized. Did you mean: {suggestion}?" |
| --clean + temp profile note | "Temporary profile created: {path}. These profiles are not automatically cleaned up; delete them manually if needed." |
