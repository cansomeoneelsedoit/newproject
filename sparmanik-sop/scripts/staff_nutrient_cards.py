import html
CSS='''<style>
@page{size:A4;margin:9mm}
:root{--ink:#16211C;--muted:#4E5D57;--rule:#C2CEC8;--haz:#C7431A;--hazw:#FCE9E1;--safe:#186345;--safew:#E3EFE9;--a:#E8792B;--aw:#FDEBDD;--b:#2B6CB0;--bw:#E1ECF8}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font-family:"DejaVu Sans","Liberation Sans",Arial,sans-serif;font-size:11.5pt;line-height:1.25}
.pg{break-after:page;height:278mm;display:flex;flex-direction:column;gap:2.4mm}.pg:last-child{break-after:auto}
h1{font-size:21pt;margin:0;line-height:1.05}.sub{font-size:11.5pt;color:var(--muted)}
.chip{display:inline-block;background:var(--ink);color:#fff;font-weight:700;padding:1mm 3mm;font-size:13pt}
.choose{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3mm}
.ch{border:2.5px solid var(--ink);padding:2.5mm 3mm;text-align:center}
.ch.n{border-color:var(--safe);background:var(--safew)}
.ch b{display:block;font-size:17pt}.ch span{font-size:11pt;color:var(--muted)}
table{width:100%;border-collapse:collapse}
th,td{border:1.5px solid var(--rule);padding:1.1mm 2.5mm;text-align:right;font-size:12pt}
th{background:#F1F4F2;font-size:12pt}
td:first-child,th:first-child{text-align:left}
td.n{background:var(--safew);font-weight:700}
tr.a td:first-child{border-left:6px solid var(--a)} tr.b td:first-child{border-left:6px solid var(--b)}
tr.chk td{font-weight:700;background:#FAFAF7}
.drum{font-weight:700;font-size:13pt;margin-top:1mm}
.box{border:2.5px solid var(--ink);padding:2mm 4mm}
.box b.h{display:block;font-size:14pt;margin-bottom:1mm}
.red{border-color:var(--haz);background:var(--hazw)}.red b.h{color:var(--haz)}
ol,ul{margin:0;padding-left:6mm}li{margin:.4mm 0}
.foot{margin-top:auto;text-align:center;font-weight:700;font-size:13pt;border-top:3px solid var(--ink);padding-top:2mm}
</style>'''
STAGES={
 'grow':dict(id='S1 GROW',hst='HST 0 – 24',ec='2100',
   A=[('YaraTera Calcinit',870),('Krista K Plus',345)],bor=None,
   B=[('Krista MKP',220),('Meroke MAG-S',570),('Meroke Vitaflex',20),('MIKRO Fe 6% EDDHA',5)],
   sop_id='<b>Tanpa SOP</b> di tahap ini',sop_en='<b>No SOP</b> this stage'),
 'flower':dict(id='S2 FLOWER',hst='HST 25 – 41',ec='2400',
   A=[('YaraTera Calcinit',945),('Krista K Plus',115)],bor=80,
   B=[('Krista MKP',230),('Meroke MAG-S',605),('Meroke Vitaflex',20),('MIKRO Fe 6% EDDHA',5)],
   sop_id='SOP <b>310 g</b> setiap tangki',sop_en='SOP <b>310 g</b> every tank'),
 'sizing':dict(id='S3 SIZING',hst='HST 42 – 59',ec='2550',
   A=[('YaraTera Calcinit',945)],bor=None,
   B=[('Krista MKP',210),('Meroke MAG-S',625),('Meroke Vitaflex',20),('MIKRO Fe 6% EDDHA',5)],
   sop_id='SOP <b>535 g</b> setiap tangki',sop_en='SOP <b>535 g</b> every tank'),
 'ripen':dict(id='S4 RIPEN',hst='HST 60 – panen',hst_en='HST 60 – harvest',ec='2700',
   A=[('YaraTera Calcinit',895)],bor=None,
   B=[('Krista MKP',185),('Meroke MAG-S',625),('Meroke Vitaflex',20),('MIKRO Fe 6% EDDHA',5)],
   sop_id='SOP <b>645 g</b> setiap tangki',sop_en='SOP <b>645 g</b> every tank'),
}
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANG=['id']
def g(x):
    if x<1000: return f'{x} g'
    k=f'{x/1000:.3f}'.rstrip('0').rstrip('.')
    return (k.replace('.',',') if LANG[0]=='id' else k)+' kg'
