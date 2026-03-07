# Tarayici Baslat — Playwright MCP icin CDP Baglantisi

Bu komutu calistirdigin zaman asagidaki adimlari sirayla uygula. Kullaniciya Turkce mesaj ver.

Kullanim: `/browser [chrome|edge|firefox|brave|opera|vivaldi] [--clean] [--port=XXXX] [--connect]`

Arguman degiskeni: `$ARGUMENTS`

---

## 1. Arguman Ayristirma

`$ARGUMENTS` degerini parse et:

- **Pozisyonel (ilk kelime):** Tarayici adi (opsiyonel). Orn: `chrome`, `edge`, `firefox`
- **`--clean`:** Temiz/gecici profil ile baslat
- **`--port=XXXX`:** Ozel debug portu (varsayilan: 9222)
- **`--connect`:** Yeni tarayici baslatma, mevcut instance'a baglan
- Arguman yoksa veya bossa → Adim 5'e git (secim akisi)

---

## 2. Platform Tespiti

Bash ile platformu tespit et:

```bash
uname -s 2>/dev/null || echo "Windows"
```

- `MINGW*`, `MSYS*`, `CYGWIN*` veya `Windows` → **Windows**
- `Darwin` → **macOS**
- `Linux` → **Linux**

Sonucu `PLATFORM` olarak hatirla. Tum sonraki adimlarda bu degere gore komut sec.

---

## 3. Yuklu Tarayicilari Tespit Et

