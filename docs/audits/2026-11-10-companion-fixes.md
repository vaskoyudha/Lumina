# Review Companion dan perbaikan CRUD — 10 November 2026

Lanjutan audit commit `fffe09d` pada branch `codex/audit-crud-keamanan`,
kemudian disinkronkan dengan `main` sampai `a59f30c`.
Permintaan pemilik: review AI Companion, petakan bug, lalu perbaiki seluruh
temuan, termasuk R1–R6 dari audit CRUD sebelumnya.

## Peta temuan Companion dan perubahan

| ID | Temuan | Perbaikan |
| --- | --- | --- |
| C1 | OCR tidak memiliki deadline klien; exception FileReader dapat meninggalkan chat sibuk; gambar keempat dan seterusnya terlewat tanpa pemberitahuan | Deadline 23 detik mencakup pembacaan file/upload, error/abort menjadi hasil gagal, dan gambar yang tidak diperiksa dilaporkan |
| C2 | Composer mencabut blob URL yang masih dipakai pratinjau transcript | Transcript memegang URL sendiri dan mencabutnya saat komponen ditutup |
| C3 | Setelah “Periksa sebagai pesan”, pertanyaan asal dan jawaban yang mungkin mengutipnya masih masuk history model | Pasangan giliran asal ikut ditandai privat dan dikeluarkan dari permintaan berikutnya |
| C4 | Follow-up setelah pemeriksaan bersih mengambil penjelasan/taktik dari pemeriksaan berisiko sebelumnya | Digest dan penjelasan berasal dari pemeriksaan terakhir yang sama; follow-up bersih tidak membawa taktik lama |
| C5 | SSE dengan CRLF tertahan sampai koneksi tutup; `[DONE]` tidak menghentikan pembacaan | Event CRLF diproses bertahap, DONE menutup hasil dan membatalkan upstream; cleanup dijalankan sekali |
| C6 | Pemberitahuan transfer data hanya `sr-only` dan tidak menjelaskan pengiriman pertanyaan/riwayat obrolan | Catatan terlihat di composer, membedakan pesan yang diperiksa, pertanyaan/obrolan, digest, dan gambar |
| C7 | Teks OCR tidak masuk konteks Conversation Agent bila giliran gambar tidak memiliki teks ketikan | Konteks lokal diambil dari sumber pemeriksaan tersimpan dalam state, termasuk OCR dan nama lampiran |
| C8 | Balasan khusus tool tanpa teks masuk history sebagai string kosong, lalu ditolak schema pada chat berikutnya | History hanya memuat giliran dengan teks nonkosong |
| C9 | Pertanyaan konsep lebih dari 2.000 karakter dikirim lalu ditolak route tanpa penjelasan batas | Chat memberi batas yang jelas tanpa mengirim payload tidak valid; teks pemeriksaan tetap dapat lebih panjang |
| C10 | Kartu “Riwayat Agen” menampilkan seed aktivitas dan waktu fiktif; sapaan akun selalu “Tamu” | Kartu hanya memuat stage yang sudah selesai (`selesai` atau `temuan`) dari trace nyata dalam memori tab, menampilkan durasi terukur, dan membuka percakapan asal; sapaan memakai nama akun |
| C11 | Fitur metadata riwayat dari main terbaru menyalin awal pesan/nama lampiran menjadi judul di database | Klien hanya mengirim label topik publik; server menerapkan allowlist saat menulis dan membaca; migrasi 010 membersihkan judul lama tanpa menghapus riwayat |
| C12 | Pemanggilan tool template laporan tanpa pemeriksaan sebelumnya dapat menghasilkan balasan kosong | Chat menjelaskan bahwa pesan perlu diperiksa lebih dahulu, tanpa membuka template dengan temuan yang tidak tersedia |

Klasifikasi: C3, C6, dan C11 menyentuh kontrak privasi; C1, C4, C5, C7, C8, dan C12
mempengaruhi ketepatan/ketersediaan alur; C2 dan C9 mempengaruhi pengalaman pengguna.
Perbaikan C3 melindungi permintaan berikutnya; data yang sebelumnya dikirim
ketika pengguna masih menganggapnya pertanyaan tidak dapat ditarik kembali.

Pengiriman dikunci sebelum pekerjaan async pertama sehingga callback berulang
tidak memulai permintaan bersamaan. Request, timer, dan blob URL dibersihkan saat
unmount. Jawaban yang sudah selesai tidak disegel ulang oleh error fase summary
yang datang belakangan. Semua perubahan ini mempertahankan scoring deterministik.

## Penutupan temuan CRUD