def page(st,L):
    LANG[0]=L
    s=STAGES[st]; ID=L=='id'
    T=lambda a,b:a if ID else b
    rows=''
    rows+=f'<tr><th>{T("Produk","Product")}</th><th>{T("1 hari","1 day")}<br><small>{T("ember 5 L","5 L bucket")}</small></th><th style="background:var(--safew)">{T("5 hari","5 days")}<br><small>{T("drum 25 L","25 L drum")}</small></th><th>{T("10 hari","10 days")}<br><small>{T("drum 50 L","50 L drum")}</small></th></tr>'
    rows+=f'<tr><td colspan="4" class="drum" style="background:var(--aw)">DRUM A · {T("ORANYE","ORANGE")}</td></tr>'
    tot=0
    for n,v in s['A']:
        rows+=f'<tr class="a"><td>{n}</td><td>{g(v)}</td><td class="n">{g(v*5)}</td><td>{g(v*10)}</td></tr>'; tot+=v
    b=s['bor']
    if b:
        note=T('kantong dari Boyd','bag from Boyd')
        rows+=f'<tr class="a"><td>Karate Plus Boroni <small>({note})</small></td><td>{g(b)}</td><td class="n">{g(b*5)}</td><td>{g(b*10)}</td></tr>'; tot+=b
    rows+=f'<tr class="a chk"><td>{T("Berat cek A","A check weight")}</td><td>{g(tot)}</td><td class="n">{g(tot*5)}</td><td>{g(tot*10)}</td></tr>'
    rows+=f'<tr><td colspan="4" class="drum" style="background:var(--bw)">DRUM B · {T("BIRU","BLUE")}</td></tr>'
    tot=0
    for n,v in s['B']:
        rows+=f'<tr class="b"><td>{n}</td><td>{g(v)}</td><td class="n">{g(v*5)}</td><td>{g(v*10)}</td></tr>'; tot+=v
    rows+=f'<tr class="b chk"><td>{T("Berat cek B","B check weight")}</td><td>{g(tot)}</td><td class="n">{g(tot*5)}</td><td>{g(tot*10)}</td></tr>'
    sop=s['sop_id'] if ID else s['sop_en']
    return f'''<div class="pg">
<div><h1>{T("CAMPURAN NUTRISI","NUTRIENT MIX")} <span class="chip">{s['id']}</span></h1><div class="sub">Sparmanik 4.0 · {s['hst'] if ID else s.get('hst_en',s['hst'])} · EC {s['ec']} · pH {T('5,8 – 6,3','5.8 – 6.3')}</div></div>
<div class="choose">
<div class="ch"><b>{T("1 HARI","1 DAY")}</b>{T("ember A 5 L + ember B 5 L","bucket A 5 L + bucket B 5 L")}<br><span>{T("= 1 tangki · tuang semua","= 1 tank · pour it all in")}</span></div>
<div class="ch n"><b>{T("5 HARI","5 DAYS")}</b>{T("drum A 25 L + drum B 25 L","drum A 25 L + drum B 25 L")}<br><span>{T("= 5 tangki · BIASA","= 5 tanks · NORMAL")}</span></div>
<div class="ch"><b>{T("10 HARI","10 DAYS")}</b>{T("drum A 50 L + drum B 50 L","drum A 50 L + drum B 50 L")}<br><span>{T("= 10 tangki","= 10 tanks")}</span></div>
</div>
<table>{rows}</table>
<div class="box"><b class="h">{T("CARA BUAT DRUM / EMBER","MAKING THE DRUM / BUCKET")}</b><ol>
<li>{T("Isi air hangat setengah.","Half fill with warm water.")}</li>
<li>{T("1 produk → aduk sampai <b>bening</b> → produk berikutnya.","1 product → stir until <b>clear</b> → next product.")}</li>
<li>{T("Penuhi sampai garis <b>5 / 25 / 50 L</b>. Tulis label: A/B · tahap · hari · tanggal.","Top up to the <b>5 / 25 / 50 L</b> line. Label: A/B · stage · days · date.")}</li>
</ol></div>
<div class="box"><b class="h">{T("CARA BUAT TANGKI 1.000 L","MAKING THE 1,000 L TANK")}</b><ol>
<li>{T("Air <b>900 L</b>.","Water to <b>900 L</b>.")}</li>
<li>{T("<b>5 L A</b> → aduk → <b>5 L B</b> → aduk. (1 hari: tuang <b>seluruh</b> ember A, lalu ember B.)","<b>5 L A</b> → stir → <b>5 L B</b> → stir. (1 day: pour the <b>whole</b> bucket A, then bucket B.)")}</li>
<li>{sop}{"" if st=="grow" else " "+T("(larutkan dulu di ember).","(dissolve in a bucket first).")}</li>
<li>{T("Penuhi 1.000 L → mixer 2 menit → cek EC + pH → foto ke Boyd → baru pompa nyala.","Top up to 1,000 L → mixer 2 min → check EC + pH → photo to Boyd → then pump on.")}</li>
</ol></div>
<div class="box red"><b class="h">{T("JANGAN ✕","NEVER ✕")}</b>
{T("A + B dicampur · sendok sama untuk A dan B · SOP atau silika di drum · Boroni tanpa Boyd · <b>asam borat</b>","A + B mixed · same scoop for A and B · SOP or silica in a drum · Boroni without Boyd · <b>boric acid</b>")}<br>
{T("Di bawah 1 kg → <b>timbangan dapur</b> (1 g). Pakai drum dalam 2 minggu.","Under 1 kg → <b>kitchen scale</b> (1 g). Use a drum within 2 weeks.")}</div>
<div class="foot">{T("EC salah? Pompa JANGAN nyala → TELEPON BOYD","Wrong EC? Pump stays OFF → CALL BOYD")}</div>
</div>'''
for L in ['id','en']:
    body=''.join(page(x,L) for x in ['grow','flower','sizing','ripen'])
    open(os.path.join(ROOT,'build',f'batch_{L}.html'),'w',encoding='utf-8').write(f'<!doctype html><html lang="{L}"><head><meta charset="utf-8"><title>Sparmanik Nutrient Batches</title>{CSS}</head><body>{body}</body></html>')
