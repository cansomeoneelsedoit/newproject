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

page('','SPARMANIK 4.0 · 6 OKT 2026','Yang baru di Sparmanik 4.0','Ini buku v3.8 ditambah pelajaran musim 2026. Bila keduanya berbeda, 4.0 ikut 2026.',
'''<table><tr><th>#</th><th>Topik</th><th>Kata v3.8</th><th>Aturan 4.0</th><th>Alasan (2026)</th></tr>
<tr><td><b>D1</b></td><td>Siram akar silikon</td><td>Tiap minggu HST 8–57</td><td><b>HST 8, 15, 22, 29, 36 saja</b></td><td>Siram akar HST 50 → buah pecah esoknya</td></tr>
<tr><td><b>D2</b></td><td>Akhir musim</td><td>Air biasa mulai HST 72</td><td><b>Pakan Matang sampai buah terakhir</b></td><td>Brix 14.6–19 tercapai dengan pakan Matang</td></tr>
<tr><td><b>D3</b></td><td>Boroni di Besar</td><td>800 g, boleh</td><td><b>Tidak — hanya stok Bunga</b></td><td>Kerusakan boron musim ini</td></tr>
<tr><td><b>D4</b></td><td>Semprot daun</td><td>Ca semprot daun sampai HST 55</td><td><b>Ca HST 35–44 · tidak ada HST 45–59 · Matang: MKP / Calcinit selang hari</b></td><td>Jaring kulit terbentuk HST 45–60</td></tr>
<tr><td><b>D5</b></td><td>Batch stok</td><td>50 L (10 hari)</td><td><b>25 L (5 hari) biasa · 1 & 10 hari juga bisa</b></td><td>Lebih sedikit terbuang bila rencana berubah</td></tr></table>
<div class="call r"><b class="t">Tiga aturan emas</b><ol style="margin:2pt 0 0 14pt;padding:0">
<li><b>Asam borat dilarang.</b> Boron hanya dari Karate Plus Boroni, dalam kit timbangan Boyd. Asam borat membuat 19% buah 2026 cacat.</li>
<li><b>Setelah buah jadi, tanpa air biasa.</b> Tanpa siram gelas, tangki air biasa, atau silikon. Semuanya memecah buah.</li>
<li><b>Kelembapan ≥ suhu × 2.</b> Udara kering menutup daun, menghentikan gula, memecah buah (hal. 56).</li></ol></div>
<div class="call y"><b class="t">Zat besi: Fe-EDDHA saja, jangan pernah Fe-EDTA</b>Stok Tumbuh 30 Jul 2026 memakai Fe-EDTA 13%. Di atas pH 6.5 zat besinya tak terserap; air buangan kita 7.0–7.8 → daun muda pucat. Tiap Stok B pakai MIKRO Fe 6% EDDHA, 50 g per 50 L.</div>
<h2>Bagian buku yang berubah</h2>
<table><tr><th>Halaman</th><th>Perubahan</th></tr>
<tr><td>10 · 27 · 42</td><td>Tanpa Boroni di stok Besar</td></tr>
<tr><td>12 · 13 · 19 · 26 · 28</td><td>Silikon berhenti di HST 36</td></tr>
<tr><td>13 · 29 · 31 · 34–36</td><td>Pakan Matang sampai buah terakhir, tanpa akhir air biasa</td></tr>
<tr><td>26 · 34–36</td><td>Semprot daun kalsium HST 35–44 saja</td></tr><tr><td>9 · 11 · 12 · 13</td><td>Waktu v4.6: Trichoderma HST 0, 17, 38, 59 · Tri-Pholate HST 20, 28, 35</td></tr>
<tr><td><b>50 – 62 (baru)</b></td><td>Kartu foto produk · biaya per musim · batch 1 / 5 / 10 hari · kelembapan · panen & grading · cek pertumbuhan · air buangan & hubungi Boyd · bilas darurat · pelajaran 2026 · daftar cek</td></tr></table>''')

def g(x):
    if x<1000: return f'{x} g'
    return f'{x/1000:.3f}'.rstrip('0').rstrip('.')+' kg'
