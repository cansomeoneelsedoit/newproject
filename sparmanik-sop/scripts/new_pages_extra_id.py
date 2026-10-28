# Indonesian copy of new_pages_extra.py. Extra 4.0 pages: product photo cards, cost per crop, growth checks, run-off & call Boyd, emergency flush.
# Executed inside new_pages_id.py (uses page(), img(), CSS helpers from there).

def pc(tag, tcls, photo, name, an, desc, pack, warn=''):
    w = '<div class="w">%s</div>' % warn if warn else ''
    return ('<div class="pc"><div class="ph"><img src="%s"></div><div class="tx"><span class="tg %s">%s</span>'
            '<b class="n">%s</b><div class="an">%s</div>%s<div class="an">%s</div>%s</div></div>') % (img(photo), tcls, tag, name, an, desc, pack, w)

P1 = [
 pc('KANTONG A → DRUM A','tA','calcinit','YaraTera Calcinit','kalsium nitrat · 15.5% N · 19% Ca','<b>Pola MERAH.</b> Butiran putih. Menyerap air dari udara dan mengeras — bungkus dua lapis, tutup rapat.','karung 25 kg · Rp 14,800/kg'),
 pc('KANTONG A → DRUM A','tA','kplus','YaraTera Krista K Plus','kalium nitrat · 13.7% N · 38.4% K','<b>Pola HIJAU.</b> Tertulis KRISTA K PLUS. Hanya Tumbuh dan Bunga.','karung 25 kg · Rp 46,000/kg','Bukan Krista MKP — itu Drum B.'),
 pc('KANTONG A → DRUM A','tA','boroni','Meroke Karate Plus Boroni','kalsium nitrat · 15.5% N · 26% CaO · 0.3% B','<b>Karung ORANYE</b>, gambar matahari — satu-satunya karung oranye. 4.0: <b>hanya stok Bunga</b>, dalam kit Boyd.','karung 25 kg · Rp 13,200/kg','Jangan pernah asam borat.'),
 pc('KANTONG B → DRUM B','tB','mkp','YaraTera Krista MKP','mono kalium fosfat · 22.7% P · 28.2% K','<b>Pola BIRU TUA.</b> Tertulis KRISTA MKP.','karung 25 kg · Rp 63,000/kg','Bukan Krista K Plus — itu Drum A.'),
 pc('KANTONG B → DRUM B','tB','mags','Meroke MAG-S','magnesium sulfat · 9.6% Mg · 13% S','<b>Tetesan UNGU.</b> Kristal putih. Paling berat di Drum B.','bungkus 1 kg · Rp 16,000/kg','Bukan SOP — SOP masuk ke tangki.'),
 pc('KANTONG B → DRUM B','tB','vitaflex','Meroke VITAFLEX','unsur mikro · Fe Mn Zn Cu B Mo','<b>Tetesan MERAH MUDA.</b> Hanya 200 g per drum 50 L — timbangan dapur.','bungkus 500 g · Rp 200,000/kg'),
 pc('KANTONG B → DRUM B','tB','fe','Meroke MIKRO Fe 6%','kelat besi EDDHA-Fe','<b>Tetesan MERAH MARUN TUA.</b> Hanya 50 g per drum 50 L — timbangan dapur.','bungkus 500 g · Rp 273,904/kg','Harus EDDHA — jangan pernah Fe-EDTA.'),
]
P2 = [
 pc('LANGSUNG KE TANGKI','tT','sop','Meroke SOP','kalium sulfat · 43% K · 18% S','<b>Panel ungu, burung merah.</b> Larutkan dulu di air hangat. Bunga 310 g · Besar 535 g · Matang 645 g per tangki.','bungkus 1 kg · Rp 25,000/kg','Jangan pernah di drum. Tanpa SOP saat Tumbuh.'),
 pc('SIRAM AKAR · SIRAMAN SENDIRI','tD','kalsika','Kalsika','kalium silikat · 51.6% SiO₂','<b>Sachet BIRU, 100 g.</b> Satu sachet di 300 L air biasa. 4.0: HST 8, 15, 22, 29, 36 saja.','sachet 100 g · Rp 409,866/kg','Jangan setelah HST 36. Jarak 2 hari dari Trichoderma.'),
 pc('SIRAM AKAR · PAKAI GELAS','tD','tricho','Tricoderma+ (Ruminesia)','Trichoderma harzianum + Bacillus, Azotobacter, Pseudomonas','<b>Foil perak, label buah kuning.</b> 1 g per liter, gelas 250 ml per polybag. HST 0, 17, 38, 59.','bungkus 1 kg · Rp 80,485/kg','Jangan pernah di dripper atau tangki pakan.'),
 pc('SEMPROT DAUN','tD','tripholate','YaraVita Tri-Pholate','nutrisi mikro semprot daun','<b>Sachet putih kecil, pola HIJAU.</b> 0.125 g per liter (2 g per tangki semprot 16 L). HST 20, 28, 35, setelah jam 4 sore.','bungkus 25 g · Rp 1,491,600/kg','Stop setelah HST 35 — merusak jaring kulit.'),
]
page(50,'KENALI PRODUK · 1 DARI 2','Rupa tiap produk','Supaya tidak ada yang menimbang kantong yang salah. Foto dari gudang, Sep 2026.',
 '<div class="call r" style="margin-top:0"><b class="t">Dua aturan warna</b><b>Karung Yara:</b> lihat pola sidik jarinya — Calcinit merah, K Plus hijau, MKP biru tua. '
 '<b>Bungkus Meroke:</b> semua putih dengan burung merah — lihat tetesannya: MAG-S ungu, Vitaflex merah muda, Fe merah marun tua. <b>Boroni satu-satunya karung oranye.</b></div>'
 '<div class="prods">' + ''.join(P1) + '</div>')
