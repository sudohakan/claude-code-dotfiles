#!/usr/bin/env node
// Keep hook-approvals.log bounded so the file does not grow forever.

const fs = require('fs');
const os = require('os');
const path = require('path');

const MAX_LINES = 500;
const MAX_BYTES = 50 * 1024;

if (process.argv.includes('--self-test')) {
  process.stdout.write(JSON.stringify({ ok: true, hook: 'rotate-hook-approvals' }));
  process.exit(0);
}

try {
  const logPath = path.join(os.homedir(), '.claude', 'hook-approvals.log');
  if (!fs.existsSync(logPath)) process.exit(0);

  const stat = fs.statSync(logPath);
  if (stat.size <= MAX_BYTES) process.exit(0);

  const lines = fs.readFileSync(logPath, 'utf8').split(/\r?\n/);
  const trimmed = lines.slice(-MAX_LINES).join('\n').trim();
  fs.writeFileSync(logPath, trimmed ? `${trimmed}\n` : '', 'utf8');
} catch {
  process.exit(0);
}
