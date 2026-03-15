# Config Docs Analysis Report

**Date:** 2026-03-10
**Analyzed by:** Claude Opus 4.6
**Scope:** All files in `config/docs/` cross-referenced against `config/CLAUDE.md`, `config/commands/`, `config/hooks/`, and `config/settings.json`

---

## File 1: `config/docs/decision-matrix.md`

**Purpose:** Routes user requests to the correct GSD flow, Superpowers skill, and Ralph usage.

### Issues Found

1. **Line 16 — `dispatching-parallel-agents` listed as a skill, but placed outside the Superpowers column.** The table puts it under "GSD Flow" column context (left side), but in CLAUDE.md (line 156) it is listed as a Superpowers skill (`dispatching-parallel-agents`). The table cell is empty for Superpowers on that row, creating ambiguity about whether it is a GSD flow or a Superpowers skill.

2. **Line 14 — "Explore agent" referenced under Superpowers column.** "Explore agent" is not a registered skill or plugin — it is an informal term for using the Agent tool for research. This is inconsistent with other rows that reference actual skill names (e.g., `brainstorming`, `writing-plans`). It should either be clarified as "Agent tool (research)" or linked to a specific skill.

3. **Line 15 — "WebSearch + Context7" listed under Superpowers.** These are MCP tools / plugins, not Superpowers skills. The column header is "Superpowers" which implies plugin skills from `superpowers@claude-plugins-official`. Mixing tool types in this column is misleading.

### Missing Info

- No mention of the `research-phase` GSD command (`/gsd:research-phase`), which exists in `config/commands/gsd/`. The research flow described on lines 18-31 does not reference this command.
- No mention of `run-phase` command which exists but is not referenced anywhere in any doc.
- Several GSD commands are not represented in this routing table: `add-phase`, `insert-phase`, `remove-phase`, `pause-work`, `resume-work`, `health`, `progress`, `cleanup`, `settings`, `set-profile`, `validate-phase`, `map-codebase`, `reapply-patches`, and milestone-related commands (`new-milestone`, `complete-milestone`, `audit-milestone`, `plan-milestone-gaps`).

### Improvements

- Add a "Quick Reference" section listing ALL available GSD commands grouped by category (project setup, phase management, execution, debugging, maintenance).
- Clarify column headers: rename "Superpowers" to "Skill / Tool" to avoid confusion with the specific plugin name.
- Add a row for "milestone management" workflows.

### Cross-Reference Errors

- The file is referenced from CLAUDE.md line 200 as `~/.claude/docs/decision-matrix.md` — path is correct.
- No internal links to other docs files, but the companion `review-ralph.md` is mentioned in the same CLAUDE.md line. Consider adding a cross-reference within this file.

---

## File 2: `config/docs/multi-agent.md`

**Purpose:** Defines multi-agent coordination rules, parallel dispatch, DAG scheduling, quality gates, and failure protocols.

### Issues Found

