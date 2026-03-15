#!/usr/bin/env node
// Conservative retention cleanup for generated artifacts.
// Runs at most once per day to avoid unnecessary overhead on every session.

const fs = require('fs');
const path = require('path');
const os = require('os');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;

// Daily throttle — skip if last run was less than 24 hours ago
const throttleFile = path.join(claudeDir, 'cache', 'retention-cleanup-last-run');
if (!process.argv.includes('--self-test') && !process.argv.includes('--force')) {
  try {
    if (fs.existsSync(throttleFile)) {
      const lastRun = parseInt(fs.readFileSync(throttleFile, 'utf8').trim(), 10);
      if (now - lastRun < DAY) process.exit(0);
    }
  } catch { /* run normally if cache is unreadable */ }
}

const TARGETS = [
  { dir: path.join(claudeDir, 'debug'), maxAgeMs: 30 * DAY },
  { dir: path.join(claudeDir, 'telemetry'), maxAgeMs: 30 * DAY },
  { dir: path.join(claudeDir, 'file-history'), maxAgeMs: 30 * DAY },
  { dir: path.join(claudeDir, 'plans'), maxAgeMs: 45 * DAY },
];

if (process.argv.includes('--self-test')) {
  process.stdout.write(JSON.stringify({ ok: true, hook: 'retention-cleanup' }));
  process.exit(0);
}

function pruneProjectCheckpoints(projectsDir) {
  if (!fs.existsSync(projectsDir)) return;

  for (const entry of fs.readdirSync(projectsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const projectDir = path.join(projectsDir, entry.name);
    const memoryDir = path.join(projectsDir, entry.name, 'memory');
    if (!fs.existsSync(memoryDir)) continue;

    for (const file of ['auto-checkpoint.md']) {
      const fullPath = path.join(memoryDir, file);
      if (!fs.existsSync(fullPath)) continue;
      try {
        const stat = fs.statSync(fullPath);
        if ((now - stat.mtimeMs) > (30 * DAY)) fs.unlinkSync(fullPath);
      } catch {}
    }

    for (const child of fs.readdirSync(projectDir, { withFileTypes: true })) {
      if (child.name === 'memory') continue;
      const childPath = path.join(projectDir, child.name);
      try {
        const stat = fs.statSync(childPath);
        if ((now - stat.mtimeMs) <= (21 * DAY)) continue;

        if (child.isDirectory()) {
          fs.rmSync(childPath, { recursive: true, force: true });
        } else if (child.isFile() && child.name.endsWith('.jsonl')) {
          fs.unlinkSync(childPath);
        }
      } catch {}
    }
  }
}

function pruneEmptyTodoFiles(todosDir) {
  if (!fs.existsSync(todosDir)) return;

  for (const entry of fs.readdirSync(todosDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const fullPath = path.join(todosDir, entry.name);
    try {
      const stat = fs.statSync(fullPath);
      if ((now - stat.mtimeMs) <= (14 * DAY)) continue;
      const content = fs.readFileSync(fullPath, 'utf8').trim();
      if (content === '[]' || content === '') fs.unlinkSync(fullPath);
    } catch {}
  }
}

function prune(dir, maxAgeMs) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }

    if (entry.isDirectory()) {
      prune(fullPath, maxAgeMs);
      try {
        const remaining = fs.readdirSync(fullPath);
        if (remaining.length === 0) fs.rmdirSync(fullPath);
      } catch {}
      continue;
    }

    if ((now - stat.mtimeMs) > maxAgeMs) {
      try {
        fs.unlinkSync(fullPath);
      } catch {}
    }
  }
}

try {
  for (const target of TARGETS) {
    prune(target.dir, target.maxAgeMs);
  }
  pruneProjectCheckpoints(path.join(claudeDir, 'projects'));
  pruneEmptyTodoFiles(path.join(claudeDir, 'todos'));
  // Record last run timestamp
  try {
    const cacheDir = path.join(claudeDir, 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(throttleFile, String(now), { mode: 0o600 });
  } catch {}
} catch {
  process.exit(0);
}
