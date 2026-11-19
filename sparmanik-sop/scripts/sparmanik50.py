"""Sparmanik 5.0 — Oct to Jan Harvest booklet, drawn in the look of the Sparmanik 4.0 / v3.8 book pages:
DM Serif Display titles + Inter text, cream page cards, green stage header with HST badge, blue numbered
circles, orange/blue drum bars, the day-by-day chart table. Indonesian + English, one page per week.
Run: python3 scripts/sparmanik50.py [HST0 as YYYY-MM-DD]  -> build/s50_{id,en}.html"""
import os, sys, base64, datetime as D
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from crop_booklet import fmt, SOW, H0, LOGO, MON_ID, MON_EN, MONTH_ID, MONTH_EN
from crop_simple import sjobs, tank
from daily_cards import stage, watch, LAST
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FD = os.path.join(ROOT, 'assets', 'fonts')
def face(fam, file, w=400, style='normal'):
    b = base64.b64encode(open(os.path.join(FD, file), 'rb').read()).decode()
    return f"@font-face{{font-family:'{fam}';src:url(data:font/woff2;base64,{b}) format('woff2');font-weight:{w};font-style:{style}}}"
FONTS = ''.join([face('Disp', 'dm-serif-display-latin-400-normal.woff2'), face('Disp', 'dm-serif-display-latin-400-italic.woff2', style='italic'),
                 face('Sans', 'inter-latin-400-normal.woff2', 400), face('Sans', 'inter-latin-500-normal.woff2', 500),
                 face('Sans', 'inter-latin-600-normal.woff2', 600), face('Sans', 'inter-latin-700-normal.woff2', 700)])
