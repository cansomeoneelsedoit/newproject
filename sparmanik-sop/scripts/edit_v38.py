import pymupdf as fitz
from collections import Counter
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=os.path.join(ROOT,'sources','Melon_SOP_Book_EN_v3.8_06-08-2026.pdf')
OUT=os.path.join(ROOT,'build','v38_edited.pdf')
d=fitz.open(SRC)
F='/usr/share/fonts/truetype/liberation/'
FONTS={'r':F+'LiberationSans-Regular.ttf','b':F+'LiberationSans-Bold.ttf','s':F+'LiberationSerif-Bold.ttf'}
pix_cache={}
def bg(pn,rect):
    if pn not in pix_cache: pix_cache[pn]=d[pn-1].get_pixmap(dpi=144)
    pix=pix_cache[pn]; z=2
    pts=[]
    r=fitz.Rect(rect)+(-1.2,-1.2,1.2,1.2)
    for t in [i/10 for i in range(11)]:
        for (x,y) in [(r.x0+(r.x1-r.x0)*t,r.y0),(r.x0+(r.x1-r.x0)*t,r.y1),(r.x0,r.y0+(r.y1-r.y0)*t),(r.x1,r.y0+(r.y1-r.y0)*t)]:
            X=min(max(int(x*z),0),pix.width-1);Y=min(max(int(y*z),0),pix.height-1)
            pts.append(pix.pixel(X,Y))
    c=Counter(pts).most_common(1)[0][0]
    return tuple(v/255 for v in c)
ops={}  # pn -> list of (rect, fill, inserts)
def spans(pn):
    out=[]
    for b in d[pn-1].get_text('dict')['blocks']:
        for l in b.get('lines',[]):
            for s in l['spans']:
                if s['text'].strip(): out.append(s)
    return out
def find(pn,text,y=None,x=None):
    N=lambda t:' '.join(t.replace('\u00a0',' ').split())
    c=[s for s in spans(pn) if N(s['text'])==N(text)]
    if y is not None: c=[s for s in c if abs(s['bbox'][1]-y)<3]
    if x is not None: c=[s for s in c if abs(s['bbox'][0]-x)<3]
    assert len(c)>=1,(pn,text,y)
    return c
def col(s):
    v=s['color']; return ((v>>16&255)/255,(v>>8&255)/255,(v&255)/255)
def rep(pn,old,new,font='r',y=None,x=None,size=None,maxw=None,color=None,allm=False):
    cs=find(pn,old,y,x)
    if not allm: cs=cs[:1]
    for s in cs:
        r=fitz.Rect(s['bbox'])
        sz=size or s['size']; fn=FONTS[font]
        f=fitz.Font(fontfile=fn)
        w=f.text_length(new,fontsize=sz)
        lim=maxw or max(r.width*1.6, 30)
        if maxw and w>maxw: sz=sz*maxw/w
        ops.setdefault(pn,[]).append((r,bg(pn,r),[(fitz.Point(s['origin']),new,sz,fn,color or col(s))]))
def addrow(pn,ref_text,ref_y,new_row_dy,text,font='b'):
    sp=find(pn,ref_text,ref_y)[0]
    o=fitz.Point(sp['origin']); o.y+=new_row_dy
    ops.setdefault(pn,[]).append((fitz.Rect(0,0,0,0),None,[(o,text,sp['size'],FONTS[font],col(sp))]))
def block(pn,rect,lines,size=10.5,font='r',color=(0x26/255,0x33/255,0x1f/255),lh=None,start=None):
    r=fitz.Rect(rect); lh=lh or size*1.5
    ins=[]; y=start or (r.y0+size*0.95)
    for ln in lines:
        x=r.x0
        for seg,fk in ln if isinstance(ln,list) else [(ln,font)]:
            ins.append((fitz.Point(x,y),seg,size,FONTS[fk],color))
            x+=fitz.Font(fontfile=FONTS[fk]).text_length(seg,fontsize=size)
        y+=lh
    ops.setdefault(pn,[]).append((r,bg(pn,r),ins))
