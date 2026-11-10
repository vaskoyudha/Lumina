# Database Belajar dan Simulasi — 9 November 2026

Permintaan pemilik produk: materi, kuis, dan skenario dibaca dari PostgreSQL;
progres belajar dan hasil simulasi disimpan per akun, termasuk di deployment.
Ini menggantikan batas progres localStorage pada plan §8 dan aturan auth lama.
Percakapan serta pesan yang diperiksa tetap tidak disimpan; hanya metadata
riwayat Companion (judul, waktu, jumlah giliran, skor terakhir) yang tersimpan
per akun.

1. Versi terkecil: tabel konten JSONB, seed 12 modul dan satu skenario nyata,
   pembaca server untuk katalog/detail, penyimpanan kuis dan hasil simulasi
   berdasarkan sesi. Profil membaca hasil akun yang sama dari perangkat lain.
2. Cut: CMS online, role editor, versioning konten, analitik, dan sinkronisasi
   progres lama. Workbench tetap draf lokal; penerbitan lewat impor JSON CLI.
3. Area bersama: Belajar B, Simulasi C, auth/profil, migrasi, dan deployment.
   Tidak ada perubahan kontrak scoring atau dependensi baru.
4. Selesai: migrasi/seed bisa diulang tanpa menghapus akun/progres; perubahan
   konten DB terlihat tanpa rebuild; kuis dinilai server; progres akun terisolasi;
   hasil simulasi tervalidasi dan tersimpan sekali per percobaan; kegagalan simpan
   terlihat dengan retry; `/darurat` tetap publik; verify dan tes DB lulus.

Penerapan ke situs membutuhkan rilis aplikasi baru, migrasi, dan seed pada VPS.
Pekerjaan lokal ini tidak otomatis mengubah luminaaa.web.id.
