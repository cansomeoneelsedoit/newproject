# Extra 4.0 pages: product photo cards, cost per crop, growth checks, run-off & call Boyd, emergency flush.
# Executed inside new_pages.py (uses page(), img(), CSS helpers from there).

def pc(tag, tcls, photo, name, an, desc, pack, warn=''):
    w = '<div class="w">%s</div>' % warn if warn else ''
    return ('<div class="pc"><div class="ph"><img src="%s"></div><div class="tx"><span class="tg %s">%s</span>'
            '<b class="n">%s</b><div class="an">%s</div>%s<div class="an">%s</div>%s</div></div>') % (img(photo), tcls, tag, name, an, desc, pack, w)

P1 = [
 pc('BAG A → DRUM A','tA','calcinit','YaraTera Calcinit','calcium nitrate · 15.5% N · 19% Ca','<b>RED pattern.</b> White prills. Pulls water from the air and sets hard — double-bag and seal.','25 kg sack · Rp 14,800/kg'),
 pc('BAG A → DRUM A','tA','kplus','YaraTera Krista K Plus','potassium nitrate · 13.7% N · 38.4% K','<b>GREEN pattern.</b> Says KRISTA K PLUS. Grow and Flower only.','25 kg sack · Rp 46,000/kg','Not Krista MKP — that one is Drum B.'),
 pc('BAG A → DRUM A','tA','boroni','Meroke Karate Plus Boroni','calcium nitrate · 15.5% N · 26% CaO · 0.3% B','<b>ORANGE sack</b>, sunburst — the only orange bag. 4.0: <b>Flower stock only</b>, in Boyd’s kit.','25 kg sack · Rp 13,200/kg','Never boric acid.'),
 pc('BAG B → DRUM B','tB','mkp','YaraTera Krista MKP','mono potassium phosphate · 22.7% P · 28.2% K','<b>NAVY BLUE pattern.</b> Says KRISTA MKP.','25 kg sack · Rp 63,000/kg','Not Krista K Plus — that one is Drum A.'),
 pc('BAG B → DRUM B','tB','mags','Meroke MAG-S','magnesium sulphate · 9.6% Mg · 13% S','<b>PURPLE droplet.</b> White crystals. Biggest weight in Drum B.','1 kg packs · Rp 16,000/kg','Not SOP — SOP goes in the tank.'),
 pc('BAG B → DRUM B','tB','vitaflex','Meroke VITAFLEX','micros · Fe Mn Zn Cu B Mo','<b>PINK droplet.</b> Only 200 g per 50 L drum — kitchen scale.','500 g pack · Rp 200,000/kg'),
 pc('BAG B → DRUM B','tB','fe','Meroke MIKRO Fe 6%','EDDHA-Fe iron chelate','<b>DARK MAROON droplet.</b> Only 50 g per 50 L drum — kitchen scale.','500 g pack · Rp 273,904/kg','Must be EDDHA — never Fe-EDTA.'),
]
P2 = [
 pc('STRAIGHT INTO THE TANK','tT','sop','Meroke SOP','sulphate of potash · 43% K · 18% S','<b>Purple panel, red bird.</b> Dissolve in warm water first. Flower 310 g · Sizing 535 g · Ripen 645 g per tank.','1 kg packs · Rp 25,000/kg','Never in a drum. No SOP at Grow.'),
 pc('DRENCH · OWN PULSE','tD','kalsika','Kalsika','potassium silicate · 51.6% SiO₂','<b>BLUE sachet, 100 g.</b> One sachet in 300 L plain water. 4.0: HST 8, 15, 22, 29, 36 only.','100 g sachet · Rp 409,866/kg','Never after HST 36. 2 days from Trichoderma.'),
 pc('DRENCH · BY CUP','tD','tricho','Tricoderma+ (Ruminesia)','Trichoderma harzianum + Bacillus, Azotobacter, Pseudomonas','<b>Silver foil, yellow fruit label.</b> 1 g per litre, 250 ml cup per bag. HST 0, 17, 38, 59.','1 kg pack · Rp 80,485/kg','Never in the drippers or feed tank.'),
 pc('FOLIAR · LEAF SPRAY','tD','tripholate','YaraVita Tri-Pholate','foliar micronutrient','<b>Small white sachet, GREEN pattern.</b> 0.125 g per litre (2 g per 16 L pack). HST 20, 28, 35, after 4 pm.','25 g pack · Rp 1,491,600/kg','Stop after HST 35 — marks the net.'),
]
page(50,'KNOW YOUR PRODUCTS · 1 OF 2','What each product looks like','So nobody weighs the wrong bag. Photos from the store, Sep 2026.',
 '<div class="call r" style="margin-top:0"><b class="t">Two colour rules</b><b>Yara sacks:</b> read the fingerprint — Calcinit red, K Plus green, MKP navy. '
 '<b>Meroke packs:</b> all white with a red bird — read the droplet: MAG-S purple, Vitaflex pink, Fe dark maroon. <b>Boroni is the only orange sack.</b></div>'
 '<div class="prods">' + ''.join(P1) + '</div>')
