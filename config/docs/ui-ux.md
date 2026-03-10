# UI/UX Pro Max — Tasarim Sistemi

Kullanici UI olustur/duzelt/iyilestir dediginde veya stil/renk/layout sordugunda tetiklenir.

## Calisma akisi (her UI gorevinde zorunlu)
1. WebSearch ile referans tasarim ve design system arastirmasi yap (urun tipi + sektor)
2. Varsayilan stack: `html-tailwind`. Gerekirse: `--domain <ux|style|typography|chart|landing>`
3. Gerekirse farkli stack sec: `react|nextjs|vue|shadcn|html-tailwind|...`

## Teslim oncesi zorunlu kontroller
- [ ] Icon: SVG (Heroicons/Lucide), emoji yok
- [ ] Tiklanabilir element → `cursor-pointer`
- [ ] Kontrast >= 4.5:1, light mode'da border'lar gorunur
- [ ] Responsive: 375/768/1024/1440px
- [ ] Input'larda label var, focus state'leri gorunur
