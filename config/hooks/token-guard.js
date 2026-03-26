#!/usr/bin/env node
/**
 * token-guard.js — Global token savings hook
 * Inspired by OpenWolf's pre-read/post-read pattern, adapted for global use.
 *
 * PreToolUse:Read — Warns on duplicate reads, estimates token cost
 * PostToolUse:Read — Tracks token consumption per file
 *
 * Mode is determined by env var TOKEN_GUARD_MODE (pre|post), set in settings.json.
 * Session state stored in ~/.claude/cache/token-guard-session.json
 */
const fs = require('node:fs');
const path = require('node:path');

const CACHE_DIR = path.join(process.env.HOME || '/home/hakan', '.claude', 'cache');
const SESSION_FILE = path.join(CACHE_DIR, 'token-guard-session.json');
const MAX_SESSION_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours — new session after gap

function readJSON(fp, fallback) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); }
  catch { return fallback; }
}

function writeJSON(fp, data) {
  if (!fs.existsSync(path.dirname(fp))) fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
}

function estimateTokens(text, ext) {
  const codeExts = new Set(['.ts','.js','.tsx','.jsx','.py','.rs','.go','.java','.c','.cpp','.cs','.css','.json','.yaml','.yml','.xml','.csproj','.sln']);
  const ratio = codeExts.has(ext) ? 3.5 : 4.0;
  return Math.ceil(text.length / ratio);
}

function getSession() {
  const session = readJSON(SESSION_FILE, { files_read: {}, total_tokens: 0, duplicates_warned: 0, started: Date.now() });
  // Reset if stale
  if (Date.now() - session.started > MAX_SESSION_AGE_MS) {
    return { files_read: {}, total_tokens: 0, duplicates_warned: 0, started: Date.now() };
  }
  return session;
}

async function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    setTimeout(() => resolve(chunks.length ? Buffer.concat(chunks).toString('utf-8') : '{}'), 3000);
  });
}

async function main() {
  const mode = process.env.TOKEN_GUARD_MODE;
  if (!mode) { process.exit(0); return; }

  const raw = await readStdin();
  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); return; }

  const filePath = input.tool_input?.file_path || input.tool_input?.path || '';
  if (!filePath) { process.exit(0); return; }

  const normalized = filePath.replace(/\\/g, '/');
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath);
  const session = getSession();

  if (mode === 'pre') {
    // --- PRE-READ: warn on duplicate reads ---
    if (session.files_read[normalized]) {
      const prev = session.files_read[normalized];
      prev.count++;
      session.duplicates_warned++;
      writeJSON(SESSION_FILE, session);
      // Warn via stderr (shown to Claude as hook message)
      process.stderr.write(`[token-guard] ${basename} zaten okundu (${prev.count}. kez, ~${prev.tokens} token). Context'te mevcut bilgiyi kullan.\n`);
    } else {
      // First read — record placeholder
      session.files_read[normalized] = { count: 1, tokens: 0, first_read: Date.now() };
      writeJSON(SESSION_FILE, session);
    }
  }

  if (mode === 'post') {
    // --- POST-READ: track token consumption ---
    const content = input.tool_output?.content || '';
    const tokens = content ? estimateTokens(content, ext) : 0;

    if (session.files_read[normalized]) {
      session.files_read[normalized].tokens = tokens;
    } else {
      session.files_read[normalized] = { count: 1, tokens, first_read: Date.now() };
    }
    session.total_tokens += tokens;
    writeJSON(SESSION_FILE, session);

    // Warn if session total exceeds thresholds
    if (session.total_tokens > 500000 && session.total_tokens - tokens <= 500000) {
      process.stderr.write(`[token-guard] Session toplam: ~${Math.round(session.total_tokens / 1000)}K token. /compact düşün.\n`);
    }
    if (session.total_tokens > 800000 && session.total_tokens - tokens <= 800000) {
      process.stderr.write(`[token-guard] Session toplam: ~${Math.round(session.total_tokens / 1000)}K token! /compact önerilir.\n`);
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