DK=(0x26/255,0x33/255,0x1f/255)
# ---------- p1 cover
rep(1,'Sparmanik Farm · Indonesian Farm  •  Kab. Simalungun  •  v3.8 · 6 Aug 2026','Sparmanik Farm · Kab. Simalungun  •  SPARMANIK 4.0 · 6 Oct 2026',x=125.2)
# ---------- p10 bags
rep(10,'Karate Plus Boroni','Boroni — not used (4.0)',y=426.1,maxw=66)
rep(10,'0.80 kg','—',y=427.7)
rep(10,'10.25 kg','9.45 kg',y=446.4)
for s in spans(10):
    if 'Boroni 4.80' in s['text']:
        rep(10,s['text'],s['text'].strip().replace('Boroni 4.80','Boroni 2.40'))
# ---------- p12 HST 43 silicon
rep(12,'Silicon drench — 2 pulses only today','No silicon from HST 38 (4.0)',y=449.8,font='b')
# ---------- p13
rep(13,'Silicon stops at Day 60. Plain water only from Day 72.','4.0: no silicon after Day 36 · Ripen feed to the last fruit, no plain-water finish.')
for yy in (186.6,287.8):
    rep(13,'Silicon drench — 2 pulses only today','No silicon (4.0) — splits fruit',y=yy,font='b')
rep(13,'CHANGE TO RIPEN MIX · STOP silicon','CHANGE TO RIPEN MIX',font='b')
rows=[(504.6,'72'),(529.3,'73'),(553.3,'74'),(578.1,'75')]
for i,(yy,h) in enumerate(rows):
    yb=yy-1
    # whole row cells except HST
    r=fitz.Rect(92,yb,520,yb+21)
    base=yb+12
    ins=[(fitz.Point(99.4,base-1),'RIPEN',5.6,FONTS['b'],(0xc0/255,0x65/255,0x1b/255)),
         (fitz.Point(129.8,base),'2700',8.6,FONTS['r'],DK),(fitz.Point(160.5,base),'1350',8.6,FONTS['r'],DK),
         (fitz.Point(192.7,base),'645 g',8.6,FONTS['r'],DK),(fitz.Point(239.6,base),'800',8.6,FONTS['b'],DK),
         (fitz.Point(284.8,base),'4 × 6m',8.6,FONTS['r'],DK),(fitz.Point(331.2,base),'8 · 11am · 2 · 5pm',4.8,FONTS['r'],(0x2e/255,0x7d/255,0xa0/255))]
    if i==0: ins.append((fitz.Point(384.8,base),'Ripen feed to the last fruit · rolling pick',4.9,FONTS['b'],(0x8a/255,0x3a/255,0x12/255)))
    ops.setdefault(13,[]).append(('cells',(yb,yb+21),ins))
# ---------- p19 silicon
# p19 'stop at Day 60' handled in late fixes
# ---------- p26 sizing
rep(26,'calcium foliar weekly to ~HST 55; silicon weekly.','no leaf spray, no silicon (netting · 4.0).')
# ---------- p27 sizing stock
rep(27,'Karate Plus Boroni · boron · optional','NOT used in 4.0 — boron in Flower only',color=(0xc0/255,0x39/255,0x2b/255),font='b')
rep(27,'800 g','—',y=300.5); rep(27,'0.8 kg','—',y=314.7)
rep(27,'K Plus. Drum A is Calcinit only (plus Boroni if used).','K Plus or Boroni (4.0). Drum A is Calcinit only.')
# ---------- p28
rep(28,'Silicon drench (Kalsika)','No silicon drench',font='r')
rep(28,'once a week','in this stage',font='b')
rep(28,'— keep it going through this stage.','— after fruit set it splits fruit (4.0).')
# ---------- p29 ripen
rep(29,'plain water','to the last fruit',y=140.2,font='b',maxw=62)
rep(29,'taper','steady',y=140.2,font='b')
block(29,(95,216.5,529,247),[[('Feed the ripening mix (low N, high K) ','r'),('to the last fruit','b'),(' — no switch to plain water (4.0).','r')],
                              'Pick ripe fruit every morning; leave the rest on the feed to sweeten.'],lh=16.5,start=226.8)
