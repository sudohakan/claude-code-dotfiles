# Global Claude Talimatları

## Dil
Kullanıcı Türkçe yazıyorsa Türkçe, İngilizce yazıyorsa İngilizce yanıt ver.

## Git Kuralı
**Git komutları (commit, push, pull, checkout, branch, merge, rebase, reset, stash vb.) SADECE kullanıcı açıkça talep ettiğinde çalıştırılır.** Otomatik commit, auto-push veya GSD'nin atomic commit kuralı dahil — kullanıcı istemeden git komutu çalıştırma.

---

## 1. GSD — Geliştirme İş Akışı

**Aşağıdaki durumlarda GSD otomatik devreye girer:**

### Yeni proje / yeni özellik
Kullanıcı yeni bir proje, modül veya büyük bir özellik tanımladığında:
1. `/init-hakan` ile proje yapılandırmasını oluştur (CLAUDE.md + session-continuity + .planning/ iskeleti)
2. `/gsd:new-project` ile başla — ROADMAP.md ve STATE.md oluştur
3. Her faz için sırayla: `/gsd:discuss-phase` → `/gsd:plan-phase` → `/gsd:execute-phase` → `/gsd:verify-work`

### Küçük / tek seferlik görev
"Şunu düzelt", "şunu ekle", "şunu yaz" gibi spesifik ve sınırlı istekler:
- `/gsd:quick` kullan — planlama fazını atlar, direkt çalıştırır, atomic commit atar

### Bug / hata ayıklama
Kullanıcı bir hata bildirdiğinde veya "neden çalışmıyor?" diye sorduğunda:
- `/gsd:debug` kullan — semptomları topla, gsd-debugger ajanını çalıştır

### GSD Profile Seçimi
Görev başında Claude aşağıdaki kurallarla profile'ı **otomatik belirler**, kullanıcıya sormadan uygular. Status line'da aktif profile gösterilir.

| Görev Tipi | Profile |
|------------|---------|
| Yeni proje, kritik özellik, mimari değişiklik | `quality` |
| Normal geliştirme, standart özellik | `balanced` |
| Quick fix, typo, tek satır değişiklik | `budget` |

**Otomatik belirleme kuralı:** Görev metnindeki anahtar kelimeler taranır:
- **budget →** fix, typo, düzelt, rename, kaldır, sil, güncelle (tek dosya)
- **quality →** yeni proje, mimari, refactor, migration, güvenlik, performans
- **balanced →** yukarıdakilerin hiçbiri veya belirsiz durum (varsayılan)

Profile belirlendikten sonra mevcut profile farklıysa `/gsd:set-profile` otomatik çalıştırılır.

### Temel kurallar
- **Asla koda atlama.** Gereksinimler netleşmeden implement etme.
- Atomic commit: İş parçası tamamlandığında kullanıcıya bildir, **commit ancak kullanıcı onaylarsa** atılır.
- **Doğrulama zorunlu:** Kod yazıldığında, dosya değiştirildiğinde veya kurulum yapıldığında `superpowers:verification-before-completion` çağrılır. "Tamamlandı" demeden önce kanıt göster. Bu kural görev büyüklüğünden bağımsız, `/gsd:quick` dahil her akışta geçerlidir.
- Context yönetimi aşağıdaki tabloya göre görev başında belirlenir:

| Tahmini Büyüklük | Strateji |
|-------------------|----------|
| < 50 satır değişiklik | Ana context'te yap |
| 50–200 satır | Research → subagent, implement → ana context |
| 200+ satır veya 3+ dosya grubu | Tam multi-agent (research + implement + test paralel) → **CS tetiklenir** |
| Sınıflar arası refactoring | Worktree agent'lar → **CS tercih edilir** |
| Security audit / kapsamlı test | **CS background** (ana session bloklanmaz) |
| 2+ proje dizini eş zamanlı | **CS zorunlu** (her proje kendi session'ında) |

- **Context bütçesi (görev büyüklüğünden bağımsız, hook otomatik uyarır):**
  - **%45 (CHECKPOINT)** → araştırma ve büyük işler için subagent'a geç. Uzun çıktıları dosyaya yaz. Ana context'te sadece kısa sonuçlar tut.
  - **%55 (SUBAGENT-ONLY)** → tüm yeni görevler subagent üzerinden. Ana context'te yalnızca koordinasyon + kısa yanıtlar.
  - **%65 (WARNING)** → mevcut işi tamamla, yeni iş başlatma. session-continuity.md güncellemeye hazırlan.
  - **%75 (CRITICAL)** → HEMEN session-continuity.md güncelle. Kullanıcıya bildir: `claude --resume` ile devam edilebilir.
  - **%85 (COMPACT-SUGGEST)** → Mevcut işi tamamla, session-continuity.md güncel mi kontrol et, kullanıcıya `/compact` öner.
  - **%90 (COMPACT-URGENT)** → Önce session-continuity.md güncelle, sonra kullanıcıya `/compact` çalıştırmasını söyle. Compact sonrası aynı session'da devam edilir.
- **Subagent tercihi:** Context %45 üzerindeyken Read/Grep/Glob yerine Explore agent kullan. Büyük dosya okuma, codebase tarama, test çalıştırma gibi context şişiren işler her zaman subagent'ta yapılmalı.
- `.planning/` dizinindeki STATE.md ve ROADMAP.md her zaman güncel tutulur.
- **Oturum sonu zorunlu:** "bitti/kapat/sonra devam ederiz" veya context CRITICAL → `memory/session-continuity.md` güncelle.
- **Session devam:** Kullanıcıya `claude --resume` (session seç) veya `claude --continue` (son session) hatırlat.

---

## 2. UI/UX Pro Max — Tasarım Sistemi
> Detay: `~/.claude/docs/ui-ux.md`

Kullanıcı UI oluştur/düzelt/iyileştir dediğinde veya stil/renk/layout sorduğunda tetiklenir. Çalışma akışı ve teslim öncesi kontrol listesi docs dosyasında.

---

## 3. Karar Tablosu + Entegrasyon Matrisi
> Detay: `~/.claude/docs/decision-matrix.md` | Review/Ralph: `~/.claude/docs/review-ralph.md`

Hangi görev → hangi GSD akışı + hangi Superpowers + Ralph uygun mu kararı bu tabloya göre verilir. Araştırma görevleri (codebase iç / dış web) ayrı akışta.

---

## 4. Multi-Agent Koordinasyon Protokolü
> Detay: `~/.claude/docs/multi-agent.md`

Agent rolleri, paralel agent kuralları/limitleri, başlatma kontrol listesi, kalite kapısı, subagent güvenlik kuralları, başarısızlık protokolü, DAG scheduling ve research parallelizasyonu docs dosyasında.

---

## 5. Oturum Sürekliliği (proje bazlı)

Session-continuity proje kapsamında tutulur. Yeni projede `/init-hakan` ile oluşturulur.

**Oturum başı (sırasıyla):**
1. **Sağlık kontrolü:** `node ~/.claude/hooks/pretooluse-safety.js --test` çalıştır (hook aktif mi?), `jq --version` kontrol et, `.planning/` dizini varsa STATE.md tutarlılığını doğrula
2. **Context restore:** `memory/session-continuity.md` varsa oku → kaldığı yeri, son kararları ve sonraki adımı özetle
3. **Durum özeti:** `memory/MEMORY.md` + `.planning/STATE.md` varsa oku → kullanıcıya kısa özet sun
4. Dosyalar yoksa sessizce geç (her projede olmayabilir)

**Oturum sonu:** `memory/session-continuity.md`'yi güncelle:
```
## Son Oturum — {tarih}
**Proje:** {proje adı}  **Faz:** {faz no ve adı}
**Durum:** tamamlandı / devam ediyor / bloke
**Sonraki adım:** {ne yapılmalı}
**Kararlar:** {önemli teknik kararlar}
```

---

## 6. Cross-Project Knowledge Base

Global memory dizininde 3 dosya tutulur. Bug çözüldüğünde, pattern tespit edildiğinde veya mimari karar alındığında ilgili dosya güncellenir.

| Dosya | İçerik | Ne Zaman Güncelle |
|-------|--------|-------------------|
| `memory/solutions.md` | Bug çözümleri, root cause'lar | Bug fix sonrası |
| `memory/patterns.md` | Tekrar eden mimari pattern'ler | Pattern tespit edildiğinde |
| `memory/decisions.md` | Teknik kararlar ve trade-off'lar | Mimari karar alındığında |

**Her kayıtta proje adı belirtilir.** Aynı çözüm farklı projelerde geçerliyse "Geçerli projeler" alanına eklenir.
**Proje-spesifik bağlam korunur** — bir projenin kararı diğerini bağlamaz, ancak benzer durumda referans olarak sunulur.

---

## 7. Gelişmiş Araç Seti
> Detay: `~/.claude/docs/tools-reference.md`

Claude Squad, ccusage, Trail of Bits, Container Use, PostToolUse Hooks, recall, ClaudeCTX — tüm araç detayları ve kullanım örnekleri docs dosyasında.

---

## 8. Context Engineering — Token Verimliliği

### Temel Kurallar
- **Dosya sistemine yaz, context'e değil:** Uzun çıktıları dosyaya kaydet, context'te sadece referans tut
- **Subagent izolasyonu:** Her subagent temiz context ile başlar — context rot'u önler
- **Lazy loading:** MCP tool'ları ToolSearch ile yüklenir, gereksiz tool context'e eklenmez
- **Progressive disclosure:** Önce özet, gerekirse detay — büyük dosyaları parça parça oku

### Karar Kalitesi
- Kritik kararlarda 3+ alternatif hipotez üret
- Her karar için kanıt tabanlı değerlendirme yap
- Audit trail tut: neden bu yaklaşım, neden diğerleri değil

### Kalite Kapısı Güçlendirmesi
- İmplementasyon öncesi doğrulama kriterleri tanımla
- LLM-as-Judge: `superpowers:requesting-code-review` sonuçlarını kanıt bazlı skorla
- Başarısız review → düzelt → tekrar review (otomatik retry loop)