| ID | Perubahan | Bukti regresi |
| --- | --- | --- |
| R1 | Laporan yang sudah ditinjau dibuka lagi setelah konten berubah; laporan pending/duplikat konten yang sama tidak digandakan | Integrasi PostgreSQL untuk topik dan balasan |
| R2 | Filter `mine`/`saved` tanpa sesi menghasilkan daftar kosong | Integrasi PostgreSQL dan isolasi simpanan dua akun |
| R3 | Kegagalan intrusi memerlukan receipt waktu server milik akun/skenario yang sama; prefix satu langkah langsung ditolak | Integrasi menolak receipt yang belum cukup lama/milik akun lain, lalu menerima receipt yang sudah berlalu dan retry tanpa duplikasi |
| R4 | Store mengembalikan halaman dan ID balasan; editor menuju halaman/anchor tersebut setelah membuat balasan | Integrasi balasan ke-21 dan tes React navigasi |
| R5 | Popup/dialog tanpa provider belajar mengambil progres akun dari endpoint autentikasi dan menampilkan loading/error dengan jujur | Tes React untuk progres modul 10, jumlah modul dari DB, dan kegagalan pembacaan; route menguji sesi, isolasi, dan no-store |
| R6 | Perubahan nama dari dialog diteruskan ke state popup | Tes React menyimpan nama, menutup dialog, dan memeriksa nama/inisial trigger |

Endpoint bersama baru: GET `/api/account/progress`, berisi progres akun dari
sesi dan jumlah modul, dengan `Cache-Control: no-store`. Tidak menerima ID akun
dari browser dan tidak mengembalikan detail database saat gagal.

Migrasi baru: `008_simulation_intrusion_timers.sql` dan
`010_companion_private_titles.sql`. Migrasi 010 mengganti seluruh label riwayat
yang sudah ada dengan “Percakapan Companion”, karena label lama dapat berisi
kutipan pesan. ID, pemilik, waktu, jumlah giliran, dan risiko tetap tersedia.
Runner mengirim kejadian
perangkat terkompromi pada mode tantangan melalui Server Action yang memeriksa
sesi, memvalidasi input, dan membatasi frekuensi. Receipt tidak direset oleh retry.
`db:cleanup` menghapus receipt terbengkalai setelah sehari; receipt untuk hasil
tersimpan dipertahankan. Replay juga menolak keputusan setelah batas panik tercapai.

Waktu server memberi batas minimum kegagalan intrusi, dengan toleransi satu tick;
server tetap tidak dapat membuktikan waktu bermain aktif atau jeda di browser.
Hasil simulasi adalah riwayat belajar akun sendiri, bukan sertifikasi anti-cheat.

## Verifikasi dan penerapan

Tes regresi tinggal di samping sumber: `companion-regressions.test.tsx`,
`vision-client.test.ts`, `voice-stream.test.ts`, tes profil, tes komunitas,
tes route progres, tes runner, serta integrasi store komunitas dan belajar.
Provider AI diganti stub pada pengujian agar tidak mengirim data ke provider nyata.
Penemuan C10 berasal dari pemeriksaan visual browser setelah gate pertama lulus;
dua tes React tambahan memeriksa keadaan kosong yang jujur dan navigasi riwayat nyata.

Hasil akhir:

- `npm run verify` lulus setelah integrasi main: typecheck, Biome,
  **1.078 tes**, dan build produksi.
- Seluruh **47 tes integrasi PostgreSQL** lulus pada database terpisah
  `lumina_crud_audit_test`, termasuk metadata riwayat Companion. Total 1.125 tes
  tercakup oleh gate dan run integrasi terpisah.
- Chrome headless pada **380 × 844** menguji build produksi dengan dua akun
  sintetis dan sesi database: progres akun dari Companion, perubahan nama dan
  trigger profil, terbitkan/edit topik, balasan ke-21 beserta halaman/anchor,
  laporkan → setujui moderator → edit → laporkan ulang, serta hapus oleh penulis.
  Riwayat agen nyata juga diuji membuka percakapan asal setelah memulai chat baru.
  Setelah sinkronisasi main, browser juga membuktikan metadata tersimpan tanpa
  kutipan pesan, reload hanya memulihkan label, dan tool model membuka template
  laporan yang dapat diisi pada lebar 380px.
- Companion, hasil pemeriksaan, dialog progres, editor komunitas, halaman kedua
  balasan, dan antrean moderasi diperiksa visual; lebar document/body tetap
  380px. Tidak ada uncaught browser error pada alur CRUD tersebut.
- Stub HTTP dipakai untuk provider bahasa di browser; tindakan komunitas,
  profil, sesi, dan PostgreSQL memakai backend sungguhan. Tidak ada panggilan
  AI nyata atau pengujian ke website produksi.
- `git diff --check` lulus. Tiga warning lint, satu info lint, serta tiga
  warning tracing scanner saat build tetap merupakan temuan bawaan baseline.

Screenshot dan harness browser berada di `.cache/crud-audit/`, diabaikan Git.
Seluruh akun browser sintetis dan data turunannya dibersihkan setelah verifikasi.

Sebelum menjalankan versi ini pada database tujuan, jalankan `npm run db:migrate`.
Tidak ada deployment VPS dalam pekerjaan ini. Perbaikan audit tidak mengubah
engine `lib/scoring/` atau kontrak scoring. Kontrak tool/laporan dari main tetap
dipertahankan. Isi pesan, lampiran, dan transkrip Companion tidak ditambahkan
ke database atau localStorage; hanya metadata dengan label topik publik yang
dipersistenkan sesuai pengecualian produk terbaru. Perubahan melintasi stream A/B/C/D
serta permukaan bersama profil/API/migrasi/cleanup.