page(51,'KNOW YOUR PRODUCTS · 2 OF 2','Tank, drench and spray products','None of these ever goes into Drum A or Drum B.',
 '<div class="prods">' + ''.join(P2) + '</div>'
 '<div class="call y"><b class="t">The three that get confused</b><b>Krista MKP vs Krista K Plus</b> — both Yara, both white, both say KRISTA. MKP → Drum B, K Plus → Drum A.<br>'
 '<b>Calcinit vs Karate Plus Boroni</b> — both calcium nitrate, both Drum A. Boroni carries boron: Flower stock only.<br>'
 '<b>SOP vs MAG-S</b> — both white 1 kg packs. SOP → straight into the tank. MAG-S → Drum B.</div>'
 '<div class="call r"><b class="t">Banned from the farm</b>Boric acid (about 17.5% B, roughly 50× stronger than Boroni) · Fe-EDTA (stops feeding iron above pH 6.5).</div>')

# ---- cost per crop, recalculated for 4.0 (model checked against cost card v2.5 totals)
PR = {'Calcinit':14800,'MAG-S':16000,'SOP':25000,'Krista MKP':63000,'Krista K Plus':46000,'Karate Plus Boroni':13200,
      'Vitaflex':200000,'MIKRO Fe 6% EDDHA':273904,'Kalsika':409866,'Tricoderma+':80485,'Tri-Pholate':1491600}
REC = {'Grow':{'Calcinit':.87,'Krista K Plus':.345,'Krista MKP':.22,'MAG-S':.57,'Vitaflex':.02,'MIKRO Fe 6% EDDHA':.005},
       'Flower':{'Calcinit':.945,'Karate Plus Boroni':.08,'Krista K Plus':.115,'Krista MKP':.23,'MAG-S':.605,'Vitaflex':.02,'MIKRO Fe 6% EDDHA':.005,'SOP':.31},
       'Sizing':{'Calcinit':.945,'Krista MKP':.21,'MAG-S':.625,'Vitaflex':.02,'MIKRO Fe 6% EDDHA':.005,'SOP':.535},
       'Ripen':{'Calcinit':.895,'Krista MKP':.185,'MAG-S':.625,'Vitaflex':.02,'MIKRO Fe 6% EDDHA':.005,'SOP':.645}}
def usage(tanks, sizing_boroni, kalsika_g):
    u = {}
    for st, n in tanks.items():
        for k, v in REC[st].items(): u[k] = u.get(k, 0) + v*n
    if sizing_boroni: u['Karate Plus Boroni'] += .08*tanks['Sizing']
    u['Kalsika'] = kalsika_g/1000; u['Tricoderma+'] = 1.01; u['Tri-Pholate'] = 0.024
    return u
OLD = usage({'Grow':17,'Flower':19,'Sizing':26,'Ripen':10}, True, 800)
NEW = usage({'Grow':17,'Flower':19,'Sizing':26,'Ripen':18}, False, 500)
order = ['Calcinit','MAG-S','SOP','Krista MKP','Krista K Plus','Karate Plus Boroni','Vitaflex','MIKRO Fe 6% EDDHA','Kalsika','Tricoderma+','Tri-Pholate']
rp = lambda x: 'Rp {:,}'.format(round(x))
kgf = lambda x: ('%.2f kg' % x) if x >= 1 else ('%.0f g' % (x*1000))
rows = ''; to = tn = 0
for k in order:
    co = OLD[k]*PR[k]; cn = NEW[k]*PR[k]; to += co; tn += cn
    rows += '<tr><td>%s</td><td class="n">%s</td><td class="n">%s</td><td class="n">%s</td><td class="n">%s</td><td class="n"><b>%s</b></td></tr>' % (k, rp(PR[k]), kgf(OLD[k]), rp(co), kgf(NEW[k]), rp(cn))
