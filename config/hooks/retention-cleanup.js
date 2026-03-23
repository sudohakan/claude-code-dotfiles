#!/usr/bin/env node
// Conservative retention cleanup for generated artifacts.
// Runs at most once per day, writes storage trend snapshots,
// and applies only reversible maintenance actions automatically.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const cacheDir = path.join(claudeDir, 'cache');
const reportFile = path.join(cacheDir, 'storage-hygiene-report.json');
const trendHistoryFile = path.join(cacheDir, 'storage-hygiene-history.jsonl');
const trendSummaryFile = path.join(cacheDir, 'storage-hygiene-trend.json');
const autoActionsFile = path.join(cacheDir, 'maintenance-auto-actions-last-run.json');

// Daily throttle — skip if last run was less than 24 hours ago
const throttleFile = path.join(cacheDir, 'retention-cleanup-last-run');
if (!process.argv.includes('--self-test') && !process.argv.includes('--force')) {
  try {
    if (fs.existsSync(throttleFile)) {
      const lastRun = Number.parseInt(fs.readFileSync(throttleFile, 'utf8').trim(), 10);
      if (now - lastRun < DAY) process.exit(0);
    }
  } catch {
    // Run normally if cache is unreadable.
  }
}

function getRetentionDays(envName, fallbackDays) {
  const raw = process.env[envName];
  if (!raw) return fallbackDays;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackDays;
}

function getBooleanEnv(envName, fallback) {
  const raw = process.env[envName];
  if (!raw) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

const RETENTION_DAYS = {
  debug: getRetentionDays('CLAUDE_RETENTION_DEBUG_DAYS', 30),
  telemetry: getRetentionDays('CLAUDE_RETENTION_TELEMETRY_DAYS', 30),
  metrics: getRetentionDays('CLAUDE_RETENTION_METRICS_DAYS', 30),
  fileHistory: getRetentionDays('CLAUDE_RETENTION_FILE_HISTORY_DAYS', 21),
  shellSnapshots: getRetentionDays('CLAUDE_RETENTION_SHELL_SNAPSHOTS_DAYS', 14),
  pasteCache: getRetentionDays('CLAUDE_RETENTION_PASTE_CACHE_DAYS', 14),
  sessionEnv: getRetentionDays('CLAUDE_RETENTION_SESSION_ENV_DAYS', 14),
  tasks: getRetentionDays('CLAUDE_RETENTION_TASKS_DAYS', 21),
  plans: getRetentionDays('CLAUDE_RETENTION_PLANS_DAYS', 45),
  projectLogs: getRetentionDays('CLAUDE_RETENTION_PROJECT_LOG_DAYS', 14),
  projectCheckpoint: getRetentionDays('CLAUDE_RETENTION_PROJECT_CHECKPOINT_DAYS', 30),
  todo: getRetentionDays('CLAUDE_RETENTION_TODO_DAYS', 14),
  trendHistory: getRetentionDays('CLAUDE_RETENTION_STORAGE_TREND_DAYS', 120),
};

const AUTO_ACTIONS = {
  fileHistory: getBooleanEnv('CLAUDE_AUTO_ARCHIVE_FILE_HISTORY', true),
  projectSessions: getBooleanEnv('CLAUDE_AUTO_ARCHIVE_PROJECT_SESSIONS', true),
  aliasInspect: getBooleanEnv('CLAUDE_AUTO_INSPECT_PROJECT_ALIASES', true),
  aliasApply: getBooleanEnv('CLAUDE_AUTO_APPLY_PROJECT_ALIAS_HYGIENE', false),
  projectSessionScanLimit: getRetentionDays('CLAUDE_AUTO_ARCHIVE_PROJECT_SESSION_SCAN_LIMIT', 3),
};

const TARGETS = [
  { dir: path.join(claudeDir, 'debug'), maxAgeMs: RETENTION_DAYS.debug * DAY },
  { dir: path.join(claudeDir, 'telemetry'), maxAgeMs: RETENTION_DAYS.telemetry * DAY },
  { dir: path.join(claudeDir, 'metrics'), maxAgeMs: RETENTION_DAYS.metrics * DAY },
  { dir: path.join(claudeDir, 'file-history'), maxAgeMs: RETENTION_DAYS.fileHistory * DAY },
  { dir: path.join(claudeDir, 'shell-snapshots'), maxAgeMs: RETENTION_DAYS.shellSnapshots * DAY },
  { dir: path.join(claudeDir, 'paste-cache'), maxAgeMs: RETENTION_DAYS.pasteCache * DAY },
  { dir: path.join(claudeDir, 'session-env'), maxAgeMs: RETENTION_DAYS.sessionEnv * DAY },
  { dir: path.join(claudeDir, 'tasks'), maxAgeMs: RETENTION_DAYS.tasks * DAY },
  { dir: path.join(claudeDir, 'plans'), maxAgeMs: RETENTION_DAYS.plans * DAY },
];

if (process.argv.includes('--self-test')) {
  process.stdout.write(JSON.stringify({
    ok: true,
    hook: 'retention-cleanup',
    reportFile,
    trendHistoryFile,
    trendSummaryFile,
    autoActionsFile,
    autoActions: AUTO_ACTIONS,
  }));
  process.exit(0);
}

const sizeCache = new Map();

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function getPathSize(targetPath) {
  if (sizeCache.has(targetPath)) return sizeCache.get(targetPath);

  let total = 0;
  let stat;
  try {
    stat = fs.statSync(targetPath);
  } catch {
    sizeCache.set(targetPath, 0);
    return 0;
  }

  if (stat.isFile()) {
    total = stat.size;
  } else if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
      total += getPathSize(path.join(targetPath, entry.name));
    }
  }

  sizeCache.set(targetPath, total);
  return total;
}

