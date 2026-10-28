"""Extract text blocks from build/v38_edited.pdf into i18n/en_pages/pNN.json for translation."""
import os, json, re
import pymupdf as fitz
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = fitz.open(os.path.join(ROOT, 'build', 'v38_edited.pdf'))
od = os.path.join(ROOT, 'i18n', 'en_pages'); os.makedirs(od, exist_ok=True)
SPACED = re.compile(r'^(?:[A-Z0-9·&\-/+→%.,]{1,2} ){4,}')

def blocks(p):
    out = []
    for bi, b in enumerate(p.get_text('dict')['blocks']):
        if b['type'] != 0: continue
        lines = []
        for l in b['lines']:
            sp = [s for s in l['spans'] if s['text'].strip()]
            if sp: lines.append([s['text'].replace(' ', ' ') for s in sp])
        if lines and any(re.search('[A-Za-z]{2}', ''.join(x)) for x in lines):
            out.append({'id': bi, 'lines': lines,
                        'spaced': bool(SPACED.match(' '.join(lines[0]) + ' '))})
    return out

if __name__ == '__main__':
    for i, p in enumerate(d):
        json.dump(blocks(p), open(os.path.join(od, f'p{i+1:02d}.json'), 'w'), ensure_ascii=False, indent=0)
    print('pages', len(d))
