# Env Check — Local Tooling Health

When this command is executed, verify the local Claude workspace can operate cleanly.

## Check
- `~/.claude/settings.json` exists and parses
- Key hook files exist: `gsd-check-update.js`, `dotfiles-check-update.js`, `pretooluse-safety.js`, `gsd-context-monitor.js`
- `~/.claude/project-registry.json` exists and parses
- Configured MCP launchers referenced in `settings.json` exist
- The current shell can resolve common runtimes when needed: `node`, `npm`, `python`, `bash`

## Output
- Report `OK`, `WARN`, or `FAIL` for each category
- End with a short summary of what is healthy and what needs attention
- Do not change files unless the user explicitly asks for a repair
