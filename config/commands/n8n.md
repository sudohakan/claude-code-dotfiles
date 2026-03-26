---
description: "n8n workflow operations — list, create, run, status, logs"
---

# n8n Workflow Manager

Manage n8n workflows via MCP. n8n runs at http://localhost:5678 (Docker on WSL).

## Routing

Parse the user's argument to determine the subcommand:

| Argument pattern | Action |
|-----------------|--------|
| `list` | Call `n8n_list_workflows` MCP tool. Show name, ID, active status in a table. |
| `create <description>` | Use `n8n_search_nodes` to find relevant nodes, then `n8n_create_workflow` to build workflow from natural language description. Run `validate_workflow` before saving. |
| `run <id>` | Execute workflow via n8n REST API: `curl -s -X POST -H "X-N8N-API-KEY: $(grep N8N_API_KEY /mnt/c/dev/n8n/.env | cut -d= -f2-)" -H "Content-Type: application/json" http://localhost:5678/api/v1/executions -d '{"workflowId":"<id>"}'`. Note: workflow must have a Manual Trigger node. Show execution result. |
| `status` | Check n8n health (`curl -s http://localhost:5678/healthz`) and call `n8n_list_workflows` to count active/inactive. |
| `logs <id>` | Call `n8n_executions` with workflow ID filter. Show last 10 executions with status and timestamp. |
| (no args) | Show this help table. |

## Notes
- n8n Docker must be running. If connection fails, suggest: `cd /mnt/c/dev/n8n && docker compose up -d`
- API key loaded from `/mnt/c/dev/n8n/.env` via wrapper script
- For workflow creation, use `validate_workflow` before activating
- n8n UI accessible at http://localhost:5678 (LAN: http://192.168.1.55:5678)
