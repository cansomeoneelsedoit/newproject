import os,base64
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def img(name): return 'data:image/jpeg;base64,'+base64.b64encode(open(os.path.join(ROOT,'assets','products',name+'.jpg'),'rb').read()).decode()
CSS='''<style>
@page{size:595pt 842pt;margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:"Liberation Sans",Arial,sans-serif;color:#26331f;font-size:9.6pt;line-height:1.42}
.pg{width:595pt;height:842pt;position:relative;break-after:page;background:#fff;overflow:hidden}
.pg:last-child{break-after:auto}
.card{position:absolute;left:34pt;top:34pt;width:527pt;background:#FFFDF8;border:0.75pt solid #DDDDDD;border-radius:6pt;padding:26pt 29pt 22pt}
.kick{font-size:8.6pt;letter-spacing:2.6pt;color:#2E7DA0;font-weight:700;text-transform:uppercase}
h1{font-family:"Liberation Serif",serif;font-weight:700;font-size:16.5pt;color:#2F5D3E;margin:5pt 0 2pt}
.sub{font-size:8.6pt;color:#6A7059}
.rule{width:45pt;height:2.25pt;background:#D99A2B;margin:8pt 0 12pt}
h2{font-family:"Liberation Serif",serif;font-weight:700;font-size:12.5pt;color:#22301E;margin:12pt 0 5pt}
p{margin:3pt 0 6pt}
.call{border-radius:5pt;padding:8pt 11pt;margin:8pt 0}
.y{background:#FBF0D6;border:0.75pt solid #ECD8A6}.y b.t{color:#9A6B0F}
.r{background:#FBE6E3;border:0.75pt solid #F0C3BC}.r b.t{color:#C0392B}
.g{background:#E8F1E6;border:0.75pt solid #C4D9C0}.g b.t{color:#2F6B3E}
b.t{display:block;font-size:10.5pt;margin-bottom:2pt}
table{width:100%;border-collapse:separate;border-spacing:0;margin:5pt 0 8pt;font-size:9pt;border:0.75pt solid #E4DCC7;border-radius:5pt;overflow:hidden}
th{background:#2F5D3E;color:#fff;text-align:left;padding:5pt 7pt;font-size:8.4pt}
td{padding:4.5pt 7pt;border-top:0.75pt solid #E4DCC7;vertical-align:top}
td.n,th.n{text-align:right;white-space:nowrap}
tr.chk td{font-weight:700;background:#F6F1E3}
tr.A td:first-child{border-left:4pt solid #D9782B} tr.B td:first-child{border-left:4pt solid #2E7DA0}
td.five{background:#EEF4EC;font-weight:700}
ol.num{list-style:none;padding:0;margin:4pt 0;counter-reset:n}
ol.num li{counter-increment:n;position:relative;padding:4pt 0 6pt 26pt;border-bottom:0.75pt solid #EFE8D6}
ol.num li:before{content:counter(n);position:absolute;left:0;top:3pt;width:16pt;height:16pt;border-radius:50%;background:#2E7DA0;color:#fff;font-weight:700;font-size:8.4pt;text-align:center;line-height:16pt}
ul{margin:3pt 0 6pt;padding-left:13pt}li{margin:2pt 0}
.badge{display:inline-block;border-radius:3pt;padding:1pt 5pt;font-size:7.4pt;font-weight:700;color:#fff}
.grow{background:#2F5D3E}.flower{background:#C99A2B}.sizing{background:#D9782B}.ripen{background:#8A5A2B}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7pt;margin:6pt 0 8pt}
.st{border:0.75pt solid #E4DCC7;border-radius:5pt;padding:7pt;text-align:center;background:#fff}
.st b{display:block;font-family:"Liberation Serif",serif;font-size:15pt;color:#2F5D3E}
.st span{font-size:7.6pt;color:#6A7059;text-transform:uppercase;letter-spacing:.8pt}
.st.on{background:#EEF4EC;border-color:#9DC09A}
.pn{position:absolute;bottom:11pt;width:100%;text-align:center;font-size:9pt;color:#6B7059}
.prods{display:grid;grid-template-columns:repeat(2,1fr);gap:7pt}
.pc{border:0.75pt solid #E4DCC7;border-radius:5pt;background:#fff;display:grid;grid-template-columns:62pt 1fr;overflow:hidden}
.pc .ph{background:#F4F1E8;display:flex;align-items:center;justify-content:center;padding:4pt}
.pc .ph img{max-width:56pt;max-height:70pt}
.pc .tx{padding:5pt 7pt 6pt;font-size:8pt;line-height:1.32}
.pc .tg{font-size:6.6pt;letter-spacing:1pt;font-weight:700;color:#fff;padding:1.5pt 4pt;border-radius:2pt;display:inline-block;margin-bottom:2pt}
.tA{background:#D9782B}.tB{background:#2E7DA0}.tT{background:#5A6B60}.tD{background:#2F5D3E}
.pc b.n{display:block;font-family:'Liberation Serif',serif;font-size:10pt;color:#2F5D3E}
.pc .an{color:#6A7059;font-size:7.2pt}
.pc .w{color:#C0392B;font-weight:700}
.hero{background:#2F5D3E;color:#fff;border-radius:6pt;padding:14pt 16pt;margin-bottom:10pt}
.hero .kick{color:#E8B84B}.hero h1{color:#fff;margin:3pt 0 0}
</style>'''
pages=[]
def page(num,kick,title,sub,body):
    pn=f'<div class="pn">{num}</div>' if num else ''
    pages.append(f'<div class="pg"><div class="card"><div class="kick">{kick}</div><h1>{title}</h1><div class="sub">{sub}</div><div class="rule"></div>{body}</div>{pn}</div>')

