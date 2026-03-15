# Deploy — Generic Azure-Oriented Deployment Entry Point

When this command is executed, provide a safe deployment flow for the current project.

## Behavior
- Detect whether the current project has `azure-pipelines.yml`, `.github/workflows`, or another obvious deployment entrypoint
- Summarize the detected deployment path
- If Azure Pipelines is detected, prefer the pipeline-based deployment path
- If deployment prerequisites are missing, stop and report exactly what is missing
- Never force deployment. Ask for confirmation before triggering a real deployment action

## Output
- Current project path
- Detected deployment mechanism
- Required variables or credentials that appear to be missing
- Next executable step
