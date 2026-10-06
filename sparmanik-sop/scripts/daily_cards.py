"""Daily job cards, HST 0-85, Indonesian + English, Day-8 card style (v1.2).
Run: python3 scripts/daily_cards.py  -> build/daily_id.html, build/daily_en.html (print with Chromium)."""
import os, base64, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(ROOT, 'assets', 'logo.jpg'), 'rb').read()).decode()
LAST = 85

def stage(h):
    if h <= 7:  return dict(k='S1', name=('Tumbuh — penyesuaian', 'Grow — establish'), ec='2.1', sop=None, timer=('3 × 5 menit · 08 · 12 · 16', '3 × 5 min · 8 am · 12 pm · 4 pm'), water='0,5 L', ro='75–100 ml', col='#2F5D3E')
    if h <= 24: return dict(k='S1', name=('Tumbuh — vegetatif', 'Grow — vegetative'), ec='2.1', sop=None, timer=('4 × 6 menit · 08 · 11 · 14 · 17', '4 × 6 min · 8 · 11 am · 2 · 5 pm'), water='0,8 L', ro='120–160 ml', col='#2F5D3E')
    if h <= 41: return dict(k='S2', name=('Bunga & jadi buah', 'Flower & set'), ec='2.4', sop='310 g', timer=('5 × 7 menit · 08 · 10 · 12 · 14 · 16', '5 × 7 min · 8 · 10 · 12 · 2 · 4'), water='1,2 L', ro='175–235 ml', col='#B9811F')
    if h <= 59: return dict(k='S3', name=('Pembesaran buah', 'Fruit sizing'), ec='2.55', sop='535 g', timer=('6 × 8 menit · 07 · 09 · 11 · 13 · 15 · 17', '6 × 8 min · 7 · 9 · 11 · 1 · 3 · 5'), water='1,6 L', ro='240–320 ml', col='#C66A22')
    return dict(k='S4', name=('Pematangan & panen', 'Ripen & harvest'), ec='2.7', sop='645 g', timer=('4 × 6 menit · 08 · 11 · 14 · 17', '4 × 6 min · 8 · 11 am · 2 · 5 pm'), water='0,8 L', ro='80–120 ml', col='#8A5A2B')

SIL = {8, 15, 22, 29, 36}
TRI = {0, 17, 38, 59}
TPH = {20, 28, 35}
CA = {35, 42}

