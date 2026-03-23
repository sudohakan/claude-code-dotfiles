#!/usr/bin/env node
// Archive oversized stale project session artifacts from ~/.claude/projects/<project-key>.

const fs = require('fs');
const path = require('path');
const os = require('os');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const projectsDir = path.join(claudeDir, 'projects');
const archiveRoot = path.join(claudeDir, 'archives', 'project-session-hygiene');
const cacheDir = path.join(claudeDir, 'cache');
const reportFile = path.join(cacheDir, 'project-session-hygiene-last-run.json');
const DAY = 24 * 60 * 60 * 1000;

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');
const wantJson = args.has('--json');
const projectKey = getArgValue('--project-key') || process.env.CLAUDE_PROJECT_SESSION_HYGIENE_PROJECT;
const olderThanDays = parsePositiveInt(getArgValue('--older-than-days')) || parsePositiveInt(process.env.CLAUDE_PROJECT_SESSION_HYGIENE_DAYS) || 5;
const minSizeMb = parsePositiveInt(getArgValue('--min-size-mb')) || parsePositiveInt(process.env.CLAUDE_PROJECT_SESSION_HYGIENE_MIN_MB) || 15;
const keepNewest = parsePositiveInt(getArgValue('--keep-newest')) || parsePositiveInt(process.env.CLAUDE_PROJECT_SESSION_HYGIENE_KEEP_NEWEST) || 3;

if (args.has('--self-test')) {
  process.stdout.write(JSON.stringify({
    ok: true,
    tool: 'project-session-hygiene',
    projectsDir,
    reportFile,
    defaults: { olderThanDays, minSizeMb, keepNewest },
  }));
  process.exit(0);
}

if (!projectKey) {
  process.stderr.write('Missing required --project-key\n');
  process.exit(1);
}

const projectDir = path.join(projectsDir, projectKey);
if (!fs.existsSync(projectDir)) {
  process.stderr.write(`Project not found: ${projectKey}\n`);
  process.exit(1);
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

function getArtifactInfo(fullPath, isDirectory) {
  const stat = fs.statSync(fullPath);
  return {
    path: fullPath,
    isDirectory,
    sizeBytes: isDirectory ? getDirectorySize(fullPath) : stat.size,
    mtimeMs: stat.mtimeMs,
    lastWriteTime: stat.mtime.toISOString(),
  };
}

function collectSessions() {
  const groups = new Map();
  for (const entry of fs.readdirSync(projectDir, { withFileTypes: true })) {
    if (entry.name === 'memory') continue;

    const fullPath = path.join(projectDir, entry.name);
    if (entry.isDirectory()) {
      const group = groups.get(entry.name) || { name: entry.name };
      group.directory = getArtifactInfo(fullPath, true);
      groups.set(entry.name, group);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
    const baseName = entry.name.slice(0, -'.jsonl'.length);
    const group = groups.get(baseName) || { name: baseName };
    group.jsonl = getArtifactInfo(fullPath, false);
    groups.set(baseName, group);
  }

  return Array.from(groups.values())
    .map((group) => {
      const artifacts = [group.directory, group.jsonl].filter(Boolean);
      const newestMtimeMs = Math.max(...artifacts.map((artifact) => artifact.mtimeMs));
      const totalSizeBytes = artifacts.reduce((sum, artifact) => sum + artifact.sizeBytes, 0);
      return {
        name: group.name,
        hasDirectory: Boolean(group.directory),
        hasJsonl: Boolean(group.jsonl),
        directory: group.directory || null,
        jsonl: group.jsonl || null,
        totalSizeBytes,
        newestMtimeMs,
        lastWriteTime: new Date(newestMtimeMs).toISOString(),
        ageDays: Math.floor((Date.now() - newestMtimeMs) / DAY),
      };
    })
    .sort((a, b) => {
      if (b.totalSizeBytes !== a.totalSizeBytes) return b.totalSizeBytes - a.totalSizeBytes;
      return b.newestMtimeMs - a.newestMtimeMs;
    });
}

const allSessions = collectSessions();
const protectedNewest = new Set(
  [...allSessions]
    .sort((a, b) => b.newestMtimeMs - a.newestMtimeMs)
    .slice(0, keepNewest)
    .map((session) => session.name)
);

const candidates = allSessions.filter((session) => {
  if (protectedNewest.has(session.name)) return false;
  if (session.ageDays < olderThanDays) return false;
  if (session.totalSizeBytes < minSizeMb * 1024 * 1024) return false;
  return true;
});

const output = {
  generatedAt: new Date().toISOString(),
  mode: shouldApply ? 'apply' : 'dry-run',
  projectKey,
  criteria: { olderThanDays, minSizeMb, keepNewest },
  totals: {
    allSessions: allSessions.length,
    candidateSessions: candidates.length,
    candidateBytes: candidates.reduce((sum, session) => sum + session.totalSizeBytes, 0),
  },
  largestSessions: allSessions.slice(0, 15).map(simplifySession),
  candidates: candidates.map(simplifySession),
};

if (shouldApply) {
  const runDir = path.join(archiveRoot, new Date().toISOString().replace(/[:.]/g, '-'), projectKey);
  ensureDir(runDir);
  output.archiveDir = runDir;
  output.archived = [];

  for (const session of candidates) {
    const archived = {
      name: session.name,
      totalSizeBytes: session.totalSizeBytes,
      ageDays: session.ageDays,
      moved: [],
    };

    if (session.directory && fs.existsSync(session.directory.path)) {
      const destination = path.join(runDir, path.basename(session.directory.path));
      fs.renameSync(session.directory.path, destination);
      archived.moved.push({ from: session.directory.path, to: destination });
    }

    if (session.jsonl && fs.existsSync(session.jsonl.path)) {
      const destination = path.join(runDir, path.basename(session.jsonl.path));
      fs.renameSync(session.jsonl.path, destination);
      archived.moved.push({ from: session.jsonl.path, to: destination });
    }

    output.archived.push(archived);
  }
}

ensureDir(cacheDir);
fs.writeFileSync(reportFile, JSON.stringify(output, null, 2), { mode: 0o600 });

if (wantJson) {
  process.stdout.write(JSON.stringify(output, null, 2));
} else {
  const lines = [
    `Mode: ${output.mode}`,
    `Project: ${projectKey}`,
    `Sessions: ${output.totals.allSessions}`,
    `Candidates: ${output.totals.candidateSessions}`,
    `Candidate bytes: ${output.totals.candidateBytes}`,
    `Criteria: olderThanDays=${olderThanDays}, minSizeMb=${minSizeMb}, keepNewest=${keepNewest}`,
  ];
  if (output.archiveDir) lines.push(`Archive: ${output.archiveDir}`);
  for (const session of (shouldApply ? output.archived : output.candidates)) {
    lines.push(`- ${session.name}: ${(session.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB, age=${session.ageDays}d`);
  }
  process.stdout.write(lines.join('\n'));
}

function simplifySession(session) {
  return {
    name: session.name,
    totalSizeBytes: session.totalSizeBytes,
    ageDays: session.ageDays,
    lastWriteTime: session.lastWriteTime,
    hasDirectory: session.hasDirectory,
    hasJsonl: session.hasJsonl,
  };
}
