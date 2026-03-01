# Project Initialization — Hakan

When you run this command, apply the following steps in order:

## 1. Project Analysis
- Analyze the file structure in the current directory (tech stack, framework, language, package manager)
- Read existing CLAUDE.md, README.md, package.json, .csproj, pom.xml, etc. if present
- Check git remote info (read only — do not run git commands)
- **Archetype detection:** Determine the most suitable archetype from the table below

### Archetype Table

| Archetype | Trigger Files | Default Rules |
|-----------|--------------|---------------|
| **dotnet-backend** | `.csproj`, `.sln`, `Program.cs` | C# naming (PascalCase), Controller/Service/Repository pattern, NuGet, xUnit/NUnit |
| **react-frontend** | `package.json` + `react` dependency | Component structure, hook pattern, npm/yarn/pnpm, Jest/Vitest |
| **nextjs-fullstack** | `next.config.*` | App Router/Pages Router, API routes, SSR rules |
| **node-backend** | `package.json` + express/fastify/nest | REST convention, middleware pattern, Jest |
| **python** | `requirements.txt`, `pyproject.toml`, `setup.py` | PEP 8, snake_case, pytest, venv/poetry |
| **monorepo** | `pnpm-workspace.yaml`, `lerna.json`, `nx.json` | Workspace rules, shared deps, turbo/nx |
| **generic** | None of the above | Minimal CLAUDE.md, only detected information |

If multiple archetypes match (e.g.: .sln + package.json) → **ask the user** which is primary.

## 2. Create Project CLAUDE.md
Create `CLAUDE.md` in the project root. Content is **shaped by the archetype**:

```markdown
# {Project Name}

## Tech Stack
- Language: {detected language}
- Framework: {detected framework}
- Package manager: {npm/yarn/pnpm/nuget/maven/...}
- Test framework: {detected or suggested}
- Archetype: {detected archetype}

## Project Rules
{Pre-defined rules by archetype + project-specific additions}

## Build & Test
- Build: `{build command}`
- Test: `{test command}`
- Lint: `{lint command}`
```

### Archetype-Specific Rules

**dotnet-backend:**
- Naming: PascalCase (class, method, property), camelCase (local var, param)
- Structure: Controllers/ → Services/ → Repositories/ → Models/
- Async/await required (for I/O operations)
- Use dependency injection, do not create services with `new`

**react-frontend:**
- Components: function components + hooks (no class components)
- Files: ComponentName/index.tsx + ComponentName.styles.ts
- State: Context or zustand/redux (detect from project)
- Import order: react → 3rd party → local → styles

**node-backend:**
- Route → Controller → Service → Repository layers
- Error handling: centralized via middleware
- Validation: Zod/Joi on request body

**Note:** Rules in global CLAUDE.md (GSD, multi-agent, review, Ralph, git rule) apply everywhere — do not repeat in project CLAUDE.md.

## 3. Create Session Continuity
Create `session-continuity.md` in the project's auto-memory directory:

```markdown
# Session Continuity — {Project Name}

## Last Session
**Date:** —
**Phase:** —
**Status:** —
**Next step:** —
**Decisions:** —

## Session History
(chronological, last 5 sessions)
```

## 4. Verification
- Show created files to user
- Confirm that the detected tech stack and **archetype** are correct
- Fix anything missing or incorrect

## 5. GSD Integration
Ask the user: "Would you like to manage this project with GSD?"
- **Yes** →
  1. Create `.planning/` directory
  2. Create `.planning/STATE.md` skeleton:
     ```markdown
     # State — {Project Name}
     ## Active Phase
     Not started yet — will be initiated with `/gsd:new-project`.
     ## Profile
     balanced (default)
     ```
  3. Run `/gsd:new-project` (creates ROADMAP.md + PROJECT.md, updates STATE.md)
- **No** → Continue with only project CLAUDE.md + session-continuity
