# Sparmanik Farm — Melon SOP book (4.0)

Everything needed to rebuild the Sparmanik melon book, plus the record of what the 2026 crop taught us.
Nothing here depends on a chat session: clone, run one command, get the PDF.

## Rebuild

```bash
cd sparmanik-sop
pip install pymupdf pillow          # once
python3 scripts/build_book.py       # builds everything in output/ (book, daily cards, nutrition chart, nutrient cards)
```

`build_book.py` takes `sources/Melon_SOP_Book_EN_v3.8_06-08-2026.pdf`, applies every 4.0 text change in place
(`scripts/edit_v38.py`), renders the new pages (`scripts/new_pages.py` + `scripts/new_pages_extra.py`) in the same
style, and stitches them together. To change a rule: edit the line in `edit_v38.py` (old page text) or the page in
`new_pages*.py` (new pages), then rebuild.

## What's where

| Path | What |
| --- | --- |
| `output/Sparmanik_4.0_Melon_SOP_Book.pdf` | The current book |
| `output/Sparmanik_4.0_Buku_SOP_Melon_ID.pdf` | The same book in Indonesian for staff (same 63 pages, same layout) |
| `output/Sparmanik_4.0_Grafik_Nutrisi_Harian_ID.pdf` | Indonesian day-by-day feed/water chart (book pages 11–13) |
| `output/Sparmanik_4.0_Kartu_Nutrisi_1-5-10_Hari.pdf` | Staff nutrient cards, ID + EN, 1/5/10-day batches |
| `output/Sparmanik_4.0_Daily_Cards_ID.pdf` / `_EN.pdf` | Daily job card for every day HST 0–85 (`scripts/daily_cards.py` — dates live in `jobs()`) |
| `output/Sparmanik_4.0_Daily_Nutrition_Chart_EN.pdf` | Day-by-day feed/water chart HST 0–75 (book pages 11–13) |
| `sources/` | Every earlier book and card we were given (v3.4 ID, v3.7, v3.8, older ID, cost card v2.5, Day 8 action card) |
| `assets/products/` | Photos of the 11 products (from cost card v1.4) |
| `assets/logo.jpg`, `assets/floorplan.jpg` | Farm logo and Greenhouse 1 floor plan (from v3.8) |
| `scripts/` | Build scripts |

## Version history

| Version | Date | Notes |
| --- | --- | --- |
| v3.1 ID (`NEW_SOP_Melon_Book_ID_older.pdf`) | 31 Jul 2026 | First playbook; had an optional silica leaf spray (not used in 4.0) |
| v3.4 ID, v3.7 EN, v3.8 EN | 6 Aug 2026 | Stage-by-stage playbook (sources/) |
| v4.6 (not in repo) | Sep 2026 | Source of cost card v2.5 volumes; Trichoderma HST 0/17/38/59, Tri-Pholate HST 20/28/35 |
| **4.0** | 6 Oct 2026 | v3.8 + v4.6 timings + 2026 crop lessons. Where they disagree, the 2026 crop wins |

## Indonesian edition — how it works

`scripts/id_extract.py` dumps every text block of the edited English book to `i18n/en_pages/pNN.json`;
`i18n/id_pages/pNN.json` holds the Indonesian for the same blocks (same lines and styling runs), and
`scripts/id_render.py` swaps each line in place, so pictures, boxes and colours stay identical.
`i18n/id_extra.json` covers text the extractor can't see (letter-spaced headings, table rows stored as
pictures). New 4.0 pages: `scripts/new_pages_id.py` + `new_pages_extra_id.py`. Glossary: `i18n/BRIEF.md`.
**When you change the English** (`edit_v38.py` or `new_pages*.py`), make the same change in the Indonesian
files, then rebuild. If block ids shift, the renderer prints `shape mismatch` for that block.

## The rules 2026 proved (newer than any book — they override older text)

1. **Boric acid is banned.** Boron only from Karate Plus Boroni, in Boyd's pre-weighed kit, **Flower stock only**.
   Boric acid (~17.5% B, ~50× Boroni) went in before 8 Sep 2026: damaged pollen, 19% deformed fruit, 5-day flush.
2. **No plain water after fruit set (HST 38).** No glass/hand watering, no plain-water tank, no silicon drench.
   The silicon drench on 19 Sep (HST 50) split fruit on 20 Sep and cost a Kirin row.
3. **Silicon (Kalsika) only HST 8, 15, 22, 29, 36.**
4. **Ripen feed (EC 2.7, SOP 645 g) to the last fruit.** No plain-water finish. Brix 14.6–19 came on Ripen feed.
5. **Humidity ≥ temperature × 2** (VPD ~0.8–1.6 kPa). 21 Sep: 34.8 °C / 59% → splitting. Mist leaves only, last 15:30.
6. **Fe-EDDHA only, never Fe-EDTA.** The 30 Jul Grow stock used Fe-EDTA 13%; run-off pH 7.0–7.8 → iron lock-up, pale leaves.
7. **Calcium leaf spray HST 35–44 only**; no leaf spray while netting forms (HST 45–59). Ripen: MKP 48 g / Calcinit 80 g
   per 16 L pack on alternate days, leaves only, never mixed.
8. **5-day stock batches (25 L)** as normal; 1-day (5 L bucket) and 10-day (50 L) use the same recipe. Strength never changes.
9. **Rolling harvest.** Pick ripe fruit every morning, leave the rest. Test Brix on fruit that split that day — never cut good fruit.
10. **One dry wilting bag:** soak that bag 30–60 min in plain water and clear the dripper (the only plain-water job allowed).
11. **No citric acid.** Citric acid monohydrate (E330) put in the water tower made it smell fishy overnight
    (bacteria feed on it, grow slime, pH drifts back up). Tower drained. Feed self-settles ~pH 6.0; if a mixed
    1,000 L tank reads above 6.3, use the Shopee **pH Down 1 L** bottles in the mixed tank only, a little at a time.

## 2026 crop record

Transplant 30 Jul (HST 0) · boron flush 9 Sep · Sizing 18 Sep (8 days late) · splitting 20 Sep · Ripen 29 Sep · main harvest 3 Oct (HST 65).
Brix: White Kirin Kevin 19.0 · Yellow Kirin Australia F3 17.4 · Sparmanik Manis Candy 15.5 · Yellow Kirin Kevin 14.6.
Fruit 0.7–1.5 kg (target 1.8–2.2). 19 Sep census: 514 fruit, average 786 g.

## Crop 2 (2026–27)

Seeds sown straight into the polybags Sun 25 Oct 2026 (no rockwool nursery). HST 0 = the day the seedlings
have 2–3 true leaves — planned **Wed 4 Nov 2026** (to confirm). From there: Flower Sun 29 Nov · Sizing
Wed 16 Dec · Ripen Sun 3 Jan 2027 · harvest from about Mon 18 Jan 2027.

## Open items

- Indonesian edition: the greenhouse floor-plan picture (page 38) is still English (it is an image).
- Replace draft plant heights (page 58) with our own averages after the next crop.
- Confirm grade A–D limits (page 57).
