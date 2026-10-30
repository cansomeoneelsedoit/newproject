"""Crop booklet "Oct to Jan Harvest" 2026-27: dated instructions for one crop, Indonesian + English.
Sown straight into the polybags 25 Oct 2026; HST 0 = day most seedlings have 2-3 true leaves.
Run: python3 scripts/crop_booklet.py [HST0 as YYYY-MM-DD]  -> build/crop_{id,en}.html (build_book.py prints them)."""
import os, sys, datetime as D, calendar
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from daily_cards import CSS, LOGO, stage, card, SIL, TRI, TPH, CA, LAST, TONE
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SOW = D.date(2026, 10, 25)
H0 = D.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else D.date(2026, 11, 4)
day = lambda h: H0 + D.timedelta(h)
DAY_ID = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
DAY_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
MON_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
MONTH_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
def fmt(d, ID, long=True):
    w = (DAY_ID if ID else DAY_EN)[d.weekday()]
    if not long: w = w[:3]
    return f'{w} {d.day} {(MON_ID if ID else MON_EN)[d.month - 1]} {d.year}'

# key events by HST: (id, en, tone)
def events(h):
    E = []
    if h == 0: E.append(('HST 0 · Trichoderma', 'HST 0 · Trichoderma', 'green'))
    if h == 1: E.append(('Pakan penuh EC 2.1', 'Full feed EC 2.1', 'blue'))
    if h == 7: E.append(('Mulai buang tunas', 'Side shoots start', 'green'))
    if h in SIL: E.append(('Silika' + (' (terakhir)' if h == 36 else ''), 'Silicon' + (' (last)' if h == 36 else ''), 'blue'))
    if h in TRI and h: E.append(('Trichoderma', 'Trichoderma', 'green'))
    if h in TPH: E.append(('Tri-Pholate 16:00', 'Tri-Pholate 4 pm', 'gold'))
    if h in CA: E.append(('Semprot Calcinit', 'Calcinit spray', 'gold'))
    if h == 24: E.append(('MALAM: stok BUNGA', 'NIGHT: FLOWER stock', 'red'))
    if h == 25: E.append(('GANTI KE BUNGA', 'TO FLOWER', 'red'))
    if h == 38: E.append(('1 buah/tanaman · stop air biasa', '1 fruit/plant · no plain water', 'red'))
    if h == 41: E.append(('MALAM: stok BESAR', 'NIGHT: SIZING stock', 'red'))
    if h == 42: E.append(('GANTI KE BESAR', 'TO SIZING', 'red'))
    if h == 45: E.append(('Jaring kulit · stop semprot', 'Netting · no sprays', 'gold'))
    if h == 59: E.append(('MALAM: stok MATANG', 'NIGHT: RIPEN stock', 'red'))
    if h == 60: E.append(('GANTI KE MATANG', 'TO RIPEN', 'red'))
    if h == 68: E.append(('Mulai cek Brix', 'Brix checks start', 'blue'))
    if h == 75: E.append(('PANEN mulai', 'HARVEST starts', 'green'))
    return E