page('','SPARMANIK 4.0 · 6 OCT 2026','What’s new in Sparmanik 4.0','This is book v3.8 with the lessons of the 2026 crop built in. Where the two disagree, 4.0 follows 2026.',
'''<table><tr><th>#</th><th>Topic</th><th>v3.8 said</th><th>Rule in 4.0</th><th>Why (2026)</th></tr>
<tr><td><b>D1</b></td><td>Silicon drench</td><td>Weekly HST 8–57</td><td><b>HST 8, 15, 22, 29, 36 only</b></td><td>Drench at HST 50 → fruit split next day</td></tr>
<tr><td><b>D2</b></td><td>Finish</td><td>Plain water from HST 72</td><td><b>Ripen feed to the last fruit</b></td><td>Brix 14.6–19 reached on Ripen feed</td></tr>
<tr><td><b>D3</b></td><td>Boroni in Sizing</td><td>800 g, optional</td><td><b>None — Flower stock only</b></td><td>Boron damage this crop</td></tr>
<tr><td><b>D4</b></td><td>Leaf sprays</td><td>Ca foliar to HST 55</td><td><b>Ca HST 35–44 · none HST 45–59 · Ripen: MKP / Calcinit alternate days</b></td><td>Netting forms HST 45–60</td></tr>
<tr><td><b>D5</b></td><td>Stock batch</td><td>50 L (10 days)</td><td><b>25 L (5 days) normal · 1 & 10 days too</b></td><td>Less waste when plans change</td></tr></table>
<div class="call r"><b class="t">Three golden rules</b><ol style="margin:2pt 0 0 14pt;padding:0">
<li><b>Boric acid is banned.</b> Boron only from Karate Plus Boroni, in Boyd’s pre-weighed kit. Boric acid deformed 19% of the 2026 fruit.</li>
<li><b>After fruit set, no plain water.</b> No glass watering, no plain-water tank, no silicon. Each split fruit.</li>
<li><b>Humidity ≥ temperature × 2.</b> Dry air shuts the leaves, stops sugar and splits fruit (page 56).</li></ol></div>
<div class="call y"><b class="t">Iron: Fe-EDDHA only, never Fe-EDTA</b>The 30 Jul 2026 Grow stock used Fe-EDTA 13%. It stops feeding iron above pH 6.5; our run-off was 7.0–7.8 → pale new leaves. Every Stock B uses MIKRO Fe 6% EDDHA, 50 g per 50 L.</div>
<h2>Where the book changed</h2>
<table><tr><th>Pages</th><th>Change</th></tr>
<tr><td>10 · 27 · 42</td><td>No Boroni in Sizing stock</td></tr>
<tr><td>12 · 13 · 19 · 26 · 28</td><td>Silicon stops at HST 36</td></tr>
<tr><td>13 · 29 · 31 · 34–36</td><td>Ripen feed to the last fruit, no plain-water finish</td></tr>
<tr><td>26 · 34–36</td><td>Calcium leaf spray HST 35–44 only</td></tr><tr><td>9 · 11 · 12 · 13</td><td>v4.6 timings: Trichoderma HST 0, 17, 38, 59 · Tri-Pholate HST 20, 28, 35</td></tr>
<tr><td><b>50 – 62 (new)</b></td><td>Product photo cards · cost per crop · 1 / 5 / 10-day batches · humidity · harvest & grading · growth checks · run-off & call Boyd · emergency flush · 2026 lessons · checklist</td></tr></table>''')

