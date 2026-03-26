#!/usr/bin/env node
/**
 * fix-plugin-root.js — SessionStart hook
 * Fixes Windows paths in plugin JSON files on WSL.
 * 1. Replaces ${CLAUDE_PLUGIN_ROOT} in hooks.json with actual WSL path
 * 2. Converts Windows paths in known_marketplaces.json and installed_plugins.json
 * 3. Converts /mnt/c/Users/Hakan/ NTFS-mount paths to native WSL paths
 * Targets both WSL-side and Windows-side plugin directories.
 */
const fs = require('node:fs');
const path = require('node:path');

const HOME = process.env.HOME || '/home/hakan';
const PLUGINS_BASE = path.join(HOME, '.claude', 'plugins');
const CACHE_BASE = path.join(PLUGINS_BASE, 'cache');
const MARKETPLACE_BASE = path.join(PLUGINS_BASE, 'marketplaces');
const MARKER = '${CLAUDE_PLUGIN_ROOT}';

// Windows-side plugin directory (NTFS mount)
const WIN_PLUGINS_BASE = '/mnt/c/Users/Hakan/.claude/plugins';
const WIN_CACHE_BASE = path.join(WIN_PLUGINS_BASE, 'cache');
const WIN_MARKETPLACE_BASE = path.join(WIN_PLUGINS_BASE, 'marketplaces');

// Three forms of Windows paths that need fixing:
// 1. JSON double-escaped: C:\\Users\\Hakan\\.claude\...
// 2. Single-backslash:    C:\Users\Hakan\.claude\...
// 3. NTFS mount:          /mnt/c/Users/Hakan/.claude/...
const WIN_PREFIX_DBL = /^C:\\\\Users\\\\Hakan\\\\.claude\\/;
const WIN_PREFIX_SINGLE = /^C:\\Users\\Hakan\\.claude\\/;
const NTFS_MOUNT_PREFIX = /^\/mnt\/c\/Users\/Hakan\/\.claude\//;

function needsFix(p) {
  return p && (WIN_PREFIX_DBL.test(p) || WIN_PREFIX_SINGLE.test(p) || NTFS_MOUNT_PREFIX.test(p));
}

function toNativeWsl(p) {
  if (!p) return p;
  if (WIN_PREFIX_DBL.test(p)) {
    return p.replace(WIN_PREFIX_DBL, HOME + '/.claude/').replace(/\\\\/g, '/');
  }
  if (WIN_PREFIX_SINGLE.test(p)) {
    return p.replace(WIN_PREFIX_SINGLE, HOME + '/.claude/').replace(/\\/g, '/');
  }
  if (NTFS_MOUNT_PREFIX.test(p)) {
    return p.replace(NTFS_MOUNT_PREFIX, HOME + '/.claude/');
  }
  return p;
}

function log(msg) {
  process.stderr.write(`[fix-plugin-root] ${msg}\n`);
}

// --- Fix known_marketplaces.json and installed_plugins.json ---
function fixRegistryJson(filePath) {
  let fixed = 0;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const d = JSON.parse(raw);
    let changed = false;

    const isKnownMarketplaces = filePath.includes('known_marketplaces');
    const isInstalledPlugins = filePath.includes('installed_plugins');

    if (isKnownMarketplaces) {
      for (const [, val] of Object.entries(d)) {
        if (needsFix(val.installLocation)) {
          val.installLocation = toNativeWsl(val.installLocation);
          changed = true;
          fixed++;
        }
      }
    }

    if (isInstalledPlugins) {
      const plugins = d.plugins || d;
      for (const [, entries] of Object.entries(plugins)) {
        if (!Array.isArray(entries)) continue;
        for (const entry of entries) {
          if (needsFix(entry.installPath)) {
            entry.installPath = toNativeWsl(entry.installPath);
            changed = true;
            fixed++;
          }
        }
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(d, null, 2) + '\n', 'utf-8');
      log(`Fixed ${path.basename(filePath)} (${fixed} paths) at ${filePath}`);
    }
  } catch (e) {
    if (e.code !== 'ENOENT') {
      log(`Error processing ${filePath}: ${e.message}`);
    }
  }
  return fixed;
}