1. **Line 29 — `cs-spawn.sh (tmux)` reference.** The `cs-spawn.sh` script is not present in the `config/` directory of this dotfiles repo. It is presumably installed separately (Claude Squad). The doc should note this dependency explicitly. Also, `tmux` may not be available on Windows (the user's platform is Windows 11). The doc does not address Windows compatibility.

2. **Line 48 — `container-use.exe stdio` in tools-reference.md vs MCP config.** The settings.json (line 82) configures container-use as `C:/Users/Hakan/bin/container-use.exe` with args `["stdio"]`. The multi-agent doc references Container Use as Docker-based but does not mention the actual MCP server configuration or that it is an exe binary on Windows.

3. **Line 56 — "CLAUDE.md check" for cs-spawn.sh.** States to "confirm CLAUDE.md exists in the target directory." This is a project-level CLAUDE.md, but the dotfiles system installs CLAUDE.md to `~/.claude/CLAUDE.md` (global). The distinction between global and project-level CLAUDE.md should be clarified.

4. **Line 78 — `max_concurrent_agents` config reference.** This config key is mentioned but it is not defined in `settings.json`. It may be a GSD-internal config, but no location is specified for where to set it.

5. **Lines 87-91 — `gsd-tools.cjs` commands listed.** These commands (`phase-plan-dag`, `update-dag-status`, `analyze-plan-routing`) are referenced but the `gsd-tools.cjs` file is not present in the dotfiles repo. It is likely part of the GSD npm package installed separately. This external dependency should be noted.

### Missing Info

- No mention of the `gsd-statusline.js` hook (present in `config/hooks/` and active in `settings.json`), which provides real-time status during agent execution.
- The `SessionStart` hooks (`gsd-check-update.js`, `dotfiles-check-update.js`) are not mentioned anywhere in any docs file.
- No guidance on how to monitor parallel agents' progress from the main session.

### Improvements

- Add a "Prerequisites" section listing external tools needed: Claude Squad, gsd-tools.cjs, tmux (Linux/macOS only), Docker.
- Add Windows-specific notes (tmux not available, WSL requirement, etc.).
- The DAG scheduling section is detailed but could benefit from a visual diagram or ASCII art showing the dependency flow.
- Add a "Monitoring" section explaining how to check agent status (cs-spawn.sh --list, --log).

### Cross-Reference Errors

- Referenced from CLAUDE.md line 207 as `~/.claude/docs/multi-agent.md` — path correct.
- Line 69 references `/gsd:debug` which exists in `config/commands/gsd/debug.md` — correct.
- Line 73 references `dispatching-parallel-agents` skill — this is a Superpowers skill, reference is correct.

---

## File 3: `config/docs/review-ralph.md`

**Purpose:** Defines when to use which review tool and when Ralph (automated fix loop) is appropriate.

### Issues Found

1. **Line 5 — `code-review:code-review` plugin reference.** Settings.json has `code-review@claude-plugins-official` enabled (line 49). The colon notation `code-review:code-review` implies plugin:skill format. This is correct but differs from how other plugins are referenced (e.g., `superpowers:requesting-code-review` on line 6). The naming convention should be consistent — verify the actual skill name within the code-review plugin.

2. **Line 7 — `feature-dev:code-reviewer` plugin reference.** Settings.json has `feature-dev@claude-plugins-official` enabled (line 52). The skill name `code-reviewer` should be verified — it may be `code-review` or another variant within that plugin.

3. **Line 27 — `--completion-promise` and `--max-iterations` parameters.** These are described as "required parameters" for Ralph, but the doc does not explain how Ralph is invoked (command syntax, skill name). CLAUDE.md does not define Ralph invocation either. The `ralph-loop@claude-plugins-official` plugin is enabled in settings.json (line 53) but no invocation syntax is documented.

### Missing Info

- No invocation example for Ralph. Users/Claude need to know: is it `ralph-loop:run --completion-promise "..." --max-iterations 5`? Or triggered differently?
- The `pr-review-toolkit@claude-plugins-official` plugin (line 60 of settings.json) is enabled but not mentioned in the review tool selection table. It may overlap with `code-review:code-review`.
- The `code-simplifier@claude-plugins-official` plugin (line 59) is also not mentioned — it could be relevant for review workflows.
- No mention of `security-guidance@claude-plugins-official` (line 61) which could be part of review for security-sensitive code.

### Improvements

- Add Ralph invocation syntax with a concrete example.
- Add a note about which plugins are available for reviews (list all review-adjacent plugins from settings.json).
- The "Trigger Checklist" is excellent — consider adding a similar checklist for choosing between the three review tools.
- Add a "Flow Diagram" showing: code complete → choose review type → review → pass/fail → Ralph if automatable.

### Cross-Reference Errors

- Referenced from CLAUDE.md line 200 alongside decision-matrix.md — path correct.
- References `superpowers:requesting-code-review` which matches CLAUDE.md line 163 — consistent.

---

## File 4: `config/docs/tools-reference.md`

**Purpose:** Documents all advanced tools: Claude Squad, Trail of Bits, Container Use, hooks, recall, and ClaudeCTX.

### Issues Found

1. **Line 34 — "6 security skills active" for Trail of Bits.** The actual count in settings.json is **11 Trail of Bits skills** (lines 63-73): `static-analysis`, `differential-review`, `insecure-defaults`, `sharp-edges`, `supply-chain-risk-auditor`, `audit-context-building`, `property-based-testing`, `variant-analysis`, `spec-to-code-compliance`, `git-cleanup`, `workflow-skill-design`. The doc only lists 6 and omits 5 skills.

2. **Lines 35-40 — Trail of Bits skill list is incomplete.** Missing skills:
   - `property-based-testing@trailofbits`
   - `variant-analysis@trailofbits`
   - `spec-to-code-compliance@trailofbits`
   - `git-cleanup@trailofbits`
   - `workflow-skill-design@trailofbits`

3. **Line 53 — Hook table: `dippy/` listed as a hook directory.** The `dippy/` directory does NOT exist in `config/hooks/`. It is referenced in `settings.json` (line 24) as `C:/Users/Hakan/.claude/hooks/dippy/bin/dippy-hook`, suggesting it is installed separately (not part of the dotfiles repo). The doc should clarify this is an external dependency.

4. **Line 55 — `gsd-context-monitor.js` described as PostToolUse hook.** This is correct per settings.json. However, the description says "Monitors context budget (warns at thresholds)" — the actual thresholds are defined in CLAUDE.md section 6 (45%, 55%, 65%, 75%, 85%, 90%). The doc should cross-reference or list these thresholds.

5. **Line 56 — `post-autoformat.js` described as PostToolUse hook, "disabled by default."** But in settings.json, it is NOT listed as a hook at all (only `gsd-context-monitor.js` is in PostToolUse). The file exists in `config/hooks/` but is not wired up. The doc says "disabled by default" which is technically accurate but misleading — it is not just disabled, it is completely absent from the settings configuration.

6. **Lines 50-56 — Hook table is incomplete.** Missing hooks that ARE in settings.json:
   - `gsd-check-update.js` — SessionStart hook (checks for GSD updates)
   - `dotfiles-check-update.js` — SessionStart hook (checks for dotfiles updates)
   - `gsd-statusline.js` — StatusLine hook (not a Pre/PostToolUse hook, but still a hook)

7. **Lines 58-62 — `recall` tool reference.** No indication of whether recall is installed or how to install it. Is it an npm package? A binary? An MCP server? The doc assumes it exists but provides no setup info.

8. **Lines 64-70 — `ClaudeCTX` tool reference.** Same issue as recall — no installation or setup information. Is it `claudectx` CLI? Where is it installed from?

9. **Missing tools from settings.json that are not documented:**
   - `playwright` MCP server (line 96-101 of settings.json, disabled as plugin but configured as MCP)
   - `HakanMCP` MCP server (lines 87-94)
   - Several enabled plugins not mentioned: `typescript-lsp`, `frontend-design`, `skill-creator`, `commit-commands`, `code-simplifier`, `pr-review-toolkit`, `security-guidance`, `hookify`, `claude-md-management`, `document-skills`, `example-skills`, `claude-api`

### Missing Info

- No section for MCP servers (container-use, HakanMCP, playwright are all configured).
- No section for non-Trail-of-Bits plugins (there are 15+ enabled plugins not documented).
- No installation/setup instructions for any tool.
- No version information for any tool.

### Improvements

- Update Trail of Bits count from 6 to 11 and list all skills.
- Add an "MCP Servers" section documenting container-use, HakanMCP, and playwright.
- Add a "Plugins" section or at minimum a table listing all enabled plugins grouped by provider.
- Add installation/prerequisite notes for external tools (dippy, recall, claudectx, cs-spawn.sh).
- Add the SessionStart hooks to the hook table.
- Consider restructuring: group by "Built-in Hooks" vs "External Tools" vs "MCP Servers" vs "Plugins".

### Cross-Reference Errors

- Referenced from CLAUDE.md line 249 as `~/.claude/docs/tools-reference.md` — path correct.
- CLAUDE.md line 251 lists "Claude Squad, Trail of Bits, Container Use, Dippy, recall, ClaudeCTX" — matches the tools-reference.md sections, but the tools-reference.md is missing significant coverage as noted above.

---

## File 5: `config/docs/ui-ux.md`

**Purpose:** Defines the UI/UX Pro Max design system workflow and delivery checklist.

### Issues Found

1. **Line 6 — `search.py` command reference.** This file references `search.py "<urun_tipi> <sektor>" --design-system` but there is no `search.py` anywhere in the dotfiles repo. This appears to be an external tool or a conceptual placeholder. If it is a real tool, its location and installation should be documented. If it is conceptual, it should be clearly marked as such.

2. **Lines 7-8 — `--domain` and `--stack` flags.** These flags are for the undocumented `search.py` tool. Without knowing what `search.py` is, these are unverifiable.

3. **Entire file is in Turkish.** All other docs files and CLAUDE.md are in English. This is inconsistent. CLAUDE.md section 10 (line 192-195) describes UI/UX Pro Max in English, but the detailed doc is Turkish. Given the "respond in user's language" rule, the reference docs should ideally be in English (as the canonical language) with the system responding in the user's language at runtime.

4. **Line 11 — "Heroicons/Lucide" icon libraries referenced.** No indication whether these are installed or expected as CDN/npm dependencies. This is project-dependent and should note that.

### Missing Info

- No color system or design token definitions.
- No component library reference (shadcn, MUI, etc.) — only `--stack` flag hints.
- No accessibility (a11y) guidelines beyond contrast ratio.
- No animation/transition guidelines.
- No dark mode guidance (only mentions "light mode'da border'lar gorunur").
- No connection to the `frontend-design@claude-plugins-official` plugin that is enabled in settings.json.
- CLAUDE.md section 10 says "Triggered when user intent is visual interface design/modification" but the doc itself doesn't define trigger conditions — it jumps straight to the workflow.

### Improvements

- Translate to English for consistency, or provide bilingual version.
- Expand significantly — this is the shortest doc at 16 lines. Other docs are 30-100+ lines.
- Add trigger conditions matching CLAUDE.md section 10.
- Add design token guidelines (spacing, typography scale, color palette approach).
- Add dark mode checklist.
- Reference the `frontend-design` plugin and explain how it integrates.
- Add examples of common UI patterns and how to approach them.
- Document `search.py` or remove/replace the reference.

### Cross-Reference Errors

- Referenced from CLAUDE.md line 193 as `~/.claude/docs/ui-ux.md` — path correct.
- No cross-references to other docs within this file.

---

## Global Cross-Cutting Issues

### 1. Terminology Inconsistency

| Term | Used In | Variant | Used In |
|------|---------|---------|---------|
| "Explore agent" | decision-matrix.md | "Agent tool" | CLAUDE.md |
| "Task tool subagent" | multi-agent.md | "subagent" | CLAUDE.md |
| "cs-spawn.sh" | multi-agent.md, tools-reference.md | "Claude Squad" | tools-reference.md, CLAUDE.md |
| "Container Use (Dagger)" | tools-reference.md | "Container Use (Docker)" | multi-agent.md |

The "Dagger" vs "Docker" inconsistency (tools-reference line 44 says "Dagger", multi-agent line 30 says "Docker") is significant — these are different technologies.

### 2. Plugin Coverage Gap

Settings.json has **28 enabled plugins** across 4 providers (claude-plugins-official, trailofbits, anthropic-agent-skills). The docs collectively mention fewer than half of them. Undocumented plugins:

- `typescript-lsp@claude-plugins-official`
- `frontend-design@claude-plugins-official`
- `skill-creator@claude-plugins-official`
- `commit-commands@claude-plugins-official`
- `code-simplifier@claude-plugins-official`
- `pr-review-toolkit@claude-plugins-official`
- `security-guidance@claude-plugins-official`
- `hookify@claude-plugins-official`
- `claude-md-management@claude-plugins-official`
- `document-skills@anthropic-agent-skills`
- `example-skills@anthropic-agent-skills`
- `claude-api@anthropic-agent-skills`
- 5 Trail of Bits skills (listed above)

### 3. GSD Command Coverage Gap

There are **34 GSD commands** in `config/commands/gsd/`. The docs collectively reference approximately 10 of them. Notable undocumented commands:

- Phase management: `add-phase`, `insert-phase`, `remove-phase`, `validate-phase`, `auto-phase`, `run-phase`
- Work management: `pause-work`, `resume-work`, `add-todo`, `check-todos`, `add-tests`
- Milestones: `new-milestone`, `complete-milestone`, `audit-milestone`, `plan-milestone-gaps`
- Maintenance: `health`, `progress`, `cleanup`, `settings`, `set-profile`, `map-codebase`, `reapply-patches`, `list-phase-assumptions`
- Meta: `help`, `join-discord`, `update`

### 4. Non-GSD Command Coverage

There are **10 non-GSD commands** in `config/commands/`. None are documented in any docs file:

- `browser.md`, `commit.md`, `create-pr.md`, `dotfiles-update.md`, `fix-github-issue.md`, `fix-pr.md`, `init-hakan.md`, `release.md`, `run-ci.md`, `ship.md`

### 5. Hook Coverage

Settings.json configures **6 hooks** across 3 event types. The docs only document 4 hooks and miss the SessionStart hooks and StatusLine hook entirely.

| Hook | Event | Documented? |
|------|-------|-------------|
| `dippy` | PreToolUse (Bash) | Yes (tools-reference) |
| `pretooluse-safety.js` | PreToolUse (Bash) | Yes (tools-reference) |
| `gsd-context-monitor.js` | PostToolUse | Yes (tools-reference) |
| `post-autoformat.js` | (not wired) | Yes but misleading (tools-reference) |
| `gsd-check-update.js` | SessionStart | **NO** |
| `dotfiles-check-update.js` | SessionStart | **NO** |
| `gsd-statusline.js` | StatusLine | **NO** |

---

## Priority Recommendations

### Critical (accuracy errors)
1. **tools-reference.md:** Update Trail of Bits from "6 skills" to "11 skills" and list all of them.
2. **tools-reference.md:** Fix Container Use label — choose either "Dagger" or "Docker" and be consistent with multi-agent.md.
3. **tools-reference.md:** Add missing hooks (SessionStart, StatusLine) to the hook table.
4. **ui-ux.md:** Verify or remove `search.py` reference — it does not exist in the repo.

### High (completeness gaps)
5. **tools-reference.md:** Add sections for MCP servers and enabled plugins.
6. **All docs:** Document the non-GSD commands (commit, create-pr, ship, etc.).
7. **decision-matrix.md:** Add the missing GSD commands to the routing table or add a command reference section.
8. **review-ralph.md:** Add Ralph invocation syntax and example.

### Medium (consistency/clarity)
9. **ui-ux.md:** Translate to English for consistency with other docs.
10. **All docs:** Standardize terminology (Agent tool vs Explore agent, subagent vs Task tool subagent).
11. **multi-agent.md:** Add Windows compatibility notes.
12. **tools-reference.md:** Add installation/setup info for external tools.

### Low (nice-to-have)
13. **All docs:** Add cross-references between docs files.
14. **decision-matrix.md:** Add milestone workflow row.
15. **multi-agent.md:** Add monitoring guidance for parallel agents.
16. **ui-ux.md:** Expand with design tokens, dark mode, a11y, animation guidelines.
