"""Render the Indonesian edition: swap every translated text line of build/v38_edited.pdf in place.
Translations: i18n/id_pages/pNN.json — same blocks/lines/spans as i18n/en_pages/pNN.json.
Writes build/v38_id.pdf. Layout, colours, pictures and boxes stay exactly as in the English book."""
import os, re, json, sys, collections
import pymupdf as fitz
from id_extract import blocks, SPACED
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', 'v38_edited.pdf'); OUT = os.environ.get('ID_OUT') or os.path.join(ROOT, 'build', 'v38_id.pdf')
F = '/usr/share/fonts/truetype/liberation/'
FONTS = {'r': F + 'LiberationSans-Regular.ttf', 'b': F + 'LiberationSans-Bold.ttf', 's': F + 'LiberationSerif-Bold.ttf',
         'd': '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'}
FO = {k: fitz.Font(fontfile=v) for k, v in FONTS.items()}
d = fitz.open(SRC)
VEILS = {31: [fitz.Rect(64, 318, 531, 385)]}   # faded 'not used in 4.0' box drawn by edit_v38.py
_ex = os.path.join(ROOT, 'i18n', 'id_extra.json')
EXTRA = json.load(open(_ex)) if os.path.exists(_ex) else {}

# ---- font weight per Type3 font ref: compare ink coverage with Liberation Regular vs Bold
_cov = {}
def coverage_ref(text, size, key):
    k = (text, round(size, 1), key)
    if k not in _cov:
        f = FO[key]; w = f.text_length(text, fontsize=size) + 4
        doc = fitz.open(); pg = doc.new_page(width=w, height=size * 1.6)
        pg.insert_text((2, size * 1.15), text, fontsize=size, fontfile=FONTS[key], fontname='X')
        pix = pg.get_pixmap(dpi=144, colorspace=fitz.csGRAY)
        s = pix.samples; _cov[k] = sum(255 - v for v in s) / 255.0
    return _cov[k]

