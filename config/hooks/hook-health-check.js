#!/usr/bin/env node
// Writes a lightweight health snapshot for expected local hooks.
// Runs at most once per day to avoid unnecessary overhead on every session.

const fs = require('fs');
const os = require('os');
const path = require('path');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const cacheDir = path.join(claudeDir, 'cache');
const outputFile = path.join(cacheDir, 'hook-health.json');

// Daily throttle — skip if last run was less than 24 hours ago
if (!process.argv.includes('--self-test') && !process.argv.includes('--force')) {
  try {
    if (fs.existsSync(outputFile)) {
      const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      const lastRun = new Date(data.checked_at).getTime();
      if (Date.now() - lastRun < 24 * 60 * 60 * 1000) process.exit(0);
    }
  } catch { /* run normally if cache is unreadable */ }
}

const expectedHooks = [
  'gsd-check-update.js',
  'dotfiles-check-update.js',
  'pretooluse-safety.js',
  'gsd-context-monitor.js',
  'task-completed-check.js',
  'teammate-idle-check.js',
  'rotate-hook-approvals.js',
  'retention-cleanup.js',
  'hook-health-check.js',
  'team-active-reminder.js',
];

if (process.argv.includes('--self-test')) {
  process.stdout.write(JSON.stringify({ ok: true, hook: 'hook-health-check' }));
  process.exit(0);
}

try {
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const hooksDir = path.join(claudeDir, 'hooks');
  const snapshot = {
    checked_at: new Date().toISOString(),
    hooks: expectedHooks.map((name) => {
      const fullPath = path.join(hooksDir, name);
      const exists = fs.existsSync(fullPath);
      return {
        name,
        exists,
        size: exists ? fs.statSync(fullPath).size : null
      };
    })
  };

  fs.writeFileSync(outputFile, JSON.stringify(snapshot, null, 2), { mode: 0o600 });
} catch {
  process.exit(0);
}
