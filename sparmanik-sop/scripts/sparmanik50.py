"""Sparmanik 5.0 — the Oct to Jan Harvest booklet in the look of the Sparmanik 4.0 book (v3.8 style).
Same content as crop_simple.py (one page per week), Indonesian + English.
Run: python3 scripts/sparmanik50.py [HST0 as YYYY-MM-DD]  -> build/s50_{id,en}.html"""
import os, sys, re, datetime as D
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from crop_booklet import fmt, SOW, H0, STAGE_COL, LOGO
from crop_simple import sjobs, tank
from daily_cards import stage, LAST
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOK_CSS = re.search(r"CSS='''(.*?)'''", open(os.path.join(ROOT, 'scripts', 'new_pages.py'), encoding='utf-8').read(), re.S).group(1)
CSS = BOOK_CSS + '''<style>
.cover{position:absolute;left:34pt;top:34pt;right:34pt;bottom:34pt;border-radius:8pt;background:linear-gradient(165deg,#36684A 0%,#2A5238 55%,#1E3B29 100%);color:#fff;text-align:center;padding:48pt 40pt}
.cover .kick{color:#D99A2B;letter-spacing:3pt}
.cover h1{font-size:44pt;color:#fff;margin:18pt 0 2pt;line-height:1.05}.cover h1 em{color:#D99A2B;font-style:normal}
.cover .tag{font-size:12pt;color:#EEE6CE;margin-top:10pt;line-height:1.6}
.cover .logo{width:150pt;height:150pt;border-radius:50%;background:#fff;margin:22pt auto 18pt;display:flex;align-items:center;justify-content:center}
.cover .logo img{width:104pt}
.cover .chips{display:grid;grid-template-columns:repeat(3,1fr);gap:7pt;text-align:left;margin-top:6pt}
.cover .chips div{background:rgba(255,255,255,.09);border:0.75pt solid rgba(255,255,255,.22);border-radius:14pt;padding:6pt 11pt}
.cover .chips span{display:block;font-size:6.8pt;letter-spacing:1.4pt;color:#D99A2B;font-weight:700}.cover .chips b{font-size:10.5pt}
.cover .fill{margin-top:16pt;font-size:9.6pt;text-align:left;line-height:2.1;color:#EEE6CE}
.cover .ft{position:absolute;left:0;right:0;bottom:20pt;font-size:8pt;color:#C9D3C2}
table.w{font-size:11pt}table.w td{padding:7pt 7pt}
table.w td.d{width:88pt;font-weight:700;white-space:nowrap}table.w td.d small{display:block;font-weight:400;color:#6A7059;font-size:8pt}
table.w td.h{width:30pt;text-align:center;font-weight:700}table.w td.ec{width:100pt;text-align:center;font-weight:700}
table.w td.ec small{display:block;font-weight:400;font-size:7.6pt;color:#6A7059}
table.w td.j div{margin:1pt 0}table.w td.ok{width:24pt}table.w td.ok span{display:inline-block;width:14pt;height:14pt;border:1pt solid #8A907F;border-radius:3pt}
table.w td.q{color:#8A907F}
.big li{font-size:11.5pt;margin:6pt 0}
.how{border:0.75pt solid #E4DCC7;border-radius:5pt;padding:7pt 11pt;margin:6pt 0;background:#fff}
.how b.t{display:block;font-family:"Liberation Serif",serif;color:#2F5D3E;font-size:11.5pt;margin-bottom:2pt}
.mix{display:grid;grid-template-columns:1fr 1fr;gap:8pt}
.mx{border:0.75pt solid #E4DCC7;border-radius:5pt;overflow:hidden;background:#fff}
.mx .tt{color:#fff;font-weight:700;padding:5pt 8pt;font-size:10pt}
.mx table{margin:0;border:0;border-radius:0;font-size:8.6pt}.mx td{padding:2.5pt 8pt}.mx td.rr{text-align:right;white-space:nowrap}
.mx tr.A td:first-child{border-left:3pt solid #D9782B}.mx tr.B td:first-child{border-left:3pt solid #2E7DA0}
.mx .nt{font-size:7.8pt;color:#5F6A57;padding:4pt 8pt}
.log td{height:17pt}
.wkb{float:right;margin-top:-40pt;color:#fff;font-weight:700;font-size:10pt;border-radius:5pt;padding:5pt 10pt}
</style>'''