page(51,'KENALI PRODUK · 2 DARI 2','Produk untuk tangki, siram akar dan semprot','Tidak satu pun dari ini boleh masuk Drum A atau Drum B.',
 '<div class="prods">' + ''.join(P2) + '</div>'
 '<div class="call y"><b class="t">Tiga yang sering tertukar</b><b>Krista MKP vs Krista K Plus</b> — keduanya Yara, putih, bertulisan KRISTA. MKP → Drum B, K Plus → Drum A.<br>'
 '<b>Calcinit vs Karate Plus Boroni</b> — keduanya kalsium nitrat, keduanya Drum A. Boroni mengandung boron: hanya stok Bunga.<br>'
 '<b>SOP vs MAG-S</b> — keduanya bungkus putih 1 kg. SOP → langsung ke tangki. MAG-S → Drum B.</div>'
 '<div class="call r"><b class="t">Dilarang di kebun</b>Asam borat (sekitar 17.5% B, kira-kira 50× lebih kuat dari Boroni) · Fe-EDTA (zat besinya tidak terserap di atas pH 6.5) · Asam sitrat (membuat toren bau amis; pakai pH Down 1 L di tangki campuran, hanya di atas pH 6.3).</div>')

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
rows += '<tr class="chk"><td>Total bahan</td><td></td><td></td><td class="n">%s</td><td></td><td class="n">%s</td></tr>' % (rp(to), rp(tn))
COST_OLD, COST_NEW = to, tn
page(52,'BIAYA KITA · 4.0','Biaya per musim','Seluruh kebun — 1,010 polybag · 2,020 tanaman · pindah tanam sampai buah terakhir. Harga dari daftar harga v1.3 (Sep 2026).',
 '<div class="stats" style="grid-template-columns:repeat(4,1fr)"><div class="st"><b>17</b><span>tangki Tumbuh</span></div><div class="st"><b>19</b><span>tangki Bunga</span></div>'
 '<div class="st"><b>26</b><span>tangki Besar</span></div><div class="st on"><b>18</b><span>tangki Matang (4.0)</span></div></div>'
 '<table><tr><th>Produk</th><th class="n">Harga / kg</th><th class="n">kg v2.5</th><th class="n">biaya v2.5</th><th class="n">kg 4.0</th><th class="n">biaya 4.0</th></tr>' + rows + '</table>'
 '<div class="stats"><div class="st on"><b>%s</b><span>per polybag · %s per tanaman</span></div><div class="st"><b>%s</b><span>dengan upah (Rp 800,000)</span></div><div class="st"><b>+%s</b><span>4.0 vs v2.5</span></div></div>' % (rp(tn/1010), rp(tn/2020), rp(tn+800000), rp(tn-to)) +
 '<div class="call y"><b class="t">Yang berubah dari kartu biaya v2.5</b><b>Matang</b> jalan sampai buah terakhir (4.0): 10 tangki sampai HST 72 plus sekitar 8 lagi sampai HST 82, padahal v2.5 pakai air biasa gratis. '
 '<b>Boroni</b> hanya di Bunga: 1.52 kg, bukan 3.60 kg. <b>Kalsika</b> 5 kali (HST 8–36), bukan 8. Jumlah tangki dan harga lainnya sama seperti v2.5.</div>'
 '<p class="sub">Belum termasuk: benih, cocopeat, listrik, air. Tangki setengah terpakai saat ganti tahap bisa menambah sampai 5% — batch 5 hari (hal. 53) mengurangi itu.</p>')

