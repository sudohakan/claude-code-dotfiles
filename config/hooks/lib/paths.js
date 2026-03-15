/**
 * Shared path utilities for Claude Code hooks.
 * Centralizes directory resolution logic to avoid duplication across hooks.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Returns the Claude configuration directory.
 * Respects CLAUDE_CONFIG_DIR env var, falls back to ~/.claude
 */
function getClaudeDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

/**
 * Returns the Claude cache directory, creating it if it doesn't exist.
 */
function getCacheDir() {
  const dir = path.join(getClaudeDir(), 'cache');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Returns the Claude todos directory path.
 */
function getTodosDir() {
  return path.join(getClaudeDir(), 'todos');
}

/**
 * Returns candidate memory directories for a given working directory.
 * Checks both local ./memory and the Claude projects directory.
 */
function getMemoryDirCandidates(cwd) {
  const claudeDir = getClaudeDir();
  const projectKey = cwd.replace(/[:\\/]/g, '-').replace(/^-+/, '');
  return [
    path.join(cwd, 'memory'),
    path.join(claudeDir, 'projects', projectKey, 'memory'),
  ];
}

/**
 * Finds the first existing memory directory for a given working directory.
 * Returns null if none found.
 */
function findMemoryDir(cwd) {
  for (const dir of getMemoryDirCandidates(cwd)) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

/**
 * Returns the path to the dotfiles-meta.json file.
 */
function getMetaFilePath() {
  return path.join(getClaudeDir(), 'dotfiles-meta.json');
}

module.exports = {
  getClaudeDir,
  getCacheDir,
  getTodosDir,
  getMemoryDirCandidates,
  findMemoryDir,
  getMetaFilePath,
};
