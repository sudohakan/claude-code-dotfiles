#!/bin/bash
# Work Sync Cron Wrapper — loads full PATH for az CLI and claude
source /home/hakan/.bashrc 2>/dev/null
export PATH="/home/hakan/.npm-global/bin:/home/hakan/.local/bin:/usr/local/bin:/usr/bin:/bin:/mnt/c/Program Files/Microsoft SDKs/Azure/CLI2/wbin:$PATH"
exec /home/hakan/.npm-global/bin/claude --dangerously-skip-permissions -p "/work-sync" >> /home/hakan/.claude/cache/work-sync-cron.log 2>&1
