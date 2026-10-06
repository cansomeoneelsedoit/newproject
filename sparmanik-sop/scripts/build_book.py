"""Build Sparmanik 4.0 from sources/ v3.8 + scripts. Run: python3 scripts/build_book.py"""
import os, subprocess, glob
import pymupdf as fitz
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = lambda *p: os.path.join(ROOT, *p)
os.makedirs(B('build'), exist_ok=True); os.makedirs(B('output'), exist_ok=True)
subprocess.run(['python3', B('scripts', 'edit_v38.py')], check=True)
subprocess.run(['python3', B('scripts', 'new_pages.py')], check=True)
chrome = (glob.glob('/opt/pw-browsers/chromium-*/chrome-linux/chrome') + ['chromium'])[0]
subprocess.run([chrome, '--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
                '--print-to-pdf=' + B('build', 'new_pages.pdf'), B('build', 'new_pages.html')], check=True, stderr=subprocess.DEVNULL)
d = fitz.open(B('build', 'v38_edited.pdf')); new = fitz.open(B('build', 'new_pages.pdf'))
out = fitz.open()
out.insert_pdf(d, from_page=0, to_page=0)          # cover
out.insert_pdf(new, from_page=0, to_page=0)        # "What's new in 4.0" flyleaf (unnumbered)
out.insert_pdf(d, from_page=1, to_page=len(d)-1)   # v3.8 pages 2-49, edited
out.insert_pdf(new, from_page=1, to_page=len(new)-1)  # new pages 50+
out.set_metadata({'title': 'Sparmanik 4.0 — Melon SOP Book', 'author': 'Sparmanik Farm'})
dst = B('output', 'Sparmanik_4.0_Melon_SOP_Book.pdf')
out.save(dst, garbage=3, deflate=True)
print('built', dst, len(out), 'pages')

# ---- staff handouts
chart = fitz.open(); chart.insert_pdf(d, from_page=10, to_page=12)   # v3.8 pages 11-13, edited to 4.0
chart.set_metadata({'title': 'Sparmanik 4.0 — Daily Nutrition Chart', 'author': 'Sparmanik Farm'})
chart.save(B('output', 'Sparmanik_4.0_Daily_Nutrition_Chart_EN.pdf'), garbage=3, deflate=True)
subprocess.run(['python3', B('scripts', 'daily_cards.py')], check=True)
subprocess.run(['python3', B('scripts', 'staff_nutrient_cards.py')], check=True)
for name, src in [('Sparmanik_4.0_Daily_Cards_ID.pdf', 'daily_id.html'), ('Sparmanik_4.0_Daily_Cards_EN.pdf', 'daily_en.html')]:
    subprocess.run([chrome, '--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
                    '--print-to-pdf=' + B('output', name), B('build', src)], check=True, stderr=subprocess.DEVNULL)
print('handouts done')
nc = fitz.open()
for L in ('id', 'en'):
    p = B('build', f'batch_{L}.pdf')
    subprocess.run([chrome, '--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
                    '--print-to-pdf=' + p, B('build', f'batch_{L}.html')], check=True, stderr=subprocess.DEVNULL)
    nc.insert_pdf(fitz.open(p))
nc.save(B('output', 'Sparmanik_4.0_Kartu_Nutrisi_1-5-10_Hari.pdf'), garbage=3, deflate=True)
print('nutrient cards', len(nc), 'pages')
