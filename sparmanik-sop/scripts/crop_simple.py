"""SIMPLE crop booklet "Oct to Jan Harvest": one page per week instead of one per day.
Run: python3 scripts/crop_simple.py [HST0 as YYYY-MM-DD]  -> build/crop_simple_{id,en}.html"""
import os, sys, datetime as D
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import crop_booklet as C
from crop_booklet import fmt, head, page, build, STAGE_COL, SOW, H0, EXTRA_CSS
from daily_cards import CSS, stage, SIL, TRI, TPH, CA, LAST
ROOT = C.ROOT

def sjobs(h, ID):
    T = lambda a, b: a if ID else b; J = []
    if h < 0:
        n = h + (H0 - SOW).days  # days since sowing
        if n == 0: J.append(T('Benih ditanam di polybag', 'Seed sown into the polybags'))
        elif n <= 3: J.append(T('Jaga cocopeat lembap, tidak becek', 'Keep the cocopeat damp, not soggy'))
        elif n == 4: J.append(T('Bibit muncul → cahaya penuh, kipas jalan', 'Seedlings up → full light, fans on'))
        elif n == 7: J.append(T('Sisakan 1 bibit terkuat per lubang', 'Keep 1 strongest seedling per hole'))
        return J
    if h == 0: J.append(T('Trichoderma 1 gelas ★', 'Trichoderma, one cup ★'))
    if h == 1: J.append(T('Pakan penuh mulai', 'Full feed starts'))
    if h == 7: J.append(T('Mulai buang tunas samping (ruas 1–8), tiap 2–3 hari', 'Start pinching side shoots (nodes 1–8), every 2–3 days'))
    if h in SIL: J.append(T('Silika ★', 'Silicon ★') + (T(' — TERAKHIR', ' — LAST ONE') if h == 36 else ''))
    if h == 8: J.append(T('Besok timer: 4 × 6 menit', 'Tomorrow timer: 4 × 6 min'))
    if h in TRI and h: J.append('Trichoderma ★')
    if h == 20: J.append(T('Stop buang tunas (sudah ruas 8)', 'Stop pinching shoots (node 8 reached)'))
    if h in TPH: J.append(T('Tri-Pholate setelah jam 16 ★', 'Tri-Pholate after 4 pm ★'))
    if h in CA: J.append(T('Semprot Calcinit ★', 'Calcinit spray ★'))
    if h == 24: J.append(T('<b>MALAM: buat stok BUNGA</b>', '<b>TONIGHT: make FLOWER stock</b>'))
    if h == 25: J.append(T('<b>GANTI KE BUNGA</b> · pasang perangkap lalat', '<b>CHANGE TO FLOWER</b> · hang fly traps'))
    if 25 <= h <= 37: J.append(T('Penyerbukan 06–10 ★', 'Pollinate 6–10 am ★'))
    if h == 38: J.append(T('<b>Sisakan 1 buah + pangkas ★ · STOP air biasa</b>', '<b>Keep 1 fruit + top ★ · NO plain water from now</b>'))
    if h in (39, 40): J.append(T('Selesaikan pilih buah & pangkas', 'Finish fruit selection & topping'))
    if h == 41: J.append(T('<b>MALAM: buat stok BESAR</b>', '<b>TONIGHT: make SIZING stock</b>'))
    if h == 42: J.append(T('<b>GANTI KE BESAR</b> · gantung buah', '<b>CHANGE TO SIZING</b> · sling the fruit'))
    if h == 45: J.append(T('Jaring kulit: <b>STOP semprot daun</b> sampai HST 59', 'Netting: <b>NO leaf sprays</b> until HST 59'))
    if h == 59: J.append(T('<b>MALAM: buat stok MATANG</b>', '<b>TONIGHT: make RIPEN stock</b>'))
    if h == 60: J.append(T('<b>GANTI KE MATANG</b> — sampai buah terakhir', '<b>CHANGE TO RIPEN</b> — to the last fruit'))
    if h >= 60: J.append(T('Semprot 16:00: ', '4 pm spray: ') + ('MKP 48 g' if (h - 60) % 2 == 0 else 'Calcinit 80 g'))
    if 68 <= h < 75: J.append(T('Cek Brix pada buah pecah', 'Brix on split fruit'))
    if h >= 75: J.append(T('<b>PANEN pagi ★</b>', '<b>HARVEST in the morning ★</b>'))
    return J

def tank(h, ID):
    T = lambda a, b: a if ID else b
    if h < 0:
        n = h + (H0 - SOW).days
        if n <= 3: return '0.5', '—', T('2 × 3 mnt', '2 × 3 min')
        if n <= 6: return '1.0', '—', T('2 × 3 mnt', '2 × 3 min')
        return '1.5', '—', T('3 × 3 mnt', '3 × 3 min')
    s = stage(h)
    k = 0 if h <= 8 else (1 if h <= 24 else (2 if h <= 41 else (3 if h <= 59 else 4)))
    tm = ['3 × 5', '4 × 6', '5 × 7', '6 × 8', '4 × 6'][k] + T(' mnt', ' min')
    return ('1.5' if h == 0 else s['ec']), (s['sop'] or '—'), tm