def jobs(h):
    J = []  # (title_id, title_en, body_id, body_en, tone)  tone: blue|green|red|gold
    if h == 0:
        J.append(('Pindah tanam + Trichoderma', 'Transplant + Trichoderma',
                  'Tanam bibit pelan-pelan ke polybag yang sudah dibuffer. Hari ini <b>air biasa saja</b>, belum pupuk. Siram polybag dulu, lalu <b>1 gelas (250 ml)</b> Trichoderma di pangkal batang: 10 g per ember 10 L, diamkan 15–30 menit, pakai hari ini juga. <b>Jangan</b> lewat dripper atau tangki.',
                  'Plant seedlings gently into the buffered bags. <b>Plain water only today</b>, no feed. Water the bags first, then <b>one cup (250 ml)</b> of Trichoderma at the stem base: 10 g per 10 L bucket, stand 15–30 min, use the same day. <b>Never</b> through the drippers or tank.', 'green'))
    if h == 1:
        J.append(('Pupuk mulai hari ini', 'Feed starts today', 'Stok A + Stok B S1 → tangki 1.000 L · EC 2.1 · pH 5,8–6,3. Tanpa SOP.', 'Stock A + Stock B S1 → 1,000 L tank · EC 2.1 · pH 5.8–6.3. No SOP.', 'blue'))
    if h == 7:
        J.append(('Mulai buang tunas samping', 'Start removing side shoots', 'Tiap 2–3 hari sampai ruas 8. Petik <b>tunas</b> di ketiak daun ruas 1–8, <b>daun tetap</b>. Jangan potong pucuk utama. Ruas 9–12 dibiarkan — buah dari sini.', 'Every 2–3 days until node 8. Pinch the <b>shoot</b> in the leaf armpit on nodes 1–8, <b>keep the leaf</b>. Never the main tip. Leave nodes 9–12 — fruit comes from there.', 'green'))
    if h in SIL:
        last = h == 36
        J.append(('Siram silika (Kalsika)' + (' — TERAKHIR' if last else ''), 'Silicon drench (Kalsika)' + (' — LAST ONE' if last else ''),
                  'Saklar MANUAL. 400 L air bersih → jalankan 3 menit → 1 sachet 100 g ke ~300 L, aduk sampai bening → jalankan 8 menit → tambah sampai 100 L saja → jalankan 3 menit sampai habis → buat tangki pupuk biasa. Hari ini hanya siram <b>14:00 dan 17:00</b>.' + (' <b>Setelah hari ini tidak ada silika lagi</b> — buah pecah.' if last else ''),
                  'MANUAL switch. 400 L clean water → run 3 min → one 100 g sachet into ~300 L, stir until clear → run 8 min → top up to 100 L only → run 3 min until empty → make the normal feed tank. Today only the <b>2 pm and 5 pm</b> pulses.' + (' <b>No silicon after today</b> — it splits fruit.' if last else ''), 'blue'))
    if h == 8:
        J.append(('Ganti timer', 'Change the timer', 'Mulai besok (hari 9): <b>4 × 6 menit · 08 · 11 · 14 · 17</b>. Set sekali, biarkan sampai hari 25.', 'From tomorrow (day 9): <b>4 × 6 min · 8 · 11 am · 2 · 5 pm</b>. Set it once and leave it until day 25.', 'gold'))
    if h in TRI and h != 0:
        J.append(('Trichoderma — siram gelas', 'Trichoderma cup drench', '10 g per ember 10 L air biasa, diamkan 15–30 menit. Siram polybag dulu, lalu 1 gelas (250 ml) di pangkal batang. Pagi atau sore. Aduk tiap 10 polybag. 2 hari jauh dari silika.', '10 g per 10 L bucket of plain water, stand 15–30 min. Water the bags first, then one cup (250 ml) at the stem base. Morning or late afternoon. Stir every 10 bags. 2 days away from silicon.', 'green'))
    if h == 20:
        J.append(('Ruas 8 — stop buang tunas', 'Node 8 — stop removing shoots', 'Mulai ruas 9 ke atas tunas dibiarkan. Bunga betina dan buah tumbuh dari sini.', 'From node 9 up, leave the shoots. Female flowers and fruit grow from here.', 'green'))
    if h in TPH:
        last = h == 35
        J.append(('Semprot Tri-Pholate setelah jam 16' + (' — TERAKHIR' if last else ''), 'Tri-Pholate spray after 4 pm' + (' — LAST ONE' if last else ''), '<b>2 g per spray pack 16 L</b> (0,125 g/L). Daun saja. Setelah jam 16.' + (' Setelah HST 35 berhenti — semprotan merusak jaring kulit.' if last else ''), '<b>2 g per 16 L spray pack</b> (0.125 g/L). Leaves only. After 4 pm.' + (' Stop after HST 35 — spray marks the net.' if last else ''), 'gold'))
    if h == 24:
        J.append(('Malam ini: buat stok FLOWER', 'Tonight: make the FLOWER stock', 'Kit Boyd (dengan Boroni). Lihat buku hal. 23 / 53. Jangan pernah asam borat.', 'Boyd’s kit (with Boroni). See book pages 23 / 53. Never boric acid.', 'red'))
    if h == 25:
        J.append(('GANTI KE FLOWER', 'CHANGE TO FLOWER', 'Tangki: stok FLOWER + <b>SOP 310 g</b> → EC <b>2.4</b>. Timer <b>5 × 7 menit</b>. Mulai polinasi tangan setiap pagi. Pasang perangkap lalat buah.', 'Tank: FLOWER stock + <b>SOP 310 g</b> → EC <b>2.4</b>. Timer <b>5 × 7 min</b>. Start hand pollination every morning. Hang fruit-fly traps.', 'red'))
    if 25 <= h <= 37:
        J.append(('Polinasi tangan 06:00–10:00', 'Hand pollination 06:00–10:00', 'Bunga betina mekar di ruas 9–12 → serbuk dari bunga jantan <b>tanaman yang sama</b>. Tidak ada? Tanaman terdekat varietas & generasi sama. Tulis tanggal + silang di label — <b>tanggal ini = jam panen</b>.', 'Open female flowers on nodes 9–12 → pollen from a male flower on the <b>same plant</b>. None? Nearest plant of the same variety and generation. Write date + cross on the tag — <b>this date times the harvest</b>.', 'green'))
    if h in CA:
        J.append(('Semprot Calcinit di daun', 'Calcinit leaf spray', '<b>80 g per spray pack 16 L</b>. Pagi atau setelah 16:00, tidak di matahari terik. Daun saja.' + (' <b>Terakhir</b> — tidak ada semprot daun HST 45–59.' if h == 42 else ''), '<b>80 g per 16 L spray pack</b>. Early morning or after 4 pm, never in strong sun. Leaves only.' + (' <b>Last one</b> — no leaf sprays HST 45–59.' if h == 42 else ''), 'gold'))
    if h == 38:
        J.append(('Pilih 1 buah + pangkas', 'Keep one fruit + top', 'Simpan <b>SATU</b> buah terbaik per tanaman. Pangkas di atas <b>daun ke-25</b> (hitung daun hijau, jangan ditaksir). Tidak ada buah → <b>jangan pangkas</b>. Mulai hari ini: <b>tidak ada air biasa, siram gelas, atau silika</b>.', 'Keep <b>ONE</b> best fruit per plant. Top just above <b>leaf 25</b> (count green leaves, don’t guess). No fruit → <b>don’t top</b>. From today: <b>no plain water, glass watering or silicon</b>.', 'red'))
    if h in (39, 40):
        J.append(('Lanjut pilih buah & pangkas', 'Finish fruit selection & topping', 'Selesaikan semua baris. Kirim Boyd: dipangkas ___ · belum ___ · tanpa buah ___.', 'Finish every row. Send Boyd: topped ___ · not yet ___ · no fruit ___.', 'green'))
    if h == 41:
        J.append(('Malam ini: buat stok SIZING', 'Tonight: make the SIZING stock', 'Tanpa Boroni (4.0). Lihat buku hal. 27 / 54.', 'No Boroni (4.0). See book pages 27 / 54.', 'red'))
    if h == 42:
        J.append(('GANTI KE SIZING', 'CHANGE TO SIZING', 'Tangki: stok SIZING + <b>SOP 535 g</b> → EC <b>2.55</b>. Timer <b>6 × 8 menit</b>. Gantung buah di sling. Senin: timbang 10 buah per varietas.', 'Tank: SIZING stock + <b>SOP 535 g</b> → EC <b>2.55</b>. Timer <b>6 × 8 min</b>. Support fruit in slings. Mondays: weigh 10 fruit per variety.', 'red'))
    if h == 45:
        J.append(('Jaring kulit mulai', 'Netting starts', '<b>Tidak ada semprot daun sampai HST 59.</b> Buang daun tua bawah yang sudah tidak hijau untuk sirkulasi udara.', '<b>No leaf sprays until HST 59.</b> Remove old lower leaves with no green left, for airflow.', 'gold'))
    if h == 59:
        J.append(('Malam ini: buat stok RIPEN', 'Tonight: make the RIPEN stock', 'Drum Ripen sendiri: Calcinit 8,95 kg (A) · MKP 1,85 kg + MAG-S 6,25 kg + Vitaflex + Fe (B). Lihat buku hal. 30 / 55.', 'Its own Ripen drums: Calcinit 8.95 kg (A) · MKP 1.85 kg + MAG-S 6.25 kg + Vitaflex + Fe (B). See book pages 30 / 55.', 'red'))
    if h == 60:
        J.append(('GANTI KE RIPEN', 'CHANGE TO RIPEN', 'Tangki: stok RIPEN + <b>SOP 645 g</b> → EC <b>2.7</b>. Timer <b>4 × 6 menit</b>. Run-off 10–15%. <b>Sampai buah terakhir</b> — tidak ganti ke air biasa.', 'Tank: RIPEN stock + <b>SOP 645 g</b> → EC <b>2.7</b>. Timer <b>4 × 6 min</b>. Run-off 10–15%. <b>To the last fruit</b> — no switch to plain water.', 'red'))
    if h >= 60:
        mkp = (h - 60) % 2 == 0
        J.append(('Semprot daun jam 16:00 — ' + ('MKP' if mkp else 'Calcinit'), '4 pm leaf spray — ' + ('MKP' if mkp else 'Calcinit'),
                  ('<b>MKP 48 g</b>' if mkp else '<b>Calcinit 80 g</b>') + ' per spray pack 16 L. Daun saja. <b>MKP dan Calcinit tidak pernah dicampur.</b>',
                  ('<b>MKP 48 g</b>' if mkp else '<b>Calcinit 80 g</b>') + ' per 16 L pack. Leaves only. <b>MKP and Calcinit are never mixed.</b>', 'gold'))
    if h >= 68 and h < 75:
        J.append(('Cek Brix', 'Brix check', 'Pakai buah yang <b>pecah hari ini</b>, daging masih bersih. Sari dari tengah daging. <b>Jangan potong buah bagus.</b> Kirim angka ke Boyd.', 'Use fruit that <b>split today</b>, flesh still clean. Juice from mid-flesh. <b>Never cut a good fruit.</b> Send the numbers to Boyd.', 'blue'))
    if h >= 72 and h < 75:
        J.append(('Siap panen', 'Get ready to harvest', 'Siapkan gunting, krat, timbangan, tempat teduh. Mulai petik buah yang sudah matang setiap pagi.', 'Get scissors, crates, scale and a shaded area ready. Start picking ripe fruit each morning.', 'green'))
    if h >= 75:
        J.append(('Panen pagi 06:00–09:30', 'Morning harvest 06:00–09:30', 'Matang = jaring penuh · bawah menguning · harum · lepas dengan putaran pelan · Brix 15+. Potong gunting, tangkai T, taruh di teduh. <b>Buah lain jangan dipotong.</b> Grade A–D, timbang, catat per ID tanaman.', 'Ripe = full net · ground spot yellow · aroma · slips with a gentle twist · Brix 15+. Cut with scissors, T-stalk, into the shade. <b>Don’t cut anything else.</b> Grade A–D, weigh, log by plant ID.', 'green'))
    return J