# ---- growth checks + topping + weight log
CK = [('0','Pindah tanam: 2–3 daun sejati, kokoh, rata','8–12 cm','2–3'),('7','Mulai buang tunas samping (ruas 1–8)','15–20 cm','4–6'),
      ('14','Batang memanjat talinya','35–50 cm','7–9'),('20','Ruas 8 — berhenti buang tunas','70–100 cm','10–12'),
      ('25','Bunga betina pertama, ruas 9–12','110–140 cm','14–16'),('38–40','Satu buah per tanaman; pangkas pucuk di daun 25','180–200 cm','25'),
      ('45','Jaring kulit mulai','—','25'),('55','Buah sekitar 1.2 kg','—','23+'),('60','Hampir ukuran penuh, jaring kulit lengkap','—','22+'),
      ('68','Mulai uji Brix','—','20+'),('75–85','Panen 1.8–2.2 kg, Brix 15+','—','20+')]
ck = ''.join('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td></td></tr>' % c for c in CK)
blank = ''.join('<tr>' + '<td>&nbsp;</td>'*7 + '</tr>' for _ in range(5))
page(58,'CEK MINGGUAN · TIAP SENIN','Apakah tanaman sesuai jadwal?','Ukur 5 tanaman bertanda yang sama — satu per blok varietas plus satu di ujung baris. Dua cek berturut tertinggal → hubungi Boyd.',
 '<table><tr><th>HST</th><th>Tanda penting</th><th>Tinggi (patokan)</th><th>Daun (patokan)</th><th>Kita</th></tr>' + ck + '</table>'
 '<p class="sub">Tinggi dan jumlah daun masih patokan sampai kita punya rata-rata sendiri — tulis angka kita, itu jadi angka 4.1. 2026: rata-rata 786 g di HST 51 adalah tanda awal tanaman tertinggal.</p>'
 '<h2>Pangkas pucuk di daun 25 (HST 38–46)</h2>'
 '<table><tr><th>Tanaman punya</th><th>Tindakan</th></tr><tr><td>Satu buah + 25 daun hijau atau lebih</td><td><b>Pangkas tepat di atas daun 25</b></td></tr>'
 '<tr><td>Satu buah + kurang dari 25</td><td>Belum</td></tr><tr><td>Tidak ada buah</td><td><b>Jangan dipangkas</b> — tidak akan bisa berbunga lagi</td></tr></table>'
 '<p class="sub">Hitung, jangan menebak. Daun dengan tepi cokelat dan tengah hijau tetap dihitung.</p>'
 '<h2>Catatan berat buah — mulai HST 42, 10 buah per varietas</h2>'
 '<table><tr><th>Tanggal</th><th>HST</th><th>Yellow Kevin</th><th>White Kevin</th><th>Manis Candy</th><th>Australia F3</th><th>Nama</th></tr>' + blank + '</table>')