def g(x):
    if x<1000: return f'{x} g'
    return f'{x/1000:.3f}'.rstrip('0').rstrip('.')+' kg'
def rec(name,cls,ec,sop,A,B):
    def rows(items,lab):
        s=''; t=0
        for n,v in items:
            s+=f'<tr class="{lab}"><td>{n}</td><td class="n">{g(v)}</td><td class="n five">{g(v*5)}</td><td class="n">{g(v*10)}</td></tr>'; t+=v
        s+=f'<tr class="chk {lab}"><td>Check weight {lab}</td><td class="n">{g(t)}</td><td class="n">{g(t*5)}</td><td class="n">{g(t*10)}</td></tr>'
        return s
    return f'''<h2><span class="badge {cls}">{name}</span> &nbsp;EC {ec} · {sop}</h2>
<table><tr><th>Product</th><th class="n">1 day · 5 L bucket</th><th class="n">5 days · 25 L</th><th class="n">10 days · 50 L</th></tr>
<tr><td colspan="4" style="background:#FDEBDD;font-weight:700;font-size:8pt">STOCK A · orange</td></tr>{rows(A,'A')}
<tr><td colspan="4" style="background:#E1ECF8;font-weight:700;font-size:8pt">STOCK B · blue</td></tr>{rows(B,'B')}</table>'''
B4=lambda m,s: [("Krista MKP",m),("Meroke MAG-S",s),("Meroke Vitaflex",20),("MIKRO Fe 6% EDDHA",5)]
page(53,'NUTRITION · 4.0 · BATCH SIZE','Make 1, 5 or 10 days of stock','Same recipe, same strength — only the amount changes. Every 1,000 L tank still gets 5 L A + 5 L B.',
'''<div class="stats"><div class="st"><b>1 day</b><span>5 L bucket A + B · 1 tank</span></div><div class="st on"><b>5 days</b><span>25 L drums · normal</span></div><div class="st"><b>10 days</b><span>50 L drums · 10 tanks</span></div></div>
<table><tr><th>Batch</th><th>Use it when</th></tr><tr><td>1 day</td><td>Stage-change day · testing a fix · last days of the crop. Pour each <b>whole</b> bucket into the tank.</td></tr>
<tr><td><b>5 days</b></td><td><b>Every week.</b> Fresh stock, little waste if the plan changes.</td></tr><tr><td>10 days</td><td>Only with 10+ days left in the stage and no change planned.</td></tr></table>'''
+rec('S1 GROW','grow','2.1','no SOP',[("YaraTera Calcinit",870),("Krista K Plus",345)],B4(220,570)))
page(54,'NUTRITION · 4.0 · BATCH SIZE','Flower & Sizing batches','Under 1 kg → kitchen scale reading to 1 g. Same mixing method as page 15.',
rec('S2 FLOWER','flower','2.4','SOP 310 g / tank',[("YaraTera Calcinit",945),("Karate Plus Boroni (Boyd’s kit)",80),("Krista K Plus",115)],B4(230,605))
+rec('S3 SIZING','sizing','2.55','SOP 535 g / tank · no Boroni',[("YaraTera Calcinit",945)],B4(210,625)))
page(55,'NUTRITION · 4.0 · BATCH SIZE','Ripen batch & kits','Ripen has its own drums (v3.8 page 30) — not Sizing drums with extra SOP.',
rec('S4 RIPEN','ripen','2.7','SOP 645 g / tank',[("YaraTera Calcinit",895)],B4(185,625))
+'''<div class="call y"><b class="t">Best practice: pre-weighed kits</b>Boyd weighs one bag per drum per batch, labelled e.g. “Ripen · A · 5 days”. Staff tip the bag in, top up to the 25 L line and stir until clear. Boroni is only ever in a kit.</div>
<div class="call r"><b class="t">Small amounts matter</b>In a 1-day bucket Fe-EDDHA is 5 g and Vitaflex 20 g — 1 g wrong is 20% wrong. Use the kitchen scale, or a kit from Boyd.</div>''')