EXTRA_CSS = '''<style>
.cv{background:linear-gradient(160deg,#2F5D3E,#1F3D2A);color:#fff;border-radius:8pt;height:100%;padding:40pt 40pt;text-align:center;position:relative}
.cv .k{color:#E8B84B;font-size:9pt;letter-spacing:3pt}
.cv h1{color:#fff;font-size:40pt;margin:16pt 0 4pt}.cv h1 em{color:#E8B84B;font-style:normal}
.cv img{width:150pt;border-radius:50%;background:#fff;padding:8pt;margin:22pt 0}
.cv .dates{display:grid;grid-template-columns:repeat(3,1fr);gap:8pt;margin-top:16pt;text-align:left}
.cv .dates div{background:rgba(255,255,255,.1);border:0.75pt solid rgba(255,255,255,.25);border-radius:6pt;padding:7pt 9pt}
.cv .dates span{display:block;font-size:7pt;letter-spacing:1.4pt;color:#E8B84B;font-weight:700}.cv .dates b{font-size:11.5pt}
.cv .fill{margin-top:16pt;font-size:10pt;text-align:left;line-height:2}
.cv .ft{position:absolute;bottom:22pt;left:0;right:0;font-size:8pt;opacity:.75}
h2{font-family:"Liberation Serif",serif;color:#2F5D3E;font-size:15pt;margin:12pt 0 5pt}
table.t{width:100%;border-collapse:collapse;font-size:9.2pt;margin:4pt 0 8pt}
table.t th{background:#2F5D3E;color:#fff;text-align:left;padding:4pt 6pt;font-size:8.2pt}
table.t td{border-bottom:0.75pt solid #E4DCC7;padding:3.5pt 6pt;vertical-align:top}
table.t td.d{white-space:nowrap;font-weight:700}
.cal{width:100%;border-collapse:collapse;table-layout:fixed;margin:3pt 0 10pt}
.cal th{font-size:7.6pt;color:#6A7059;padding:2pt;letter-spacing:.8pt}
.cal td{border:0.75pt solid #E4DCC7;height:56pt;vertical-align:top;padding:2pt 3pt;font-size:6.6pt;line-height:1.2}
.cal td.o{background:#F6F4EE;color:#B9B9AE}
.cal .n{font-weight:700;font-size:9.5pt}.cal .h{float:right;color:#fff;border-radius:2pt;padding:0 2.5pt;font-size:6.4pt;font-weight:700}
.cal .e{display:block;margin-top:1.5pt;font-weight:700}
.rules{counter-reset:r;list-style:none;padding:0;margin:4pt 0}
.rules li{counter-increment:r;position:relative;padding:3pt 0 4pt 22pt;border-bottom:0.75pt solid #EFE8D6}
.rules li:before{content:counter(r);position:absolute;left:0;top:3pt;width:15pt;height:15pt;border-radius:50%;background:#B8401F;color:#fff;font-weight:700;font-size:8pt;text-align:center;line-height:15pt}
.mix{display:grid;grid-template-columns:1fr 1fr;gap:8pt}
.mx{border:0.75pt solid #E2DACA;border-radius:6pt;overflow:hidden;background:#fff}
.mx .tt{color:#fff;font-weight:700;padding:5pt 8pt;font-size:10.5pt}
.mx table{width:100%;border-collapse:collapse;font-size:8.6pt}.mx td{padding:2.5pt 8pt;border-top:0.75pt solid #F0EAD9}
.mx td.r{text-align:right;white-space:nowrap}.mx tr.A td:first-child{border-left:3pt solid #D9782B}.mx tr.B td:first-child{border-left:3pt solid #2E7DA0}
.mx .nt{font-size:7.8pt;color:#5F6A57;padding:4pt 8pt}
.box{border-radius:6pt;padding:7pt 10pt;margin:7pt 0}.box.r{background:#FBE6E3;border:0.75pt solid #F0C3BC}.box.y{background:#FBF4E2;border:0.75pt solid #ECD8A6}.box.g{background:#E8F1E6;border:0.75pt solid #C4D9C0}
.log td{height:17pt}
</style>'''

STAGE_COL = {'S1': '#2F5D3E', 'S2': '#B9811F', 'S3': '#C66A22', 'S4': '#8A5A2B'}

def head(ID, kick, title, sub=''):
    T = lambda a, b: a if ID else b
    return f'''<div class="hd"><img src="{LOGO}"><div><div class="k">{kick}</div><h1>{title}</h1><div class="sub">{sub}</div></div><div></div></div>'''

def page(inner, foot=''):
    return f'<div class="pg">{inner}<div class="foot">{foot}</div></div>'