page(59,'AIR BUANGAN · HUBUNGI BOYD','Air buangan dalam ml & kapan menghubungi Boyd','Ukur yang keluar dari satu polybag bertanda: ember di bawahnya pagi hari, ukur dengan gayung sore hari.',
 '<table><tr><th>Tahap</th><th>HST</th><th class="n">Air per polybag</th><th class="n">Target</th><th class="n">Air buangan ml</th></tr>'
 '<tr><td>Adaptasi</td><td>0–7</td><td class="n">0.5 L</td><td class="n">15–20%</td><td class="n"><b>75–100</b></td></tr>'
 '<tr><td>Tumbuh</td><td>8–24</td><td class="n">0.8 L</td><td class="n">15–20%</td><td class="n"><b>120–160</b></td></tr>'
 '<tr><td>Bunga</td><td>25–41</td><td class="n">1.2 L</td><td class="n">15–20%</td><td class="n"><b>175–235</b></td></tr>'
 '<tr><td>Besar</td><td>42–59</td><td class="n">1.6 L</td><td class="n">15–20%</td><td class="n"><b>240–320</b></td></tr>'
 '<tr><td>Matang</td><td>60+</td><td class="n">0.8 L</td><td class="n">10–15%</td><td class="n"><b>80–120</b></td></tr></table>'
 '<p>Kurang beberapa hari → tambah 1 menit di tiap siraman. Lebih → kurangi 1 siraman. Jangan ubah karena satu hari atau hujan.</p>'
 '<div class="call r"><b class="t">Hubungi Boyd hari itu juga bila</b><ul style="margin:2pt 0 0">'
 '<li>EC pakan tidak sesuai angka tahap, atau pH di luar 5.8–6.3, setelah dicampur — <b>pompa tetap mati</b>.</li>'
 '<li>EC air buangan lebih dari 1,000 di atas pakan (mis. di atas 3,400 saat Bunga), atau pH air buangan di atas 6.8.</li>'
 '<li>Air buangan di luar batas tiga hari berturut.</li><li>Lebih dari 50 retak basah, atau buah pecah dua hari berturut.</li>'
 '<li>Polybag kering tidak pulih semalam, atau tiga polybag atau lebih layu.</li><li>Buah cacat, bunga mati, atau tepi daun terbakar.</li>'
 '<li>Getah lengket di batang, atau bercak embun tepung pertama.</li><li>Kelembapan masih di bawah suhu × 2 setelah pengabutan.</li>'
 '<li>Dua cek mingguan berturut tertinggal.</li><li>Apa pun yang Anda ragukan. Berhenti dan tanya — jangan menebak.</li></ul></div>')

page(60,'HANYA DARURAT · BOYD YANG MEMUTUSKAN','Bilas karena salah pakan','Dipakai sekali di 2026 (9 Sep, HST 41) setelah asam borat masuk. Bukan pekerjaan rutin.',
 '<div class="call r" style="margin-top:0"><b class="t">Hanya Boyd yang memulai bilas</b>Bilas = air biasa ke akar. Bila salah waktu, buah pecah. Pakai hanya untuk membuang kesalahan pakan — salah karung, salah dosis.</div>'
 '<ol class="num">'
 '<li>Tandai 5 polybag (beda baris, satu di ujung baris). Ukur EC air buangannya <b>sebelum</b> bilas.</li>'
 '<li>Tangki 1: 1,000 L air biasa pada pH 6. Tanpa pupuk. Jalankan dripper <b>30 menit</b> (sekitar 1 L per polybag).</li>'
 '<li>Sambil berjalan, tuang dengan tangan <b>0.5 L di pinggir</b> tiap polybag — dripper hanya membasahi tengah.</li>'
 '<li>Tangki 2: isi lagi, jalankan 30 menit, terus tuang di pinggir. Tangki 3: isi lagi, jalankan 30 menit. Tiga tangki = sekitar 3 L per polybag.</li>'
 '<li>Tusukkan jari ke tengah dan pinggir 10 polybag. Masih kering di dalam → 2 L dengan tangan di polybag itu saja.</li>'
 '<li>Ukur air buangan <b>terakhir</b> dari 5 polybag yang sama dan kirim angkanya ke Boyd.</li>'
 '<li><b>Sore itu juga</b> buat ulang tangki (EC 1300–1400 dulu, lalu pakan tahap) dan siram seperti biasa. Polybag jangan pernah terendam air biasa semalaman.</li></ol>'
 '<div class="call y"><b class="t">Setelah bilas</b>Terus serbuki setiap bunga baru — serbuk sari rusak berarti lebih sedikit buah jadi. Tanaman akan mundur sekitar 5 hari; Boyd menggeser semua tanggal berikutnya sama banyak.</div>')
