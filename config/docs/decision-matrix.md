# Karar Tablosu + Entegrasyon Matrisi

## Ana Yönlendirme Tablosu

| Kullanıcı Ne İstedi? | GSD Akışı | Superpowers | Ralph |
|---|---|---|---|
| Yeni proje / uygulama | `new-project` → full cycle | brainstorming (ZORUNLU) | — |
| Yeni özellik / modül | `discuss` → `plan` → `execute` → `verify` | writing-plans | — |
| "Şunu düzelt/ekle/değiştir" | `quick` | verification (ZORUNLU) | — |
| Hata var, neden? | `debug` | systematic-debugging | Opsiyonel |
| UI yaz / tasarla | UI/UX Pro Max akışı | — | — |
| execute-phase sırasında | wave-based execution | TDD + verification | Opsiyonel |
| Her faz sonu | — | requesting-code-review | — |
| Araştır / öğren / incele (codebase) | — | Explore agent | — |
| Araştır / öğren / incele (dış kaynak) | — | WebSearch + Context7 | — |
| Birden fazla bağımsız görev (GSD dışı) | `dispatching-parallel-agents` skill | — | — |

## Araştırma Görevi

GSD ve commit zorunlu değil. İki tür araştırma akışı:

### Codebase araştırması (iç)
1. Explore agent ile codebase tara (pattern, dosya yapısı, bağımlılık)
2. Gerekirse Grep/Glob ile spesifik arama
3. Sonucu yapılandırılmış özet olarak sun

### Dış araştırma (web/dökümantasyon)
1. Context7 ile kütüphane/framework dökümantasyonu çek
2. WebSearch ile güncel bilgi ara
3. Gerekirse WebFetch ile detay al
4. Sonucu kaynaklarıyla birlikte özetle
