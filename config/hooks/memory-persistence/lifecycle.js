#!/usr/bin/env node
/**
 * Memory Persistence Lifecycle Hook
 * Manages session memory across Stop and SessionStart events.
 *
 * Stop: Saves key context (active project, phase, decisions) to session file
 * SessionStart: Loads previous session context if available
 */
const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = path.join(require('os').homedir(), '.claude', 'sessions');
const MEMORY_DIR = path.join(require('os').homedir(), '.claude', 'projects');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getSessionFile() {
  const date = new Date().toISOString().split('T')[0];
  return path.join(SESSIONS_DIR, `session-${date}.json`);
}

function saveSession(data) {
  ensureDir(SESSIONS_DIR);
  const file = getSessionFile();
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  fs.writeFileSync(file, JSON.stringify(merged, null, 2));
}

function loadLatestSession() {
  ensureDir(SESSIONS_DIR);
  const files = fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.startsWith('session-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  const latest = path.join(SESSIONS_DIR, files[0]);
  const age = Date.now() - fs.statSync(latest).mtimeMs;
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  if (age > SEVEN_DAYS) return null;
  return JSON.parse(fs.readFileSync(latest, 'utf8'));
}

// Export for use by other hooks
module.exports = { saveSession, loadLatestSession, getSessionFile, ensureDir };
