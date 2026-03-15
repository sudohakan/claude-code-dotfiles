# Active Agents

Bu dosya, Agent Teams icin kullanilan cekirdek rol setini tanimlar. Amaç rol secimini kisa, izlenebilir ve token-dostu tutmaktir.

## Rules
- Aktif ajan sayisi mevcut takim komutlarinin kullandigi cekirdek rollerle sinirli tutulur
- Yeni ihtiyac cikarsa once mevcut cekirdek rollerden biri genisletilir
- Sıkıştırılmış uzmanlik eslesmeleri `ROLE_COMPRESSION_MAP.md` icinde tutulur

## Aktif Cekirdek Roller
- `backend-architect`
- `business-analyst`
- `cloud-architect`
- `content-strategist`
- `devops`
- `fullstack-dev`
- `growth-lead`
- `launch-ops`
- `observability-engineer`
- `analytics-optimizer`
- `product-manager`
- `qa-tester`
- `research-lead`
- `security-engineer`
- `social-media-operator`
- `tech-lead`
- `ui-ux-designer`

## Notes
- Bu liste favori listesi degildir; aktif kutuphaneyi tanimlar.
- Bu liste su anki takim komutlari (`/e2eteam`, `/buildteam`, `/opsteam`, `/growthteam`, `/researchteam`) ile fiilen kullanilan rollerden olusur.
- Team kurarken tam rol yoksa en yakin aktif rol secilir.
- Rol davranisinin ana kaynagi `teams/agents/<role>.md` dosyasidir.
