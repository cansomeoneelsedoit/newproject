# Sparmanik 4.0 — Indonesian edition: translator brief

Readers are farm staff in Kab. Simalungun, North Sumatra. Some read slowly. Write plain, short, everyday
Indonesian — the same voice as the old Indonesian book v3.4 (`i18n/ref_v34_id/pNN.txt`, text of each page).
Many v3.8/4.0 pages have a matching v3.4 ID page: grep the ref folder for the page's numbers or terms and
**reuse its wording** wherever the English says the same thing. Where 4.0 changed the content, translate the
4.0 English — the English is always the truth; v3.4 is only a wording guide.

## Glossary (use exactly)

| English | Indonesian |
|---|---|
| Grow / Flower / Sizing / Ripen (stages, feeds) | Tumbuh / Bunga / Besar / Matang |
| Stock A / Stock B | Stok A / Stok B |
| drum · tank · jug · bucket | drum · tangki · gayung · ember |
| feed · nutrient | pakan · nutrisi |
| plain water | air biasa |
| run-off · drain | air buangan |
| transplant · seedling · seed | pindah tanam · bibit · benih |
| HST, Day 25 | HST, Hari 25 |
| side shoots | tunas samping |
| hand pollination | penyerbukan tangan |
| fruit set | buah jadi |
| leaf spray / foliar | semprot daun |
| root drench | siram akar |
| netting (skin net) | jaring kulit |
| split / cracking fruit | buah pecah |
| harvest · rolling harvest | panen · panen bertahap |
| greenhouse · row · bag/polybag | rumah kaca · baris · polybag |
| timer · pulse · dripper | timer · siraman · dripper |
| weigh · stir · pour · top up | timbang · aduk · tuang · tambah air sampai penuh |
| Never … | Jangan … / Jangan pernah … |
| Call Boyd | Hubungi Boyd |
| What to watch | Yang diawasi |
| Move on when | Lanjut bila |
| Reference | Referensi |
| Do | Kerjakan |
| tonight · the night before | malam ini · malam sebelumnya |

Keep unchanged: product names (Calcinit, Krista K Plus, Krista MKP, MAG-S, Vitaflex, Fe-EDDHA, Fe-EDTA,
Karate Plus Boroni, SOP, Kalsika, Trichoderma, Tri-Pholate, Yara, Meroke), variety names, people's names,
EC, pH, ppm, Brix, VPD, BER, N P K Ca Mg B Fe, units (g, kg, L, mL, m, °C, %), times (8 · 11am → keep as
written), and **all numbers exactly as in the English, with decimal POINTS** (pH 5.8, EC 2.1 — the meters
and the old book use points; never change 5.8 to 5,8). Keep "(4.0)" markers. Keep symbols → ✓ ✗ ★ · — as they are.

## The file format (PDF pages)

`i18n/en_pages/pNN.json` is a list of text blocks from page NN of the book:
`{"id": 14, "lines": [["Then check: ", "EC", " = this week's number"], ...], "spaced": false}`

Write `i18n/id_pages/pNN.json` — the same list, same `id`s, **the same number of lines per block and the same
number of strings per line** (each string is one styling run: bold/colour/size). Translate each string in
place. You may move words between the runs of a line or between lines of a block to make natural
Indonesian (a block's lines are one paragraph wrapped), and a run may become "" (empty). Never add or drop
a line or a run. Untranslatable runs (numbers, "1", "EC", "→") stay identical. You may omit the `spaced` key.

- Bold runs usually carry the key word — keep the key word in that run.
- Spaced kicker lines like `"S TA R T H E R E · W H AT M O S T D AYS N E E D"` are letter-spaced headings: write
  them normally in CAPITALS, e.g. `"MULAI DI SINI · KEBUTUHAN TIAP HARI"` (the renderer re-spaces them).
- **Length matters**: the text is drawn back into the same spot. Indonesian runs long — aim for no more
  than ~110% of the English length per line. Cut filler words; prefer short words (e.g. "tiap", "bila",
  "sdh" is NOT ok — no SMS abbreviations, but short honest words are).
- Blocks that continue a paragraph from the previous block (e.g. blocks 23 and 24) — translate them together
  so the sentence reads right across the break.

Worked examples: compare `i18n/en_pages/p03.json` with `i18n/id_pages/p03.json`, and p15.

## Check your pages

```
cd /home/user/newproject/sparmanik-sop
ID_OUT=/tmp/claude-0/-home-user/5ecc52ba-a497-5013-8b3e-4955b14f4ff1/scratchpad/check_<you>.pdf python3 scripts/id_render.py <page numbers...>
```
It prints `shape mismatch` (fix the run/line counts) and `shrunk to 0.xx — shorten` (text too long; shorten
the lines of that block until the warning is gone or the scale is ≥ 0.8). Then render each of your pages to
PNG (pymupdf: `fitz.open(pdf)[n-1].get_pixmap(dpi=80).save(...)` into the scratchpad) and LOOK at it: no
English left (except the kept terms), nothing overlapping, nothing cut off. Fix and re-run until clean.
Never edit scripts/ or other people's pages. Don't commit.