SIMPLE_CSS = '''<style>
.wk{display:grid;grid-template-columns:1fr auto;align-items:end;border-bottom:3pt solid #2F5D3E;padding-bottom:6pt;margin-bottom:8pt}
.wk h1{font-size:26pt;margin:0}.wk .k{font-size:9pt}
.wk .bd{font-size:12pt;padding:6pt 12pt;border-radius:6pt;color:#fff;font-weight:700}
table.w{width:100%;border-collapse:collapse;font-size:12.5pt}
table.w th{background:#2F5D3E;color:#fff;padding:5pt 6pt;font-size:9pt;text-align:left}
table.w td{border-bottom:1pt solid #E4DCC7;padding:8pt 6pt;vertical-align:top;line-height:1.35}
table.w td.d{width:92pt;font-weight:700}table.w td.d small{display:block;font-weight:400;color:#6A7059;font-size:9pt}
table.w td.h{width:34pt;text-align:center;font-weight:700}table.w td.ec{width:86pt;text-align:center;font-weight:700}
table.w td.ec small{display:block;font-weight:400;font-size:8pt;color:#6A7059}
table.w td.j div{margin:1pt 0}table.w td.ok{width:26pt}table.w td.ok span{display:inline-block;width:16pt;height:16pt;border:1.2pt solid #8A907F;border-radius:3pt}
.rt{font-size:9.5pt;color:#5F6A57;margin-top:8pt}
.big li{font-size:13pt;margin:7pt 0;line-height:1.35}
.how{border:0.75pt solid #E2DACA;border-radius:6pt;padding:7pt 10pt;margin:6pt 0;background:#fff;font-size:10.6pt}
.how b.t{display:block;color:#2F5D3E;font-size:12pt;margin-bottom:2pt}
</style>'''

