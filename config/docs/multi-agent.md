# Multi-Agent Koordinasyon Protokolu

## Agent Rolleri

| Rol | Ne Yapar | Ne Zaman |
|-----|----------|----------|
| **Researcher** | Codebase analizi, pattern kesfi | plan-phase oncesi |
| **Implementer** | Kod yazimi, GSD executor | execute-phase sirasinda |
| **Tester** | Test yazimi ve calistirma | her implementer'dan sonra |
| **Reviewer** | Code review, kalite kontrolu | her wave sonunda zorunlu |

## Paralel Agent Kurallari

| Durum | Strateji |
|-------|----------|
| Bagimsiz dosya gruplarinda 2+ task | **Paralel** |
| GSD wave'i birden fazla plan iceriyor | **Paralel** |
| Birden fazla alan arastirilacak | **Paralel** (research) |
| Task'lar arasi bagimlilik var | **Sirali** |
| Ayni dosyalar etkileniyor | **Sirali** veya **worktree** |
| 2+ agent farkli modullere yaziyor | **Worktree** |
| Sadece okuma yapan agent'lar | **Ayni workspace** |

## Paralel Agent Limitleri

| Platform | Teknik Limit | Onerilen | Asildiginda |
|----------|-------------|----------|-------------|
| **Task tool subagent** | 10 es zamanli | 4-6 | Kuyruklanir (batch) |
| **cs-spawn.sh (tmux)** | OS limiti (~sinirsiz) | 4-6 | Her biri ayri API token tuketir |
| **Container Use (Docker)** | Docker daemon limiti | 3-4 | RAM/CPU baskisi |
| **Tek mesajda paralel tool call** | ~5 guvenilir | 3-4 | Fazlasi inconsistent |

**Varsayilan paralel agent:** 4-6 (rate limit + token overhead dengesi)
**10+ gerekiyorsa:** Wave'lere bol — batch kuyruk otomatik calisir ama dinamik pulling yok
**Maliyet uyarisi:** Her agent ~20K token overhead ile baslar. 10 paralel = 200K token anlik tuketim

## Agent Baslatma Kontrol Listesi
1. Task bagimsiz mi? → Paralel baslatilabilir
2. Ayni dosyalar etkileniyor mu? → Worktree kullan veya sirali yap
3. 6'dan fazla agent gerekiyor mu? → Wave'lere bol
4. Her agent'in ciktisi net mi? → Degilse once discuss et
5. **Subagent prompt'unda verification hatirlaticisi var mi?** → Yoksa ekle: "Tamamlamadan once sonucu dogrula"

## Kalite Kapisi — ZORUNLU (her wave sonunda)
1. Tum agent'lar tamamlandi mi kontrol et
2. `superpowers:verification-before-completion` uygula
3. Worktree varsa → bagimlilik sirasina gore merge + `git diff` ile conflict kontrol
4. Conflict varsa → otomatik cozme YAPMA → kullaniciya sor
5. `superpowers:requesting-code-review` ile review tetikle
6. Review gecmediyse → duzelt → tekrar review

**Kisayol yok.** "Basit degisiklik" bile review'dan gecer.

## Subagent Guvenlik Kurallari
- **Verification zorunlu:** Her subagent prompt'una su hatirlatma eklenir: "Isi tamamlamadan once sonucu dogrula — test calistir, syntax kontrol et, ciktiyi oku."
- **Proje CLAUDE.md kontrolu:** `cs-spawn.sh --dir` ile agent baslatilirken hedef dizinde CLAUDE.md varligi dogrulanir. Yoksa uyari verilir.
- **Context limiti:** Task tool subagent'lari kendi context limitlerini bilemez. Buyuk gorevlerde (`200+ satir`) subagent'i `cs-spawn.sh` veya `Container Use` ile baslat — bunlar bagimsiz session olarak calisir.
- **Rate limit korumasi:** 6+ paralel agent calisirken 429 hatasi alinabilir. Gecici hata protokolu (2 retry) uygulanir.

## Agent Basarisizlik Protokolu

| Hata Tipi | Strateji | Max Retry |
|-----------|----------|-----------|
| **Gecici** (timeout, network, rate limit) | Otomatik retry | 2 |
| **Mantiksal** (yanlis plan, eksik bagimlilik) | Kullaniciya danis | 0 |
| **Conflict** (merge conflict, ayni dosya) | Worktree'ye gec veya siraliya don | 1 |
| **Ortam** (build hatasi, eksik dependency) | Duzelt ve retry | 2 |

**Recovery:** Hata → baglimli agent'lari durdur → strateji uygula → 2 retry sonrasi basarisiz → `/gsd:debug`
**Eskalasyon:** 1 agent fail → wave devam | 2+ agent fail → wave dur | Kritik path fail → tum baglimli wave'ler dur

## Paralel Dispatch Tetikleyicisi
Kullanıcı 2+ bağımsız görev verdiğinde `dispatching-parallel-agents` skill otomatik çağrılır.
GSD içinde DAG scheduler bu rolü üstlenir.

## DAG Scheduling (execute-phase)

`depends_on` bazlı dinamik scheduling (`max_concurrent_agents` config ile eş zamanlı agent sınırı, default: 6):

```
Eski:  Wave 1: [A, B, C] -> hepsi bitmeli -> Wave 2: [D, E]
Yeni:  A bitti -> D baslar (D sadece A'ya bagli)
       B bitti -> E baslar (E sadece B'ye bagli)
       C bitti -> (kimse bagli degil)
```

### gsd-tools.cjs Komutlari

- `gsd-tools.cjs phase-plan-dag {phase}` — dependency graph + ready/blocked durumu
- `gsd-tools.cjs update-dag-status {phase} {plan}` — plan tamamlandiginda yeni ready planlari hesapla
- `gsd-tools.cjs analyze-plan-routing {phase}` — Task() vs cs-spawn.sh yonlendirme onerisi

### Executor Yonlendirme Kurallari

| Kosul | Executor | Neden |
|-------|----------|-------|
| files_modified >= 5 VEYA task_count >= 8 | cs-spawn.sh | Buyuk plan, worktree izolasyonu gerekli |
| Ayni anda calisan baska planla dosya cakismasi | cs-spawn.sh | Conflict onleme |
| Diger tum durumlar | Task() tool | Hafif, hizli, mevcut davranis |

### Research Parallelizasyonu

plan-phase arastirma adimi dinamik domain sayisi kullanir:
- Basit faz: 2-3 domain (stack, patterns, pitfalls)
- Karmasik faz: 4-8 domain (auth, DB, API, testing, security, caching...)
- Batch siniri: 5 agent/batch (rate limit korumasi)
- Synthesizer N adet domain dosyasini tek RESEARCH.md'ye birlestirir