GREEN, DK, BLUE, ORANGE, GOLD, RED = '#2F5D3E', '#22301E', '#2E7DA0', '#D9782B', '#D99A2B', '#C0392B'
SC = {'S1': '#2F5D3E', 'S2': '#C99A2B', 'S3': '#D9782B', 'S4': '#8A5A2B', 'S0': '#7A8F6A'}
CSS = f'''<style>{FONTS}
@page{{size:595pt 842pt;margin:0}}*{{box-sizing:border-box}}
body{{margin:0;font-family:'Sans',sans-serif;color:{DK};font-size:9.4pt;line-height:1.45;-webkit-print-color-adjust:exact}}
.pg{{width:595pt;height:842pt;position:relative;break-after:page;background:#fff;overflow:hidden}}.pg:last-child{{break-after:auto}}
.card{{position:absolute;left:34pt;top:34pt;width:527pt;background:#FFFDF8;border:0.75pt solid #E6E0D0;border-radius:7pt;padding:26pt 29pt 22pt}}
.kick{{font:700 7.6pt 'Sans';letter-spacing:2.6pt;color:{BLUE};text-transform:uppercase}}
h1{{font:400 19pt 'Disp';color:{GREEN};margin:4pt 0 1pt;letter-spacing:-.2pt}}
.sub{{font-size:8.4pt;color:#6A7059}}
.rule{{width:45pt;height:2.25pt;background:{GOLD};margin:9pt 0 12pt}}
h2{{font:400 13pt 'Disp';color:{DK};margin:12pt 0 5pt}}
.pn{{position:absolute;bottom:22pt;width:100%;text-align:center;font:600 8pt 'Sans';color:#6B7059}}
/* stage header */
.hero{{background:linear-gradient(140deg,#336A47 0%,#244A33 60%,#1C3826 100%);border-radius:8pt;padding:13pt 15pt 13pt;color:#fff;position:relative}}
.hero .k{{font:700 7.4pt 'Sans';letter-spacing:2.2pt;color:#E8B84B;text-transform:uppercase}}
.hero h1{{color:#fff;font-size:19pt;margin:3pt 0 9pt}}
.hero .hst{{position:absolute;right:14pt;top:12pt;border:1pt solid rgba(255,255,255,.55);background:rgba(255,255,255,.13);border-radius:7pt;padding:6pt 12pt;font:700 12pt 'Sans'}}
.chips{{display:grid;grid-template-columns:repeat(3,1fr);gap:6pt}}
.chips div{{background:rgba(255,255,255,.1);border-radius:5pt;padding:6pt 9pt}}
.chips span{{display:block;font:500 6.6pt 'Sans';letter-spacing:1pt;opacity:.75;text-transform:uppercase}}.chips b{{font:700 10pt 'Sans'}}
/* numbered list */
ol.num{{list-style:none;padding:0;margin:4pt 0;counter-reset:n}}
ol.num li{{counter-increment:n;position:relative;padding:5pt 0 7pt 30pt;border-bottom:0.75pt dashed #E2DCCB;min-height:24pt}}
ol.num li:last-child{{border-bottom:0}}
ol.num li:before{{content:counter(n);position:absolute;left:0;top:3pt;width:19pt;height:19pt;border-radius:50%;background:{BLUE};color:#fff;font:400 11pt 'Disp';text-align:center;line-height:19pt}}
ul.watch{{list-style:none;padding:0;margin:3pt 0}}
ul.watch li{{position:relative;padding:4pt 0 5pt 17pt;border-bottom:0.75pt dashed #E2DCCB}}ul.watch li:last-child{{border-bottom:0}}
ul.watch li:before{{content:'!';position:absolute;left:0;top:4.5pt;width:11pt;height:11pt;border-radius:50%;background:{RED};color:#fff;font:700 7.4pt 'Sans';text-align:center;line-height:11pt}}
.call{{border-radius:6pt;padding:9pt 12pt;margin:9pt 0}}
.call b.t{{display:block;font:700 9.6pt 'Sans';margin-bottom:2pt}}
.call.r{{background:#FBE6E3;border:0.75pt solid #F0C3BC}}.call.r b.t{{color:{RED}}}
.call.y{{background:#FBF0D6;border:0.75pt solid #ECD8A6}}.call.y b.t{{color:#9A6B0F}}
.call.g{{background:#E8F1E6;border:0.75pt solid #C4D9C0}}.call.g b.t{{color:{GREEN};display:inline}}
/* day-by-day chart */
table.ch{{width:100%;border-collapse:separate;border-spacing:0;border-radius:6pt;overflow:hidden;margin:10pt 0 4pt}}
.ch th{{background:{GREEN};color:#fff;font:700 7.4pt 'Sans';letter-spacing:.6pt;padding:6pt 4pt;text-align:center;text-transform:uppercase;line-height:1.2}}
.ch td{{padding:6pt 4pt;border-bottom:0.75pt solid #E8E2D2;text-align:center;font:600 10pt 'Sans';vertical-align:middle}}
.ch tr:nth-child(odd) td{{background:#F7F9F3}}
.ch td.day{{text-align:left;font-weight:700;white-space:nowrap;padding-left:8pt}}.ch td.day small{{display:block;font:500 7pt 'Sans';color:#6A7059}}
.ch td.job{{text-align:left;font:600 8.6pt 'Sans';color:#8A3A12;line-height:1.35}}.ch td.job.q{{color:#A4A894;font-weight:500}}
.ch td.tm{{font:500 7.6pt 'Sans';color:{BLUE};white-space:nowrap}}
.ch td.ok span{{display:inline-block;width:13pt;height:13pt;border:1pt solid #9BA08E;border-radius:3pt;background:#fff}}
.bd{{display:inline-block;font:700 6.2pt 'Sans';letter-spacing:.6pt;color:#fff;border-radius:3pt;padding:1.5pt 4pt;text-transform:uppercase}}
.legend .bd{{font-size:6.6pt;padding:2pt 6pt;margin-right:3pt;border-radius:7pt}}
.note{{font-size:7.6pt;color:#6A7059}}
/* drum bars */
.drum{{border:0.75pt solid #E6E0D0;border-radius:6pt;overflow:hidden;background:#fff;margin:7pt 0}}
.drum .bar{{color:#fff;padding:6pt 11pt;font:700 10pt 'Sans'}}.drum .bar small{{font:500 7.4pt 'Sans'}}
.drum .it{{display:grid;grid-template-columns:22pt 1fr auto;align-items:center;padding:6pt 11pt;border-top:0.75pt solid #EFE9DB}}
.drum .it:first-of-type{{border-top:0}}
.drum .no{{width:15pt;height:15pt;border-radius:50%;background:#EEEBE3;color:#6A7059;font:700 7.4pt 'Sans';text-align:center;line-height:15pt}}
.drum .nm b{{font:700 9pt 'Sans';text-transform:uppercase}}.drum .nm small{{display:block;font-size:7pt;color:#6A7059}}
.drum .kg{{text-align:right;font:400 17pt 'Disp';line-height:1}}.drum .kg small{{display:block;font:500 7pt 'Sans';color:#6A7059;margin-top:2pt}}
/* cover */
.cv{{position:absolute;left:34pt;top:34pt;width:527pt;height:520pt;border-radius:7pt;background:linear-gradient(160deg,#356548 0%,#28503A 50%,#1E3A29 100%);color:#fff;text-align:center;padding:40pt 30pt}}
.cv .k{{font:700 7.6pt 'Sans';letter-spacing:2.8pt;color:{GOLD}}}
.cv h1{{font:400 44pt 'Disp';color:#fff;line-height:1.02;margin:12pt 0 0}}.cv h1 em{{color:{GOLD}}}
.cv .tg{{font:400 10.4pt 'Sans';color:#EEE6CE;margin-top:16pt;line-height:1.75}}
.cv .tgt{{font:700 10pt 'Sans';margin-top:18pt}}
.cv .logo{{width:126pt;height:126pt;border-radius:50%;background:#fff;margin:9pt auto 10pt;display:flex;align-items:center;justify-content:center;border:2pt solid rgba(255,255,255,.4)}}
.cv .logo{{overflow:hidden}}.cv .logo img{{width:92pt;border-radius:50%}}
.cv .pills{{display:flex;justify-content:center;gap:7pt}}
.cv .pills span{{border:0.75pt solid rgba(255,255,255,.35);background:rgba(255,255,255,.07);border-radius:12pt;padding:5pt 12pt;font:600 7.6pt 'Sans'}}
.cv .ft{{font:400 7.6pt 'Sans';color:#D7DECF;margin-top:16pt}}
/* contents */
.toc{{display:grid;grid-template-columns:1fr 1fr;gap:0 22pt}}
.toc div{{display:grid;grid-template-columns:20pt 1fr auto;gap:6pt;padding:6pt 0;border-bottom:0.75pt dashed #E2DCCB;align-items:center;font-weight:600}}
.toc i{{font:400 11pt 'Disp';color:{GOLD};font-style:normal}}.toc em{{font-style:normal;font-weight:700}}.toc small{{display:block;font-weight:400;color:#6A7059;font-size:7.6pt}}
table.log{{width:100%;border-collapse:separate;border-spacing:0;border-radius:6pt;overflow:hidden;border:0.75pt solid #E6E0D0}}
.log th{{background:{GREEN};color:#fff;font:700 7.4pt 'Sans';padding:6pt;text-align:left;text-transform:uppercase;letter-spacing:.5pt}}
.log td{{height:20pt;border-top:0.75pt solid #E8E2D2;background:#fff}}
.dk{{position:absolute;left:34pt;top:34pt;width:527pt;border-radius:7pt;background:linear-gradient(160deg,#356548,#1E3A29);color:#fff;padding:26pt 29pt 22pt}}
.dk .kick{{color:{GOLD}}}.dk h1{{color:#fff}}.dk .sub{{color:#C9D3C2}}
.dk ol.num li{{border-bottom-color:rgba(255,255,255,.18);font-size:10.4pt}}.dk ol.num li:before{{background:{ORANGE}}}
.box{{background:rgba(255,255,255,.08);border:0.75pt solid rgba(255,255,255,.2);border-radius:6pt;padding:10pt 12pt;margin-top:10pt}}
.eq{{display:grid;grid-template-columns:1fr 18pt 1fr 18pt 1fr;align-items:center;text-align:center;margin:6pt 0 10pt}}
.eq .c{{background:rgba(255,255,255,.08);border:0.75pt solid rgba(255,255,255,.22);border-radius:7pt;padding:10pt 6pt}}
.eq .ball{{width:38pt;height:38pt;border-radius:50%;margin:0 auto 5pt;font:400 20pt 'Disp';line-height:38pt}}
.eq .op{{font:400 20pt 'Disp';color:{GOLD}}}.eq small{{display:block;font-size:8pt;color:#EEE6CE}}
</style>'''

