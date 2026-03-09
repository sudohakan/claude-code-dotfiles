#!/usr/bin/env node
// Check for claude-code-dotfiles updates in background, write result to cache
// Called by SessionStart hook - runs once per session

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { getCacheDir, getMetaFilePath } = require('./lib/paths');

const cacheDir = getCacheDir();
const cacheFile = path.join(cacheDir, 'dotfiles-update-check.json');
const metaFile = getMetaFilePath();

// Only check if dotfiles-meta.json exists (means dotfiles were installed via script)
if (!fs.existsSync(metaFile)) {
  process.exit(0);
}

// Run check in background
const child = spawn(process.execPath, ['-e', `
  const fs = require('fs');
  const https = require('https');

  const cacheFile = ${JSON.stringify(cacheFile)};
  const metaFile = ${JSON.stringify(metaFile)};

  let installed = '0.0.0';
  let repoPath = '';
  try {
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    installed = meta.version || '0.0.0';
    repoPath = meta.repo_path || '';
  } catch (e) {}

  // Fetch latest VERSION from GitHub
  const url = 'https://raw.githubusercontent.com/sudohakan/claude-code-dotfiles/main/VERSION';
  https.get(url, { timeout: 10000 }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const latest = data.trim();
      const result = {
        update_available: latest && installed !== latest,
        installed,
        latest: latest || 'unknown',
        repo_path: repoPath,
        checked: Math.floor(Date.now() / 1000)
      };
      fs.writeFileSync(cacheFile, JSON.stringify(result));
    });
  }).on('error', () => {
    // Network error — write cache with no update
    const result = {
      update_available: false,
      installed,
      latest: 'unknown',
      repo_path: repoPath,
      checked: Math.floor(Date.now() / 1000),
      error: 'network'
    };
    fs.writeFileSync(cacheFile, JSON.stringify(result));
  });
`], {
  stdio: 'ignore',
  windowsHide: true,
  detached: true
});

child.unref();