exec(open(os.path.join(ROOT,'scripts','new_pages_extra.py'),encoding='utf-8').read())
cl=''.join(f'<tr><td>{t} °C</td><td class="n"><b>{lo}%</b></td><td class="n">{hi}%</td></tr>' for t,lo,hi in [(28,56,79),(30,60,81),(32,64,83),(34,68,85),(36,72,87)])
page(56,'CLIMATE · 4.0','Humidity ≥ temperature × 2','v3.8 planned for a humid house. September 2026 showed the other risk: hot, dry afternoons.',
f'''<p>Below this line the air is too dry: leaves close, stop making sugar and pull water so hard that fruit splits. The rule keeps VPD at about 0.8–1.6 kPa.</p>
<table><tr><th>Temperature</th><th class="n">Minimum humidity — below: mist leaves</th><th class="n">Too wet — above: stop, open vents</th></tr>{cl}</table>
<h2>Every day with the Krisbow meter</h2>
<ol class="num"><li>Read and photograph it at <b>08:00 · 10:00 · 12:00 · 14:00</b>. The 12:00–14:00 readings matter most.</li>
<li>Too dry → mist the <b>leaves only</b> with the spray pack, 5–10 minutes. Check again after 30 minutes. Never the fruit, never wet the bags.</li>
<li>Over 80% → stop misting, all vents open, fans on.</li>
<li>Last misting <b>15:30</b>, so leaves are dry before night.</li>
<li>At night open vents and doors where possible: cool nights keep sugar in the fruit.</li></ol>
<div class="call g"><b class="t">2026 readings</b>21 Sep: 34.8 °C at 59% — VPD about 2.3 kPa, far too dry; fruit had split the day before.<br>25 Sep 10:30: 31.7 °C at 71.8% — VPD about 1.3 kPa, ideal.</div>''')

page(57,'HARVEST · 4.0','Rolling harvest & grading','Pick only ripe fruit every morning; leave the rest on the Ripen feed to sweeten.',
'''<div class="stats"><div class="st"><b>Brix 15+</b><span>pass</span></div><div class="st"><b>1.8–2.2 kg</b><span>target weight</span></div><div class="st"><b>06:00–09:30</b><span>pick while cool</span></div></div>
<h2>Every morning — walk every row</h2>
<table><tr><th>Fruit</th><th>Action</th></tr>
<tr><td>Split or rotten</td><td>Cut off → sack → <b>out of the greenhouse</b>. Count.</td></tr>
<tr><td>Ripe: full net · ground spot yellow · aroma · slips with a gentle twist</td><td><b>Pick</b> with scissors, short T-stalk. Shade, one layer. Count + weigh.</td></tr>
<tr><td>Everything else</td><td><b>Don’t cut.</b> Leave it until it is ripe.</td></tr></table>
<div class="call y"><b class="t">Brix test without wasting fruit</b>From HST 68 test fruit that <b>split that day</b>, flesh still clean. Juice from mid-flesh, not the seed cavity. Never cut a good fruit to test. Old splits and brown flesh read wrong.</div>
<h2>Grading A–D</h2>
<table><tr><th>Grade</th><th>Weight</th><th>Brix</th><th>Skin</th><th>Goes to</th></tr>
<tr><td><b>A</b></td><td>1.8 – 2.2 kg</td><td>15+</td><td>Clean, full net</td><td>Premium</td></tr>
<tr><td><b>B</b></td><td>1.2 – 1.8 or over 2.2 kg</td><td>14+</td><td>Clean or minor marks</td><td>Second grade</td></tr>
<tr><td><b>C</b></td><td>Under 1.2 kg</td><td>13+</td><td>Marks, sound flesh</td><td>Local sale</td></tr>
<tr><td><b>D</b></td><td>—</td><td>—</td><td>Split, rotten, brown flesh, fly-stung</td><td>Destroy outside</td></tr></table>
<p>Don’t wash. Log each fruit against its plant ID. Tank and timer stay on Ripen until the last fruit is picked.</p>''')

