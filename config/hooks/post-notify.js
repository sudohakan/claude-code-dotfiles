#!/usr/bin/env node
/**
 * CC Notify — Desktop Notification Hook
 * Sends a Windows toast notification when Claude Code is waiting for user input.
 * Useful for long-running tasks (agents, builds).
 *
 * Logic: If after a tool call 'AskUserQuestion' fires or the session is idle,
 * a Windows notification is sent.
 *
 * Also notifies when long-running tools (>30s) complete.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const LONG_TASK_THRESHOLD_MS = 30000; // 30 seconds

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const toolName = data.tool_name;
    const sessionId = data.session_id || '';

    // Debounce: 1 notification per 60 seconds
    const tmpDir = os.tmpdir();
    const notifyPath = path.join(tmpDir, `claude-notify-${sessionId}.json`);

    if (fs.existsSync(notifyPath)) {
      try {
        const last = JSON.parse(fs.readFileSync(notifyPath, 'utf8'));
        if (Date.now() - last.timestamp < 60000) {
          process.exit(0);
        }
      } catch (e) {}
    }

    let shouldNotify = false;
    let title = 'Claude Code';
    let message = '';

    // Case 1: AskUserQuestion — waiting for user input
    if (toolName === 'AskUserQuestion') {
      shouldNotify = true;
      title = 'Claude Code — Input Required';
      message = 'Claude is asking a question and waiting for your response.';
    }

    // Case 2: Long-running Task/Bash completed
    if (['Task', 'Bash'].includes(toolName)) {
      const duration = data.tool_result?.duration_ms;
      if (duration && duration > LONG_TASK_THRESHOLD_MS) {
        shouldNotify = true;
        const secs = Math.round(duration / 1000);
        title = 'Claude Code — Task Complete';
        message = `${toolName} took ${secs}s: completed.`;
      }
    }

    if (!shouldNotify) {
      process.exit(0);
    }

    // Windows Toast Notification (PowerShell)
    sendWindowsNotification(title, message);

    // Update debounce
    fs.writeFileSync(notifyPath, JSON.stringify({ timestamp: Date.now() }));
  } catch (e) {
    process.exit(0);
  }
});

function sendWindowsNotification(title, message) {
  try {
    const escapedTitle = title.replace(/'/g, "''");
    const escapedMessage = message.replace(/'/g, "''");

    const ps = `
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
      [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

      $template = @"
      <toast>
        <visual>
          <binding template="ToastGeneric">
            <text>${escapedTitle}</text>
            <text>${escapedMessage}</text>
          </binding>
        </visual>
        <audio silent="true"/>
      </toast>
"@

      $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
      $xml.LoadXml($template)
      $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
      [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Claude Code').Show($toast)
    `;

    execSync(`powershell -NoProfile -NonInteractive -Command "${ps.replace(/\n/g, ' ')}"`, {
      timeout: 5000,
      stdio: 'pipe',
      windowsHide: true,
    });
  } catch (e) {
    // If notification cannot be sent, fail silently
  }
}
