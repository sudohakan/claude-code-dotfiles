#!/usr/bin/env node
// Analyze and consolidate duplicate project alias directories under ~/.claude/projects.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const projectsDir = path.join(claudeDir, 'projects');
const archiveRoot = path.join(claudeDir, 'archives', 'project-alias-hygiene');
const cacheDir = path.join(claudeDir, 'cache');
const reportFile = path.join(cacheDir, 'project-alias-hygiene-last-run.json');

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');
const wantJson = args.has('--json');
const preferMode = getArgValue('--prefer') || process.env.CLAUDE_PROJECT_ALIAS_PREFERENCE || 'largest';
const targetKey = getArgValue('--normalized-key');

if (args.has('--self-test')) {
  process.stdout.write(JSON.stringify({
    ok: true,
    tool: 'project-alias-hygiene',
    projectsDir,
    reportFile,
    modes: ['largest', 'windows', 'wsl'],
  }));
  process.exit(0);
}

function getArgValue(flagName) {
  const argv = process.argv.slice(2);
  const index = argv.indexOf(flagName);
  if (index === -1) return '';
  return argv[index + 1] || '';
}

function normalizeProjectKey(projectKey) {
  return projectKey
    .toLowerCase()
    .replace(/^-mnt-([a-z])-/, '$1--');
}

function scoreVariant(name, sizeBytes, mtimeMs) {
  const scores = {
    largest: sizeBytes,
    windows: (/^[A-Z]--/.test(name) ? 3 : (/^[a-z]--/.test(name) ? 2 : (/^-mnt-[a-z]-/.test(name) ? 1 : 0))),
    wsl: (/^-mnt-[a-z]-/.test(name) ? 3 : (/^[a-z]--/.test(name) ? 2 : (/^[A-Z]--/.test(name) ? 1 : 0))),
  };

  return {
    primary: scores[preferMode] ?? sizeBytes,
    secondary: sizeBytes,
    tertiary: mtimeMs,
  };
}

function compareVariantPriority(a, b) {
  const aScore = scoreVariant(a.name, a.sizeBytes, a.mtimeMs);
  const bScore = scoreVariant(b.name, b.sizeBytes, b.mtimeMs);

  if (bScore.primary !== aScore.primary) return bScore.primary - aScore.primary;
  if (bScore.secondary !== aScore.secondary) return bScore.secondary - aScore.secondary;
  if (bScore.tertiary !== aScore.tertiary) return bScore.tertiary - aScore.tertiary;
  return a.name.localeCompare(b.name);
}

function getPathSize(targetPath) {
  let stat;
  try {
    stat = fs.statSync(targetPath);
  } catch {
    return 0;
  }

  if (stat.isFile()) return stat.size;
  if (!stat.isDirectory()) return 0;

  let total = 0;
  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    total += getPathSize(path.join(targetPath, entry.name));
  }
  return total;
}

function getHash(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function collectGroups() {
  if (!fs.existsSync(projectsDir)) return [];

  const groups = new Map();
  for (const entry of fs.readdirSync(projectsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(projectsDir, entry.name);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }

    const normalizedKey = normalizeProjectKey(entry.name);
    const variants = groups.get(normalizedKey) || [];
    variants.push({
      name: entry.name,
      path: fullPath,
      sizeBytes: getPathSize(fullPath),
      mtimeMs: stat.mtimeMs,
    });
    groups.set(normalizedKey, variants);
  }

  return Array.from(groups.entries())
    .filter(([, variants]) => variants.length > 1)
    .filter(([normalizedKey]) => !targetKey || normalizedKey === targetKey)
    .map(([normalizedKey, variants]) => {
      const sorted = [...variants].sort(compareVariantPriority);
      return {
        normalizedKey,
        canonical: sorted[0],
        duplicates: sorted.slice(1),
        variants: sorted,
        totalSizeBytes: sorted.reduce((sum, variant) => sum + variant.sizeBytes, 0),
      };
    })
    .sort((a, b) => b.totalSizeBytes - a.totalSizeBytes);
}

function sanitizeAlias(name) {
  return name.replace(/[^a-z0-9._-]+/gi, '_');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function moveFileWithParents(fromPath, toPath) {
  ensureDir(path.dirname(toPath));
  fs.renameSync(fromPath, toPath);
}

function archivePath(runDir, sourceAlias, relativePath) {
  return path.join(runDir, 'conflicts', sanitizeAlias(sourceAlias), relativePath);
}

function summarizeGroup(group) {
  return {
    normalizedKey: group.normalizedKey,
    canonical: group.canonical.name,
    duplicates: group.duplicates.map((variant) => ({
      name: variant.name,
      sizeBytes: variant.sizeBytes,
    })),
    totalSizeBytes: group.totalSizeBytes,
  };
}

function mergeDirectory(sourceDir, targetDir, runDir, sourceAlias, summary, relativeBase = '') {
  if (!fs.existsSync(sourceDir)) return;
  ensureDir(targetDir);

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const relativePath = path.join(relativeBase, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(targetPath)) {
        moveFileWithParents(sourcePath, targetPath);
        summary.moved.push(relativePath);
        continue;
      }

      if (!fs.statSync(targetPath).isDirectory()) {
        const archived = archivePath(runDir, sourceAlias, relativePath);
        moveFileWithParents(sourcePath, archived);
        summary.conflicts.push(relativePath);
        continue;
      }

      mergeDirectory(sourcePath, targetPath, runDir, sourceAlias, summary, relativePath);
      tryRemoveEmptyDir(sourcePath);
      continue;
    }

    if (!fs.existsSync(targetPath)) {
      moveFileWithParents(sourcePath, targetPath);
      summary.moved.push(relativePath);
      continue;
    }

    let keepSource = false;
    try {
      const sourceStat = fs.statSync(sourcePath);
      const targetStat = fs.statSync(targetPath);
      const identical = sourceStat.size === targetStat.size && getHash(sourcePath) === getHash(targetPath);
      if (identical) {
        fs.unlinkSync(sourcePath);
        summary.duplicatesSkipped.push(relativePath);
      } else {
        keepSource = true;
      }
    } catch {
      keepSource = true;
    }

    if (keepSource) {
      const archived = archivePath(runDir, sourceAlias, relativePath);
      moveFileWithParents(sourcePath, archived);
      summary.conflicts.push(relativePath);
    }
  }
}

function tryRemoveEmptyDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  try {
    if (fs.readdirSync(dirPath).length === 0) fs.rmdirSync(dirPath);
  } catch {}
}

function analyzeDryRun(groups) {
  return groups.map(summarizeGroup);
}

function applyGroup(group, runDir) {
  const canonicalPath = group.canonical.path;
  ensureDir(canonicalPath);

  const details = {
    normalizedKey: group.normalizedKey,
    canonical: group.canonical.name,
    mergedAliases: [],
  };

  for (const duplicate of group.duplicates) {
    const summary = {
      sourceAlias: duplicate.name,
      moved: [],
      duplicatesSkipped: [],
      conflicts: [],
      removedSource: false,
    };

    mergeDirectory(duplicate.path, canonicalPath, runDir, duplicate.name, summary);
    tryRemoveEmptyDir(duplicate.path);

    if (fs.existsSync(duplicate.path)) {
      const entries = fs.readdirSync(duplicate.path);
      if (entries.length > 0) {
        const leftoverArchive = path.join(runDir, 'leftovers', sanitizeAlias(duplicate.name));
        ensureDir(path.dirname(leftoverArchive));
        fs.renameSync(duplicate.path, leftoverArchive);
        summary.leftoverArchive = leftoverArchive;
      } else {
        fs.rmdirSync(duplicate.path);
        summary.removedSource = true;
      }
    } else {
      summary.removedSource = true;
    }

    details.mergedAliases.push(summary);
  }

  return details;
}

const groups = collectGroups();
const output = {
  generatedAt: new Date().toISOString(),
  mode: shouldApply ? 'apply' : 'dry-run',
  prefer: preferMode,
  targetKey: targetKey || null,
  groups: shouldApply ? [] : analyzeDryRun(groups),
  totals: {
    duplicateGroups: groups.length,
    duplicateAliases: groups.reduce((sum, group) => sum + group.duplicates.length, 0),
    duplicateBytes: groups.reduce((sum, group) => {
      return sum + group.duplicates.reduce((groupSum, variant) => groupSum + variant.sizeBytes, 0);
    }, 0),
  },
};

if (shouldApply) {
  const runDir = path.join(archiveRoot, new Date().toISOString().replace(/[:.]/g, '-'));
  ensureDir(runDir);
  output.archiveDir = runDir;
  for (const group of groups) {
    output.groups.push(applyGroup(group, runDir));
  }
}

ensureDir(cacheDir);
fs.writeFileSync(reportFile, JSON.stringify(output, null, 2), { mode: 0o600 });

if (wantJson) {
  process.stdout.write(JSON.stringify(output, null, 2));
} else {
  const lines = [
    `Mode: ${output.mode}`,
    `Preference: ${output.prefer}`,
    `Duplicate groups: ${output.totals.duplicateGroups}`,
    `Duplicate aliases: ${output.totals.duplicateAliases}`,
    `Duplicate bytes: ${output.totals.duplicateBytes}`,
  ];

  if (output.archiveDir) lines.push(`Archive: ${output.archiveDir}`);
  for (const group of output.groups) {
    if (!shouldApply) {
      lines.push(`- ${group.normalizedKey}: keep ${group.canonical}, merge ${group.duplicates.map((item) => item.name).join(', ')}`);
      continue;
    }

    lines.push(`- ${group.normalizedKey}: canonical ${group.canonical}`);
    for (const alias of group.mergedAliases) {
      lines.push(`  - ${alias.sourceAlias}: moved=${alias.moved.length}, skipped=${alias.duplicatesSkipped.length}, conflicts=${alias.conflicts.length}, removed=${alias.removedSource ? 'yes' : 'no'}`);
    }
  }

  process.stdout.write(lines.join('\n'));
}
