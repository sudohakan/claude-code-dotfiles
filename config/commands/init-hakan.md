# Proje Başlatma — Hakan

Bu komutu çalıştırdığında aşağıdaki adımları sırayla uygula:

## 1. Proje Analizi
- Mevcut dizindeki dosya yapısını analiz et (tech stack, framework, dil, paket yöneticisi)
- Varsa mevcut CLAUDE.md, README.md, package.json, .csproj, pom.xml vb. dosyaları oku
- Git remote bilgisini kontrol et (sadece okuma — git komutu çalıştırma)
- **Arketip tespiti:** Aşağıdaki tablodan projeye en uygun arketipi belirle

### Arketip Tablosu

| Arketip | Tetikleyici Dosyalar | Varsayılan Kurallar |
|---------|---------------------|---------------------|
| **dotnet-backend** | `.csproj`, `.sln`, `Program.cs` | C# naming (PascalCase), Controller/Service/Repository pattern, NuGet, xUnit/NUnit |
| **react-frontend** | `package.json` + `react` dependency | Component yapısı, hook pattern, npm/yarn/pnpm, Jest/Vitest |
| **nextjs-fullstack** | `next.config.*` | App Router/Pages Router, API routes, SSR kuralları |
| **node-backend** | `package.json` + express/fastify/nest | REST convention, middleware pattern, Jest |
| **python** | `requirements.txt`, `pyproject.toml`, `setup.py` | PEP 8, snake_case, pytest, venv/poetry |
| **monorepo** | `pnpm-workspace.yaml`, `lerna.json`, `nx.json` | Workspace kuralları, shared deps, turbo/nx |
| **generic** | Yukarıdakilerin hiçbiri | Minimal CLAUDE.md, sadece tespit edilen bilgiler |

Birden fazla arketip eşleşiyorsa (örn: .sln + package.json) → **kullanıcıya sor** hangisinin birincil olduğunu.

## 2. Proje CLAUDE.md Oluştur
Proje root'unda `CLAUDE.md` oluştur. İçeriği **arketipe göre** şekillendirilir:

```markdown
# {Proje Adı}

## Tech Stack
- Dil: {tespit edilen dil}
- Framework: {tespit edilen framework}
- Paket yöneticisi: {npm/yarn/pnpm/nuget/maven/...}
- Test framework: {tespit edilen veya önerilen}
- Arketip: {tespit edilen arketip}

## Proje Kuralları
{Arketipe göre önceden tanımlı kurallar + projeye özel eklemeler}

## Build & Test
- Build: `{build komutu}`
- Test: `{test komutu}`
- Lint: `{lint komutu}`
```

### Arketip-Spesifik Kurallar

**dotnet-backend:**
- Naming: PascalCase (class, method, property), camelCase (local var, param)
- Yapı: Controllers/ → Services/ → Repositories/ → Models/
- Async/await zorunlu (I/O operasyonlarında)
- Dependency injection kullan, `new` ile service oluşturma

**react-frontend:**
- Component: function component + hooks (class component kullanma)
- Dosya: ComponentName/index.tsx + ComponentName.styles.ts
- State: Context veya zustand/redux (projeye göre tespit et)
- Import sırası: react → 3rd party → local → styles

**node-backend:**
- Route → Controller → Service → Repository katmanları
- Error handling: middleware ile merkezi
- Validation: request body'de Zod/Joi

**Not:** Global CLAUDE.md'deki kurallar (GSD, multi-agent, review, Ralph, git kuralı) zaten her yerde geçerli — proje CLAUDE.md'de tekrarlama.

## 3. Session Continuity Oluştur
Projenin auto-memory dizinine `session-continuity.md` dosyası oluştur:

```markdown
# Oturum Sürekliliği — {Proje Adı}

## Son Oturum — {tarih}
**Proje:** {proje adı}  **Faz:** —
**Durum:** yeni proje
**Sonraki adım:** —
**Kararlar:** —
```

> Not: Bu dosya her oturum sonunda tamamen yeniden yazılır (append edilmez). Sadece son durumu tutar.

## 4. Doğrulama
- Oluşturulan dosyaları kullanıcıya göster
- Tespit edilen tech stack ve **arketipin** doğru olduğunu onayla
- Eksik veya yanlış bir şey varsa düzelt

## 5. GSD Entegrasyonu
Kullanıcıya sor: "Bu projeyi GSD ile yönetmek ister misin?"
- **Evet** →
  1. `.planning/` dizinini oluştur
  2. `.planning/STATE.md` iskeletini oluştur:
     ```markdown
     # State — {Proje Adı}
     ## Aktif Faz
     Henüz başlamadı — `/gsd:new-project` ile başlatılacak.
     ```
  3. `/gsd:new-project` çalıştır (ROADMAP.md + PROJECT.md oluşturulur, STATE.md güncellenir)
- **Hayır** → Sadece proje CLAUDE.md + session-continuity ile devam et