function clearSizeCache(targetPath) {
  sizeCache.delete(targetPath);
}

function listLargestChildren(parentDir, limit = 5) {
  if (!fs.existsSync(parentDir)) return [];

  const results = [];
  for (const entry of fs.readdirSync(parentDir, { withFileTypes: true })) {
    const fullPath = path.join(parentDir, entry.name);
    results.push({
      name: entry.name,
      path: fullPath,
      type: entry.isDirectory() ? 'directory' : 'file',
      sizeBytes: getPathSize(fullPath),
    });
  }

  return results
    .sort((a, b) => b.sizeBytes - a.sizeBytes)
    .slice(0, limit);
}

function normalizeProjectKey(projectKey) {
  return projectKey
    .toLowerCase()
    .replace(/^-mnt-([a-z])-/, '$1--');
}

function collectDuplicateProjectAliases(projectsDir) {
  if (!fs.existsSync(projectsDir)) return [];

  const groups = new Map();
  for (const entry of fs.readdirSync(projectsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const normalized = normalizeProjectKey(entry.name);
    const projectPath = path.join(projectsDir, entry.name);
    const variants = groups.get(normalized) || [];
    variants.push({
      name: entry.name,
      path: projectPath,
      sizeBytes: getPathSize(projectPath),
    });
    groups.set(normalized, variants);
  }

  return Array.from(groups.entries())
    .filter(([, variants]) => variants.length > 1)
    .map(([normalizedKey, variants]) => ({
      normalizedKey,
      totalSizeBytes: variants.reduce((sum, variant) => sum + variant.sizeBytes, 0),
      variants: variants.sort((a, b) => b.sizeBytes - a.sizeBytes),
    }))
    .sort((a, b) => b.totalSizeBytes - a.totalSizeBytes);
}

function getDuplicateAliasSummary(groups) {
  return {
    duplicateGroups: groups.length,
    duplicateAliases: groups.reduce((sum, group) => sum + Math.max(0, group.variants.length - 1), 0),
    duplicateBytes: groups.reduce((sum, group) => {
      return sum + group.variants.slice(1).reduce((groupSum, variant) => groupSum + variant.sizeBytes, 0);
    }, 0),
  };
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
        if ((now - stat.mtimeMs) > (RETENTION_DAYS.projectCheckpoint * DAY)) {
          fs.unlinkSync(fullPath);
          clearSizeCache(fullPath);
        }
      } catch {}
    }

    for (const child of fs.readdirSync(projectDir, { withFileTypes: true })) {
      if (child.name === 'memory') continue;
      const childPath = path.join(projectDir, child.name);
      try {
        const stat = fs.statSync(childPath);
        if ((now - stat.mtimeMs) <= (RETENTION_DAYS.projectLogs * DAY)) continue;

        if (child.isDirectory()) {
          fs.rmSync(childPath, { recursive: true, force: true });
          clearSizeCache(childPath);
        } else if (child.isFile() && child.name.endsWith('.jsonl')) {
          fs.unlinkSync(childPath);
          clearSizeCache(childPath);
        }
      } catch {}
    }

    tryRemoveProjectDir(projectDir);
  }
}

