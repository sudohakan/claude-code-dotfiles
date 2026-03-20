# On-Demand MCP Server Catalog

The on-demand MCP catalog is now built into HakanMCP itself at `src/catalog/servers.json`. No separate documentation file is needed.

## Usage

Use these HakanMCP tools directly:

1. **`mcp_catalog`** — List all available on-demand servers with conditions
2. **`mcp_connectFromCatalog`** — Connect by server key (e.g., `serverKey: "fetch"`)
3. **`mcp_listTools`** — Discover tools on the connected server
4. **`mcp_callTool`** — Execute a tool on the connected server
5. **`mcp_disconnect`** — Close connection when done

## Available Servers (no auth required)

| Key | Name | Use Case |
|-----|------|----------|
| `fetch` | Fetch | WebFetch fails or truncates content |
| `filesystem` | Filesystem | Recursive tree, batch read, sandboxed access |
| `git` | Git | Cross-branch diff, blame, pattern analysis |
| `memory` | Memory | Knowledge graph (entity-relation model) |
| `sequential-thinking` | Sequential Thinking | Trade-off analysis, systematic reasoning |
| `sqlite` | SQLite | Local .sqlite/.db queries |
| `time` | Time | Timezone conversion |
| `mermaid` | Mermaid | Diagram generation (flowchart, sequence, ER, etc.) |
| `duckdb` | DuckDB | Analytical SQL on CSV/Parquet/JSON |

## Adding New Servers

Edit `C:/dev/HakanMCP/src/catalog/servers.json` and rebuild. Servers must require no API key or authentication.
