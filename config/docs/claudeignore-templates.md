<!-- last_updated: 2026-03-15 -->
# .claudeignore Templates

## Project Type Detection

| Signal File/Pattern | Project Type | Template to Use |
|--------------------|-------------|----------------|
| `*.csproj`, `*.sln`, `*.cs` | .NET/C# | .NET template |
| `package.json`, `*.tsx`, `*.jsx` | Node/React | React/Node template |
| `*.py`, `requirements.txt`, `pyproject.toml` | Python | Python template |
| `ntuser.ini`, `NTUSER.DAT*` | Windows Home Directory | Home Directory template |
| `go.mod` | Go | Common template |
| `Cargo.toml` | Rust | Common + `.cargo/registry/` |

**Rule:** If no `.claudeignore` exists in the current directory, detect project type from signal files and suggest the matching template.

---

## Templates

### Common (All Projects)
```
.git/
node_modules/
bin/
obj/
dist/
build/
*.log
*.bak
.DS_Store
Thumbs.db
```

### .NET / C#
```
bin/
obj/
*.user
*.suo
.vs/
packages/
*.nupkg
TestResults/
```

### React / Node
```
node_modules/
.next/
dist/
build/
coverage/
.env.local
.env.*.local
*.tsbuildinfo
```

### Python
```
__pycache__/
*.pyc
*.pyo
.venv/
venv/
env/
.pytest_cache/
*.egg-info/
.mypy_cache/
htmlcov/
```

### Home Directory (C:\Users\Hakan or /home/hakan)
```
# Security sensitive
.ssh/
.gnupg/
.git-credentials
.kube/
.azure/
.docker/
.cargo/registry/
.rustup/toolchains/
NTUSER.DAT*
ntuser.dat.LOG*
ntuser.ini
*.blf
*.regtrans-ms
*.TxR.*
*.reg

# Performance — large/irrelevant dirs
AppData/
Application\ Data/
Local\ Settings/
OneDrive/
Music/
Videos/
Pictures/
Zomboid/
Unity/
node-*/
.conda/
.ollama/
.android/
.dotnet/

# Noisy / irrelevant files
forti-*.ps1
forti-*.log
forti-*.png
forti-*.txt
forti-*.csv
forti-*.etl
*.etl
obj_*
CRLF
soapui-settings.xml
*.bak

# Windows system
Cookies
Recent
PrintHood
NetHood
SendTo
Templates
Intel/
```