def gray(c): return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
def rgb(v): return ((v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255)
_pix = {}
def pix(pn, cs=None):
    k = (pn, cs is None)
    if k not in _pix: _pix[k] = d[pn].get_pixmap(dpi=144, colorspace=cs or fitz.csRGB)
    return _pix[k]

def coverage_span(pn, s):
    px = pix(pn, fitz.csGRAY); bb = fitz.Rect(s['bbox'])
    xs = range(max(int(bb.x0 * 2), 0), min(int(bb.x1 * 2), px.width)); ys = range(max(int(bb.y0 * 2), 0), min(int(bb.y1 * 2), px.height))
    vals = [px.pixel(x, y)[0] for x in xs for y in ys]
    if not vals: return None
    bgv = collections.Counter(vals).most_common(1)[0][0]; fg = gray(rgb(s['color'])) * 255
    if abs(fg - bgv) < 40: return None
    return sum(min(max((v - bgv) / (fg - bgv), 0), 1) for v in vals)

_weight = collections.defaultdict(list)
def collect_weights():
    for pn in range(len(d)):
        for b in d[pn].get_text('dict')['blocks']:
            for l in b.get('lines', []):
                for s in l['spans']:
                    t = s['text'].strip()
                    if len(t) < 3 or not s['font'].startswith('Type3') or len(_weight[s['font']]) >= 6: continue
                    c = coverage_span(pn, s)
                    if c is None: continue
                    cr, cb = coverage_ref(s['text'], s['size'], 'r'), coverage_ref(s['text'], s['size'], 'b')
                    _weight[s['font']].append((c - cr) / max(cb - cr, 1e-6))
def style(s):
    f = s['font']
    if 'DejaVu' in f: return 'd'
    if f.startswith('Liberation') or f.startswith('Helvetica'): return 'b' if 'Bold' in f else 'r'
    if s['size'] >= 14: return 's'
    w = _weight.get(f)
    if not w: return 'r'
    w = sorted(w)[len(w) // 2]
    return 'b' if w > 0.5 else 'r'

# ---- background colour under a rect (most common colour on its border)
def bg(pn, rect):
    p = pix(pn); r = fitz.Rect(rect) + (-1.2, -1.2, 1.2, 1.2); pts = []
    for t in [i / 10 for i in range(11)]:
        for (x, y) in [(r.x0 + r.width * t, r.y0), (r.x0 + r.width * t, r.y1), (r.x0, r.y0 + r.height * t), (r.x1, r.y0 + r.height * t)]:
            pts.append(p.pixel(min(max(int(x * 2), 0), p.width - 1), min(max(int(y * 2), 0), p.height - 1)))
    return tuple(v / 255 for v in collections.Counter(pts).most_common(1)[0][0])

def page_lines(p):
    out = []
    for bi, b in enumerate(p.get_text('dict')['blocks']):
        if b['type'] != 0: continue
        ls = []
        for l in b['lines']:
            sp = [s for s in l['spans'] if s['text'].strip()]
            if sp: ls.append(sp)
        out.append((bi, fitz.Rect(b['bbox']), ls))
    return out

def run(pages=None):
    collect_weights()
    for pn in range(len(d)):
        if pages and pn + 1 not in pages: continue
        fn = os.path.join(ROOT, 'i18n', 'id_pages', f'p{pn+1:02d}.json')
        if not os.path.exists(fn) and not any(e['page'] == pn + 1 for e in EXTRA.get('blocks', [])): continue
        tr = {b['id']: b for b in json.load(open(fn))} if os.path.exists(fn) else {}
        p = d[pn]; W = p.rect.width
        for e in EXTRA.get('blocks', []):
            if e['page'] != pn + 1: continue
            b = [b for bi, b in enumerate(p.get_text('dict')['blocks']) if bi == e['block']][0]
            ls = [[x for x in l['spans'] if x['text'].strip()] for l in b['lines']]
            ls = [l for l in ls if l]
            lines = [['' for _ in l] for l in ls]; lines[0][0] = e['text']
            tr[e['block']] = {'id': e['block'], 'lines': lines, 'align': e.get('align')}
        rects = [fitz.Rect(dr['rect']) for dr in p.get_drawings() if dr.get('fill') is not None and dr['rect'].width > 20 and dr['rect'].height > 8]
        PL = page_lines(p)
        allL = [(fitz.Rect(sp[0]['bbox']).x0, fitz.Rect(sp[-1]['bbox']).x1, fitz.Rect(sp[0]['bbox']).y0, fitz.Rect(sp[0]['bbox']).y1, (bi, li)) for bi, _, ls in PL for li, sp in enumerate(ls)]
        tr_spaced = {(pn, e['block']): True for e in EXTRA.get('blocks', []) if e['page'] == pn + 1 and e.get('spaced')}
        jobs = []
        for bi, bb, ls in PL:
            if bi not in tr: continue
            tl = tr[bi]['lines']
            if len(tl) != len(ls) or any(len(a) != len(b) for a, b in zip(tl, ls)):
                print(f'p{pn+1} block {bi}: shape mismatch, skipped', file=sys.stderr); continue
            for li, (sp, new) in enumerate(zip(ls, tl)):
                if [s['text'].replace('\u00a0', ' ') for s in sp] == new: continue
                me = (bi, li)
                x0 = sp[0]['bbox'][0]; x1 = sp[-1]['bbox'][2]; y0 = min(s['bbox'][1] for s in sp); y1 = max(s['bbox'][3] for s in sp)
                lr = fitz.Rect(x0, y0, x1, y1); cx = (x0 + x1) / 2; lw = x1 - x0
                cont = [r for r in rects if r.contains(lr + (1, 1, -1, -1))]
                cont = min(cont, key=lambda r: r.width * r.height) if cont else None
                others = [a for a in allL if a[4] != me]
                left_peers = sum(1 for a in others if abs(a[0] - x0) < 1.2)
                ctr_peers = sum(1 for a in others if abs((a[0] + a[1]) / 2 - cx) < 1.2 and abs((a[1] - a[0]) - lw) > 3)
                in_cont_ctr = cont is not None and abs((cont.x0 + cont.x1) / 2 - cx) < 2.5 and (x0 - cont.x0) > 12 and (lw > 0.3 * cont.width or cont.width < 200)
                centered = in_cont_ctr or (ctr_peers > left_peers and ctr_peers >= 1 and left_peers == 0)
                if tr[bi].get('align'): centered = tr[bi]['align'] == 'center'
                row = [a for a in others if a[2] < y1 - 1 and a[3] > y0 + 1]
                right = [a[0] for a in row if a[0] > x1 - 0.5]
                left = [a[1] for a in row if a[1] < x0 + 0.5]
                if in_cont_ctr:
                    pad = 7 if cont.width < 200 else 12
                    lo, hi = cont.x0 + pad, cont.x1 - pad
                else:
                    edge = cont.x1 - max(min(x0 - cont.x0, 14), 5) if cont is not None else W - 64
                    hi = min([r - 6 for r in right] + [edge])
                    if centered:
                        lft = max([l + 6 for l in left] + [cont.x0 + 6 if cont is not None else 64])
                        half = min(cx - lft, hi - cx); lo, hi = cx - half, cx + half
                    else:
                        lo = x0
                hi = max(hi, x1); lo = min(lo, x0)
                jobs.append(dict(bi=bi, sp=sp, new=new, lo=lo, hi=hi, centered=centered))
        for j in jobs:
            raw = ' '.join(s['text'] for s in j['sp'])
            if tr_spaced.get((pn, j['bi'])): raw = 'S P A C E D '
            spaced = bool(SPACED.match(raw + ' '))
            caps = (not spaced) and raw.upper() == raw and j['sp'][0]['size'] < 9.5 and re.search('[A-Z]{3}', raw)
            j['track'] = 2.6 if spaced else (0.7 if caps else 0)
            j['segs'] = [(s, t, 'b' if spaced else style(s)) for s, t in zip(j['sp'], j['new']) if t]
            j['w'] = sum(FO[k].text_length(t, fontsize=s['size']) + j['track'] * max(len(t) - 1, 0) for s, t, k in j['segs'])
            j['scale'] = min(1.0, (j['hi'] - j['lo']) / j['w']) if j['w'] else 1.0
        bscale = {}
        for j in jobs: bscale[j['bi']] = min(bscale.get(j['bi'], 1.0), j['scale'])
        for j in jobs:
            for s in j['sp']: p.add_redact_annot(fitz.Rect(s['bbox']) + (-0.3, -0.2, 0.3, 0.2), fill=False)
        p.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE, text=fitz.PDF_REDACT_TEXT_REMOVE)
        for j in jobs:
            if not j['segs']: continue
            sc = max(bscale[j['bi']], 0.6); track = j['track']
            op = 0.4 if any(fitz.Rect(j['sp'][0]['bbox']).tl + (2, 4) in v for v in VEILS.get(pn + 1, [])) else 1
            tw = j['w'] * sc
            x = max((j['lo'] + j['hi']) / 2 - tw / 2, j['lo']) if j['centered'] else j['lo']
            for s, t, k in j['segs']:
                sz = s['size'] * sc; o = fitz.Point(x, s['origin'][1] - (s['size'] - sz) * 0.15)
                c = rgb(s['color'])
                if track:
                    for ch in t:
                        p.insert_text(o, ch, fontsize=sz, fontfile=FONTS[k], fontname='ID' + k, color=c, fill_opacity=op)
                        o.x += FO[k].text_length(ch, fontsize=sz) + track * sc
                    x = o.x - track * sc
                else:
                    p.insert_text(o, t, fontsize=sz, fontfile=FONTS[k], fontname='ID' + k, color=c, fill_opacity=op)
                    x += FO[k].text_length(t, fontsize=sz)
            if sc < 0.8: print(f'p{pn+1} block {j["bi"]}: shrunk to {sc:.2f} — shorten', file=sys.stderr)
    for e in EXTRA.get('patches', []):
        pn = e['page'] - 1
        if pages and pn + 1 not in pages: continue
        p = d[pn]; r = fitz.Rect(e['rect'])
        fill = tuple(e['fill']) if e.get('fill') else bg(pn, r)
        p.draw_rect(r, color=None, fill=fill, overlay=True)
        k = e.get('font', 'b'); sz = e['size']
        c = tuple(int(e.get('color', '22301e')[i:i + 2], 16) / 255 for i in (0, 2, 4))
        w = FO[k].text_length(e['text'], fontsize=sz)
        if w > r.width - 2: sz *= (r.width - 2) / w; w = FO[k].text_length(e['text'], fontsize=sz)
        x = r.x0 + 1 if e.get('align', 'left') == 'left' else (r.x0 + r.x1) / 2 - w / 2
        p.insert_text((x, e['y']), e['text'], fontsize=sz, fontfile=FONTS[k], fontname='ID' + k, color=c)
    d.save(OUT, garbage=3, deflate=True); print('saved', OUT)

if __name__ == '__main__':
    run([int(a) for a in sys.argv[1:]] or None)
