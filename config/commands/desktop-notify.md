# Desktop Notify — Send A Local Notification

When this command is executed, send a local desktop notification on Windows using `~/.claude/hooks/desktop-notify.ps1`.

## Arguments
- Optional first argument: notification title
- Optional remaining text: notification message

## Behavior
- If no arguments are provided, send a simple "Claude task completed" notification
- If PowerShell notification support is unavailable, report that briefly instead of failing noisily
