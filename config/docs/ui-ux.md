# UI/UX Pro Max — Tasarim Sistemi

Kullanici UI olustur/duzelt/iyilestir dediginde veya stil/renk/layout sordugunda tetiklenir.

## Calisma akisi (her UI gorevinde zorunlu)
1. `search.py "<urun_tipi> <sektor>" --design-system` (varsayilan stack: `html-tailwind`)
2. Gerekirse: `--domain <ux|style|typography|chart|landing>`
3. Gerekirse: `--stack <react|nextjs|vue|shadcn|html-tailwind|...>`

## Teslim oncesi zorunlu kontroller
- [ ] Icon: SVG (Heroicons/Lucide), emoji yok
- [ ] Tiklanabilir element → `cursor-pointer`
- [ ] Kontrast >= 4.5:1, light mode'da border'lar gorunur
- [ ] Responsive: 375/768/1024/1440px
- [ ] Input'larda label var, focus state'leri gorunur
