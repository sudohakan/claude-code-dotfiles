#!/usr/bin/env node
/**
 * PostToolUse Auto-Format Hook
 * Edit/Write sonrası proje bazlı formatter çalıştırır.
 * Sadece proje dizininde formatter config varsa aktif olur.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const toolName = data.tool_name;

    // Sadece dosya değiştiren tool'larda çalış
    if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
      process.exit(0);
    }

    // Değiştirilen dosya yolunu bul
    const filePath = data.tool_result?.filePath
      || data.tool_input?.file_path
      || data.tool_input?.filePath;

    if (!filePath || typeof filePath !== 'string') {
      process.exit(0);
    }

    // Dosya uzantısına göre formatter seç
    const ext = path.extname(filePath).toLowerCase();
    const formattableExts = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.json', '.html', '.vue', '.svelte', '.md', '.yaml', '.yml'];

    if (!formattableExts.includes(ext)) {
      process.exit(0);
    }

    // Proje dizinini bul (dosyanın bulunduğu en yakın package.json veya .prettierrc)
    let dir = path.dirname(filePath);
    let hasFormatter = false;
    const configFiles = ['.prettierrc', '.prettierrc.json', '.prettierrc.js', 'prettier.config.js', '.eslintrc', '.eslintrc.json', '.eslintrc.js', 'eslint.config.js', 'biome.json'];

    for (let i = 0; i < 10; i++) {
      for (const cfg of configFiles) {
        if (fs.existsSync(path.join(dir, cfg))) {
          hasFormatter = true;
          break;
        }
      }
      if (hasFormatter) break;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }

    // Formatter config yoksa sessizce geç
    if (!hasFormatter) {
      process.exit(0);
    }

    // Formatter'ı çalıştır (prettier > biome > eslint --fix sırası)
    const formatters = [
      { cmd: 'npx prettier --write', check: '.prettierrc' },
      { cmd: 'npx @biomejs/biome format --write', check: 'biome.json' },
    ];

    for (const fmt of formatters) {
      const cfgExists = configFiles.some(c =>
        c.includes(fmt.check.replace('.', '')) && fs.existsSync(path.join(dir, c))
      );
      if (!cfgExists && fmt.check !== '.prettierrc') continue;

      try {
        execSync(`${fmt.cmd} "${filePath}"`, {
          cwd: dir,
          timeout: 10000,
          stdio: 'pipe',
          windowsHide: true,
        });

        // Başarılı format — sessizce tamamla (context token tasarrufu)
        return;
      } catch (e) {
        // Formatter hata verdi — sessizce geç
      }
    }
  } catch (e) {
    // Silent fail
    process.exit(0);
  }
});