def build(L):
    ID = L == 'id'; T = lambda a, b: a if ID else b
    NAME = T('Panen Okt–Jan', 'Oct to Jan Harvest')
    FOOT = f'Sparmanik Farm · {NAME} 2026–27 · Sparmanik 4.0'
    P = []
    # ---- cover
    P.append(f'''<div class="pg"><div class="cv"><div class="k">SPARMANIK FARM · {T("BUKU PETUNJUK MUSIM", "CROP INSTRUCTION BOOKLET")}</div>
<h1>{T("Panen", "")} <em>{T("Okt–Jan", "Oct to Jan")}</em> {T("", "Harvest")}</h1><div style="font-size:12pt">{T("Melon · musim 2026–27 · ikuti hari demi hari", "Melon · 2026–27 crop · follow it day by day")}</div>
<img src="{LOGO}">
<div class="dates"><div><span>{T("SEMAI DI POLYBAG", "SOWN IN POLYBAGS")}</span><b>{fmt(SOW, ID)}</b></div><div><span>HST 0</span><b>{fmt(H0, ID)}</b></div><div><span>{T("PANEN MULAI", "HARVEST FROM")}</span><b>{fmt(day(75), ID)}</b></div>
<div><span>{T("GANTI KE BUNGA", "TO FLOWER")}</span><b>{fmt(day(25), ID)}</b></div><div><span>{T("GANTI KE BESAR", "TO SIZING")}</span><b>{fmt(day(42), ID)}</b></div><div><span>{T("GANTI KE MATANG", "TO RIPEN")}</span><b>{fmt(day(60), ID)}</b></div></div>
<div class="fill">{T("Varietas & baris", "Varieties & rows")}: ____________________________________________<br>{T("Penanggung jawab", "Person in charge")}: ________________________ · {T("Telepon Boyd", "Call Boyd")}: ________________</div>
<div class="ft">{T("Sesuai buku Sparmanik 4.0. Bila buku ini dan buku besar berbeda, ikuti buku ini dan tanya Boyd.", "Matches the Sparmanik 4.0 book. If this and the big book differ, follow this one and ask Boyd.")}</div></div></div>''')
    # ---- key dates + rules
    rows = ''
    rows += f'<tr><td class="d">{fmt(SOW, ID, False)}</td><td>—</td><td>{T("Benih ditanam langsung di polybag", "Seed sown straight into the polybags")}</td></tr>'
    rows += f'<tr><td class="d">{fmt(SOW + D.timedelta(1), ID, False)} – {fmt(H0 - D.timedelta(1), ID, False)}</td><td>—</td><td>{T("Bibit: pakan lemah EC 1.0 → 1.5, lihat hal. 6", "Seedlings: weak feed EC 1.0 → 1.5, see page 6")}</td></tr>'
    for h in range(0, LAST + 1):
        E = events(h)
        if E: rows += f'<tr><td class="d">{fmt(day(h), ID, False)}</td><td>{h}</td><td>{" · ".join(T(a, b) for a, b, _ in E)}</td></tr>'
    P.append(page(head(ID, T("JADWAL MUSIM INI", "THIS CROP'S SCHEDULE"), T("Tanggal penting", "Key dates"), T(f"HST 0 = {fmt(H0, ID)}. Semua tanggal di buku ini dihitung dari hari itu.", f"HST 0 = {fmt(H0, ID)}. Every date in this booklet counts from that day.")) +
        f'<table class="t"><tr><th>{T("Tanggal", "Date")}</th><th>HST</th><th>{T("Yang terjadi", "What happens")}</th></tr>{rows}</table>', FOOT))
    rules = T(['<b>Boroni hanya di stok BUNGA.</b> Asam borat dilarang di kebun.',
               '<b>Silika hanya HST 0–36</b> (5 kali). Setelah itu tidak pernah — buah pecah.',
               '<b>Mulai HST 38 tidak ada air biasa,</b> siram gelas, atau air tambahan.',
               '<b>Pakan MATANG sampai buah terakhir.</b> Tidak ganti ke air biasa.',
               '<b>Kelembapan ≥ suhu × 2.</b> Kurang → semprot daun 5–10 menit, terakhir 15:30.',
               '<b>Fe-EDDHA saja.</b> Jangan Fe-EDTA, jangan asam sitrat.',
               '<b>Drum A dan B tidak pernah dicampur</b> pekat. Bertemu hanya di tangki 1.000 L.',
               '<b>Semprot daun HST 45–59 dilarang</b> (jaring kulit sedang terbentuk).',
               '<b>Brix dari buah yang pecah hari itu.</b> Jangan potong buah bagus.',
               '<b>Panen bertahap:</b> petik yang matang tiap pagi, sisanya tetap diberi pakan.'],
              ['<b>Boroni in the FLOWER stock only.</b> Boric acid is banned from the farm.',
               '<b>Silicon only HST 0–36</b> (5 times). Never after — it splits fruit.',
               '<b>From HST 38 no plain water,</b> glass watering or extra water.',
               '<b>RIPEN feed to the last fruit.</b> No switch to plain water.',
               '<b>Humidity ≥ temperature × 2.</b> Below → mist leaves 5–10 min, last at 3:30 pm.',
               '<b>Fe-EDDHA only.</b> Never Fe-EDTA, never citric acid.',
               '<b>Drums A and B are never mixed</b> strong. They meet only in the 1,000 L tank.',
               '<b>No leaf sprays HST 45–59</b> (the net is forming).',
               '<b>Brix from fruit that split that day.</b> Never cut a good fruit.',
               '<b>Rolling harvest:</b> pick ripe fruit each morning, the rest stays on the feed.'])
    P.append(page(head(ID, T("ATURAN 4.0", "4.0 RULES"), T("10 aturan yang dibuktikan musim 2026", "The 10 rules the 2026 crop proved"), T("Baca bersama tim sebelum mulai. Ragu? Berhenti dan telepon Boyd.", "Read them with the team before you start. Not sure? Stop and call Boyd.")) +
        '<ol class="rules">' + ''.join(f'<li>{r}</li>' for r in rules) + '</ol>' +
        f'''<h2>{T("Cara pakai buku ini", "How to use this booklet")}</h2><ul>
<li>{T("Setiap pagi buka <b>kartu dengan tanggal hari ini</b> (mulai hal. 8). Kerjakan tugas bernomor, lalu rutin harian.", "Every morning open the <b>card with today's date</b> (from page 8). Do the numbered jobs, then the daily routine.")}</li>
<li>{T("Isi kotak di bawah kartu dan foto ke Boyd.", "Fill in the boxes at the bottom of the card and photo it to Boyd.")}</li>
<li>{T("Malam ganti stok: pakai halaman resep drum (hal. 7).", "Stock-mixing nights: use the drum recipe page (page 7).")}</li>
<li>{T("Bila HST 0 bergeser, Boyd mencetak ulang buku ini dengan tanggal baru.", "If HST 0 moves, Boyd reprints this booklet with the new dates.")}</li></ul>''', FOOT))
    # ---- calendars (Oct+Nov, Dec+Jan)
    def month(y, m):
        cal = calendar.Calendar(0)
        wk = T(['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
        out = f'<h2>{(MONTH_ID if ID else MONTH_EN)[m - 1]} {y}</h2><table class="cal"><tr>' + ''.join(f'<th>{w}</th>' for w in wk) + '</tr>'
        for week in cal.monthdatescalendar(y, m):
            out += '<tr>'
            for d in week:
                if d.month != m: out += '<td class="o"></td>'; continue
                h = (d - H0).days; tag = ''; ev = ''
                if d == SOW: ev = f'<span class="e" style="color:#2F5D3E">{T("Semai", "Sown")}</span>'
                if SOW < d < H0: tag = f'<span class="h" style="background:#7A8F6A">{T("bibit", "seedl.")}</span>'
                if 0 <= h <= LAST:
                    s = stage(h); tag = f'<span class="h" style="background:{STAGE_COL[s["k"]]}">HST {h}</span>'
                    ev = ''.join(f'<span class="e" style="color:{TONE[t]}">{T(a, b)}</span>' for a, b, t in events(h))
                    if 25 <= h <= 37 and not events(h): ev = f'<span class="e" style="color:#2F5D3E;font-weight:400">{T("polinasi", "pollinate")}</span>'
                    if h > 75: ev = f'<span class="e" style="color:#2F5D3E;font-weight:400">{T("panen", "harvest")}</span>'
                out += f'<td><span class="n">{d.day}</span>{tag}{ev}</td>'
            out += '</tr>'
        return out + '</table>'
    legend = f'<div class="sub">HST: <b style="color:#2F5D3E">S1 {T("Tumbuh", "Grow")}</b> · <b style="color:#B9811F">S2 {T("Bunga", "Flower")}</b> · <b style="color:#C66A22">S3 {T("Besar", "Sizing")}</b> · <b style="color:#8A5A2B">S4 {T("Matang", "Ripen")}</b> · <b style="color:#B8401F">{T("merah = malam ganti stok / ganti tahap", "red = stock night / stage change")}</b></div>'
    P.append(page(head(ID, T("KALENDER", "CALENDAR"), T("Oktober – November 2026", "October – November 2026")) + legend + month(2026, 10) + month(2026, 11), FOOT))
    P.append(page(head(ID, T("KALENDER", "CALENDAR"), T("Desember 2026 – Januari 2027", "December 2026 – January 2027")) + legend + month(2026, 12) + month(2027, 1), FOOT))
    # ---- seedling stage
    sd = lambda n: fmt(SOW + D.timedelta(n), ID, False)
    seed_rows = T([
        (f'{sd(0)}', 'Benih ditanam di polybag.', 'Cocopeat basah merata, tidak becek.'),
        (f'{sd(1)} – {sd(3)}', 'Berkecambah. Jaga lembap dan hangat.', 'Air biasa atau EC 0.5. Siram 2 × 3 menit (08 · 12).'),
        (f'{sd(4)} – {sd(6)}', 'Kotiledon (daun biji) muncul → <b>cahaya penuh</b>, kipas jalan.', '<b>EC 1.0</b>: 2 L Stok A + 2 L Stok B per 1.000 L.'),
        (f'{sd(7)} – {(H0 - D.timedelta(1)).day} {MON_ID[(H0 - D.timedelta(1)).month - 1]}', 'Daun sejati 1–2. Sisakan 1 bibit terkuat per lubang (potong, jangan cabut).', '<b>EC 1.5</b>: 3.5 L A + 3.5 L B per 1.000 L. Siram 3 × 3 menit (08 · 11 · 14).'),
        (f'{fmt(H0, ID, False)}', '<b>HST 0</b> — 2–3 daun sejati. Trichoderma. Kartu harian mulai.', 'Lihat kartu HST 0.')],
        [(f'{sd(0)}', 'Seed sown into the polybags.', 'Cocopeat evenly damp, not soggy.'),
        (f'{sd(1)} – {sd(3)}', 'Germinating. Keep damp and warm.', 'Plain water or EC 0.5. Water 2 × 3 min (8 · 12).'),
        (f'{sd(4)} – {sd(6)}', 'Seed leaves up → <b>full light</b>, fans on.', '<b>EC 1.0</b>: 2 L Stock A + 2 L Stock B per 1,000 L.'),
        (f'{sd(7)} – {(H0 - D.timedelta(1)).day} {MON_EN[(H0 - D.timedelta(1)).month - 1]}', 'First 1–2 true leaves. Keep the 1 strongest seedling per hole (cut, don’t pull).', '<b>EC 1.5</b>: 3.5 L A + 3.5 L B per 1,000 L. Water 3 × 3 min (8 · 11 · 2).'),
        (f'{fmt(H0, ID, False)}', '<b>HST 0</b> — 2–3 true leaves. Trichoderma. Daily cards start.', 'See the HST 0 card.')])
    P.append(page(head(ID, T("TAHAP BIBIT · SEBELUM HST 0", "SEEDLING STAGE · BEFORE HST 0"), T("Bibit di polybag", "Seedlings in the polybags"), T(f"Semai {fmt(SOW, ID)} · HST 0 {fmt(H0, ID)}", f"Sown {fmt(SOW, ID)} · HST 0 {fmt(H0, ID)}")) +
        f'<table class="t"><tr><th>{T("Tanggal", "Date")}</th><th>{T("Tanaman", "Plants")}</th><th>{T("Pakan & air", "Feed & water")}</th></tr>' +
        ''.join(f'<tr><td class="d">{a}</td><td>{b}</td><td>{c}</td></tr>' for a, b, c in seed_rows) + '</table>' +
        f'''<div class="box y"><b>{T("Stok TUMBUH sudah harus siap", "The GROW stock must be ready now")}</b><br>{T("Pakan bibit memakai stok Tumbuh (S1) yang sama, hanya lebih encer. Belum ada? Buat malam ini (hal. 7). pH 5.8–6.3. Angka liter perkiraan — <b>selalu cek dengan meter EC</b>.", "Seedling feed uses the same Grow (S1) stock, just weaker. Not made yet? Make it tonight (page 7). pH 5.8–6.3. Litres are estimates — <b>always check with the EC meter</b>.")}</div>
<div class="box r"><b>{T("Awasi", "Watch for")}</b><ul>
<li>{T("<b>Busuk di pangkal (damping-off)</b> — terlalu basah, dingin, udara diam → kurangi air, kipas jalan.", "<b>Rotting at the base (damping-off)</b> — too wet, cold, still air → less water, fans on.")}</li>
<li>{T("<b>Bibit tinggi kurus</b> — kurang cahaya → buka naungan.", "<b>Tall thin seedlings</b> — too little light → open the shade.")}</li>
<li>{T("<b>Lubang tanpa bibit</b> — catat baris + nomor polybag, kirim ke Boyd.", "<b>Holes with no seedling</b> — note row + bag number, send to Boyd.")}</li>
<li>{T("Jangan siram setelah jam 15:00. Pegang 2 cm atas cocopeat: kering → tambah 1 siraman.", "No watering after 3 pm. Feel the top 2 cm of cocopeat: dry → add one pulse.")}</li></ul></div>
<div class="box g"><b>{T("HST 0 bila", "HST 0 when")}</b> {T("sebagian besar bibit punya 2–3 daun sejati. Bila jatuh di hari lain dari", "most seedlings have 2–3 true leaves. If that is a different day from")} {fmt(H0, ID)}, {T("kabari Boyd — tanggal buku ini dicetak ulang.", "tell Boyd — the dates in this booklet get reprinted.")}</div>''', FOOT))
    # ---- drum recipes
    REC = [('S1', T('TUMBUH', 'GROW'), T('sekarang (bibit) sampai HST 24', 'now (seedlings) to HST 24'), [('A', 'Calcinit', 8.70), ('A', 'Krista K Plus', 3.45), ('B', 'Krista MKP', 2.20), ('B', 'MAG-S', 5.70), ('B', 'Vitaflex', 0.20), ('B', 'Fe-EDDHA', 0.05)], None),
           ('S2', T('BUNGA', 'FLOWER'), T(f'malam {fmt(day(24), ID, False)}', f'night of {fmt(day(24), ID, False)}'), [('A', 'Calcinit', 9.45), ('A', 'Karate Plus Boroni', 0.80), ('A', 'Krista K Plus', 1.15), ('B', 'Krista MKP', 2.30), ('B', 'MAG-S', 6.05), ('B', 'Vitaflex', 0.20), ('B', 'Fe-EDDHA', 0.05)], '310 g'),
           ('S3', T('BESAR', 'SIZING'), T(f'malam {fmt(day(41), ID, False)}', f'night of {fmt(day(41), ID, False)}'), [('A', 'Calcinit', 9.45), ('B', 'Krista MKP', 2.10), ('B', 'MAG-S', 6.25), ('B', 'Vitaflex', 0.20), ('B', 'Fe-EDDHA', 0.05)], '535 g'),
           ('S4', T('MATANG', 'RIPEN'), T(f'malam {fmt(day(59), ID, False)}', f'night of {fmt(day(59), ID, False)}'), [('A', 'Calcinit', 8.95), ('B', 'Krista MKP', 1.85), ('B', 'MAG-S', 6.25), ('B', 'Vitaflex', 0.20), ('B', 'Fe-EDDHA', 0.05)], '645 g')]
    def kg(x): return (f'{x:.2f} kg' if x >= 1 else f'{x * 1000:.0f} g')
    boxes = ''
    for k, nm, when, items, sop in REC:
        trs = ''.join(f'<tr class="{t}"><td>{t} · {n}</td><td class="r">{kg(q)}</td><td class="r">{kg(q / 2)}</td></tr>' for t, n, q in items)
        boxes += f'''<div class="mx"><div class="tt" style="background:{STAGE_COL[k]}">{k} · {nm} <span style="font-weight:400;font-size:8.6pt">— {when}</span></div>
<table><tr><td><b>{T("Produk", "Product")}</b></td><td class="r"><b>50 L</b></td><td class="r"><b>25 L</b></td></tr>{trs}</table>
<div class="nt">{T("Per tangki 1.000 L", "Per 1,000 L tank")}: 5 L A + 5 L B{(" + SOP " + sop) if sop else ""} · EC {stage({"S1": 1, "S2": 25, "S3": 42, "S4": 60}[k])["ec"]}</div></div>'''
    P.append(page(head(ID, T("MALAM GANTI STOK", "STOCK-MIXING NIGHTS"), T("Resep drum per tahap", "Drum recipe per stage"), T("Drum 50 L = 10 tangki · 25 L = 5 tangki (5 hari). Kekuatan pakan tidak pernah berubah.", "50 L drum = 10 tanks · 25 L = 5 tanks (5 days). Feed strength never changes.")) +
        f'<div class="mix">{boxes}</div>' +
        f'''<div class="box y"><b>{T("Cara isi drum", "How to fill a drum")}</b> — {T("isi setengah dengan air hangat → timbang 1 produk, tuang, aduk sampai <b>JERNIH</b> → baru produk berikutnya → tambah air sampai tanda 50 L (atau 25 L) → tulis A/B + tanggal + tahap.", "half fill with warm water → weigh one product, pour, stir until <b>CLEAR</b> → only then the next → top up to the 50 L (or 25 L) mark → write A/B + date + stage.")}</div>
<div class="box r"><b>{T("Jangan pernah", "Never")}</b> — {T("campur produk A ke drum B · asam borat · Fe-EDTA · asam sitrat · SOP atau silika ke dalam drum. SOP langsung ke tangki 1.000 L.", "put an A product in drum B · boric acid · Fe-EDTA · citric acid · SOP or silicon into a drum. SOP goes straight into the 1,000 L tank.")}</div>''', FOOT))
    # ---- daily cards
    for h in range(0, LAST + 1):
        P.append(card(h, L, date=fmt(day(h), ID), sow=True, foot=FOOT + f' · HST 0 = {fmt(H0, ID, False)}'))
    # ---- harvest log
    trs = ''.join('<tr>' + '<td></td>' * 8 + '</tr>' for _ in range(28))
    P.append(page(head(ID, T("CATATAN PANEN", "HARVEST LOG"), T("Catatan panen harian", "Daily harvest log"), T("Satu baris per hari. Foto halaman ini ke Boyd setiap minggu.", "One line a day. Photo this page to Boyd every week.")) +
        f'<table class="t log"><tr><th>{T("Tanggal", "Date")}</th><th>{T("Baris", "Rows")}</th><th>{T("Buah", "Fruit")} A</th><th>B</th><th>C</th><th>D / {T("buang", "binned")}</th><th>{T("Total kg", "Total kg")}</th><th>Brix</th></tr>{trs}</table>', FOOT))
    # page numbers
    return P

if __name__ == '__main__':
    for L in ('id', 'en'):
        P = build(L)
        html = '<!doctype html><html><head><meta charset="utf-8"><title>Sparmanik crop booklet</title>' + CSS + EXTRA_CSS + '</head><body>' + ''.join(P) + '</body></html>'
        open(os.path.join(ROOT, 'build', f'crop_{L}.html'), 'w', encoding='utf-8').write(html)
    print('crop booklet', len(P), 'pages · HST 0 =', H0)