rows += '<tr class="chk"><td>Total inputs</td><td></td><td></td><td class="n">%s</td><td></td><td class="n">%s</td></tr>' % (rp(to), rp(tn))
COST_OLD, COST_NEW = to, tn
page(52,'WHAT WE PAY · 4.0','Cost per crop','Whole farm — 1,010 polybags · 2,020 plants · transplant to last fruit. Rates from price list v1.3 (Sep 2026).',
 '<div class="stats" style="grid-template-columns:repeat(4,1fr)"><div class="st"><b>17</b><span>Grow tanks</span></div><div class="st"><b>19</b><span>Flower tanks</span></div>'
 '<div class="st"><b>26</b><span>Sizing tanks</span></div><div class="st on"><b>18</b><span>Ripen tanks (4.0)</span></div></div>'
 '<table><tr><th>Product</th><th class="n">Rate / kg</th><th class="n">v2.5 kg</th><th class="n">v2.5 cost</th><th class="n">4.0 kg</th><th class="n">4.0 cost</th></tr>' + rows + '</table>'
 '<div class="stats"><div class="st on"><b>%s</b><span>per polybag · %s per plant</span></div><div class="st"><b>%s</b><span>with labour (Rp 800,000)</span></div><div class="st"><b>+%s</b><span>4.0 vs v2.5</span></div></div>' % (rp(tn/1010), rp(tn/2020), rp(tn+800000), rp(tn-to)) +
 '<div class="call y"><b class="t">What changed from cost card v2.5</b><b>Ripen</b> runs to the last fruit (4.0): 10 tanks to HST 72 plus about 8 more to HST 82, where v2.5 had free plain water. '
 '<b>Boroni</b> in Flower only: 1.52 kg, not 3.60 kg. <b>Kalsika</b> 5 rounds (HST 8–36), not 8. Tank counts and rates otherwise as v2.5.</div>'
 '<p class="sub">Not included: seed, coir, electricity, water. Part-used tanks at a stage change can add up to 5% — 5-day batches (page 53) cut that.</p>')

# ---- growth checks + topping + weight log
CK = [('0','Transplant: 2–3 true leaves, sturdy, even','8–12 cm','2–3'),('7','Start removing side shoots (nodes 1–8)','15–20 cm','4–6'),
      ('14','Vine climbing its string','35–50 cm','7–9'),('20','Node 8 — stop removing shoots','70–100 cm','10–12'),
      ('25','First female flowers, nodes 9–12','110–140 cm','14–16'),('38–40','One fruit per plant; top at leaf 25','180–200 cm','25'),
      ('45','Netting starts','—','25'),('55','Fruit about 1.2 kg','—','23+'),('60','Near full size, netting complete','—','22+'),
      ('68','Start Brix tests','—','20+'),('75–85','Harvest 1.8–2.2 kg, Brix 15+','—','20+')]
ck = ''.join('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td></td></tr>' % c for c in CK)
blank = ''.join('<tr>' + '<td>&nbsp;</td>'*7 + '</tr>' for _ in range(5))
page(58,'WEEKLY CHECKS · EVERY MONDAY','Is the crop on track?','Measure the same 5 marked plants — one per variety block plus one at a row end. Two checks in a row behind → call Boyd.',
 '<table><tr><th>HST</th><th>Milestone</th><th>Height (guide)</th><th>Leaves (guide)</th><th>Ours</th></tr>' + ck + '</table>'
 '<p class="sub">Heights and leaf counts are guides until we have our own averages — write ours in and they become the 4.1 numbers. 2026: 786 g average at HST 51 was the early sign the crop was behind.</p>'
 '<h2>Topping at leaf 25 (HST 38–46)</h2>'
 '<table><tr><th>Plant has</th><th>Action</th></tr><tr><td>A fruit + 25 or more green leaves</td><td><b>Top just above leaf 25</b></td></tr>'
 '<tr><td>A fruit + fewer than 25</td><td>Not yet</td></tr><tr><td>No fruit</td><td><b>Don’t top</b> — it can never flower again</td></tr></table>'
 '<p class="sub">Count, don’t guess. A leaf with brown edges and a green middle still counts.</p>'
 '<h2>Fruit weight log — from HST 42, 10 fruit per variety</h2>'
 '<table><tr><th>Date</th><th>HST</th><th>Yellow Kevin</th><th>White Kevin</th><th>Manis Candy</th><th>Australia F3</th><th>Name</th></tr>' + blank + '</table>')