// --- Find hooks.json in cache plugins ---
function findCachePlugins(cacheBase) {
  const results = [];
  let marketplaces;
  try { marketplaces = fs.readdirSync(cacheBase); } catch { return results; }

  for (const marketplace of marketplaces) {
    const mpDir = path.join(cacheBase, marketplace);
    let plugins;
    try { plugins = fs.readdirSync(mpDir); } catch { continue; }

    for (const plugin of plugins) {
      const pluginDir = path.join(mpDir, plugin);
      let versions;
      try { versions = fs.readdirSync(pluginDir); } catch { continue; }

      for (const version of versions) {
        const versionDir = path.join(pluginDir, version);
        if (fs.existsSync(path.join(versionDir, '.orphaned_at'))) continue;

        for (const subdir of ['hooks', '.cursor']) {
          const hooksJson = path.join(versionDir, subdir, 'hooks.json');
          if (fs.existsSync(hooksJson)) {
            results.push({ hooksJson, pluginRoot: versionDir });
          }
        }
      }
    }
  }
  return results;
}

// --- Find hooks.json in marketplace plugins ---
function findMarketplacePlugins(marketplaceBase) {
  const results = [];
  let marketplaces;
  try { marketplaces = fs.readdirSync(marketplaceBase); } catch { return results; }

  for (const marketplace of marketplaces) {
    const mpDir = path.join(marketplaceBase, marketplace);
    const pluginsDir = path.join(mpDir, 'plugins');
    let plugins;
    try { plugins = fs.readdirSync(pluginsDir); } catch { continue; }

    for (const plugin of plugins) {
      const pluginDir = path.join(pluginsDir, plugin);
      for (const subdir of ['hooks', '.cursor']) {
        const hooksJson = path.join(pluginDir, subdir, 'hooks.json');
        if (fs.existsSync(hooksJson)) {
          results.push({ hooksJson, pluginRoot: pluginDir });
        }
      }
    }
  }
  return results;
}

// --- Fix hooks.json content ---
function fixHooksJson(filePath, pluginRoot) {
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); } catch { return false; }

  let changed = false;

  // Fix ${CLAUDE_PLUGIN_ROOT} markers
  if (content.includes(MARKER)) {
    content = content.replace(/\$\{CLAUDE_PLUGIN_ROOT\}(?![-:])/g, pluginRoot);
    changed = true;
  }

  // Fix JSON double-escaped Windows paths: C:\\Users\\Hakan\\.claude\\
  if (/C:\\\\Users\\\\Hakan\\\\.claude\\\\/.test(content)) {
    content = content.replace(/C:\\\\Users\\\\Hakan\\\\.claude\\\\/g, HOME + '/.claude/');
    // Clean remaining double-backslashes from the replaced segments
    content = content.replace(/\\\\/g, '/');
    changed = true;
  }

  // Fix NTFS-mount paths: /mnt/c/Users/Hakan/.claude/
  if (/\/mnt\/c\/Users\/Hakan\/\.claude\//.test(content)) {
    content = content.replace(/\/mnt\/c\/Users\/Hakan\/\.claude\//g, HOME + '/.claude/');
    changed = true;
  }

  if (!changed) return false;

  fs.writeFileSync(filePath, content, 'utf-8');
  const label = filePath.includes('marketplace') ? 'marketplace' : 'cache';
  const loc = filePath.startsWith('/mnt/c') ? 'win' : 'wsl';
  const name = path.basename(pluginRoot);
  log(`Fixed hooks.json (${label}/${loc}): ${name}`);
  return true;
}

// ========================
// Run all fixes on BOTH sides
// ========================

let totalFixes = 0;

// 1. Fix registry JSON files — WSL side
totalFixes += fixRegistryJson(path.join(PLUGINS_BASE, 'known_marketplaces.json'));
totalFixes += fixRegistryJson(path.join(PLUGINS_BASE, 'installed_plugins.json'));

// 2. Fix registry JSON files — Windows side
totalFixes += fixRegistryJson(path.join(WIN_PLUGINS_BASE, 'known_marketplaces.json'));
totalFixes += fixRegistryJson(path.join(WIN_PLUGINS_BASE, 'installed_plugins.json'));

// 3. Fix hooks.json — WSL side cache + marketplace
const wslPlugins = [
  ...findCachePlugins(CACHE_BASE),
  ...findMarketplacePlugins(MARKETPLACE_BASE),
];

// 4. Fix hooks.json — Windows side cache + marketplace
const winPlugins = [
  ...findCachePlugins(WIN_CACHE_BASE),
  ...findMarketplacePlugins(WIN_MARKETPLACE_BASE),
];

for (const { hooksJson, pluginRoot } of [...wslPlugins, ...winPlugins]) {
  // For pluginRoot, convert to native WSL path for the replacement value
  const nativeRoot = toNativeWsl(pluginRoot);
  if (fixHooksJson(hooksJson, nativeRoot)) totalFixes++;
}

if (totalFixes > 0) {
  log(`Total: ${totalFixes} fix(es) applied.`);
}

process.exit(0);