block(29,(95,262,529,308),[[('Keep feed and timer steady to harvest.','b'),(' 2026: Brix 14.6–19 on Ripen feed alone,','r')],
                            'while plain water after fruit set split fruit. Never add water by hand or glass.'],lh=16.4,start=272.2)
block(29,(185.8,353,529,366),[[('— sudden water = cracked fruit. Leaf spray 16:00: MKP / Calcinit, alternate days.','r')]],size=9.6,start=362.8)
block(29,(97,393,512,443),[[('4.0 rule — no plain-water finish','b')],
                           'Ripen feed (EC 2700, SOP 645 g) runs until the last fruit is picked.',
                           'Brix test on fruit that split that day — never cut a good fruit.'],lh=18,start=403.4,color=DK)
rep(29,', then plain water for the finish.',', to the last fruit (4.0).')
rep(29,'finish every 4 h, 6 min.','same to harvest.')
# ---------- p31 ripen watering
rep(31,'Two settings: dry it down, then plain water.','4.0: one setting, Day 60 to the last fruit.')
rep(31,'ON DAY 72, CHANGE THE TIMER AND STOP THE FEED','4.0: NO CHANGE ON DAY 72 — KEEP THE RIPEN FEED',font='b',maxw=300)
rep(31,'DAY 72–HARVEST','NOT USED',font='b')
rep(31,'— Finish · PLAIN WATER, no nutrient','— v3.8 finish, not used in 4.0')
block(31,(77,425,520,460),[[('From Day 72 the tank stays ','r'),('RIPEN FEED','b'),(' (EC 2700) — never plain water.','r')],
                           'Steady water + high-K feed lifts the sugar; dry-then-wet splits fruit.'],size=10.1,lh=19.5,start=435.6)
rep(31,'Stop the silicon drench in this stage.','No silicon in this stage (stops at Day 36).')
ops.setdefault(31,[]).append(('veil',fitz.Rect(64,318,531,385),None))
# ---------- p34-36 year plan
for pn in (34,35,36):
    rep(pn,'Ca foliar weekly.','Ca foliar to HST 44.')
    rep(pn,'Netting forms. Ca foliar to ~HST 55. Bag fruit/traps.','Netting forms. No leaf spray. Bag fruit/traps.')
    rep(pn,'Plain/low-EC water (last 7–10 d). Stop Ca foliar &','Ripen feed continues. Rolling pick, ripe fruit only.')
    rep(pn,'silicon. Fruit fly CRITICAL.','Fruit fly CRITICAL.')
    rep(pn,'water','2.7',allm=True)
    rep(pn,'Plain water. Brix','Ripen feed. Brix')
# ---------- p42
rep(42,'with a marked container. *S3 Boroni optional. Keep','with a marked container. *4.0: no Boroni in S3. Keep')
# ---------- p49 quick card
rep(49,'silicon drench.','silicon HST 8–36 only.')
rep(49,'NEW SOP Melon Book · v3.8 · 6 Aug 2026 · Kab. Simalungun, Sumatera Utara','SPARMANIK 4.0 · Melon SOP Book · 6 Oct 2026 · Kab. Simalungun, Sumatera Utara')


# ---------- v4.6 timings: Trichoderma HST 0,17,38,59 · Tri-Pholate HST 20,28,35
addrow(11,'Trichoderma cup drench',391.3,431.0-387.5,'Trichoderma cup drench')
rep(11,'Trichoderma cup drench','',y=391.3)
rep(11,'Node 8 reached — stop removing shoots','Node 8 — stop shoots · Tri-Pholate after 4 pm',font='b',maxw=150)
addrow(12,'Trichoderma cup drench',332.8,227.8-329.0,'Tri-Pholate spray after 4 pm')
rep(12,'Trichoderma cup drench','Tri-Pholate (last) · start Ca foliar',y=332.8,font='b',maxw=150)
rep(12,'Select ONE fruit per plant, remove the rest','Keep ONE fruit/plant · Trichoderma drench',font='b',maxw=150)
rep(13,'Trichoderma cup drench','',y=273.6)
rep(13,'Mix the new RIPEN stock TONIGHT','Mix RIPEN stock TONIGHT · Trichoderma',font='b',maxw=150)
rep(9,'First: 3–5 days after transplant. Then every 2–3 weeks. Write the date on the board.','HST 0 (transplant day), 17, 38 and 59 (v4.6). Write the date on the board.')