def watch(h):
    if h <= 7:  return ('Bibit layu siang · busuk di pangkal (damping-off) · daun kuning', 'Seedlings wilting at noon · rotting at the base (damping-off) · yellow leaves')
    if h <= 24: return ('Kutu daun · thrips · kutu kebul · tungau · ulat · bercak embun tepung · daun muda pucat (pH run-off)', 'Aphids · thrips · whitefly · spider mites · caterpillars · first mildew spots · pale new leaves (run-off pH)')
    if h <= 41: return ('Thrips di bunga · bunga mati / buah cacat (boron) · getah coklat di pangkal batang (Gummy Stem Blight) · lalat buah', 'Thrips on flowers · dead flowers / deformed fruit (boron) · brown gummy ooze at the stem base (Gummy Stem Blight) · fruit fly')
    if h <= 59: return ('BER (bercak coklat cekung di ujung buah) · buah pecah basah · polybag kering · lalat buah · embun tepung', 'BER (sunken brown patch on the fruit base) · fresh wet splits · a dry bag · fruit fly · mildew')
    return ('Buah pecah · lalat buah (KRITIS) · busuk buah · tikus & burung · Brix < 12 di buah tampak matang', 'Split fruit · fruit fly (CRITICAL) · fruit rot · rodents & birds · Brix under 12 on ripe-looking fruit')

