#!/usr/bin/env node
// Context Monitor - PostToolUse hook
// Reads context metrics from the statusline bridge file and injects
// warnings when context usage is high. Also auto-saves session state
// at checkpoints so context exhaustion doesn't lose work.
//
// How it works:
// 1. The statusline hook writes metrics to /tmp/claude-ctx-{session_id}.json
// 2. This hook reads those metrics after each tool use
// 3. When remaining context drops below thresholds, it injects a warning
//    as additionalContext, which the agent sees in its conversation
// 4. At CRITICAL threshold, it auto-saves a checkpoint file
//
// Thresholds (remaining_percentage):
//   CHECKPOINT      (remaining <= 45%): Auto-save session state, suggest subagents
//   WARNING         (remaining <= 35%): Agent should wrap up current task
//   CRITICAL        (remaining <= 25%): Agent MUST save state and inform user
//   COMPACT_SUGGEST (remaining <= 15%): Suggest /compact to user
//   COMPACT_URGENT  (remaining <= 10%): Strongly urge /compact + auto-save session-continuity
//
// Debounce: 5 tool uses between warnings to avoid spam
// Severity escalation bypasses debounce

const fs = require('fs');
const os = require('os');
const path = require('path');

const CHECKPOINT_THRESHOLD = 45;      // remaining <= 45% (used ~55%) -> auto-checkpoint
const WARNING_THRESHOLD = 35;         // remaining <= 35% (used ~65%)
const CRITICAL_THRESHOLD = 25;        // remaining <= 25% (used ~75%)
const COMPACT_SUGGEST_THRESHOLD = 15; // remaining <= 15% (used ~85%) -> suggest /compact
const COMPACT_URGENT_THRESHOLD = 10;  // remaining <= 10% (used ~90%) -> urge /compact
const STALE_SECONDS = 60;
const DEBOUNCE_CALLS = 5;
const CHECKPOINT_INTERVAL = 15;  // min tool uses between checkpoints

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id;
    const cwd = data.cwd || process.cwd();

    if (!sessionId) {
      process.exit(0);
    }

    const tmpDir = os.tmpdir();
    const metricsPath = path.join(tmpDir, `claude-ctx-${sessionId}.json`);

    if (!fs.existsSync(metricsPath)) {
      process.exit(0);
    }

    const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    const now = Math.floor(Date.now() / 1000);

    if (metrics.timestamp && (now - metrics.timestamp) > STALE_SECONDS) {
      process.exit(0);
    }

    const remaining = metrics.remaining_percentage;
    const usedPct = metrics.used_pct;

    // Track tool call count for checkpoint interval
    const warnPath = path.join(tmpDir, `claude-ctx-${sessionId}-warned.json`);
    let warnData = { callsSinceWarn: 0, callsSinceCheckpoint: 0, lastLevel: null, checkpointSaved: false };
    let firstWarn = true;

    if (fs.existsSync(warnPath)) {
      try {
        warnData = JSON.parse(fs.readFileSync(warnPath, 'utf8'));
        if (warnData.callsSinceCheckpoint == null) warnData.callsSinceCheckpoint = 0;
        if (warnData.checkpointSaved == null) warnData.checkpointSaved = false;
        firstWarn = false;
      } catch (e) {
        // Corrupted file, reset
      }
    }

    warnData.callsSinceWarn = (warnData.callsSinceWarn || 0) + 1;
    warnData.callsSinceCheckpoint = (warnData.callsSinceCheckpoint || 0) + 1;

    // Auto-checkpoint: write context state to project memory dir
    const shouldCheckpoint = remaining <= CHECKPOINT_THRESHOLD &&
      warnData.callsSinceCheckpoint >= CHECKPOINT_INTERVAL;

    if (shouldCheckpoint) {
      warnData.callsSinceCheckpoint = 0;
      warnData.checkpointSaved = true;
      try {
        // Find memory dir - check common locations
        const memoryDirs = [
          path.join(cwd, 'memory'),
          path.join(os.homedir(), '.claude', 'projects', cwd.replace(/[:\\\/]/g, '-').replace(/^-+/, ''), 'memory'),
        ];
        for (const memDir of memoryDirs) {
          if (fs.existsSync(memDir)) {
            const checkpointPath = path.join(memDir, 'auto-checkpoint.md');
            const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
            const content = `# Auto-Checkpoint — ${timestamp}\n` +
              `**Context:** ${usedPct}% used, ${remaining}% remaining\n` +
              `**Session:** ${sessionId}\n` +
              `**CWD:** ${cwd}\n\n` +
              `> Bu dosya context monitor tarafindan otomatik olusturuldu.\n` +
              `> Yeni session'da \`memory/session-continuity.md\` ve bu dosyayi oku.\n` +
              `> \`claude --resume\` ile devam edebilirsin.\n`;
            fs.writeFileSync(checkpointPath, content);
            break;
          }
        }
      } catch (e) {
        // Silent fail
      }
    }

    // No warning needed above checkpoint threshold
    if (remaining > CHECKPOINT_THRESHOLD) {
      fs.writeFileSync(warnPath, JSON.stringify(warnData));
      process.exit(0);
    }

    const isCompactUrgent = remaining <= COMPACT_URGENT_THRESHOLD;
    const isCompactSuggest = remaining <= COMPACT_SUGGEST_THRESHOLD;
    const isCritical = remaining <= CRITICAL_THRESHOLD;
    const isWarning = remaining <= WARNING_THRESHOLD;
    const isCheckpointOnly = !isWarning && !isCritical;
    const currentLevel = isCompactUrgent ? 'compact_urgent'
      : isCompactSuggest ? 'compact_suggest'
      : isCritical ? 'critical'
      : isWarning ? 'warning'
      : 'checkpoint';

    // Checkpoint zone (45-35%): only inject message every CHECKPOINT_INTERVAL calls
    if (isCheckpointOnly && !shouldCheckpoint) {
      fs.writeFileSync(warnPath, JSON.stringify(warnData));
      process.exit(0);
    }

    // Warning/Critical/Compact: debounce logic
    if ((isWarning || isCritical || isCompactSuggest || isCompactUrgent) && !firstWarn) {
      const severityOrder = { checkpoint: 0, warning: 1, critical: 2, compact_suggest: 3, compact_urgent: 4 };
      const severityEscalated = (severityOrder[currentLevel] || 0) > (severityOrder[warnData.lastLevel] || 0);
      if (warnData.callsSinceWarn < DEBOUNCE_CALLS && !severityEscalated) {
        fs.writeFileSync(warnPath, JSON.stringify(warnData));
        process.exit(0);
      }
    }

    // Reset debounce counter
    warnData.callsSinceWarn = 0;
    warnData.lastLevel = currentLevel;
    fs.writeFileSync(warnPath, JSON.stringify(warnData));

    // Auto-save session-continuity at compact_urgent (90%+ used)
    if (isCompactUrgent) {
      try {
        const memoryDirs = [
          path.join(cwd, 'memory'),
          path.join(os.homedir(), '.claude', 'projects', cwd.replace(/[:\\\/]/g, '-').replace(/^-+/, ''), 'memory'),
        ];
        for (const memDir of memoryDirs) {
          if (fs.existsSync(memDir)) {
            const checkpointPath = path.join(memDir, 'auto-checkpoint.md');
            const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
            const content = `# Auto-Checkpoint (Pre-Compact) — ${timestamp}\n` +
              `**Context:** ${usedPct}% used, ${remaining}% remaining\n` +
              `**Session:** ${sessionId}\n` +
              `**CWD:** ${cwd}\n` +
              `**Action:** /compact oneriliyor — session-continuity.md guncellenmeli\n\n` +
              `> Bu dosya context monitor tarafindan %90 esiginde otomatik olusturuldu.\n` +
              `> Compact sonrasi detay kaybi olabilir, session-continuity.md\'yi kontrol et.\n`;
            fs.writeFileSync(checkpointPath, content);
            break;
          }
        }
      } catch (e) {
        // Silent fail
      }
    }

    // Build message
    let message;
    if (isCompactUrgent) {
      message = `CONTEXT COMPACT URGENT (${usedPct}%, ${remaining}% kaldi): ` +
        'Context %90 uzerinde! Oncelikle session-continuity.md guncelle (ne yapildi, ne kaldi, kararlar), ' +
        'sonra kullaniciya /compact calistirmasini oner. ' +
        'Compact sonrasi calismaya ayni session\'da devam edilebilir. ' +
        'Yeni buyuk is BASLATMA, mevcut isi tamamla veya duraklat.';
    } else if (isCompactSuggest) {
      message = `CONTEXT COMPACT SUGGEST (${usedPct}%, ${remaining}% kaldi): ` +
        'Context %85 esiginde. /compact calistirmak iyi bir zamanlama olur — ' +
        'mevcut isini tamamla, session-continuity.md guncel mi kontrol et, ' +
        'sonra kullaniciya /compact onerisi sun. ' +
        'Compact detay kaybeder ama is akisi bolunmez.';
    } else if (isCritical) {
      message = `CONTEXT CRITICAL (${usedPct}%, ${remaining}% kaldi): ` +
        'HEMEN session-continuity.md guncelle — ne yapildi, ne kaldi, kararlar. ' +
        'Kullaniciya bildir: "Context dolmak uzere, /compact veya `claude --resume` ile devam edebilirsiniz." ' +
        'Yeni is BASLATMA. Mevcut isi bitir veya state kaydet.';
    } else if (isWarning) {
      message = `CONTEXT WARNING (${usedPct}%, ${remaining}% kaldi): ` +
        'Yeni buyuk isler icin SADECE subagent kullan. Ana context\'te yalnizca koordinasyon yap. ' +
        'Mevcut isi tamamla, session-continuity.md guncellemeye hazirlan. ' +
        'Eger GSD kullaniliyorsa /gsd:pause-work dusun.';
    } else {
      message = `CONTEXT CHECKPOINT (${usedPct}%, ${remaining}% kaldi): ` +
        'Context yarisi gecildi. Bundan sonra arastirma ve buyuk isler icin subagent kullan. ' +
        'Ana context\'i temiz tut — uzun tool ciktilarini dosyaya yaz, context\'e degil.';
    }

    const output = {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: message
      }
    };

    process.stdout.write(JSON.stringify(output));
  } catch (e) {
    // Silent fail -- never block tool execution
    process.exit(0);
  }
});