function pruneEmptyTodoFiles(todosDir) {
  if (!fs.existsSync(todosDir)) return;

  for (const entry of fs.readdirSync(todosDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const fullPath = path.join(todosDir, entry.name);
    try {
      const stat = fs.statSync(fullPath);
      if ((now - stat.mtimeMs) <= (RETENTION_DAYS.todo * DAY)) continue;
      const content = fs.readFileSync(fullPath, 'utf8').trim();
      if (content === '[]' || content === '') {
        fs.unlinkSync(fullPath);
        clearSizeCache(fullPath);
      }
    } catch {}
  }
}

function tryRemoveProjectDir(projectDir) {
  if (!fs.existsSync(projectDir)) return;

  try {
    const remaining = fs.readdirSync(projectDir, { withFileTypes: true });
    if (remaining.length === 0) {
      fs.rmdirSync(projectDir);
      clearSizeCache(projectDir);
      return;
    }

    if (remaining.length === 1 && remaining[0].isDirectory() && remaining[0].name === 'memory') {
      const memoryDir = path.join(projectDir, 'memory');
      const memoryItems = fs.existsSync(memoryDir) ? fs.readdirSync(memoryDir) : [];
      if (memoryItems.length === 0) {
        fs.rmdirSync(memoryDir);
        fs.rmdirSync(projectDir);
        clearSizeCache(memoryDir);
        clearSizeCache(projectDir);
      }
    }
  } catch {}
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
        clearSizeCache(fullPath);
      } catch {}
    }
  }
}

function buildStorageReport() {
  const projectsDir = path.join(claudeDir, 'projects');
  const fileHistoryDir = path.join(claudeDir, 'file-history');
  const topLevel = [
    'projects',
    'file-history',
    'plugins',
    'runtime',
    'debug',
    'telemetry',
    'metrics',
    'shell-snapshots',
  ]
    .map((name) => {
      const targetPath = path.join(claudeDir, name);
      return {
        name,
        path: targetPath,
        sizeBytes: getPathSize(targetPath),
      };
    })
    .sort((a, b) => b.sizeBytes - a.sizeBytes);

  const duplicateProjectAliases = collectDuplicateProjectAliases(projectsDir);
  const report = {
    generatedAt: new Date(now).toISOString(),
    claudeDir,
    retentionDays: RETENTION_DAYS,
    autoActionsConfig: AUTO_ACTIONS,
    topLevel,
    topLevelSizes: Object.fromEntries(topLevel.map((item) => [item.name, item.sizeBytes])),
    largestProjects: listLargestChildren(projectsDir, 10),
    topProjects: listLargestChildren(projectsDir, 10),
    largestFileHistoryEntries: listLargestChildren(fileHistoryDir, 10),
    topFileHistoryEntries: listLargestChildren(fileHistoryDir, 10),
    duplicateProjectAliases,
    duplicateProjectAliasSummary: getDuplicateAliasSummary(duplicateProjectAliases),
  };

  ensureDir(cacheDir);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), { mode: 0o600 });
  return report;
}

function runNodeJsonScript(scriptName, args = []) {
  const scriptPath = path.join(claudeDir, 'hooks', scriptName);
  try {
    const stdout = execFileSync(process.execPath, [scriptPath, ...args], {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: claudeDir },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(stdout);
  } catch (error) {
    return {
      ok: false,
      error: error.stderr ? String(error.stderr).trim() : error.message,
      script: scriptName,
      args,
    };
  }
}

function runMaintenanceAutomation(report) {
  const actions = [];

  if (AUTO_ACTIONS.fileHistory) {
    const dryRun = runNodeJsonScript('file-history-hygiene.js', ['--json']);
    const action = {
      name: 'file-history-hygiene',
      enabled: true,
      dryRun: simplifyAutomationResult(dryRun),
      applied: null,
    };
    if (dryRun?.totals?.candidateSessions > 0) {
      action.applied = simplifyAutomationResult(
        runNodeJsonScript('file-history-hygiene.js', ['--apply', '--json'])
      );
    }
    actions.push(action);
  }

  if (AUTO_ACTIONS.projectSessions) {
    const projectsToScan = (report.topProjects || report.largestProjects || [])
      .slice(0, AUTO_ACTIONS.projectSessionScanLimit)
      .map((project) => project.name);

    const scannedProjects = [];
    for (const projectKey of projectsToScan) {
      const dryRun = runNodeJsonScript('project-session-hygiene.js', ['--project-key', projectKey, '--json']);
      const projectAction = {
        projectKey,
        dryRun: simplifyAutomationResult(dryRun),
        applied: null,
      };
      if (dryRun?.totals?.candidateSessions > 0) {
        projectAction.applied = simplifyAutomationResult(
          runNodeJsonScript('project-session-hygiene.js', ['--project-key', projectKey, '--apply', '--json'])
        );
      }
      scannedProjects.push(projectAction);
    }

    actions.push({
      name: 'project-session-hygiene',
      enabled: true,
      scannedProjects,
    });
  }

  if (AUTO_ACTIONS.aliasInspect) {
    const dryRun = runNodeJsonScript('project-alias-hygiene.js', ['--json']);
    const action = {
      name: 'project-alias-hygiene',
      enabled: true,
      dryRun: simplifyAutomationResult(dryRun),
      applied: null,
      autoApplyEnabled: AUTO_ACTIONS.aliasApply,
    };
    if (AUTO_ACTIONS.aliasApply && dryRun?.totals?.duplicateGroups > 0) {
      action.applied = simplifyAutomationResult(
        runNodeJsonScript('project-alias-hygiene.js', ['--apply', '--json'])
      );
    }
    actions.push(action);
  }

  ensureDir(cacheDir);
  fs.writeFileSync(autoActionsFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    actions,
  }, null, 2), { mode: 0o600 });

  return actions;
}