TONE = {'blue': '#2E7DA0', 'green': '#2F5D3E', 'red': '#B8401F', 'gold': '#B9811F'}
CSS = '''<style>
@page{size:595pt 842pt;margin:0}*{box-sizing:border-box}
body{margin:0;font-family:"Liberation Sans",Arial,sans-serif;color:#22301E;font-size:10.6pt;line-height:1.4}
.pg{width:595pt;height:842pt;position:relative;break-after:page;overflow:hidden;padding:26pt 30pt}
.pg:last-child{break-after:auto}
.hd{display:grid;grid-template-columns:40pt 1fr auto;gap:10pt;align-items:center;border-bottom:2pt solid #2F5D3E;padding-bottom:8pt}
.hd img{width:40pt}
.k{font-size:7.6pt;letter-spacing:2.4pt;font-weight:700;color:#B9811F}
h1{font-family:"Liberation Serif",serif;font-size:21pt;margin:1pt 0;color:#2F5D3E;line-height:1.05}
.sub{font-size:8.6pt;color:#5F6A57}
.badge{color:#fff;border-radius:6pt;padding:6pt 10pt;text-align:center;font-family:"Liberation Serif",serif;line-height:1}
.badge small{display:block;font:700 7pt "Liberation Sans";letter-spacing:1.5pt;opacity:.85}.badge b{font-size:24pt}
.feed{display:grid;grid-template-columns:repeat(4,1fr);gap:6pt;margin:10pt 0 8pt}
.f{border:0.75pt solid #E2DACA;border-radius:5pt;padding:5pt 7pt;background:#FFFDF8}
.f span{display:block;font-size:6.8pt;letter-spacing:1pt;color:#6A7059;font-weight:700}.f b{font-size:11pt}
.job{border:0.75pt solid #E2DACA;border-radius:6pt;margin:7pt 0;overflow:hidden;background:#fff}
.job .t{color:#fff;font-weight:700;font-size:12pt;padding:5pt 9pt;display:flex;gap:8pt;align-items:center}
.job .t i{font-style:normal;background:#fff;border-radius:50%;width:15pt;height:15pt;display:inline-flex;align-items:center;justify-content:center;font-size:8.5pt}
.job .b{padding:6pt 10pt}
.same{background:#FBF4E2;border:0.75pt solid #ECD8A6;border-radius:6pt;padding:7pt 10pt;margin-top:7pt}
.same b.h{color:#9A6B0F}
ul{margin:3pt 0 0;padding-left:13pt}li{margin:1.5pt 0}
.watch{background:#FBE6E3;border:0.75pt solid #F0C3BC;border-radius:6pt;padding:7pt 10pt;margin-top:7pt}
.watch b.h{color:#B8401F}
.sign{position:absolute;left:30pt;right:30pt;bottom:30pt;display:grid;grid-template-columns:repeat(4,1fr);gap:6pt}
.sign div{border:0.75pt solid #E2DACA;border-radius:4pt;height:34pt;padding:3pt 5pt;font-size:7pt;color:#6A7059}
.foot{position:absolute;left:0;right:0;bottom:14pt;text-align:center;font-size:7pt;color:#8A907F}
</style>'''