def build(L):
    ID = L == 'id'; T = lambda a, b: a if ID else b
    NAME = T('Panen Okt–Jan', 'Oct to Jan Harvest')
    P = []
    def page(kick, title, sub, body):
        n = len(P) + 1
        P.append(f'<div class="pg"><div class="card"><div class="kick">{kick}</div><h1>{title}</h1><div class="sub">{sub}</div><div class="rule"></div>{body}</div><div class="pn">{n}</div></div>')
    day = lambda h: H0 + D.timedelta(h)
    # ---- cover (Sparmanik 4.0 cover look)
    P.append(f'''<div class="pg"><div class="cover"><div class="kick">SPARMANIK FARM · {T("PANDUAN MUSIM", "CROP GUIDE")} · 2026–27</div>
<h1>Sparmanik <em>5.0</em></h1><div style="font-family:'Liberation Serif',serif;font-size:22pt;font-weight:700">{NAME}</div>
<div class="tag">{T("Melon · ikuti minggu demi minggu.", "Melon · follow it week by week.")}<br>{T("Baca hanya halaman minggu ini.", "Read only this week’s page.")}</div>
<div class="logo"><img src="{LOGO}"></div>
<div class="chips"><div><span>{T("SEMAI DI POLYBAG", "SOWN IN POLYBAGS")}</span><b>{fmt(SOW, ID, False)}</b></div><div><span>HST 0</span><b>{fmt(H0, ID, False)}</b></div><div><span>{T("PANEN MULAI", "HARVEST FROM")}</span><b>{fmt(day(75), ID, False)}</b></div>
<div><span>{T("KE BUNGA", "TO FLOWER")}</span><b>{fmt(day(25), ID, False)}</b></div><div><span>{T("KE BESAR", "TO SIZING")}</span><b>{fmt(day(42), ID, False)}</b></div><div><span>{T("KE MATANG", "TO RIPEN")}</span><b>{fmt(day(60), ID, False)}</b></div></div>
<div class="fill">{T("Varietas & baris", "Varieties & rows")}: ______________________________________________<br>{T("Penanggung jawab", "Person in charge")}: ___________________________ · {T("Telepon Boyd", "Call Boyd")}: ________________</div>
<div class="ft">Sparmanik Farm · Kab. Simalungun · SPARMANIK 5.0 · {fmt(D.date.today(), ID, False)}</div></div></div>''')
    # ---- every day + rules
    page(T('MULAI DI SINI · SETIAP HARI', 'START HERE · EVERY DAY'), T('Kerjakan setiap hari', 'Do this every day'), T('Empat tugas rutin, lalu tugas di halaman minggu ini.', 'Four routine jobs, then the jobs on this week’s page.'),
        f'''<ol class="num big">
<li>{T('<b>06:30 cek tangki:</b> EC sesuai minggu ini, pH 5.8–6.3. Foto ke Boyd.', '<b>6:30 tank check:</b> EC as this week says, pH 5.8–6.3. Photo to Boyd.')}</li>
<li>{T('<b>Jalan semua baris pagi.</b> Polybag kering? Dripper mampet? Buah pecah/busuk → buang keluar.', '<b>Walk every row in the morning.</b> Dry bag? Blocked dripper? Split/rotten fruit → out.')}</li>
<li>{T('<b>Meter Krisbow 08 · 10 · 12 · 14.</b> Kelembapan kurang dari suhu × 2 → semprot daun air 5–10 menit (terakhir 15:30).', '<b>Krisbow meter 8 · 10 · 12 · 2.</b> Humidity under temperature × 2 → mist leaves 5–10 min (last 3:30 pm).')}</li>
<li>{T('<b>Kerjakan tugas di halaman minggu ini</b>, centang kotaknya.', '<b>Do the jobs on this week’s page</b>, tick the box.')}</li></ol>
<h2>{T('5 aturan — jangan pernah dilanggar', '5 rules — never break them')}</h2>
<div class="call r"><ol style="margin:0;padding-left:15pt" class="big">
<li>{T('Boroni hanya di stok BUNGA. Asam borat, Fe-EDTA, asam sitrat dilarang.', 'Boroni only in the FLOWER stock. Boric acid, Fe-EDTA, citric acid banned.')}</li>
<li>{T('Silika hanya 5 kali (sampai HST 36).', 'Silicon only 5 times (to HST 36).')}</li>
<li>{T('Mulai HST 38: tidak ada air biasa atau siram tangan.', 'From HST 38: no plain water, no hand watering.')}</li>
<li>{T('Pakan MATANG sampai buah terakhir.', 'RIPEN feed to the last fruit.')}</li>
<li>{T('Drum A dan B tidak pernah dicampur.', 'Drums A and B are never mixed.')}</li></ol></div>
<div class="call y"><b class="t">{T('Ragu? Berhenti dan telepon Boyd.', 'Not sure? Stop and call Boyd.')}</b>{T('Pakan: 5 L Stok A + 5 L Stok B per tangki 1.000 L. Bibit: lebih encer (lihat Minggu 1–2).', 'Feed: 5 L Stock A + 5 L Stock B per 1,000 L tank. Seedlings: weaker (see Weeks 1–2).')}</div>''')
    # ---- how to
    HOW = T([
        ('Trichoderma', '<b>1 g per liter</b> = <b>10 g di ember 10 L</b> air biasa, aduk, diamkan 15–30 menit. Siram polybag dulu, lalu <b>1 gelas (250 ml) per polybag</b> di pangkal batang. <b>1 ember = 40 polybag.</b> Contoh: 400 polybag = 10 ember = 100 g. Aduk tiap 10 polybag, pakai hari itu juga. Jangan lewat tangki atau dripper.'),
        ('Silika (Kalsika)', 'Saklar MANUAL. 400 L air → jalan 3 menit → 1 sachet 100 g, aduk sampai bening → jalan 8 menit → tambah sampai 100 L → jalan 3 menit sampai habis → buat tangki pakan biasa. Hari itu siram hanya jam 14 dan 17.'),
        ('Tri-Pholate', '2 g per tangki semprot 16 L. Daun saja. Setelah jam 16.'),
        ('Semprot Calcinit', '80 g per tangki semprot 16 L. Pagi atau setelah jam 16. Daun saja.'),
        ('Penyerbukan', 'Jam 06–10. Bunga betina (ada bakal buah kecil) di ruas 9–12 → oles serbuk bunga jantan dari tanaman yang sama. Tulis tanggal di label.'),
        ('Sisakan 1 buah + pangkas', 'Simpan SATU buah terbaik per tanaman, buang yang lain. Potong pucuk di atas daun ke-25. Tidak ada buah → jangan pangkas.'),
        ('Panen', 'Jam 06–09:30. Matang = jaring penuh, bawah menguning, harum, lepas dengan putaran pelan. Potong gunting, taruh di teduh, timbang, catat. Buah lain jangan dipotong.')], [
        ('Trichoderma', '<b>1 g per litre</b> = <b>10 g in a 10 L bucket</b> of plain water, stir, stand 15–30 min. Water the bags first, then <b>one cup (250 ml) per bag</b> at the stem base. <b>1 bucket = 40 bags.</b> Example: 400 bags = 10 buckets = 100 g. Stir every 10 bags, use it the same day. Never through the tank or drippers.'),
        ('Silicon (Kalsika)', 'MANUAL switch. 400 L water → run 3 min → one 100 g sachet, stir until clear → run 8 min → top up to 100 L → run 3 min until empty → make the normal feed tank. That day water only at 2 and 5 pm.'),
        ('Tri-Pholate', '2 g per 16 L spray pack. Leaves only. After 4 pm.'),
        ('Calcinit spray', '80 g per 16 L spray pack. Early morning or after 4 pm. Leaves only.'),
        ('Pollinate', '6–10 am. Female flowers (tiny fruit behind the flower) on nodes 9–12 → dab pollen from a male flower of the same plant. Write the date on the tag.'),
        ('Keep 1 fruit + top', 'Keep the ONE best fruit per plant, remove the rest. Cut the tip above leaf 25. No fruit → don’t top.'),
        ('Harvest', '6–9:30 am. Ripe = full net, yellow underside, smells sweet, slips off with a gentle twist. Cut with scissors, into the shade, weigh, write it down. Don’t cut any other fruit.')])
    page(T('CARA KERJA', 'HOW TO'), T('Tugas bertanda ★', 'Jobs marked ★'), T('Cara dan takaran untuk setiap tugas khusus.', 'Method and amounts for every special job.'),
         ''.join(f'<div class="how"><b class="t">★ {a}</b>{b}</div>' for a, b in HOW))
    # ---- weeks
    NM = T({'S1': 'Tumbuh', 'S2': 'Bunga', 'S3': 'Besar', 'S4': 'Matang'}, {'S1': 'Grow', 'S2': 'Flower', 'S3': 'Sizing', 'S4': 'Ripen'})
    start, w = SOW, 0
    while (start - H0).days <= LAST:
        w += 1
        days = [start + D.timedelta(i) for i in range(7)]
        hs = [(d - H0).days for d in days]
        if hs[-1] < 0: col, nm = '#7A8F6A', T('Bibit', 'Seedlings')
        else:
            ks = sorted({stage(max(h, 0))['k'] for h in hs if h >= 0}, key=['S1', 'S2', 'S3', 'S4'].index)
            col = STAGE_COL[ks[-1]]; nm = ' → '.join(NM[k] for k in ks)
            if hs[0] < 0: nm = T('Bibit', 'Seedlings') + ' → ' + nm
        rows = ''
        for d, h in zip(days, hs):
            ec, sop, tm = tank(h, ID)
            J = sjobs(h, ID)
            jt = ''.join(f'<div>{j}</div>' for j in J) if J else ''
            cls = 'j' if J else 'j q'
            if not J: jt = T('rutin saja', 'routine only')
            ecc = f'{ec}<small>' + (f'SOP {sop} · ' if h >= 0 else '') + f'{tm}</small>'
            dd = fmt(d, ID, False).rsplit(' ', 1)[0]
            small = (T('hari bibit ', 'seedling day ') + str((d - SOW).days)) if h < 0 else ''
            rows += f'<tr><td class="d">{dd}<small>{small}</small></td><td class="h">{h if h >= 0 else "—"}</td><td class="ec">{ecc}</td><td class="{cls}">{jt}</td><td class="ok"><span></span></td></tr>'
        sub = f'{fmt(days[0], ID, False)} – {fmt(days[-1], ID, False)}'
        page(f'{T("MINGGU", "WEEK")} {w} · {nm.upper()}', f'{T("Minggu", "Week")} {w} — {nm}', sub,
             f'<div class="wkb" style="background:{col}">{nm}</div>'
             f'<table class="w"><tr><th>{T("Hari", "Day")}</th><th>HST</th><th>EC</th><th>{T("Kerjakan hari ini", "Today’s jobs")}</th><th>✓</th></tr>{rows}</table>'
             f'<p class="sub">★ = {T("lihat Cara kerja (hal. 3)", "see How to (page 3)")} · {T("setiap hari juga: hal. 2", "every day as well: page 2")}</p>')
        start += D.timedelta(7)
    # ---- drum recipes
    REC = [('S1', T('Tumbuh', 'Grow'), T('sekarang sampai HST 24', 'now to HST 24'), [('A', 'Calcinit', 8.70), ('A', 'Krista K Plus', 3.45), ('B', 'Krista MKP', 2.20), ('B', 'MAG-S', 5.70), ('B', 'Vitaflex', 0.20), ('B', 'Fe-EDDHA', 0.05)], None),
           ('S2', T('Bunga', 'Flower'), T(f'malam {fmt(day(24), ID, False)}', f'night of {fmt(day(24), ID, False)}'), [('A', 'Calcinit', 9.45), ('A', 'Karate Plus Boroni', 0.80), ('A', 'Krista K Plus', 1.15), ('B', 'Krista MKP', 2.30), ('B', 'MAG-S', 6.05), ('B', 'Vitaflex', 0.20), ('B', 'Fe-EDDHA', 0.05)], '310 g'),
           ('S3', T('Besar', 'Sizing'), T(f'malam {fmt(day(41), ID, False)}', f'night of {fmt(day(41), ID, False)}'), [('A', 'Calcinit', 9.45), ('B', 'Krista MKP', 2.10), ('B', 'MAG-S', 6.25), ('B', 'Vitaflex', 0.20), ('B', 'Fe-EDDHA', 0.05)], '535 g'),
           ('S4', T('Matang', 'Ripen'), T(f'malam {fmt(day(59), ID, False)}', f'night of {fmt(day(59), ID, False)}'), [('A', 'Calcinit', 8.95), ('B', 'Krista MKP', 1.85), ('B', 'MAG-S', 6.25), ('B', 'Vitaflex', 0.20), ('B', 'Fe-EDDHA', 0.05)], '645 g')]
    kg = lambda x: f'{x:.2f} kg' if x >= 1 else f'{x * 1000:.0f} g'
    EC = {'S1': '2.1', 'S2': '2.4', 'S3': '2.55', 'S4': '2.7'}
    boxes = ''
    for k, nm, when, items, sop in REC:
        trs = ''.join(f'<tr class="{t}"><td>{t} · {n}</td><td class="rr">{kg(q)}</td><td class="rr">{kg(q / 2)}</td></tr>' for t, n, q in items)
        boxes += (f'<div class="mx"><div class="tt" style="background:{STAGE_COL[k]}">{k} · {nm} <span style="font-weight:400;font-size:8.4pt">— {when}</span></div>'
                  f'<table><tr><th>{T("Produk", "Product")}</th><th class="n">50 L</th><th class="n">25 L</th></tr>{trs}</table>'
                  f'<div class="nt">{T("Per tangki 1.000 L", "Per 1,000 L tank")}: 5 L A + 5 L B{(" + SOP " + sop) if sop else ""} · EC {EC[k]}</div></div>')
    page(T('MALAM GANTI STOK', 'STOCK-MIXING NIGHTS'), T('Resep drum per tahap', 'Drum recipe per stage'), T('Drum 50 L = 10 tangki · 25 L = 5 tangki (5 hari). Kekuatan pakan tidak pernah berubah.', '50 L drum = 10 tanks · 25 L = 5 tanks (5 days). Feed strength never changes.'),
         f'<div class="mix">{boxes}</div>'
         f'<div class="call y"><b class="t">{T("Cara isi drum", "How to fill a drum")}</b>{T("Isi setengah dengan air hangat → timbang 1 produk, tuang, aduk sampai <b>JERNIH</b> → baru produk berikutnya → tambah air sampai tanda 50 L (atau 25 L) → tulis A/B + tanggal + tahap.", "Half fill with warm water → weigh one product, pour, stir until <b>CLEAR</b> → only then the next → top up to the 50 L (or 25 L) mark → write A/B + date + stage.")}</div>'
         f'<div class="call r"><b class="t">{T("Jangan pernah", "Never")}</b>{T("Produk A ke drum B · asam borat · Fe-EDTA · asam sitrat · SOP atau silika ke dalam drum. SOP langsung ke tangki 1.000 L.", "An A product in drum B · boric acid · Fe-EDTA · citric acid · SOP or silicon into a drum. SOP goes straight into the 1,000 L tank.")}</div>')
    # ---- harvest log
    trs = ''.join('<tr>' + '<td></td>' * 8 + '</tr>' for _ in range(26))
    page(T('CATATAN PANEN', 'HARVEST LOG'), T('Catatan panen harian', 'Daily harvest log'), T('Satu baris per hari. Foto halaman ini ke Boyd setiap minggu.', 'One line a day. Photo this page to Boyd every week.'),
         f'<table class="log"><tr><th>{T("Tanggal", "Date")}</th><th>{T("Baris", "Rows")}</th><th>A</th><th>B</th><th>C</th><th>D / {T("buang", "binned")}</th><th>{T("Total kg", "Total kg")}</th><th>Brix</th></tr>{trs}</table>')
    P[0] = P[0]  # cover has no page number
    return P

if __name__ == '__main__':
    for L in ('id', 'en'):
        P = build(L)
        html = f'<!doctype html><html><head><meta charset="utf-8"><title>Sparmanik 5.0</title>{CSS}</head><body>{"".join(P)}</body></html>'
        open(os.path.join(ROOT, 'build', f's50_{L}.html'), 'w', encoding='utf-8').write(html)
    print('Sparmanik 5.0', len(P), 'pages · HST 0 =', H0)