page(61,'PROBLEMS · 2026 LESSONS','What went wrong in 2026 — and the fix','Add these to the picture guide on page 47.',
'''<table><tr><th>What you see</th><th>Cause in 2026</th><th>Do</th><th>Call Boyd when</th></tr>
<tr><td><b>Many fresh wet splits at once</b></td><td>Plain-water drench, glass watering, dry air</td><td>Remove split fruit; check nobody added water; mist leaves</td><td>&gt; 50 cracks, or 2 days running</td></tr>
<tr><td><b>Old dry corky cracks, brown patches</b></td><td>Old boron damage</td><td>Leave dry ones; cut wet or smelly ones</td><td>Brown flesh in sound fruit</td></tr>
<tr><td><b>One bag wilting, coir dry inside</b></td><td>Blocked dripper / water-repellent coir</td><td>Soak that bag 30–60 min in plain water, clear the dripper</td><td>Not recovered next morning, or 3+ bags</td></tr>
<tr><td><b>New leaves pale, green veins</b></td><td>Fe-EDTA at high run-off pH</td><td>Run-off pH weekly; Fe-EDDHA only</td><td>Run-off pH over 6.8</td></tr>
<tr><td><b>Deformed fruit, dead flowers</b></td><td>Boric acid instead of Boroni</td><td>Keep pollinating new flowers; check the sack in Stock A</td><td>Always, same day</td></tr>
<tr><td><b>Whole house wilting at midday</b></td><td>34.8 °C, 59% humidity</td><td>Mist leaves, shade, vents (page 56)</td><td>Still wilting at 16:00</td></tr>
<tr><td><b>Ripe-looking fruit, Brix under 12</b></td><td>Not ripe, or damaged</td><td>Leave that row longer</td><td>Main harvest within 3 days</td></tr></table>
<div class="call r"><b class="t">Never (added in 4.0)</b><ul style="margin:2pt 0 0">
<li>Boric acid or Fe-EDTA anywhere on the farm.</li>
<li>Plain water, glass watering or silicon after fruit set (HST 38).</li>
<li>MKP and Calcinit in the same spray pack. Leaf sprays HST 45–59.</li>
<li>Cutting a good fruit to test Brix.</li></ul></div>''')

page(62,'RECORD · SEASON 2026','2026 crop & the next transplant','Transplant 30 Jul 2026 (HST 0) · main harvest 3 Oct (HST 65).',
'''<div class="stats" style="grid-template-columns:repeat(4,1fr)"><div class="st"><b>19.0</b><span>White Kirin</span></div><div class="st"><b>17.4</b><span>Australia F3</span></div><div class="st"><b>15.5</b><span>Manis Candy</span></div><div class="st"><b>14.6</b><span>Yellow Kirin</span></div></div>
<p>Cracking stopped once EC was held steady with no plain water. Fruit stayed small (0.7–1.5 kg) from the boric acid, the boron flush, Fe-EDTA iron lock-up, heat and a Sizing switch 8 days late.</p>
<table><tr><th>Date</th><th>HST</th><th>What happened</th></tr>
<tr><td>3 Oct</td><td>65</td><td>Main harvest; rolling pick before and after</td></tr>
<tr><td>29 Sep</td><td>61</td><td>Ripen EC 2700, MKP spray, glass watering stopped</td></tr>
<tr><td>25 Sep</td><td>57</td><td>Silicon cancelled; tank 2505 / pH 5.8</td></tr>
<tr><td>20–21 Sep</td><td>52–53</td><td>Splitting after the 19 Sep silicon; a Kirin row lost; 34.8 °C / 59%</td></tr>
<tr><td>19 Sep</td><td>51</td><td>514 fruit weighed, average 786 g</td></tr>
<tr><td>18 Sep</td><td>50</td><td>Sizing EC 2550 started (8 days late)</td></tr>
<tr><td>9 Sep</td><td>41</td><td>Boron flush, back to Flower 2400 without boron</td></tr>
<tr><td>before 8 Sep</td><td>—</td><td>Boric acid used instead of Boroni</td></tr>
<tr><td>30 Jul</td><td>0</td><td>Transplant; Grow stock made with Fe-EDTA 13%</td></tr></table>
<h2>Before the next transplant</h2>
<ul style="list-style:'☐  '">
<li>Staff walked through the 4.0 changes (front page)</li><li>Boric acid and Fe-EDTA removed from the farm</li>
<li>Raw water and feed lab-tested</li><li>Coir washed, rested and re-buffered (page 6)</li>
<li>Pre-weighed 5-day kits for Grow and Flower ready</li><li>Tri-Pholate, Tricoderma+ and Kalsika in stock (page 52)</li><li>Krisbow, refractometer, EC and pH pens calibrated</li>
<li>Fruit-fly and sticky traps in stock</li></ul>''')
pages.sort(key=lambda h: 0 if 'class="pn"' not in h else int(h.split('class="pn">')[1].split('<')[0]))
open(os.path.join(ROOT,'build','new_pages.html'),'w',encoding='utf-8').write(f'<!doctype html><html><head><meta charset="utf-8">{CSS}</head><body>{"".join(pages)}</body></html>')
print(len(pages))