def rec(name,cls,ec,sop,A,B):
    def rows(items,lab):
        s=''; t=0
        for n,v in items:
            s+=f'<tr class="{lab}"><td>{n}</td><td class="n">{g(v)}</td><td class="n five">{g(v*5)}</td><td class="n">{g(v*10)}</td></tr>'; t+=v
        s+=f'<tr class="chk {lab}"><td>Cek berat {lab}</td><td class="n">{g(t)}</td><td class="n">{g(t*5)}</td><td class="n">{g(t*10)}</td></tr>'
        return s
    return f'''<h2><span class="badge {cls}">{name}</span> &nbsp;EC {ec} · {sop}</h2>
<table><tr><th>Produk</th><th class="n">1 hari · ember 5 L</th><th class="n">5 hari · 25 L</th><th class="n">10 hari · 50 L</th></tr>
<tr><td colspan="4" style="background:#FDEBDD;font-weight:700;font-size:8pt">STOK A · oranye</td></tr>{rows(A,'A')}
<tr><td colspan="4" style="background:#E1ECF8;font-weight:700;font-size:8pt">STOK B · biru</td></tr>{rows(B,'B')}</table>'''
B4=lambda m,s: [("Krista MKP",m),("Meroke MAG-S",s),("Meroke Vitaflex",20),("MIKRO Fe 6% EDDHA",5)]
page(53,'NUTRISI · 4.0 · UKURAN BATCH','Buat stok 1, 5 atau 10 hari','Resep sama, kekuatan sama — hanya jumlahnya berubah. Tiap tangki 1,000 L tetap dapat 5 L A + 5 L B.',
'''<div class="stats"><div class="st"><b>1 hari</b><span>ember 5 L A + B · 1 tangki</span></div><div class="st on"><b>5 hari</b><span>drum 25 L · biasa</span></div><div class="st"><b>10 hari</b><span>drum 50 L · 10 tangki</span></div></div>
<table><tr><th>Batch</th><th>Pakai bila</th></tr><tr><td>1 hari</td><td>Hari ganti tahap · uji perbaikan · hari terakhir musim. Tuang <b>seluruh</b> isi ember ke tangki.</td></tr>
<tr><td><b>5 hari</b></td><td><b>Tiap minggu.</b> Stok segar, sedikit terbuang bila rencana berubah.</td></tr><tr><td>10 hari</td><td>Hanya bila tahap masih 10+ hari dan tidak ada rencana ganti.</td></tr></table>'''
+rec('S1 TUMBUH','grow','2.1','tanpa SOP',[("YaraTera Calcinit",870),("Krista K Plus",345)],B4(220,570)))
page(54,'NUTRISI · 4.0 · UKURAN BATCH','Batch Bunga & Besar','Di bawah 1 kg → timbangan dapur yang terbaca sampai 1 g. Cara campur sama seperti hal. 15.',
rec('S2 BUNGA','flower','2.4','SOP 310 g / tangki',[("YaraTera Calcinit",945),("Karate Plus Boroni (kit Boyd)",80),("Krista K Plus",115)],B4(230,605))
+rec('S3 BESAR','sizing','2.55','SOP 535 g / tangki · tanpa Boroni',[("YaraTera Calcinit",945)],B4(210,625)))
page(55,'NUTRISI · 4.0 · UKURAN BATCH','Batch Matang & kit','Matang punya drum sendiri (v3.8 hal. 30) — bukan drum Besar ditambah SOP.',
rec('S4 MATANG','ripen','2.7','SOP 645 g / tangki',[("YaraTera Calcinit",895)],B4(185,625))
+'''<div class="call y"><b class="t">Cara terbaik: kit yang sudah ditimbang</b>Boyd menimbang satu kantong per drum per batch, berlabel mis. “Matang · A · 5 hari”. Staf tuang kantongnya, tambah air sampai garis 25 L dan aduk sampai bening. Boroni selalu hanya dalam kit.</div>
<div class="call r"><b class="t">Jumlah kecil itu penting</b>Di ember 1 hari, Fe-EDDHA hanya 5 g dan Vitaflex 20 g — salah 1 g berarti salah 20%. Pakai timbangan dapur, atau kit dari Boyd.</div>''')

exec(open(os.path.join(ROOT,'scripts','new_pages_extra_id.py'),encoding='utf-8').read())
cl=''.join(f'<tr><td>{t} °C</td><td class="n"><b>{lo}%</b></td><td class="n">{hi}%</td></tr>' for t,lo,hi in [(28,56,79),(30,60,81),(32,64,83),(34,68,85),(36,72,87)])
page(56,'IKLIM · 4.0','Kelembapan ≥ suhu × 2','v3.8 disiapkan untuk rumah kaca lembap. September 2026 menunjukkan risiko lain: siang yang panas dan kering.',
f'''<p>Di bawah batas ini udara terlalu kering: daun menutup, berhenti membuat gula dan menarik air begitu kuat sampai buah pecah. Aturan ini menjaga VPD sekitar 0.8–1.6 kPa.</p>
<table><tr><th>Suhu</th><th class="n">Batas bawah — kurang: kabutkan daun</th><th class="n">Terlalu basah — lebih: stop, buka ventilasi</th></tr>{cl}</table>
<h2>Tiap hari dengan alat ukur Krisbow</h2>
<ol class="num"><li>Baca dan foto pada <b>08:00 · 10:00 · 12:00 · 14:00</b>. Angka 12:00–14:00 paling penting.</li>
<li>Terlalu kering → kabutkan <b>daun saja</b> dengan tangki semprot, 5–10 menit. Cek lagi setelah 30 menit. Jangan ke buah, jangan basahi polybag.</li>
<li>Di atas 80% → stop pengabutan, semua ventilasi dibuka, kipas dinyalakan.</li>
<li>Pengabutan terakhir <b>15:30</b>, supaya daun kering sebelum malam.</li>
<li>Malam hari buka ventilasi dan pintu bila bisa: malam yang sejuk menjaga gula di buah.</li></ol>
<div class="call g"><b class="t">Angka 2026</b>21 Sep: 34.8 °C pada 59% — VPD sekitar 2.3 kPa, jauh terlalu kering; buah sudah pecah sehari sebelumnya.<br>25 Sep 10:30: 31.7 °C pada 71.8% — VPD sekitar 1.3 kPa, ideal.</div>''')

