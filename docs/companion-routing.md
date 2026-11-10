# Companion: maksud pengguna sebelum pemeriksaan

Perbaikan 10 November 2026 untuk contoh percakapan pemilik produk.

## Penyebab

- Nama lampiran, kata transaksi (`gopay`, `saldo`, dan lainnya), serta panjang teks
  sebelumnya cukup untuk memilih pemeriksaan. Cerita korban ikut mendapat kartu
  `0/Bersih`, walaupun skor itu hanya berarti aturan tidak mengenali pola teks.
- Pertanyaan dengan lampiran melewati penjaga pertanyaan. Dokumen non-gambar
  hanya diperiksa dari nama berkas; isinya tidak dibaca.
- Riwayat hanya dibawa pada lane `obrolan`; pindah ke `tanya` menghilangkan
  konteks. Prompt pertanyaan juga membatasi jawaban ke daftar modus, seolah
  setiap pertanyaan meminta penjelasan kurikulum.
- Tool lowongan selalu ditawarkan, termasuk saat pengguna meminta bantuan akun.

## Perilaku sesudah perbaikan

- Maksud percakapan dikenali sebelum engine: cerita peretasan/kehilangan uang,
  permintaan materi, pertanyaan, dan pertanyaan lanjutan tidak menghasilkan
  skor atau jejak detektor. Ini bukan detektor baru atau penilaian risiko.
- Pesan yang diserahkan untuk diperiksa, tautan, dan bukti lampiran tetap memakai
  engine deterministik. Seluruh contoh scam benchmark diuji terhadap penjaga
  percakapan agar tidak lolos sebagai obrolan.
- Permintaan penjelasan lampiran mendapat keterangan kemampuan yang sebenarnya.
  Tidak ada OCR, upload dokumen, atau tebakan isi untuk alur ini. Jika pengguna
  memilih pemeriksaan secara eksplisit, lampiran asli tetap disertakan lokal.
- Semua lane percakapan membawa maksimal sepuluh giliran riwayat yang sudah
  difilter klien. Giliran pemeriksaan dan kutipan buktinya tetap dikecualikan.
- Permintaan course mendapat tautan katalog/modul publik yang relevan dengan
  topik pengguna. Tautan ini terpisah dari `relatedModule` hasil scoring.
  Materi dan progres tetap mengikuti PostgreSQL; tidak ada perubahan penyimpanan.
- Pencarian lowongan hanya ditawarkan dan diterima untuk permintaan kerja yang
  eksplisit. Keluhan seperti “gw di hack ajg kok lowongan” tidak mengizinkannya.
- Ketika provider gagal, status konfigurasi/timeout/gagal dibedakan. Cerita
  kehilangan akun tetap mendapat panduan dasar dan satu pertanyaan lanjutan;
  permintaan materi tetap mendapat tautan Belajar.

Perubahan backend bersama ada di `/api/companion/answer`; konsumen memakai
kontrak yang sama. Tidak ada perubahan `ScoreResult`, bobot, atau risk band.
Tidak menambah Darurat, triage, PDF, provider, dependency, atau database baru.

## Batas dan verifikasi

Pengenalan maksud tetap deterministik, bukan pemahaman bahasa tanpa batas.
Kalimat ambigu dengan artefak atau permintaan pemeriksaan dipertahankan di
alur pemeriksaan. Pembacaan isi PDF, dokumen, dan berkas kode belum tersedia.
Tautan materi bukan tutor yang membaca seluruh modul. Respons provider nyata
tetap dapat bervariasi; uji regresi provider menggunakan respons terkontrol.

Uji mencakup kalimat asli dari screenshot, alur cerita → course, riwayat lintas
lane, larangan pengiriman teks pemeriksaan, penolakan tool tak diminta,
penjelasan lampiran, serta pemeriksaan ulang dengan lampiran asli.

Hasil verifikasi: `npm run verify` lulus (1.100 tes lulus, 47 dilewati termasuk
suite database yang memerlukan konfigurasi tersendiri). Build produksi lulus.
Uji browser pada build produksi lokal: viewport dan lebar dokumen sama-sama
380px, tautan materi bertinggi 44px, dan cerita → course tidak menghasilkan
baris detektor atau kartu skor. Provider lokal membalas `not-configured`,
sehingga uji browser ini memverifikasi fallback, bukan kualitas model produksi.

Panduan kehilangan akses/transaksi tidak dikenal dicek pada 10 November 2026:

- [GoPay: akun dibajak](https://gopay.co.id/bantuan/penipuan-perlindungan-keamanan/apa-yang-harus-saya-lakukan-jika-akun-dibajak-orang-lain)
- [GoPay: transaksi tidak dikenal](https://gopay.co.id/bantuan/penipuan-perlindungan-keamanan/bagaimana-cara-melaporkan-transaksi-yang-tidak-dikenal)
- [OJK: pelaporan penipuan melalui IASC](https://ojk.go.id/id/berita-dan-kegiatan/info-terkini/Pages/Satgas-PASTI-Terima-25-Ribu-Pengaduan-Aktivitas-Keuangan-Ilegal-dan-IASC-Berhasil-Blokir-Dana-Terkait-Scam-Rp-724-Miliar.aspx)

Draft learning companion, detection coverage, dan agent architecture yang
dilampirkan dipakai sebagai referensi, bukan perubahan kontrak produk aktif.
Bagian draft tentang progres localStorage dan baseline tanpa tool sudah tidak
sesuai repo; pengembangan validator, enrichment, dan adaptive learning berada
di luar perbaikan percakapan ini.
