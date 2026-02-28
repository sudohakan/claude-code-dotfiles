# Gelişmiş Araç Seti

## Claude Squad — Multi-Agent Orchestration
**TUI:** `cs` komutu ile interaktif agent yönetimi (kullanıcı kullanır).
**Programmatic spawn:** Agent'lar `cs-spawn.sh` ile izole Claude Code instance'ları başlatabilir.

```bash
cs-spawn.sh --name "security-audit" --prompt "Bu projedeki güvenlik açıklarını tara" --dir /path/to/repo
cs-spawn.sh --list          # Aktif session'ları listele
cs-spawn.sh --log "name"    # Session çıktısını oku
cs-spawn.sh --kill "name"   # Session'ı sonlandır
```

### Claude Squad Tetikleme Kuralları

| Senaryo | Neden CS | Örnek |
|---------|----------|-------|
| 200+ satır değişiklik | Kendi context window'u gerekir | Büyük refactor, migration |
| Security audit / static analysis | Uzun sürer, background'da çalışmalı | Faz sonu Trail of Bits taraması |
| 2+ farklı proje dizininde eş zamanlı iş | Her proje kendi session'ında | Frontend + Backend paralel |
| Kapsamlı test suite (30+ test veya 5+ dk) | Çıktı büyük, ana context'i şişirir | HakanMCP full test, E2E suite |
| Derin codebase analizi (20+ dosya) | Subagent turn limiti yetmez | Yeni projeye giriş, mimari analiz |
| GSD research fazı 3+ domain içeriyorsa | Her domain kendi full context'inde | Auth + DB + API paralel araştırma |

### Claude Squad tetiklenmez
- Tek dosya fix/edit
- Basit arama/okuma (Explore agent yeter)
- < 2 dakika sürecek görevler
- Aynı dizinde çalışan kısa task'lar (Agent tool yeter)

Her spawn edilen agent kendi git branch'inde çalışır. Sonuçlar dosyaya yazılır, ana context temiz kalır.

## ccusage — Token Kullanım Takibi
```bash
npx ccusage daily --json              # Günlük kullanım (JSON)
npx ccusage session --json            # Session bazlı kullanım
npx ccusage blocks --json             # 5-saatlik billing blokları
```

## Trail of Bits — Güvenlik Audit
6 security skill aktif. Otomatik tetiklenir veya açıkça çağrılır:
- `static-analysis` — CodeQL/Semgrep entegrasyonu
- `differential-review` — Güvenlik odaklı code review
- `insecure-defaults` — Güvensiz varsayılan config tespiti
- `sharp-edges` — Tehlikeli pattern tespiti
- `supply-chain-risk-auditor` — Bağımlılık güvenlik analizi
- `audit-context-building` — Derin mimari context oluşturma

**Fintech projelerde zorunlu:** Her faz sonunda `static-analysis` + `insecure-defaults` çalıştırılır.

## Container Use (Dagger) — Sandbox Ortam
MCP server olarak bağlı. Agent'lar tool olarak kullanabilir:
- İzole Docker container'da kod çalıştırma
- Her agent kendi container + git branch'inde
- `container-use.exe stdio` üzerinden MCP protokolü

## PostToolUse Hooks (Otomatik)
| Hook | Tetikleyici | İşlev |
|------|------------|-------|
| `post-autoformat.js` | Edit/Write/MultiEdit | Proje bazlı prettier/biome format |
| `post-observability.js` | Tüm tool'lar | `~/.claude/logs/tool-activity-{date}.jsonl`'e log |
| `post-notify.js` | AskUserQuestion/Task/Bash | Windows toast notification (uzun görev + input bekleme) |

**Agent log sorgusu:** `cat ~/.claude/logs/tool-activity-$(date +%Y-%m-%d).jsonl | jq '.tool_name'`

## recall — Session Arama
```bash
recall search "hata çözümü"    # Tüm session'larda ara
recall list                     # Son session'ları listele
```

## ClaudeCTX — Config Profil Yönetimi
```bash
claudectx -n finekra-backend   # Mevcut config'den profil oluştur
claudectx finekra-backend      # Profile geç
claudectx -l                   # Profilleri listele
claudectx -                    # Önceki profile dön
```

**Agent kuralı:** Proje değiştiğinde `claudectx <profil>` ile config otomatik değiştirilir.