function simplifyAutomationResult(result) {
  if (!result || result.ok === false) return result;
  return {
    mode: result.mode || 'unknown',
    totals: result.totals || null,
    archiveDir: result.archiveDir || null,
    archiveRoot: result.archiveRoot || null,
    projectKey: result.projectKey || null,
    targetKey: result.targetKey || null,
  };
}

function loadHistoryEntries() {
  if (!fs.existsSync(trendHistoryFile)) return [];
  const entries = fs.readFileSync(trendHistoryFile, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const minTimestamp = now - (RETENTION_DAYS.trendHistory * DAY);
  return entries.filter((entry) => {
    const timestamp = Date.parse(entry.generatedAt || '');
    return Number.isFinite(timestamp) && timestamp >= minTimestamp;
  });
}

function getBytesFromEntry(entry, key) {
  return entry?.topLevelSizes?.[key] ?? 0;
}

function pickBaselineEntry(entries, daysAgo) {
  const threshold = now - (daysAgo * DAY);
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const timestamp = Date.parse(entries[index].generatedAt || '');
    if (Number.isFinite(timestamp) && timestamp <= threshold) return entries[index];
  }
  return null;
}

function buildDelta(latestEntry, baselineEntry, key) {
  const latestBytes = getBytesFromEntry(latestEntry, key);
  const baselineBytes = baselineEntry ? getBytesFromEntry(baselineEntry, key) : null;
  return {
    latestBytes,
    baselineBytes,
    deltaBytes: baselineBytes === null ? null : latestBytes - baselineBytes,
  };
}

function buildTrendEntry(report, autoActions) {
  return {
    generatedAt: report.generatedAt,
    topLevelSizes: report.topLevelSizes,
    largestProject: report.topProjects?.[0] || null,
    largestFileHistoryEntry: report.topFileHistoryEntries?.[0] || null,
    duplicateProjectAliasSummary: report.duplicateProjectAliasSummary,
    autoActions,
  };
}

function writeTrendFiles(report, autoActions) {
  const history = loadHistoryEntries();
  history.push(buildTrendEntry(report, autoActions));

  ensureDir(cacheDir);
  fs.writeFileSync(
    trendHistoryFile,
    history.map((entry) => JSON.stringify(entry)).join('\n') + '\n',
    { mode: 0o600 }
  );

  const baseline7 = pickBaselineEntry(history, 7);
  const baseline30 = pickBaselineEntry(history, 30);
  const latestEntry = history[history.length - 1] || null;
  const trend = {
    generatedAt: report.generatedAt,
    points: history.length,
    retentionDays: RETENTION_DAYS.trendHistory,
    latest: latestEntry,
    change7d: {
      projects: buildDelta(latestEntry, baseline7, 'projects'),
      fileHistory: buildDelta(latestEntry, baseline7, 'file-history'),
      plugins: buildDelta(latestEntry, baseline7, 'plugins'),
    },
    change30d: {
      projects: buildDelta(latestEntry, baseline30, 'projects'),
      fileHistory: buildDelta(latestEntry, baseline30, 'file-history'),
      plugins: buildDelta(latestEntry, baseline30, 'plugins'),
    },
    recent: history.slice(-14),
  };

  fs.writeFileSync(trendSummaryFile, JSON.stringify(trend, null, 2), { mode: 0o600 });
}

try {
  for (const target of TARGETS) {
    prune(target.dir, target.maxAgeMs);
  }
  pruneProjectCheckpoints(path.join(claudeDir, 'projects'));
  pruneEmptyTodoFiles(path.join(claudeDir, 'todos'));

  const initialReport = buildStorageReport();
  const autoActions = runMaintenanceAutomation(initialReport);
  const finalReport = buildStorageReport();
  writeTrendFiles(finalReport, autoActions);

  try {
    ensureDir(cacheDir);
    fs.writeFileSync(throttleFile, String(now), { mode: 0o600 });
  } catch {}
} catch {
  process.exit(0);
}