def build(L):
    ID = L == 'id'; T = lambda a, b: a if ID else b
    MON = MON_ID if ID else MON_EN
    sd = lambda d: f'{d.day} {MON[d.month - 1]}'
    day = lambda h: H0 + D.timedelta(h)
    NM = T({'S1': 'Tumbuh', 'S2': 'Bunga', 'S3': 'Besar', 'S4': 'Matang', 'S0': 'Bibit'}, {'S1': 'Grow', 'S2': 'Flower', 'S3': 'Sizing', 'S4': 'Ripen', 'S0': 'Seedling'})
    P = []
    def page(inner, num=True):
        P.append(f'<div class="pg">{inner}' + (f'<div class="pn">{len(P) + 1}</div>' if num else '') + '</div>')
    def card(kick, title, sub, body):
        page(f'<div class="card"><div class="kick">{kick}</div><h1>{title}</h1><div class="sub">{sub}</div><div class="rule"></div>{body}</div>')
    # week list (needed for contents)
    weeks = []; s = SOW
    while (s - H0).days <= LAST:
        weeks.append(s); s += D.timedelta(7)
    FIRSTW = 5  # page number of week 1
    # ---- cover
    page(f'''<div class="cv"><div class="k">SPARMANIK 5.0 · {T("PANDUAN MINGGU DEMI MINGGU", "WEEK-BY-WEEK PLAYBOOK")}</div>
<h1>Sparmanik <em>5.0</em><br>{T("Panen Okt–Jan", "Oct–Jan Harvest")}</h1>
<div class="tg">{T("Tanam satu minggu demi satu minggu.", "Grow it one week at a time.")}<br>{T("Baca hanya halaman minggu ini.", "Read only this week’s page.")}</div>
<div class="tgt">{T("Semai", "Sown")} {sd(SOW)} · HST 0 {sd(H0)} · {T("panen mulai", "harvest from")} {sd(day(75))}</div>
<div class="logo"><img src="{LOGO}"></div>
<div class="pills"><span>{T("Bibit → Tumbuh → Bunga → Besar → Matang", "Seedling → Grow → Flower → Sizing → Ripen")}</span><span>{T("Target 1.8–2.2 kg · brix 15+", "Target 1.8–2.2 kg · brix 15+")}</span></div>
<div class="ft">Sparmanik Farm · Kab. Simalungun &nbsp;•&nbsp; SPARMANIK 5.0 · {sd(D.date.today())} {D.date.today().year}</div></div>''', num=False)
    # ---- contents
    rows = [('★', T('MULAI DI SINI — setiap hari', 'START HERE — every day'), '', 3), ('C', T('Cara kerja tugas ★', 'How to do the ★ jobs'), '', 4)]
    for i, w in enumerate(weeks):
        hs = [(w + D.timedelta(k) - H0).days for k in range(7)]
        ks = [stage(max(h, 0))['k'] if h >= 0 else 'S0' for h in hs]
        nm = ' → '.join(dict.fromkeys(NM[k] for k in ks))
        rows.append((str(i + 1), f'{T("Minggu", "Week")} {i + 1} · {nm}', f'{sd(w)} – {sd(w + D.timedelta(6))}', FIRSTW + i))
    nd = FIRSTW + len(weeks)
    rows += [('D', T('Stok', 'Stock') + ' ' + NM[k], '', nd + j) for j, k in enumerate(('S1', 'S2', 'S3', 'S4'))] + [('P', T('Catatan panen', 'Harvest log'), '', nd + 4)]
    toc = ''.join(f'<div><i>{a}</i><span><em>{b}</em><small>{c}</small></span><b>{n}</b></div>' for a, b, c, n in rows)
    card(T('ALUR MUSIM INI', 'HOW THIS CROP RUNS'), T('Isi buku', 'Contents'), T(f'Semai {fmt(SOW, ID)} · HST 0 = {fmt(H0, ID)}', f'Sown {fmt(SOW, ID)} · HST 0 = {fmt(H0, ID)}'),
         f'<div class="toc">{toc}</div><div class="call y" style="margin-top:14pt"><b class="t">{T("Cara pakai buku ini", "How to use this book")}</b>{T("Cari minggu hari ini. Baca hanya halaman itu: setiap hari ada satu baris — EC, SOP, siraman, dan tugas. Centang kotak setelah selesai. Bila HST 0 bergeser, Boyd mencetak ulang buku ini.", "Find this week. Read only that page: each day is one line — EC, SOP, watering and the job. Tick the box when done. If HST 0 moves, Boyd reprints this book.")}</div>')
    # ---- start here (dark page like 'Make the feed')
    page(f'''<div class="dk"><div class="kick">{T("MULAI DI SINI · SETIAP HARI", "START HERE · EVERY DAY")}</div><h1>{T("Buat pakan & cek", "Make the feed & check")}</h1><div class="rule"></div>
<div class="eq"><div class="c"><div class="ball" style="background:{ORANGE}">A</div>5 L {T("Stok A", "Stock A")}<small>({T("oranye", "orange")})</small></div><div class="op">+</div>
<div class="c"><div class="ball" style="background:{BLUE}">B</div>5 L {T("Stok B", "Stock B")}<small>({T("biru", "blue")})</small></div><div class="op">=</div>
<div class="c"><div style="font:400 22pt 'Disp'">1000 L</div><small>{T("+ SOP minggu ini · pH 5.8–6.3", "+ this week's SOP · pH 5.8–6.3")}</small></div></div>
<ol class="num">
<li>{T("<b>06:30 cek tangki:</b> EC sesuai halaman minggu ini, pH 5.8–6.3. Foto ke Boyd sebelum pompa nyala.", "<b>6:30 tank check:</b> EC as this week's page says, pH 5.8–6.3. Photo to Boyd before the pump goes on.")}</li>
<li>{T("<b>Jalan semua baris pagi.</b> Polybag kering? Dripper mampet? Buah pecah/busuk → karung → keluar.", "<b>Walk every row in the morning.</b> Dry bag? Blocked dripper? Split/rotten fruit → sack → out.")}</li>
<li>{T("<b>Meter Krisbow 08 · 10 · 12 · 14.</b> Kelembapan kurang dari suhu × 2 → semprot daun air 5–10 menit (terakhir 15:30).", "<b>Krisbow meter 8 · 10 · 12 · 2.</b> Humidity under temperature × 2 → mist leaves 5–10 min (last 3:30 pm).")}</li>
<li>{T("<b>Kerjakan tugas di halaman minggu ini</b> dan centang kotaknya.", "<b>Do the jobs on this week's page</b> and tick the box.")}</li></ol>
<div class="box"><b style="color:{GOLD};font-size:9pt;letter-spacing:1.6pt">{T("5 ATURAN — JANGAN PERNAH DILANGGAR", "5 RULES — NEVER BREAK THEM")}</b><ol style="margin:5pt 0 0;padding-left:15pt;line-height:1.7">
<li>{T("Boroni hanya di stok BUNGA. Asam borat, Fe-EDTA, asam sitrat dilarang.", "Boroni only in the FLOWER stock. Boric acid, Fe-EDTA, citric acid banned.")}</li>
<li>{T("Silika hanya 5 kali (sampai HST 36).", "Silicon only 5 times (to HST 36).")}</li>
<li>{T("Mulai HST 38: tidak ada air biasa atau siram tangan.", "From HST 38: no plain water, no hand watering.")}</li>
<li>{T("Pakan MATANG sampai buah terakhir.", "RIPEN feed to the last fruit.")}</li>
<li>{T("Drum A dan B tidak pernah dicampur.", "Drums A and B are never mixed.")}</li></ol></div>
<div style="margin-top:10pt;font-weight:700">{T("Ragu? Berhenti dan telepon Boyd.", "Not sure? Stop and call Boyd.")}</div></div>''')
    # ---- how to
    HOW = T([
        ('Trichoderma', '<b>1 g per liter = 10 g di ember 10 L</b> air biasa, aduk, diamkan 15–30 menit. Siram polybag dulu, lalu <b>1 gelas (250 ml) per polybag</b> di pangkal batang. <b>1 ember = 40 polybag</b> (400 polybag = 10 ember = 100 g). Aduk tiap 10 polybag, pakai hari itu juga.'),
        ('Silika (Kalsika)', 'Saklar MANUAL. 400 L air → jalan 3 menit → 1 sachet 100 g, aduk sampai bening → jalan 8 menit → tambah sampai 100 L → jalan 3 menit sampai habis → buat tangki pakan biasa. Hari itu siram hanya jam 14 dan 17.'),
        ('Tri-Pholate', '<b>2 g per tangki semprot 16 L.</b> Daun saja. Setelah jam 16.'),
        ('Semprot Calcinit', '<b>80 g per tangki semprot 16 L.</b> Pagi atau setelah jam 16. Daun saja.'),
        ('Penyerbukan', 'Jam 06–10. Bunga betina (ada bakal buah kecil) di ruas 9–12 → oles serbuk bunga jantan dari <b>tanaman yang sama</b>. Tulis tanggal di label.'),
        ('Sisakan 1 buah + pangkas', 'Simpan <b>SATU</b> buah terbaik per tanaman, buang yang lain. Potong pucuk di atas <b>daun ke-25</b>. Tidak ada buah → jangan pangkas.'),
        ('Panen', 'Jam 06–09:30. Matang = jaring penuh, bawah menguning, harum, lepas dengan putaran pelan. Potong gunting, taruh di teduh, timbang, catat. <b>Buah lain jangan dipotong.</b>')], [
        ('Trichoderma', '<b>1 g per litre = 10 g in a 10 L bucket</b> of plain water, stir, stand 15–30 min. Water the bags first, then <b>one cup (250 ml) per bag</b> at the stem base. <b>1 bucket = 40 bags</b> (400 bags = 10 buckets = 100 g). Stir every 10 bags, use it the same day.'),
        ('Silicon (Kalsika)', 'MANUAL switch. 400 L water → run 3 min → one 100 g sachet, stir until clear → run 8 min → top up to 100 L → run 3 min until empty → make the normal feed tank. That day water only at 2 and 5 pm.'),
        ('Tri-Pholate', '<b>2 g per 16 L spray pack.</b> Leaves only. After 4 pm.'),
        ('Calcinit spray', '<b>80 g per 16 L spray pack.</b> Early morning or after 4 pm. Leaves only.'),
        ('Pollinate', '6–10 am. Female flowers (tiny fruit behind the flower) on nodes 9–12 → dab pollen from a male flower of the <b>same plant</b>. Write the date on the tag.'),
        ('Keep 1 fruit + top', 'Keep the <b>ONE</b> best fruit per plant, remove the rest. Cut the tip above <b>leaf 25</b>. No fruit → don’t top.'),
        ('Harvest', '6–9:30 am. Ripe = full net, yellow underside, smells sweet, slips off with a gentle twist. Cut with scissors, into the shade, weigh, write it down. <b>Don’t cut any other fruit.</b>')])
    card(T('CARA KERJA · TUGAS BERTANDA ★', 'HOW TO · JOBS MARKED ★'), T('Cara kerja', 'How to do it'), T('Takaran dan langkah untuk setiap tugas khusus.', 'Amounts and steps for every special job.'),
         '<ol class="num">' + ''.join(f'<li><b>{a}</b> — {b}</li>' for a, b in HOW) + '</ol>' +
         f'<div class="call r"><b class="t">▲ {T("Jangan pernah", "Never")}</b>{T("Trichoderma lewat tangki atau dripper · semprot daun di matahari terik · MKP dan Calcinit dalam satu tangki semprot · semprot daun HST 45–59.", "Trichoderma through the tank or drippers · leaf sprays in strong sun · MKP and Calcinit in one spray pack · leaf sprays HST 45–59.")}</div>')
    # ---- weeks
    for i, w in enumerate(weeks):
        days = [w + D.timedelta(k) for k in range(7)]; hs = [(d - H0).days for d in days]
        ks = [stage(max(h, 0))['k'] if h >= 0 else 'S0' for h in hs]
        nm = ' → '.join(dict.fromkeys(NM[k] for k in ks))
        hpos = [h for h in hs if h >= 0]
        hst = f'HST {hpos[0]}–{hpos[-1]}' if hpos else T(f'Bibit hari {(days[0] - SOW).days}–{(days[-1] - SOW).days}', f'Seedling day {(days[0] - SOW).days}–{(days[-1] - SOW).days}')
        t0, t6 = tank(hs[0], ID), tank(hs[-1], ID)
        ecs = t0[0] if t0[0] == t6[0] else f'{t0[0]} → {t6[0]}'
        sops = t0[1] if t0[1] == t6[1] else f'{t0[1]} → {t6[1]}'
        tms = t0[2] if t0[2] == t6[2] else f'{t0[2]} → {t6[2]}'
        rows = ''
        for d, h, k in zip(days, hs, ks):
            ec, sop, tm = tank(h, ID)
            J = sjobs(h, ID)
            jt = '<br>'.join(J) if J else T('rutin saja', 'routine only')
            dn = fmt(d, ID, False).split(' ')
            rows += (f'<tr><td class="day">{dn[0]} {dn[1]} {dn[2]}<small>{(T("hari bibit ", "seedling day ") + str((d - SOW).days)) if h < 0 else ""}</small></td>'
                     f'<td>{h if h >= 0 else "—"}</td><td><span class="bd" style="background:{SC[k]}">{NM[k]}</span></td><td>{ec}</td><td>{sop}</td><td class="tm">{tm}</td>'
                     f'<td class="job{"" if J else " q"}">{jt}</td><td class="ok"><span></span></td></tr>')
        wt = watch(max(hpos[len(hpos) // 2], 0)) if hpos else (T('Busuk di pangkal (damping-off) · bibit tinggi kurus (kurang cahaya) · lubang tanpa bibit', 'Rotting at the base (damping-off) · tall thin seedlings (too little light) · holes with no seedling'),) * 2
        items = ''.join(f'<li>{x}</li>' for x in T(*wt).split(' · '))
        nxt = ''
        if i + 1 < len(weeks):
            nw = weeks[i + 1]; nh = [(nw + D.timedelta(k) - H0).days for k in range(7)]
            big, seen = [], set()
            for k, h in enumerate(nh):
                for j in sjobs(h, ID):
                    if '<b>' in j and j not in seen: seen.add(j); big.append((nw + D.timedelta(k), j))
            if big: nxt = f'<b class="t">{T("Minggu depan:", "Next week:")}</b> ' + ' · '.join(f'{fmt(d, ID, False).rsplit(" ", 1)[0]} — {j}' for d, j in big[:3])
            else: nxt = f'<b class="t">{T("Minggu depan:", "Next week:")}</b> {T("sama seperti minggu ini, lihat halaman berikut.", "same as this week, see the next page.")}'
        page(f'''<div class="card"><div class="hero"><div class="k">{T("MINGGU", "WEEK")} {i + 1} · {nm}</div><h1>{sd(days[0])} – {sd(days[-1])} {days[-1].year}</h1><div class="hst">{hst}</div>
<div class="chips"><div><span>{T("EC pakan", "Feed EC")}</span><b>{ecs}</b></div><div><span>SOP / {T("tangki", "tank")}</span><b>{sops}</b></div><div><span>{T("Siraman", "Watering")}</span><b>{tms}</b></div></div></div>
<h2>{T("Hari demi hari", "Day by day")}</h2>
<table class="ch"><tr><th style="text-align:left;padding-left:8pt">{T("Hari", "Day")}</th><th>HST</th><th>{T("Tahap", "Stage")}</th><th>EC</th><th>SOP<br>/1000 L</th><th>{T("Siraman", "Pulses")}</th><th style="text-align:left">{T("Tugas hari ini", "Job for the day")}</th><th>✓</th></tr>{rows}</table>
<div class="note">pH 5.8–6.3 {T("setiap hari", "every day")} · ★ = {T("lihat Cara kerja hal. 4", "see How to, page 4")} · {T("rutin harian hal. 3", "daily routine page 3")}</div>
<h2>{T("Yang diawasi minggu ini", "Watch for this week")}</h2><ul class="watch">{items}</ul>
{f'<div class="call g">{nxt}</div>' if nxt else ''}</div>''')
    # ---- drum recipes (Making Stock A & Stock B style)
    REC = [('S1', T('sekarang sampai HST 24', 'now to HST 24'), [('A', 'Calcinit', 'Yara Calcinit · kalsium nitrat' if ID else 'Yara Calcinit · calcium nitrate', 8.70), ('A', 'K Plus', 'Yara Krista K Plus · kalium nitrat' if ID else 'Yara Krista K Plus · potassium nitrate', 3.45),
            ('B', 'MKP', 'Yara Krista MKP', 2.20), ('B', 'MAG-S', 'Meroke MAG-S', 5.70), ('B', 'Vitaflex', T('kantong pink · timbangan dapur', 'pink bag · kitchen scale'), 0.20), ('B', 'Fe-EDDHA', T('timbangan dapur', 'kitchen scale'), 0.05)], None),
           ('S2', T(f'malam {fmt(day(24), ID)}', f'night of {fmt(day(24), ID)}'), [('A', 'Calcinit', 'Yara Calcinit', 9.45), ('A', 'Boroni', T('Karate Plus Boroni · karung ORANYE · hanya tahap ini', 'Karate Plus Boroni · ORANGE sack · this stage only'), 0.80), ('A', 'K Plus', 'Yara Krista K Plus', 1.15),
            ('B', 'MKP', 'Yara Krista MKP', 2.30), ('B', 'MAG-S', 'Meroke MAG-S', 6.05), ('B', 'Vitaflex', T('timbangan dapur', 'kitchen scale'), 0.20), ('B', 'Fe-EDDHA', T('timbangan dapur', 'kitchen scale'), 0.05)], '310 g'),
           ('S3', T(f'malam {fmt(day(41), ID)}', f'night of {fmt(day(41), ID)}'), [('A', 'Calcinit', T('Yara Calcinit · tanpa Boroni (4.0)', 'Yara Calcinit · no Boroni (4.0)'), 9.45),
            ('B', 'MKP', 'Yara Krista MKP', 2.10), ('B', 'MAG-S', 'Meroke MAG-S', 6.25), ('B', 'Vitaflex', T('timbangan dapur', 'kitchen scale'), 0.20), ('B', 'Fe-EDDHA', T('timbangan dapur', 'kitchen scale'), 0.05)], '535 g'),
           ('S4', T(f'malam {fmt(day(59), ID)}', f'night of {fmt(day(59), ID)}'), [('A', 'Calcinit', 'Yara Calcinit', 8.95),
            ('B', 'MKP', 'Yara Krista MKP', 1.85), ('B', 'MAG-S', 'Meroke MAG-S', 6.25), ('B', 'Vitaflex', T('timbangan dapur', 'kitchen scale'), 0.20), ('B', 'Fe-EDDHA', T('timbangan dapur', 'kitchen scale'), 0.05)], '645 g')]
    kg = lambda x: f'{x:g} kg' if x >= 1 else f'{x * 1000:.0f} g'
    def drums(k, when, items, sop):
        out = f'<h2 style="margin-top:4pt">{k} · {NM[k]} <span style="font:500 8.4pt Sans;color:#6A7059">— {when} · EC {stage({"S1": 1, "S2": 25, "S3": 42, "S4": 60}[k])["ec"]}{" · SOP " + sop + T(" langsung ke tangki", " straight into the tank") if sop else ""}</span></h2>'
        for side, col, lab in (('A', ORANGE, T('label oranye', 'orange label')), ('B', BLUE, T('label biru', 'blue label'))):
            its = [x for x in items if x[0] == side]
            out += f'<div class="drum"><div class="bar" style="background:{col}">DRUM {side} <small>— {lab} · 50 L · {len(its)} {T("produk", "products")}</small></div>'
            for n, (_, name, note, q) in enumerate(its, 1):
                out += f'<div class="it"><div class="no">{n}</div><div class="nm"><b>{name}</b><small>{note}</small></div><div class="kg" style="color:{col}">{kg(q)}<small>25 L: {kg(q / 2)}</small></div></div>'
            out += '</div>'
        return out
    for j, r in enumerate(REC):
        extra = ''
        if j == 0: extra = f'<div class="call y"><b class="t">↑ {T("Cara isi drum", "How to fill a drum")}</b>{T("Isi setengah dengan air hangat → timbang 1 produk, tuang, aduk sampai <b>JERNIH</b> → baru produk berikutnya → tambah air sampai tanda 50 L (atau 25 L) → tulis A/B + tanggal + tahap.", "Half fill with warm water → weigh one product, pour, stir until <b>CLEAR</b> → only then the next → top up to the 50 L (or 25 L) mark → write A/B + date + stage.")}</div>'
        card(T('MALAM GANTI STOK', 'STOCK NIGHT') + f' · {r[0]} · {r[1]}', T('Membuat Stok A & Stok B', 'Making Stock A & Stock B'), T('Drum 50 L = 10 tangki · 25 L = 5 tangki (5 hari). Timbang setiap produk.', '50 L drum = 10 tanks · 25 L = 5 tanks (5 days). Weigh every product.'),
             drums(*r) + extra + f'<div class="call r"><b class="t">▲ {T("Timbang semua produk. Jangan menebak.", "Weigh every product. Do not guess.")}</b>{T("Jangan pernah: produk A ke drum B · asam borat · Fe-EDTA · asam sitrat · SOP atau silika ke dalam drum.", "Never: an A product in drum B · boric acid · Fe-EDTA · citric acid · SOP or silicon into a drum.")}</div>')
    # ---- harvest log
    trs = ''.join('<tr>' + '<td></td>' * 8 + '</tr>' for _ in range(24))
    card(T('CATATAN · PANEN', 'RECORD · HARVEST'), T('Catatan panen harian', 'Daily harvest log'), T('Satu baris per hari. Foto halaman ini ke Boyd setiap minggu.', 'One line a day. Photo this page to Boyd every week.'),
         f'<table class="log"><tr><th>{T("Tanggal", "Date")}</th><th>{T("Baris", "Rows")}</th><th>A</th><th>B</th><th>C</th><th>D / {T("buang", "binned")}</th><th>{T("Total kg", "Total kg")}</th><th>Brix</th></tr>{trs}</table>')
    return P

if __name__ == '__main__':
    for L in ('id', 'en'):
        P = build(L)
        html = f'<!doctype html><html><head><meta charset="utf-8"><title>Sparmanik 5.0</title>{CSS}</head><body>{"".join(P)}</body></html>'
        open(os.path.join(ROOT, 'build', f's50_{L}.html'), 'w', encoding='utf-8').write(html)
    print('Sparmanik 5.0', len(P), 'pages · HST 0 =', H0)
