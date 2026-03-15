# Plugin Profile — Select A Plugin Set

When this command is executed, read `~/.claude/plugin-profiles.json` and present the available profiles.

## Behavior
- Show `minimal`, `dev`, and `security` with a short explanation
- Compare the selected profile against currently enabled plugins in `~/.claude/settings.json`
- Propose the JSON changes needed to move from the current state to the selected profile
- Do not apply changes automatically unless the user explicitly asks