page(59,'RUN-OFF · CALL BOYD','Run-off in millilitres & when to call','Measure what drains from one marked bag: bucket under it in the morning, jug in the evening.',
 '<table><tr><th>Stage</th><th>HST</th><th class="n">Water per bag</th><th class="n">Target</th><th class="n">Run-off ml</th></tr>'
 '<tr><td>Establish</td><td>0–7</td><td class="n">0.5 L</td><td class="n">15–20%</td><td class="n"><b>75–100</b></td></tr>'
 '<tr><td>Grow</td><td>8–24</td><td class="n">0.8 L</td><td class="n">15–20%</td><td class="n"><b>120–160</b></td></tr>'
 '<tr><td>Flower</td><td>25–41</td><td class="n">1.2 L</td><td class="n">15–20%</td><td class="n"><b>175–235</b></td></tr>'
 '<tr><td>Sizing</td><td>42–59</td><td class="n">1.6 L</td><td class="n">15–20%</td><td class="n"><b>240–320</b></td></tr>'
 '<tr><td>Ripen</td><td>60+</td><td class="n">0.8 L</td><td class="n">10–15%</td><td class="n"><b>80–120</b></td></tr></table>'
 '<p>Low for several days → add 1 minute to every pulse. High → remove 1 pulse. Never change it for one day or rain.</p>'
 '<div class="call r"><b class="t">Call Boyd the same day when</b><ul style="margin:2pt 0 0">'
 '<li>Feed EC is off the stage number, or pH outside 5.8–6.3, after mixing — <b>pump stays off</b>.</li>'
 '<li>Run-off EC more than 1,000 above the feed (e.g. over 3,400 at Flower), or run-off pH over 6.8.</li>'
 '<li>Run-off out of range three days running.</li><li>More than 50 wet cracks, or splitting two days running.</li>'
 '<li>A dry bag not recovered overnight, or three or more bags wilting.</li><li>Deformed fruit, dead flowers, or burnt leaf edges.</li>'
 '<li>Gummy ooze on a stem, or the first mildew spots.</li><li>Humidity still under temperature × 2 after misting.</li>'
 '<li>Two weekly checks in a row behind.</li><li>Anything you are not sure about. Stop and ask — don’t guess.</li></ul></div>')

page(60,'EMERGENCY ONLY · BOYD DECIDES','Feed-mistake flush','Used once in 2026 (9 Sep, HST 41) after boric acid went in. Never a routine job.',
 '<div class="call r" style="margin-top:0"><b class="t">Only Boyd starts a flush</b>A flush is plain water at the roots. Done at the wrong time it splits fruit. Use it only to wash out a feed mistake — wrong sack, wrong dose.</div>'
 '<ol class="num">'
 '<li>Mark 5 bags (different rows, one at a row end). Measure their run-off EC <b>before</b> the flush.</li>'
 '<li>Tank 1: 1,000 L plain water at pH 6. No fertiliser. Run the drippers <b>30 minutes</b> (about 1 L per bag).</li>'
 '<li>While it runs, hand-pour <b>0.5 L round the edge</b> of each bag — the dripper only wets the middle.</li>'
 '<li>Tank 2: refill, run 30 minutes, keep pouring edges. Tank 3: refill, run 30 minutes. Three tanks = about 3 L per bag.</li>'
 '<li>Push a finger into the middle and the edge of 10 bags. Still dry inside → 2 L by hand on that bag only.</li>'
 '<li>Measure the <b>last</b> run-off from the same 5 bags and send the numbers to Boyd.</li>'
 '<li><b>The same afternoon</b> remake the tank (EC 1300–1400 first, then the stage feed) and water normally. Bags must never sit in plain water overnight.</li></ol>'
 '<div class="call y"><b class="t">After the flush</b>Keep pollinating every new flower — damaged pollen means fewer set fruit. Expect the crop to run about 5 days behind; Boyd moves every later date by the same amount.</div>')
