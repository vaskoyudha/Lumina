# Audit CRUD dan keamanan — 10 November 2026

Commit yang diperiksa: `fffe09da5155dccdcad965bf233e9308f45f6751` dari `origin/main`.
Branch pemeriksaan: `codex/audit-crud-keamanan`. Pull dilakukan dengan `--ff-only`
dari working tree bersih. Tahap audit awal ini belum mengubah perilaku aplikasi.

**Tindak lanjut:** pemilik meminta review Companion dan perbaikan seluruh temuan.
R1–R6 telah ditangani; rincian perubahan dan verifikasi lanjutan ada di
[laporan perbaikan Companion dan CRUD](2026-11-10-companion-fixes.md).

Kesimpulan: alur CRUD dasar dan pembatasan kepemilikan lulus pengujian, tetapi
belum seluruh perilaku benar. Ada tiga temuan P2 dan tiga temuan P3 di bawah.
Tidak ada bukti pengambilalihan akun, SQL injection, atau akses data akun lain
dari jalur yang diuji. Temuan bukan hasil pemindaian situs produksi.

## Skill dan metode

Sebelum pencarian bug, skill dicari di GitHub. Panduan yang dipakai adalah
[Trail of Bits — sharp-edges](https://github.com/trailofbits/skills/blob/main/plugins/sharp-edges/skills/sharp-edges/SKILL.md),
beserta referensi JavaScript/TypeScript dan autentikasi/sesinya. Fokusnya adalah
batas kepercayaan, konfigurasi kosong/default, otorisasi, dan kegagalan yang
terlihat berhasil. Panduan dibaca langsung; tidak ada pemasangan skill global.
Skill `audit-context-building` juga ditinjau saat seleksi, tetapi tidak diterapkan.

Pemeriksaan mengikuti panggilan dari Server Actions/route ke store dan SQL,
kemudian membuktikan kandidat dengan PostgreSQL sungguhan atau render komponen
React. Panduan Next versi terpasang di
`node_modules/next/dist/docs/01-app/02-guides/data-security.md` ikut dibaca.

## Temuan terkonfirmasi

### R1 · P2 · Laporan ulang setelah moderasi tidak masuk antrean

Lokasi: `src/lib/community/store.ts:256`, `src/lib/community/store.ts:295`,
dan indeks unik di `migrations/004_community.sql`.

1. A membuat topik; B melaporkannya.
2. Moderator memilih tetap tampilkan. Laporan mendapat `reviewed_at`.
3. A mengubah isi topik; B kembali melapor, misalnya karena kini memuat data pribadi.
4. `reportContent()` selesai tanpa error, tetapi topik tidak muncul di antrean.

`ON CONFLICT DO NOTHING` mempertahankan laporan lama yang sudah ditutup.
Pemeriksaan sesudah konflik hanya memastikan baris lama ada, sehingga action
mengembalikan sukses tanpa membuka peninjauan baru. Pola yang sama berlaku
untuk laporan balasan. Ini menghalangi pelapor yang sama meminta peninjauan
terhadap konten yang berubah setelah moderasi.

Saran: definisikan siklus laporan ulang dan buka kembali laporan yang relevan
setelah konten berubah, sambil mempertahankan rate limit dan pencegahan spam.

Bukti: probe database `R1` mengembalikan sukses, lalu mendapati
`moderation queue contains post = false`.

### R5 · P2 · Popup progres menampilkan nol di halaman tanpa provider

Lokasi: `src/components/profil/profile-dialog.tsx:92`,
`src/components/profil/profile-popup.tsx:86`,
`src/components/belajar/account-progress-context.tsx:25`,
`src/components/shell/workspace-frame.tsx:91`.

Komunitas, Companion, dan halaman runner memakai kontrol profil tanpa
`AccountProgressProvider`. Hook jatuh ke `progress: null`; popup lalu
menafsirkannya sebagai nol modul dan tanpa lencana. Permintaan `/api/account`
hanya memuat identitas dan sesi, sehingga tidak mengisi progres tersebut.

Reproduksi: akun menyelesaikan modul 10, lalu membuka Kemajuan dari menu akun
di Komunitas atau Companion. Tampilan dapat menyebut `0 dari 12 modul selesai`
meskipun progresnya tersimpan. Data database tidak terhapus.

Saran: sediakan provider pada semua pemakai dialog, atau ambil progres saat
dialog dibuka. Bedakan kondisi belum dimuat/gagal dimuat dari progres kosong.

Bukti: render `ProfileDialog` tanpa provider menampilkan nol dan tidak pernah
memanggil pembaca progres, meskipun hasil pembaca sudah disiapkan berisi modul 10.

### R4 · P2 · Balasan baru tidak terlihat setelah halaman pertama penuh

Lokasi: `src/components/community/community-editor.tsx:367`,
`src/lib/community/store.ts:143`.

Balasan dibaca dari yang paling lama, 20 per halaman. Sesudah menerbitkan,
editor mengosongkan teks dan hanya menjalankan `router.refresh()` pada URL
yang sama. Pada halaman pertama thread dengan sedikitnya 20 balasan, balasan
baru berada di halaman berikutnya dan tidak tampak setelah submit.

Saran: kembalikan lokasi/ID balasan yang dibuat dan arahkan ke halaman serta
anchor yang tepat, atau tampilkan konfirmasi dengan tautan menuju balasan.
Pertahankan halaman saat mengedit balasan yang sudah ada.

Bukti: PostgreSQL menempatkan balasan ke-21 di halaman 2; render editor
membuktikan submit mengosongkan input dan refresh tanpa navigasi.

### R6 · P3 · Nama berhasil disimpan tetapi trigger akun tetap memakai nama lama

Lokasi: `src/components/profil/profile-popup.tsx:62`,
`src/components/profil/profile-dialog.tsx:155`.

`ProfilePopup` mengambil `/api/session` hanya pada mount. Dialog menyimpan nama
baru ke state miliknya sendiri; perubahan tidak diteruskan ke state akun popup.
`router.refresh()` mempertahankan state Client Component yang tetap terpasang.

Reproduksi: buka profil dari popup dashboard, ganti nama, simpan, lalu tutup
pengaturan. Dialog menunjukkan sukses, tetapi nama aksesibel/inisial trigger
masih memakai nama sebelumnya sampai komponen dimuat ulang.

Saran: teruskan pembaruan identitas ke popup atau gunakan state akun bersama.

Bukti: tes React menyimpan `Nama Baru`, melihat `Nama diperbarui.`, kemudian
masih menemukan tombol `Akun Anggota Lama`; `/api/session` hanya dipanggil sekali.

### R2 · P3 · Filter milik saya/tersimpan diabaikan untuk pengunjung

Lokasi: `src/lib/community/store.ts:90`, `src/lib/community/store.ts:95`.

Jika `mine=1` atau `saved=1` dibuka tanpa sesi, kedua cabang filter dilewati.
Hasilnya adalah feed publik biasa, meski state navigasi masih mengikuti filter
pribadi. Ini bukan kebocoran simpanan pengguna lain: yang tampil tetap topik publik.

Saran: tampilkan permintaan masuk atau hasil kosong untuk filter pribadi ketika
tidak ada sesi, alih-alih diam-diam mengabaikan filter.

Bukti: probe guest dengan marker unik memperoleh satu topik publik untuk kedua
filter, sedangkan pengguna yang masuk dan tidak menyimpannya memperoleh nol.

### R3 · P3 · Hasil gagal simulasi diterima sebelum kondisi gagal dibuktikan

Lokasi: `src/lib/learning/store.ts:140`,
`src/lib/learning/validation.ts:14`.

Kirim hasil mode `tantangan`, `outcome: failed`, dengan satu keputusan
`decision` indeks 2 (memasang APK). Server langsung menerima hasil gagal karena
perangkat dianggap compromised, belum isolated, dan node berikutnya bukan ending.
Belum ada bukti bahwa meter intrusi mencapai batas waktu gagal. Di runner,
pemasangan APK sendiri masih memberi kesempatan pemulihan dan bukan akhir misi.

Kontrak submission tidak membawa bukti waktu atau alasan kegagalan. Penelusuran
graf memeriksa urutan keputusan, tetapi tidak membuktikan kegagalan timer.
Dampak yang terbukti terbatas pada integritas riwayat akun pengirim sendiri;
tidak terbukti memungkinkan pemalsuan hasil sukses atau perubahan akun lain.

Saran: selaraskan aturan terminal server dan runner, serta tentukan batas
kepercayaan untuk hasil timer. Jika harus diverifikasi server, diperlukan
informasi percobaan/waktu yang dapat dipercaya server.

Bukti: probe menyimpan `{ "outcome": "failed", "steps": 1 }` pada skenario
terbit `L1-kurir-apk`, tanpa mengubah konten skenario.

## Hasil verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run verify` | Lulus: typecheck, Biome, 1.006 tes, build |
| Tes integrasi PostgreSQL yang dilewati gate default | Seluruh 39 tes lulus saat dijalankan terpisah |
| Reproduksi UI tambahan | 3 tes React lulus, mengonfirmasi perilaku R4/R5/R6 saat ini |
| Probe PostgreSQL tambahan | R1/R2/R3/R4 terkonfirmasi; isolasi simpanan dan kepemilikan edit lulus |
| `npm audit --omit=dev --json` | 0 advisory pada dependensi produksi saat pemeriksaan |
| HTTP lokal ke build produksi | 14 pemeriksaan sesuai status yang diharapkan |

Integrasi mencakup akun/password, sesi dan pencabutannya, OAuth state, maintenance,
topik/balasan, reaksi, moderasi, penilaian kuis server, isolasi progres,
idempotensi hasil simulasi, dan upsert lowongan/domain cache. CRUD draf admin
ditangani tes default dan memang lokal; bukan endpoint publikasi database.
Tidak semua entitas secara produk menyediakan delete/update publik.

HTTP: `/api/health`, `/`, `/belajar`, `/belajar/10`, `/simulasi`,
`/simulasi/L1-kurir-apk`, `/komunitas`, `/komunitas/baru`, `/masuk`, `/daftar`
merespons 200; `/api/account` dan POST `/api/loker/scan` tanpa sesi 401;
`/api/session` tanpa sesi 200; `/darurat` 404.

Gate masih mencetak tiga peringatan lint, satu informasi lint, dan tiga
peringatan tracing scanner saat build. Semuanya sudah ada pada commit yang
diaudit dan tidak menggagalkan gate.

## Bukti lokal dan batas pemeriksaan

Database runtime di `.env.local` tidak tersambung. Audit membuat cluster
PostgreSQL 18 terpisah, hanya pada loopback port 55438, database
`lumina_crud_audit_test`. Migrasi dan seed dijalankan pada database tersebut.
Tidak ada pengujian destruktif pada database runtime atau VPS. Akun probe dibuat
acak dan dihapus sesudah reproduksi.

Artefak sementara berada di `.cache/crud-audit/` (diabaikan Git):

```powershell
$env:TEST_DATABASE_URL='postgresql://lumina_audit@127.0.0.1:55438/lumina_crud_audit_test'
node .cache/crud-audit/probe.cjs
npx jest --config .cache/crud-audit/jest.config.cjs --runInBand
```

Perintah ini membutuhkan cluster audit yang aktif dan dependensi repo terpasang.
Tes tambahan adalah bukti perilaku bug saat ini, bukan tes yang mengklaim bug
sudah diperbaiki. File bukti lokal tidak merupakan test suite permanen.

Audit tidak mencakup penetrasi situs produksi, OAuth Google end-to-end,
provider AI nyata, crawl lowongan nyata, atau pemeriksaan visual browser 380px.
Pada tahap audit awal tidak ada halaman aplikasi yang diubah, commit, push,
atau deployment. Status perbaikan berikutnya mengikuti laporan tindak lanjut.
