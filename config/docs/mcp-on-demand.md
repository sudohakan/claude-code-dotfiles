<!-- last_updated: 2026-03-24 -->
# On-Demand MCP Server Catalog

Catalog is built into HakanMCP at `src/catalog/servers.json`.

## Tools
1. `mcp_catalog` — list available on-demand servers
2. `mcp_connectFromCatalog` — connect by key (e.g., `serverKey: "fetch"`)
3. `mcp_listTools` — discover tools on connected server
4. `mcp_callTool` — execute a tool
5. `mcp_disconnect` — close connection when done

## Available Servers (no auth required)

| Key | Name | Use Case |
|-----|------|----------|
| `fetch` | Fetch | WebFetch fails or truncates |
| `filesystem` | Filesystem | Recursive tree, batch read, sandboxed access |
| `git` | Git | Cross-branch diff, blame, pattern analysis |
| `memory` | Memory | Knowledge graph (entity-relation) |
| `sequential-thinking` | Sequential Thinking | Trade-off analysis, systematic reasoning |
| `sqlite` | SQLite | Local .sqlite/.db queries |
| `time` | Time | Timezone conversion |
| `mermaid` | Mermaid | Diagram generation |
| `duckdb` | DuckDB | Analytical SQL on CSV/Parquet/JSON |

## Adding New Servers
Edit `C:/dev/HakanMCP/src/catalog/servers.json` and rebuild. Servers must require no auth.