Platforma gore yuklu tarayicilari bul. **Her bulunan tarayici icin tam yolunu kaydet** (Adim 7'de kullanilacak).

### Windows

Asagidaki yollari kontrol et (bash ile `test -f` kullan):

| Tarayici | Kontrol Yollari |
|----------|----------------|
| Chrome | `"/c/Program Files/Google/Chrome/Application/chrome.exe"`, `"/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"` |
| Edge | `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"`, `"/c/Program Files/Microsoft/Edge/Application/msedge.exe"` |
| Firefox | `"/c/Program Files/Mozilla Firefox/firefox.exe"`, `"/c/Program Files (x86)/Mozilla Firefox/firefox.exe"` |
| Brave | `"/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe"` |
| Opera | `"${LOCALAPPDATA:-$HOME/AppData/Local}/Programs/Opera/opera.exe"`, `"/c/Program Files/Opera/opera.exe"` |
| Vivaldi | `"${LOCALAPPDATA:-$HOME/AppData/Local}/Vivaldi/Application/vivaldi.exe"` |
| Chromium | `"/c/Program Files/Chromium/Application/chrome.exe"` |

Dosya yolu ile bulunamazsa registry'den kontrol et:
```bash
powershell -Command "Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -ErrorAction SilentlyContinue | Select -ExpandProperty '(default)'"
```
(Ayni sekilde `msedge.exe`, `firefox.exe` icin de dene.)

### macOS

```bash
ls /Applications/ | grep -iE "chrome|firefox|edge|brave|opera|vivaldi|chromium"
mdfind "kMDItemKind == 'Application'" 2>/dev/null | grep -iE "chrome|firefox|edge|brave|opera|vivaldi|chromium"
```

### Linux

```bash
# PATH'teki komutlar
for cmd in google-chrome chromium-browser chromium firefox brave-browser microsoft-edge opera vivaldi; do command -v "$cmd" 2>/dev/null; done

# Snap ve Flatpak yollari (fallback)
for p in /snap/bin/chromium /snap/bin/firefox /var/lib/flatpak/exports/bin/com.google.Chrome /var/lib/flatpak/exports/bin/org.mozilla.firefox /var/lib/flatpak/exports/bin/com.brave.Browser /var/lib/flatpak/exports/bin/com.opera.Opera; do test -f "$p" && echo "$p"; done
```

Bulunan tarayicileri ve **tam yollarini** bir liste halinde tut. Hicbiri bulunamazsa kullaniciya soyle:
> "Desteklenen tarayici bulunamadi. Chrome, Edge veya Firefox yukleyin."

---

## 4. Fuzzy Eslestirme

Kullanici bir tarayici adi verdiyse (Adim 1'den), asagidaki tabloya gore esle:

| Girdi | Hedef |
|-------|-------|
| `chrome`, `chro`, `chrom`, `chrone`, `crhome`, `gc` | Chrome |
| `edge`, `edg`, `msedge`, `eg` | Edge |
| `firefox`, `fire`, `ff`, `fox`, `fireofx` | Firefox |
| `brave`, `brav`, `bra` | Brave |
| `opera`, `oper`, `opr` | Opera |
| `vivaldi`, `viv`, `viva` | Vivaldi |
| `chromium`, `chrm` | Chromium |

Eslestirme buyuk/kucuk harf duyarsiz yapilir. Tablo disindaki girdiler icin de dil anlayisini kullanarak en yakin eslesmeyi bulmaya calis (orn: `chorme` → Chrome).

- Eslesme bulunursa → secilen tarayici bu olur
- Eslesme bulunamazsa → kullaniciya sor: "'{girdi}' tarayicisi taninamadi. Sunu mu demek istediniz: {en yakin eslesme}?"
- Eslesen tarayici yuklu degilse → kullaniciya bildir ve yuklu olan tarayicilari listele

---

## 5. Tarayici Secim Akisi

Eger kullanici tarayici adi vermediyse:

1. `~/.claude/browser-last.json` dosyasini oku (bash ile `cat`)
2. Dosya varsa ve icindeki tarayici yuklu ise:
   - Kullaniciya su mesaji goster ve tercihini sor:
   > "Son kullanilan tarayici: **{browser}** (port: {port}). Devam etmek ister misiniz, yoksa baska bir tarayici mi secmek istersiniz?"
   - Kullanici onaylarsa → o tarayici ile devam et
3. Dosya yoksa veya kullanici baska secmek istiyorsa:
   - Yuklu tarayicilarin numarali listesini kullaniciya goster
   - Kullaniciya hangisini tercih ettigini sor

---

## 6. Port Yonetimi

Kullanilacak portu belirle:

1. `--port=XXXX` verilmisse → o portu kullan
2. Verilmemisse → varsayilan `9222`

Portun mesgul olup olmadigini kontrol et:

### Windows
```bash
powershell -Command "try { (New-Object Net.Sockets.TcpClient).Connect('localhost', {port}); Write-Output 'True' } catch { Write-Output 'False' }"
```

### macOS / Linux
```bash
lsof -i :{port} 2>/dev/null || ss -tlnp 2>/dev/null | grep {port}
```

**Karar tablosu:**

| Port Durumu | `--connect` Var mi? | Aksiyon |
|-------------|---------------------|---------|
| Bos | Hayir | Bu portu kullan, tarayiciyi baslat |
| Bos | Evet | Uyar: "Bu portta dinleyen bir tarayici yok. Tarayiciyi baslatmak ister misiniz?" |
| Mesgul | Evet | Yeni tarayici baslatma, mevcut instance'a baglan (Adim 8'e git) |
| Mesgul | Hayir | Otomatik artir: 9222 → 9223 → ... → 9230 |

Eger 9222-9230 arasi tum portlar doluysa:
> "9222-9230 arasi tum portlar mesgul. `--connect` ile mevcut instance'a baglanabilir veya bazi tarayicilari kapatabilirsiniz."

---

## 7. Tarayiciyi Baslat

**Firefox icin ozel uyari:**
Firefox secildiyse once kullaniciya bilgi ver:
> "Firefox'un CDP destegi sinirlidir. Playwright ozellikleri kisitli calisabilir. Chrome veya Edge kullanmaniz onerilir. Yine de devam etmek istiyor musunuz?"
- Hayir → tarayici secim ekranina don
- Evet → devam et

**Onemli:** Tum baslatma komutlarinda Adim 3'te tespit edilen **tam yolu** kullan. Asagidaki orneklerdeki `{path}` yerine gercek yol gelmelidir.

### Windows

Chromium tabanli tarayicilar icin:
```bash
# Standart baslatma (tam yol ile)
powershell -Command "Start-Process '{path}' -ArgumentList @('--remote-debugging-port={port}')"

# --clean ile baslatma (gecici profil)
powershell -Command "Start-Process '{path}' -ArgumentList @('--remote-debugging-port={port}', '--user-data-dir=' + (Join-Path $env:TEMP '{browser}-clean-' + (Get-Date -Format yyyyMMddHHmmss)))"
```

Firefox icin:
```bash
# Standart
powershell -Command "Start-Process '{firefox_path}' -ArgumentList @('--remote-debugging-port', '{port}')"

# --clean (Firefox -profile kullanir)
powershell -Command "$p = Join-Path $env:TEMP ('firefox-clean-' + (Get-Date -Format yyyyMMddHHmmss)); New-Item -ItemType Directory -Path $p -Force | Out-Null; Start-Process '{firefox_path}' -ArgumentList @('--remote-debugging-port', '{port}', '-profile', $p, '-no-remote')"
```

### macOS

Chromium tabanli tarayicilar icin:
```bash
# Standart
open -a "{app_name}" --args --remote-debugging-port={port}

# --clean
open -a "{app_name}" --args --remote-debugging-port={port} --user-data-dir="/tmp/{browser}-clean-$(date +%s)"
```

Uygulamalar: `"Google Chrome"`, `"Microsoft Edge"`, `"Brave Browser"`, `"Opera"`, `"Vivaldi"`, `"Chromium"`

Firefox icin:
```bash
# Standart
open -a "Firefox" --args --remote-debugging-port {port}

# --clean
TMPDIR=$(mktemp -d /tmp/firefox-clean-XXXXXX) && open -a "Firefox" --args --remote-debugging-port {port} -profile "$TMPDIR" -no-remote
```

### Linux

Chromium tabanli tarayicilar icin:
```bash
# Standart
{command} --remote-debugging-port={port} &

# --clean
{command} --remote-debugging-port={port} --user-data-dir="/tmp/{browser}-clean-$(date +%s)" &
```

Komutlar: `google-chrome`, `microsoft-edge`, `brave-browser`, `opera`, `vivaldi`, `chromium-browser`

Firefox icin:
```bash
# Standart
firefox --remote-debugging-port {port} &

# --clean
TMPDIR=$(mktemp -d /tmp/firefox-clean-XXXXXX) && firefox --remote-debugging-port {port} -profile "$TMPDIR" -no-remote &
```

### Baslatma Dogrulamasi

Tarayici baslatildiktan sonra prosesin calisip calismadigini kontrol et:

**Windows:**
```bash
powershell -Command "Start-Sleep 1; if (Get-Process -Name '{process_name}' -ErrorAction SilentlyContinue) { 'Running' } else { 'Failed' }"
```

**macOS / Linux:**
```bash
sleep 1 && pgrep -f "{browser_binary}" > /dev/null && echo "Running" || echo "Failed"
```

Basarisizsa kullaniciya bildir:
> "Tarayici baslatilamadi. Kurulumun dogru oldugunu ve baska bir instance'in profili kilitlemedigini kontrol edin."

---

## 8. CDP Baglantisini Dogrula

Tarayici baslatildiktan sonra (veya `--connect` modunda):

1. 2 saniye bekle (yeni baslatma icin)
2. CDP endpoint'ini kontrol et:
```bash
curl -s http://localhost:{port}/json/version
```
3. Basarisiz olursa → 3 saniye daha bekle ve tekrar dene
4. Hala basarisizsa:
   > "Tarayici debug portuna baglanilamadi. Tarayicinin dogru baslatilip baslatilmadigini kontrol edin."
5. Basarili olursa → JSON ciktisini parse et ve kullaniciya bildir:
   > "Tarayici baglantisi basarili!"
   > - Tarayici: {Browser}
   > - Port: {port}
   > - CDP Endpoint: ws://localhost:{port}/...
   >
   > Playwright MCP araclari kullanima hazir:
   > - `browser_navigate` — Sayfaya git
   > - `browser_click` — Elemente tikla
   > - `browser_snapshot` — Sayfa snapshot'i al
   > - `browser_fill_form` — Form doldur
   > - `browser_take_screenshot` — Ekran goruntusu al
   > - `browser_evaluate` — JavaScript calistir
   > - `browser_press_key` — Tus bas

---

## 9. Durumu Kaydet

Basarili baglantidan sonra `~/.claude/browser-last.json` dosyasina yaz:

```bash
printf '{"browser": "%s", "port": %d}\n' "{secilen_tarayici}" {port} > ~/.claude/browser-last.json
```

---

## 10. Hata Senaryolari Ozeti

| Durum | Mesaj |
|-------|-------|
| Tarayici bulunamadi | "Desteklenen tarayici bulunamadi. Chrome, Edge veya Firefox yukleyin." |
| Tarayici baslatilamadi | "Tarayici baslatilamadi. Kurulumun dogru oldugunu ve profil kilidini kontrol edin." |
| Port tukendi | "9222-9230 arasi tum portlar mesgul. `--connect` ile mevcut instance'a baglanin veya bazi tarayicilari kapatin." |
| CDP baglantisi basarisiz | "Tarayici debug portuna baglanilamadi. Tarayicinin dogru baslatildigini kontrol edin." |
| Firefox CDP sinirlamasi | "Firefox'un CDP destegi sinirlidir. Tam Playwright ozellikleri icin Chrome veya Edge kullanmayi deneyin." |
| Taninamayan tarayici adi | "'{girdi}' taninamadi. Sunu mu demek istediniz: {oneri}?" |
| --clean + temiz profil notu | "Gecici profil olusturuldu: {path}. Bu profiller otomatik temizlenmez, gerekirse elle silin." |
