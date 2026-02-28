#!/usr/bin/env node
/**
 * PostToolUse Observability Hook
 * Tüm tool kullanımlarını loglar — agent aktivitesini izlemek için.
 * Log dosyası: ~/.claude/logs/tool-activity-{date}.jsonl
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    const logDir = path.join(os.homedir(), '.claude', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const logFile = path.join(logDir, `tool-activity-${dateStr}.jsonl`);

    const entry = {
      timestamp: now.toISOString(),
      session_id: data.session_id || 'unknown',
      tool_name: data.tool_name || 'unknown',
      // Tool input özeti (büyük veriyi loglamaktan kaçın)
      input_summary: summarizeInput(data.tool_input),
      // Tool result özeti
      result_summary: summarizeResult(data.tool_result),
      // Agent mı yoksa ana context mi?
      is_subagent: !!(data.session_id && data.parent_session_id),
    };

    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');

    // 7 günden eski logları temizle (günde 1 kez)
    cleanOldLogs(logDir, 7);
  } catch (e) {
    // Silent fail — loglamak tool'u bloke etmemeli
    process.exit(0);
  }
});

function summarizeInput(input) {
  if (!input) return null;
  const summary = {};

  // Bash komutu
  if (input.command) {
    summary.command = input.command.substring(0, 200);
  }
  // Dosya yolu
  if (input.file_path) {
    summary.file = input.file_path;
  }
  // Pattern (Glob/Grep)
  if (input.pattern) {
    summary.pattern = input.pattern;
  }
  // Task prompt
  if (input.prompt) {
    summary.prompt = input.prompt.substring(0, 150);
  }

  return Object.keys(summary).length > 0 ? summary : null;
}

function summarizeResult(result) {
  if (!result) return null;
  // Sadece başarı/hata bilgisi
  if (result.error) return { error: String(result.error).substring(0, 200) };
  return { success: true };
}

function cleanOldLogs(dir, maxDays) {
  try {
    // Günde 1 kez çalıştır
    const markerFile = path.join(dir, '.last-cleanup');
    if (fs.existsSync(markerFile)) {
      const stat = fs.statSync(markerFile);
      const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
      if (ageHours < 24) return;
    }

    const files = fs.readdirSync(dir).filter(f => f.startsWith('tool-activity-'));
    const cutoff = Date.now() - (maxDays * 24 * 60 * 60 * 1000);

    for (const file of files) {
      const match = file.match(/tool-activity-(\d{4}-\d{2}-\d{2})\.jsonl/);
      if (match) {
        const fileDate = new Date(match[1]).getTime();
        if (fileDate < cutoff) {
          fs.unlinkSync(path.join(dir, file));
        }
      }
    }

    fs.writeFileSync(markerFile, new Date().toISOString());
  } catch (e) {
    // Silent fail
  }
}
