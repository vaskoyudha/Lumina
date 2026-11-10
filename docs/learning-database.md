# Database Belajar dan Simulasi untuk lomba

Keputusan pemilik produk 9 November 2026 mengganti progres lokal dengan progres
per akun. PostgreSQL yang sudah dipakai auth juga menyimpan materi, kuis, skenario,
hasil kuis, penyelesaian modul, dan hasil akhir simulasi. Tidak ada dependensi atau
layanan baru. Pesan yang diperiksa, percakapan, dan data triage tidak ikut disimpan.

## Isi dan perilaku

- `learning_modules`: metadata dan seluruh isi 12 modul, termasuk kuis, contoh,
  anatomi, checklist, dan langkah lapor. Konten memakai JSONB agar bentuk materi
  yang sudah ada tidak perlu dipecah menjadi banyak tabel untuk lomba.
- `simulation_scenarios`: satu skenario siap main, termasuk percabangan, briefing,
  taktik, alat, meter, debrief, dan materi pendukung. Level lain tetap Rencana.
- `learning_progress`: satu baris per pengguna dan modul; jawaban kuis dinilai
  server dengan ambang 60%. Penyelesaian dan lencana tidak hilang saat mengulang
  kuis. Pola yang perlu ditinjau mengikuti jawaban terakhir.
- `simulation_results`: hasil akhir, mode, dan urutan keputusan, dengan UUID
  percobaan agar retry tidak membuat duplikat. Server memeriksa urutan skenario.
- `simulation_intrusion_timers` (migrasi `008`): waktu server menerima kejadian
  perangkat terkompromi di mode tantangan. Hasil gagal karena intrusi memerlukan
  timer milik akun dan skenario yang sama, serta waktu minimum sesuai meter
  (toleransi satu tick). Memasang APK saja belum dianggap akhir misi.
  Timer bukan bukti waktu bermain aktif: waktu jeda di browser tidak dapat
  dibuktikan server. Cleanup menghapus timer terbengkalai setelah sehari;
  timer hasil tersimpan dipertahankan agar retry tetap idempoten.

Server Actions mengambil identitas dari sesi, bukan ID pengguna dari browser.
Profil membaca progres dan 20 hasil simulasi terbaru dari database. Akun berbeda
tidak berbagi progres. Guest boleh membaca dan bermain, tetapi harus masuk untuk
menyimpan. Tidak ada fallback progres ke localStorage; data lama pada perangkat
tidak otomatis diimpor ke akun. Tampilan memberi tahu jika simpan gagal dan
menyediakan retry. Penyimpanan terjadi setelah kuis selesai dan saat akhir misi;
melanjutkan pertanyaan/node di tengah percobaan belum dibuat.

Katalog dan detail dibaca saat permintaan masuk, sehingga impor perubahan konten
tidak membutuhkan rebuild. Build tidak membutuhkan database aktif. Jika database
konten gagal, halaman menampilkan keterangan belum bisa dimuat, bukan materi
hardcoded tersembunyi. Komunitas diskusi membaca database yang sama; panduannya ada di `docs/community.md`.

## Menjalankan lokal

Isi `DATABASE_URL` di `.env.local` dengan PostgreSQL lokal yang sudah tersedia:

```sh
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Migrasi tidak menghapus akun yang ada. Seed `content/competition.json` hanya
mengisi nomor/ID yang belum ada; menjalankannya kembali tidak menimpa materi
yang sudah diedit, akun, atau progres. File TypeScript materi lama adalah fixture
awal untuk tes; halaman pengguna dan runner membaca database.

## Menerapkan ke luminaaa.web.id

Perubahan lokal tidak otomatis mengubah situs. Pada VPS, siapkan image aplikasi
dari branch/commit ini mengikuti `docs/deploy.md`, lalu sebelum mengganti app:

```sh
sh deploy/backup.sh
docker compose --env-file .env.production build app
docker compose --env-file .env.production run --rm --no-deps app npm run db:migrate
docker compose --env-file .env.production run --rm --no-deps app npm run db:seed
docker compose --env-file .env.production up -d --no-build app proxy
```

Gunakan `APP_IMAGE` baru sesuai runbook agar image sebelumnya tetap dapat dipakai
rollback. Database dan volume yang sama harus dipertahankan. Akun deployment
yang sudah ada tetap bisa masuk. Progres baru mengikuti akun itu di semua browser.

Uji dengan dua akun: selesaikan modul dan misi di akun A, buka dari browser lain,
lalu masuk akun B dan pastikan progres A tidak muncul. Refresh profil A harus
tetap menampilkan penyelesaian serta hasil misi.

## Mengubah materi tanpa hardcode

Workbench `/admin` membaca materi terbit dari database, tetapi draf penulis tetap
lokal. Tab Terbit mengunduh JSON; tidak ada endpoint tulis publik atau role CMS.
Salin JSON ke server dan jalankan impor yang tervalidasi:

```sh
npm run db:seed -- modul-10.json --replace
```

Pada Compose, mount file JSON agar proses container dapat membacanya:

```sh
docker compose --env-file .env.production run --rm --no-deps \
  -v "$PWD/modul-10.json:/import/modul-10.json:ro" \
  app npm run db:seed -- /import/modul-10.json --replace
```

`--replace` memperbarui hanya modul/skenario dalam file. Baris yang tidak disebut,
akun, dan progres tidak dihapus. Bentuk file: `{ "modules": [...], "simulations":
[...] }`, sama seperti `content/competition.json`. Impor memvalidasi isi, jawaban
kuis, ID, serta graf skenario; seluruh impor dibatalkan bila gagal. Skenario yang
dirujuk modul harus sudah ada atau disertakan dalam file yang sama.

## Verifikasi

`npm run verify` menjalankan typecheck, lint, tes, dan build. Suite integrasi
`src/lib/learning/store.test.ts` memakai `TEST_DATABASE_URL` terpisah dengan nama
berakhiran `_test`. Jangan arahkan ke database akun nyata. Suite memeriksa perubahan
konten DB, penilaian kuis, isolasi akun, validasi alur, dan retry tanpa duplikasi.
Tanpa URL tes khusus, suite integrasi dilewati.

Bukti lokal sebelum penggantian Darurat oleh Komunitas (9 November 2026): `npm run verify` lulus (872 tes, 22 tes integrasi
dilewati pada gate default), kemudian suite PostgreSQL Belajar/Simulasi dijalankan
terpisah pada `lumina_learning_test` dan 3 tesnya lulus. Migrasi dan seed lokal
berhasil; seed diulang tanpa konflik. `/belajar`, `/belajar/10`, `/simulasi`,
`/simulasi/L1-kurir-apk`, dan `/darurat` merespons HTTP 200 dengan isi yang diharapkan.
Build masih menampilkan tiga peringatan tracing dari scanner lowongan yang sudah
ada. Pemeriksaan visual 380px belum terverifikasi: alat browser menghentikan akses
karena tidak dapat memastikan URL Chrome. Deployment dan login Google nyata
tidak diubah atau diuji di VPS dalam pekerjaan lokal ini.