def build_simple(L):
    ID = L == 'id'; T = lambda a, b: a if ID else b
    NAME = T('Panen Okt–Jan', 'Oct to Jan Harvest')
    FOOT = f'Sparmanik Farm · {NAME} 2026–27 · HST 0 = {fmt(H0, ID, False)}'
    full = build(L)
    P = [full[0]]  # same cover
    P.append(page(head(ID, T('SETIAP HARI', 'EVERY DAY'), T('Kerjakan setiap hari', 'Do this every day')) + f'''<ol class="big">
<li>{T('<b>06:30 cek tangki:</b> EC sesuai minggu ini, pH 5.8–6.3. Foto ke Boyd.', '<b>6:30 tank check:</b> EC as this week says, pH 5.8–6.3. Photo to Boyd.')}</li>
<li>{T('<b>Jalan semua baris pagi.</b> Polybag kering? Dripper mampet? Buah pecah/busuk → buang keluar.', '<b>Walk every row in the morning.</b> Dry bag? Blocked dripper? Split/rotten fruit → out.')}</li>
<li>{T('<b>Meter Krisbow 08 · 10 · 12 · 14.</b> Kelembapan kurang dari suhu × 2 → semprot daun air 5–10 menit (terakhir 15:30).', '<b>Krisbow meter 8 · 10 · 12 · 2.</b> Humidity under temperature × 2 → mist leaves 5–10 min (last 3:30 pm).')}</li>
<li>{T('<b>Kerjakan tugas di halaman minggu ini</b>, centang kotaknya.', '<b>Do the jobs on this week’s page</b>, tick the box.')}</li></ol>
<h2>{T('5 aturan — jangan pernah dilanggar', '5 rules — never break them')}</h2><ol class="rules big">
<li>{T('Boroni hanya di stok BUNGA. Asam borat, Fe-EDTA, asam sitrat dilarang.', 'Boroni only in the FLOWER stock. Boric acid, Fe-EDTA, citric acid banned.')}</li>
<li>{T('Silika hanya 5 kali (sampai HST 36).', 'Silicon only 5 times (to HST 36).')}</li>
<li>{T('Mulai HST 38: tidak ada air biasa atau siram tangan.', 'From HST 38: no plain water, no hand watering.')}</li>
<li>{T('Pakan MATANG sampai buah terakhir.', 'RIPEN feed to the last fruit.')}</li>
<li>{T('Drum A dan B tidak pernah dicampur.', 'Drums A and B are never mixed.')}</li></ol>
<div class="box r" style="font-size:12pt"><b>{T('Ragu? Berhenti dan telepon Boyd.', 'Not sure? Stop and call Boyd.')}</b></div>''', FOOT))
    HOW = T([
        ('Trichoderma', '10 g di ember 10 L air biasa, diamkan 15–30 menit. Siram polybag dulu, lalu 1 gelas (250 ml) di pangkal batang. Jangan lewat tangki.'),
        ('Silika (Kalsika)', 'Saklar MANUAL. 400 L air → jalan 3 menit → 1 sachet 100 g, aduk sampai bening → jalan 8 menit → tambah sampai 100 L → jalan 3 menit sampai habis → buat tangki pakan biasa. Hari itu siram hanya jam 14 dan 17.'),
        ('Tri-Pholate', '2 g per tangki semprot 16 L. Daun saja. Setelah jam 16.'),
        ('Semprot Calcinit', '80 g per tangki semprot 16 L. Pagi atau setelah jam 16. Daun saja.'),
        ('Penyerbukan', 'Jam 06–10. Bunga betina (ada bakal buah kecil) di ruas 9–12 → oles serbuk bunga jantan dari tanaman yang sama. Tulis tanggal di label.'),
        ('Sisakan 1 buah + pangkas', 'Simpan SATU buah terbaik per tanaman, buang yang lain. Potong pucuk di atas daun ke-25. Tidak ada buah → jangan pangkas.'),
        ('Panen', 'Jam 06–09:30. Matang = jaring penuh, bawah menguning, harum, lepas dengan putaran pelan. Potong gunting, taruh di teduh, timbang, catat. Buah lain jangan dipotong.')], [
        ('Trichoderma', '10 g in a 10 L bucket of plain water, stand 15–30 min. Water the bags first, then one cup (250 ml) at the stem base. Never through the tank.'),
        ('Silicon (Kalsika)', 'MANUAL switch. 400 L water → run 3 min → one 100 g sachet, stir until clear → run 8 min → top up to 100 L → run 3 min until empty → make the normal feed tank. That day water only at 2 and 5 pm.'),
        ('Tri-Pholate', '2 g per 16 L spray pack. Leaves only. After 4 pm.'),
        ('Calcinit spray', '80 g per 16 L spray pack. Early morning or after 4 pm. Leaves only.'),
        ('Pollinate', '6–10 am. Female flowers (tiny fruit behind the flower) on nodes 9–12 → dab pollen from a male flower of the same plant. Write the date on the tag.'),
        ('Keep 1 fruit + top', 'Keep the ONE best fruit per plant, remove the rest. Cut the tip above leaf 25. No fruit → don’t top.'),
        ('Harvest', '6–9:30 am. Ripe = full net, yellow underside, smells sweet, slips off with a gentle twist. Cut with scissors, into the shade, weigh, write it down. Don’t cut any other fruit.')])
    P.append(page(head(ID, T('CARA KERJA', 'HOW TO'), T('Tugas bertanda ★', 'Jobs marked ★')) + ''.join(f'<div class="how"><b class="t">★ {a}</b>{b}</div>' for a, b in HOW), FOOT))
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
            jt = ''.join(f'<div>{j}</div>' for j in sjobs(h, ID)) or f'<div style="color:#8A907F">{T("rutin saja", "routine only")}</div>'
            ecc = f'{ec}<small>' + (f'SOP {sop} · ' if h >= 0 else '') + f'{tm}</small>'
            dd = fmt(d, ID, False).rsplit(' ', 1)[0]
            small = (T('hari bibit ', 'seedling day ') + str((d - SOW).days)) if h < 0 else ''
            rows += f'<tr><td class="d">{dd}<small>{small}</small></td><td class="h">{h if h >= 0 else "—"}</td><td class="ec">{ecc}</td><td class="j">{jt}</td><td class="ok"><span></span></td></tr>'
        sub = f'{fmt(days[0], ID, False)} – {fmt(days[-1], ID, False)}'
        P.append(f'<div class="pg"><div class="wk"><div><div class="k">{NAME.upper()} · {sub}</div><h1>{T("Minggu", "Week")} {w}</h1></div><div class="bd" style="background:{col}">{nm}</div></div>'
                 f'<table class="w"><tr><th>{T("Hari", "Day")}</th><th>HST</th><th>EC</th><th>{T("Kerjakan hari ini", "Today’s jobs")}</th><th>✓</th></tr>{rows}</table>'
                 f'<div class="rt">★ = {T("lihat Cara kerja (hal. 3)", "see How to (page 3)")} · {T("setiap hari juga: hal. 2", "every day as well: page 2")} · {T("pakan: 5 L Stok A + 5 L Stok B per 1.000 L (bibit: lebih encer)", "feed: 5 L Stock A + 5 L Stock B per 1,000 L (seedlings: weaker)")}</div><div class="foot">{FOOT}</div></div>')
        start += D.timedelta(7)
    P.append(full[6])   # drum recipes
    P.append(full[-1])  # harvest log
    return P

if __name__ == '__main__':
    for L in ('id', 'en'):
        P = build_simple(L)
        html = '<!doctype html><html><head><meta charset="utf-8"><title>Sparmanik crop booklet</title>' + CSS + EXTRA_CSS + SIMPLE_CSS + '</head><body>' + ''.join(P) + '</body></html>'
        open(os.path.join(ROOT, 'build', f'crop_simple_{L}.html'), 'w', encoding='utf-8').write(html)
    print('simple booklet', len(P), 'pages · HST 0 =', H0)
