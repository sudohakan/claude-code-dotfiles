#!/usr/bin/env node
/**
 * PostToolUse Auto-Format Hook
 * Runs a project-based formatter after Edit/Write.
 * Only activates if a formatter config exists in the project directory.
 */

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const toolName = data.tool_name;

    // Only run for file-modifying tools
    if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
      process.exit(0);
    }

    // Find the path of the modified file
    const filePath = data.tool_result?.filePath
      || data.tool_input?.file_path
      || data.tool_input?.filePath;

    if (!filePath || typeof filePath !== 'string') {
      process.exit(0);
    }

    // Select formatter based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const formattableExts = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.json', '.html', '.vue', '.svelte', '.md', '.yaml', '.yml'];

    if (!formattableExts.includes(ext)) {
      process.exit(0);
    }

    // Find the project directory (nearest package.json or .prettierrc containing the file)
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

    // If no formatter config, skip silently
    if (!hasFormatter) {
      process.exit(0);
    }

    // Run formatter (prettier > biome order)
    // Uses execFileSync with array args to prevent command injection
    const formatters = [
      { bin: 'npx', args: ['prettier', '--write'], check: '.prettierrc' },
      { bin: 'npx', args: ['@biomejs/biome', 'format', '--write'], check: 'biome.json' },
    ];

    for (const fmt of formatters) {
      const cfgExists = configFiles.some(c =>
        c.includes(fmt.check.replace('.', '')) && fs.existsSync(path.join(dir, c))
      );
      if (!cfgExists && fmt.check !== '.prettierrc') continue;

      try {
        execFileSync(fmt.bin, [...fmt.args, filePath], {
          cwd: dir,
          timeout: 10000,
          stdio: 'pipe',
          windowsHide: true,
        });

        // Successful format — complete silently (context token savings)
        return;
      } catch {
        // Formatter returned error — skip silently
      }
    }
  } catch (e) {
    // Silent fail
    process.exit(0);
  }
});