page(57,'PANEN · 4.0','Panen bertahap & grading','Tiap pagi petik buah yang matang saja; sisanya biarkan di pakan Matang agar makin manis.',
'''<div class="stats"><div class="st"><b>Brix 15+</b><span>lulus</span></div><div class="st"><b>1.8–2.2 kg</b><span>target berat</span></div><div class="st"><b>06:00–09:30</b><span>petik saat sejuk</span></div></div>
<h2>Tiap pagi — telusuri semua baris</h2>
<table><tr><th>Buah</th><th>Tindakan</th></tr>
<tr><td>Pecah atau busuk</td><td>Potong → karung → <b>keluar dari rumah kaca</b>. Hitung.</td></tr>
<tr><td>Matang: jaring penuh · bercak bawah kuning · harum · lepas dengan putaran pelan</td><td><b>Petik</b> pakai gunting, tangkai T pendek. Taruh di teduh, satu lapis. Hitung + timbang.</td></tr>
<tr><td>Selain itu</td><td><b>Jangan dipotong.</b> Biarkan sampai matang.</td></tr></table>
<div class="call y"><b class="t">Uji Brix tanpa membuang buah</b>Mulai HST 68 uji buah yang <b>pecah hari itu</b>, dagingnya masih bersih. Ambil sari dari tengah daging, bukan rongga biji. Jangan potong buah bagus untuk uji. Pecahan lama dan daging cokelat memberi angka salah.</div>
<h2>Grading A–D</h2>
<table><tr><th>Kelas</th><th>Berat</th><th>Brix</th><th>Kulit</th><th>Untuk</th></tr>
<tr><td><b>A</b></td><td>1.8 – 2.2 kg</td><td>15+</td><td>Bersih, jaring penuh</td><td>Premium</td></tr>
<tr><td><b>B</b></td><td>1.2 – 1.8 atau di atas 2.2 kg</td><td>14+</td><td>Bersih atau sedikit cacat</td><td>Kelas dua</td></tr>
<tr><td><b>C</b></td><td>Di bawah 1.2 kg</td><td>13+</td><td>Ada cacat, daging baik</td><td>Jual lokal</td></tr>
<tr><td><b>D</b></td><td>—</td><td>—</td><td>Pecah, busuk, daging cokelat, tersengat lalat</td><td>Musnahkan di luar</td></tr></table>
<p>Jangan dicuci. Catat tiap buah dengan ID tanamannya. Tangki dan timer tetap di Matang sampai buah terakhir dipetik.</p>''')

page(61,'MASALAH · PELAJARAN 2026','Yang salah di 2026 — dan perbaikannya','Tambahkan ini ke panduan gambar di hal. 47.',
'''<table><tr><th>Yang terlihat</th><th>Penyebab 2026</th><th>Kerjakan</th><th>Hubungi Boyd bila</th></tr>
<tr><td><b>Banyak pecah baru yang basah sekaligus</b></td><td>Siram akar air biasa, siram gelas, udara kering</td><td>Buang buah pecah; cek tidak ada yang menambah air; kabutkan daun</td><td>&gt; 50 retak, atau 2 hari berturut</td></tr>
<tr><td><b>Retak lama kering bergabus, bercak cokelat</b></td><td>Kerusakan boron lama</td><td>Biarkan yang kering; potong yang basah atau bau</td><td>Daging cokelat di buah sehat</td></tr>
<tr><td><b>Satu polybag layu, cocopeat kering di dalam</b></td><td>Dripper tersumbat / cocopeat menolak air</td><td>Rendam polybag itu 30–60 menit di air biasa, bersihkan dripper</td><td>Belum pulih besok pagi, atau 3+ polybag</td></tr>
<tr><td><b>Daun muda pucat, tulang daun hijau</b></td><td>Fe-EDTA pada pH air buangan tinggi</td><td>pH air buangan tiap minggu; Fe-EDDHA saja</td><td>pH air buangan di atas 6.8</td></tr>
<tr><td><b>Buah cacat, bunga mati</b></td><td>Asam borat, bukan Boroni</td><td>Terus serbuki bunga baru; cek karung untuk Stok A</td><td>Selalu, hari itu juga</td></tr>
<tr><td><b>Toren air bau amis</b></td><td>Asam sitrat memberi makan bakteri</td><td>Kuras dan bilas toren; pH Down saja, di tangki campuran, hanya di atas 6.3</td><td>Selalu, hari itu juga</td></tr>
<tr><td><b>Seluruh rumah kaca layu tengah hari</b></td><td>34.8 °C, kelembapan 59%</td><td>Kabutkan daun, naungan, ventilasi (hal. 56)</td><td>Masih layu jam 16:00</td></tr>
<tr><td><b>Buah tampak matang, Brix di bawah 12</b></td><td>Belum matang, atau rusak</td><td>Biarkan baris itu lebih lama</td><td>Panen utama dalam 3 hari</td></tr></table>
<div class="call r"><b class="t">Jangan pernah (baru di 4.0)</b><ul style="margin:2pt 0 0">
<li>Asam borat, Fe-EDTA atau asam sitrat di mana pun di kebun.</li>
<li>Air biasa, siram gelas atau silikon setelah buah jadi (HST 38).</li>
<li>MKP dan Calcinit dalam satu tangki semprot. Semprot daun HST 45–59.</li>
<li>Memotong buah bagus untuk uji Brix.</li></ul></div>''')

