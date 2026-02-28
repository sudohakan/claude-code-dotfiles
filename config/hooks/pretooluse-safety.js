#!/usr/bin/env node

/**
 * PreToolUse Safety Hook
 * Tehlikeli komutları algılar ve uyarı verir.
 * Claude Code hook olarak çalışır — stdin'den JSON alır.
 */

const DANGEROUS_PATTERNS = [
  // Git destructive
  { pattern: /git\s+push\s+.*--force/i, reason: "Force push veri kaybına neden olabilir" },
  { pattern: /git\s+reset\s+--hard/i, reason: "Hard reset commit edilmemiş değişiklikleri siler" },
  { pattern: /git\s+clean\s+-[a-z]*f/i, reason: "git clean untracked dosyaları kalıcı olarak siler" },
  { pattern: /git\s+branch\s+-D/i, reason: "Büyük harf -D merge edilmemiş branch'i siler" },
  { pattern: /git\s+checkout\s+--\s+\./i, reason: "Tüm unstaged değişiklikleri siler" },

  // File system destructive
  { pattern: /rm\s+-[a-z]*r[a-z]*f|rm\s+-[a-z]*f[a-z]*r/i, reason: "Recursive force delete — geri alınamaz" },
  { pattern: /rmdir\s+\/s/i, reason: "Windows recursive directory delete" },

  // Database destructive
  { pattern: /DROP\s+(TABLE|DATABASE|SCHEMA)/i, reason: "Veritabanı yapısı kalıcı olarak silinir" },
  { pattern: /TRUNCATE\s+TABLE/i, reason: "Tablo verileri kalıcı olarak silinir" },
  { pattern: /DELETE\s+FROM\s+\w+\s*(?:;|$)/im, reason: "WHERE koşulsuz DELETE — tüm kayıtları siler" },

  // Deploy/infra
  { pattern: /terraform\s+destroy/i, reason: "Altyapı kaynakları silinir" },
  { pattern: /kubectl\s+delete\s+namespace/i, reason: "Kubernetes namespace silinir" },
];

// Self-test: node pretooluse-safety.js --test
if (process.argv.includes("--test")) {
  const TEST_COMMANDS = [
    { cmd: "git push --force origin main", shouldBlock: true },
    { cmd: "git reset --hard HEAD~3", shouldBlock: true },
    { cmd: "rm -rf /", shouldBlock: true },
    { cmd: "DROP TABLE users", shouldBlock: true },
    { cmd: "terraform destroy", shouldBlock: true },
    { cmd: "git status", shouldBlock: false },
    { cmd: "npm install", shouldBlock: false },
    { cmd: "ls -la", shouldBlock: false },
  ];

  let passed = 0, failed = 0;
  for (const { cmd, shouldBlock } of TEST_COMMANDS) {
    const blocked = DANGEROUS_PATTERNS.some(({ pattern }) => pattern.test(cmd));
    const ok = blocked === shouldBlock;
    console.log(`${ok ? "✓" : "✗"} "${cmd}" → ${blocked ? "BLOCK" : "ALLOW"} (expected: ${shouldBlock ? "BLOCK" : "ALLOW"})`);
    ok ? passed++ : failed++;
  }
  console.log(`\n${passed}/${TEST_COMMANDS.length} passed${failed > 0 ? `, ${failed} FAILED` : ""}`);
  process.exit(failed > 0 ? 1 : 0);
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const event = JSON.parse(input);

    // Sadece Bash tool çağrılarını kontrol et
    if (event.tool_name !== "Bash") {
      return;
    }

    const command = event.tool_input?.command || "";

    for (const { pattern, reason } of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        // Hook uyarı döndürür — Claude'a bilgi verir
        const result = {
          decision: "block",
          reason: `⚠️ Tehlikeli komut algılandı: ${reason}\nKomut: ${command}\nKullanıcıdan açık onay al.`
        };
        process.stdout.write(JSON.stringify(result));
        return;
      }
    }
  } catch (e) {
    // Parse hatası — sessizce geç, hook'u bloke etme
  }
}

main();
