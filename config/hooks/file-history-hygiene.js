#!/usr/bin/env node
// Analyze and archive oversized, stale file-history sessions under ~/.claude/file-history.

const fs = require('fs');
const path = require('path');
const os = require('os');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const fileHistoryDir = path.join(claudeDir, 'file-history');
const archiveRoot = path.join(claudeDir, 'archives', 'file-history-hygiene');
const cacheDir = path.join(claudeDir, 'cache');
const reportFile = path.join(cacheDir, 'file-history-hygiene-last-run.json');
const DAY = 24 * 60 * 60 * 1000;

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');
const wantJson = args.has('--json');
const olderThanDays = parsePositiveInt(getArgValue('--older-than-days')) || parsePositiveInt(process.env.CLAUDE_FILE_HISTORY_HYGIENE_DAYS) || 5;
const minSizeMb = parsePositiveInt(getArgValue('--min-size-mb')) || parsePositiveInt(process.env.CLAUDE_FILE_HISTORY_HYGIENE_MIN_MB) || 40;
const keepNewest = parsePositiveInt(getArgValue('--keep-newest')) || parsePositiveInt(process.env.CLAUDE_FILE_HISTORY_HYGIENE_KEEP_NEWEST) || 0;

if (args.has('--self-test')) {
  process.stdout.write(JSON.stringify({
    ok: true,
    tool: 'file-history-hygiene',
    fileHistoryDir,
    reportFile,
    defaults: { olderThanDays, minSizeMb, keepNewest },
  }));
  process.exit(0);
}

function getArgValue(flagName) {
  const argv = process.argv.slice(2);
  const index = argv.indexOf(flagName);
  if (index === -1) return '';
  return argv[index + 1] || '';
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function getDirectorySize(dirPath) {
  let total = 0;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += getDirectorySize(fullPath);
      continue;
    }
    try {
      total += fs.statSync(fullPath).size;
    } catch {}
  }
  return total;
}

function collectSessions() {
  if (!fs.existsSync(fileHistoryDir)) return [];

  return fs.readdirSync(fileHistoryDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const fullPath = path.join(fileHistoryDir, entry.name);
      const stat = fs.statSync(fullPath);
      return {
        name: entry.name,
        path: fullPath,
        sizeBytes: getDirectorySize(fullPath),
        lastWriteTime: stat.mtime.toISOString(),
        ageDays: Math.floor((Date.now() - stat.mtimeMs) / DAY),
      };
    })
    .sort((a, b) => {
      if (b.sizeBytes !== a.sizeBytes) return b.sizeBytes - a.sizeBytes;
      return b.lastWriteTime.localeCompare(a.lastWriteTime);
    });
}

const allSessions = collectSessions();
const protectedNewest = keepNewest > 0
  ? new Set([...allSessions]
      .sort((a, b) => b.lastWriteTime.localeCompare(a.lastWriteTime))
      .slice(0, keepNewest)
      .map((session) => session.name))
  : new Set();

const candidates = allSessions.filter((session) => {
  if (protectedNewest.has(session.name)) return false;
  if (session.ageDays < olderThanDays) return false;
  if (session.sizeBytes < minSizeMb * 1024 * 1024) return false;
  return true;
});

const output = {
  generatedAt: new Date().toISOString(),
  mode: shouldApply ? 'apply' : 'dry-run',
  criteria: { olderThanDays, minSizeMb, keepNewest },
  totals: {
    allSessions: allSessions.length,
    candidateSessions: candidates.length,
    candidateBytes: candidates.reduce((sum, session) => sum + session.sizeBytes, 0),
  },
  largestSessions: allSessions.slice(0, 10),
  candidates: candidates.map((session) => ({
    name: session.name,
    sizeBytes: session.sizeBytes,
    ageDays: session.ageDays,
    lastWriteTime: session.lastWriteTime,
  })),
};

if (shouldApply) {
  const runDir = path.join(archiveRoot, new Date().toISOString().replace(/[:.]/g, '-'));
  ensureDir(runDir);
  output.archiveDir = runDir;
  output.archived = [];

  for (const session of candidates) {
    const destination = path.join(runDir, session.name);
    fs.renameSync(session.path, destination);
    output.archived.push({
      name: session.name,
      from: session.path,
      to: destination,
      sizeBytes: session.sizeBytes,
      ageDays: session.ageDays,
    });
  }
}

ensureDir(cacheDir);
fs.writeFileSync(reportFile, JSON.stringify(output, null, 2), { mode: 0o600 });

if (wantJson) {
  process.stdout.write(JSON.stringify(output, null, 2));
} else {
  const lines = [
    `Mode: ${output.mode}`,
    `Sessions: ${output.totals.allSessions}`,
    `Candidates: ${output.totals.candidateSessions}`,
    `Candidate bytes: ${output.totals.candidateBytes}`,
    `Criteria: olderThanDays=${olderThanDays}, minSizeMb=${minSizeMb}, keepNewest=${keepNewest}`,
  ];
  if (output.archiveDir) lines.push(`Archive: ${output.archiveDir}`);
  for (const session of (shouldApply ? output.archived : output.candidates)) {
    lines.push(`- ${session.name}: ${(session.sizeBytes / (1024 * 1024)).toFixed(2)} MB, age=${session.ageDays}d`);
  }
  process.stdout.write(lines.join('\n'));
}
