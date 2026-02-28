# Review Araci Secim Tablosu

| Durum | Arac | Neden |
|-------|------|-------|
| PR olusturuldu, merge oncesi review | `code-review:code-review` | PR baglaminda diff-bazli review |
| Faz sonu kalite kontrolu | `superpowers:requesting-code-review` | Mimari uyum + plan uyumu |
| Wave ici hizli kontrol (agent ciktisi) | `feature-dev:code-reviewer` | Tek modul, bug/logic odakli |
| UI komponenti teslimi | `superpowers:requesting-code-review` | Tasarim + erisilebilirlik dahil |

**Kural:** Bir review araci gectiyse, ayni degisiklik icin ikincisini calistirma — gereksiz tekrar.

---

# Ralph Kullanim Kurallari

**Tetikleme Checklist — 5 kosulun tumu saglanmali:**
1. Basari kriteri tek cumleyle ifade edilebilir → **EVET ise devam**
2. Dogrulama otomatik calistirilanilir (test, lint, build) → **EVET ise devam**
3. Maksimum iterasyon tahmin edilebilir (genellikle 3-5) → **EVET ise devam**
4. Tasarim karari gerektiriyor mu? → **HAYIR ise devam**, evet ise Ralph kullanma
5. Kullanici onayi gerektiriyor mu? → **HAYIR ise devam**, evet ise Ralph kullanma

**Uygun gorev ornekleri:** "tum testler gecsin", "lint hatasiz olsun", "build basarili olsun", "type error'lar duzeltilsin"
**Uygun olmayan:** "UI'i iyilestir", "mimariyi refactor et", "yeni ozellik tasarla"

**Zorunlu parametreler:**
- `--completion-promise` → ne basarilacak (orn: "all tests pass")
- `--max-iterations` → ust sinir (varsayilan: 5, max: 10)