def card(h, L):
    ID = L == 'id'; T = lambda a, b: a if ID else b
    s = stage(h); J = jobs(h)
    sop = s['sop'] or T('tanpa SOP', 'no SOP')
    water = s['water'] if ID else s['water'].replace(',', '.')
    tank = T('air biasa — pupuk mulai besok', 'plain water — feed starts tomorrow') if h == 0 else T(f'Stok {s["k"]}', f'{s["k"]} stock')
    title = T(f'Hari {h} — tugas HST {h}', f'Day {h} — HST {h} jobs')
    jobs_html = ''
    n = 0
    for tid, ten, bid, ben, tone in J:
        n += 1
        c = TONE[tone]
        jobs_html += f'<div class="job"><div class="t" style="background:{c}"><i style="color:{c}">{n}</i>{T(tid, ten)}</div><div class="b">{T(bid, ben)}</div></div>'
    if not J:
        jobs_html = f'<div class="job"><div class="t" style="background:#2F5D3E"><i style="color:#2F5D3E">✓</i>{T("Tidak ada tugas khusus hari ini", "No special job today")}</div><div class="b">{T("Kerjakan rutin harian di bawah dengan teliti.", "Do the daily routine below carefully.")}</div></div>'
    daily_id = ['06:30 cek tangki: EC ' + s['ec'] + ' · pH 5,8–6,3 · foto ke Boyd sebelum pompa nyala',
                'Meter Krisbow 08 · 10 · 12 · 14 — kelembapan ≥ suhu × 2, kurang → semprot daun 5–10 menit (terakhir 15:30)',
                'Run-off 2–3× seminggu (bukan hari silika): target ' + s['ro'] + ' per polybag',
                'Senin: ukur 5 tanaman bertanda (tinggi, daun, buah)']
    daily_en = ['06:30 tank check: EC ' + s['ec'] + ' · pH 5.8–6.3 · photo to Boyd before the pump goes on',
                'Krisbow meter 8 · 10 · 12 · 2 — humidity ≥ temperature × 2; below → mist leaves 5–10 min (last 3:30 pm)',
                'Run-off 2–3× a week (not on a silicon day): target ' + s['ro'] + ' per bag',
                'Monday: measure the 5 marked plants (height, leaves, fruit)']
    if h >= 38:
        daily_id.insert(1, 'Jalan semua baris pagi: buah pecah / busuk → karung → keluar greenhouse, hitung')
        daily_en.insert(1, 'Walk every row in the morning: split / rotten fruit → sack → out of the greenhouse, count')
    if h >= 38:
        daily_id.append('<b>Tidak ada air biasa, siram gelas, atau silika.</b> Air tambahan = buah pecah.')
        daily_en.append('<b>No plain water, glass watering or silicon.</b> Extra water = split fruit.')
    dl = ''.join(f'<li>{x}</li>' for x in (daily_id if ID else daily_en))
    w = watch(h)
    return f'''<div class="pg"><div class="hd"><img src="{LOGO}"><div><div class="k">{T("SPARMANIK FARM · KARTU TUGAS HARIAN", "SPARMANIK FARM · DAILY JOB CARD")}</div><h1>{title}</h1><div class="sub">{s["k"]} · {T(*s["name"])} · Sparmanik 4.0</div></div>
<div class="badge" style="background:{s["col"]}"><small>HST</small><b>{h}</b></div></div>
<div class="feed"><div class="f"><span>{T("TANGKI 1.000 L", "1,000 L TANK")}</span><b>{tank}</b></div><div class="f"><span>EC · pH</span><b>{"—" if h==0 else s["ec"]} · 5,8–6,3</b></div><div class="f"><span>SOP / {T("TANGKI", "TANK")}</span><b>{"—" if h==0 else sop}</b></div><div class="f"><span>TIMER · {water}</span><b style="font-size:8.6pt">{T(*s["timer"])}</b></div></div>
{jobs_html}
<div class="same"><b class="h">{T("Setiap hari", "Every day")}</b><ul>{dl}</ul></div>
<div class="watch"><b class="h">{T("Awasi tahap ini", "Watch for at this stage")}</b><br>{T(*w)}<br><b>{T("Ragu? Berhenti dan telepon Boyd.", "Not sure? Stop and call Boyd.")}</b></div>
<div class="sign"><div>{T("EC / pH tangki", "Tank EC / pH")}</div><div>{T("Run-off ml / EC", "Run-off ml / EC")}</div><div>{T("Buah dipetik / dibuang", "Fruit picked / binned")}</div><div>{T("Nama & paraf", "Name & initials")}</div></div>
<div class="foot">Sparmanik Farm · {T("Kartu harian", "Daily card")} · Sparmanik 4.0 · 6 Okt 2026 · {T("sesuai buku Sparmanik 4.0", "matches the Sparmanik 4.0 book")}</div></div>'''

for L in ('id', 'en'):
    html = '<!doctype html><html><head><meta charset="utf-8"><title>Sparmanik daily cards</title>' + CSS + '</head><body>' + ''.join(card(h, L) for h in range(0, LAST + 1)) + '</body></html>'
    open(os.path.join(ROOT, 'build', f'daily_{L}.html'), 'w', encoding='utf-8').write(html)
print('cards', LAST + 1)