# ---------- apply
for pn,lst in ops.items():
    p=d[pn-1]
    cellrows=[o for o in lst if isinstance(o[0],str) and o[0]=='cells']; veils=[o for o in lst if isinstance(o[0],str) and o[0]=='veil']
    norm=[o for o in lst if not isinstance(o[0],str)]
    for r,fill,_ in norm:
        if fill is not None and not r.is_empty: p.add_redact_annot(r,fill=fill)
    for _,(y0,y1),_ in cellrows:
        # redact every span in the row except HST number (x<90)
        for s in spans(pn):
            bb=fitz.Rect(s['bbox'])
            if bb.x0>90 and y0-1<=bb.y0<=y1:
                p.add_redact_annot(bb+(-0.5,-0.5,0.5,0.5),fill=bg(pn,bb))
    p.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE,graphics=fitz.PDF_REDACT_LINE_ART_NONE)
    for r,fill,ins in norm+[(None,None,c[2]) for c in cellrows]:
        for pt,txt,sz,fn,c in ins:
            if not txt: continue
            p.insert_text(pt,txt,fontsize=sz,fontfile=fn,fontname='F'+str(abs(hash(fn))%9999),color=c)
    for _,r,_ in veils:
        p.draw_rect(r,color=None,fill=(0.984,0.973,0.945),fill_opacity=0.72,overlay=True)

# ---------- kickers & late fixes
FBK=FONTS['b']; kfont=fitz.Font(fontfile=FBK)
def spaced(p,x,y,text,size,color,sp=2.6,center=None):
    w=sum(kfont.text_length(c,fontsize=size)+sp for c in text)-sp
    if center: x=center-w/2
    for c in text:
        p.insert_text((x,y),c,fontsize=size,fontfile=FBK,fontname='KB',color=color); x+=kfont.text_length(c,fontsize=size)+sp
hexc=lambda h: tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
p=d[0]; p.add_redact_annot(fitz.Rect(130,73,465,85),fill=False); p.apply_redactions(images=0,graphics=0)
spaced(p,0,82.2,'SPARMANIK 4.0 · STAGE-BY-STAGE PLAYBOOK',8.6,hexc('d99a2b'),center=297.5)
p=d[30]; p.add_redact_annot(fitz.Rect(62,59,360,72),fill=(1,0.992,0.973)); p.apply_redactions(images=0,graphics=0)
spaced(p,63,68,'STAGE 6 · GENERATIVE · S4 FEED TO HARVEST',8.6,hexc('2e7da0'))
p=d[18]; p.add_redact_annot(fitz.Rect(411,100.5,492,111),fill=(1,0.992,0.973)); p.apply_redactions(images=0,graphics=0)
p.insert_text((411.8,108.9),'stop at Day 36 (4.0).',fontsize=8.6,fontfile=FBK,fontname='KB',color=hexc('22301e'))
p=d[40]; r=fitz.Rect(310.3,362.4,511.2,372.5); pix=p.get_pixmap(dpi=72); fl=tuple(v/255 for v in pix.pixel(309,367))
p.add_redact_annot(r,fill=fl); p.apply_redactions(images=0,graphics=0)
p.insert_text((310.3,370.6),'Silicon — root drench HST 8–36 only (4.0)',fontsize=10.1,fontfile=FONTS['r'],fontname='KR',color=hexc('26331f'))
d.save(OUT,garbage=3,deflate=True); print('saved',OUT,len(d))