page(62,'CATATAN · MUSIM 2026','Musim 2026 & pindah tanam berikutnya','Pindah tanam 30 Jul 2026 (HST 0) · panen utama 3 Okt (HST 65).',
'''<div class="stats" style="grid-template-columns:repeat(4,1fr)"><div class="st"><b>19.0</b><span>White Kirin</span></div><div class="st"><b>17.4</b><span>Australia F3</span></div><div class="st"><b>15.5</b><span>Manis Candy</span></div><div class="st"><b>14.6</b><span>Yellow Kirin</span></div></div>
<p>Buah pecah berhenti setelah EC dijaga stabil tanpa air biasa. Buah tetap kecil (0.7–1.5 kg) karena asam borat, bilas boron, zat besi terkunci oleh Fe-EDTA, panas, dan ganti ke Besar terlambat 8 hari.</p>
<table><tr><th>Tanggal</th><th>HST</th><th>Kejadian</th></tr>
<tr><td>3 Okt</td><td>65</td><td>Panen utama; petik bertahap sebelum dan sesudahnya</td></tr>
<tr><td>29 Sep</td><td>61</td><td>EC Matang 2700, semprot MKP, siram gelas dihentikan</td></tr>
<tr><td>25 Sep</td><td>57</td><td>Silikon dibatalkan; tangki 2505 / pH 5.8</td></tr>
<tr><td>20–21 Sep</td><td>52–53</td><td>Buah pecah setelah silikon 19 Sep; satu baris Kirin hilang; 34.8 °C / 59%</td></tr>
<tr><td>19 Sep</td><td>51</td><td>514 buah ditimbang, rata-rata 786 g</td></tr>
<tr><td>18 Sep</td><td>50</td><td>EC Besar 2550 dimulai (terlambat 8 hari)</td></tr>
<tr><td>9 Sep</td><td>41</td><td>Bilas boron, kembali ke Bunga 2400 tanpa boron</td></tr>
<tr><td>sebelum 8 Sep</td><td>—</td><td>Asam borat dipakai, bukan Boroni</td></tr>
<tr><td>30 Jul</td><td>0</td><td>Pindah tanam; stok Tumbuh dibuat dengan Fe-EDTA 13%</td></tr></table>
<h2>Sebelum pindah tanam berikutnya</h2>
<ul style="list-style:'☐  '">
<li>Staf sudah dijelaskan perubahan 4.0 (halaman depan)</li><li>Asam borat dan Fe-EDTA disingkirkan dari kebun</li>
<li>Air baku dan pakan diuji lab</li><li>Cocopeat dicuci, diistirahatkan dan di-buffer ulang (hal. 6)</li>
<li>Kit 5 hari yang sudah ditimbang untuk Tumbuh dan Bunga siap</li><li>Tri-Pholate, Tricoderma+ dan Kalsika tersedia (hal. 52)</li><li>Krisbow, refraktometer, pen EC dan pH dikalibrasi</li>
<li>Perangkap lalat buah dan perangkap lengket tersedia</li></ul>''')
pages.sort(key=lambda h: 0 if 'class="pn"' not in h else int(h.split('class="pn">')[1].split('<')[0]))
open(os.path.join(ROOT,'build','new_pages_id.html'),'w',encoding='utf-8').write(f'<!doctype html><html><head><meta charset="utf-8">{CSS}</head><body>{"".join(pages)}</body></html>')
print(len(pages))
