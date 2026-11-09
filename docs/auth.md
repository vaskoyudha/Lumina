# Autentikasi Lumina

Akun email/password dan Google OAuth disimpan di PostgreSQL. Progres belajar dan hasil simulasi disimpan per akun di PostgreSQL; percakapan tidak disimpan di database. Pertanyaan obrolan dan gambar OCR dapat dikirim ke provider yang dikonfigurasi; isi pesan yang diperiksa tetap diskor di perangkat. Node 24 diperlukan.

## Menjalankan

Siapkan PostgreSQL dan database aplikasi, lalu isi `DATABASE_URL` di `.env.local`. Jalankan `npm ci`, `npm run db:migrate`, `npm run db:seed`, dan `npm run dev`. Migrasi harus dijalankan sebelum aplikasi menerima trafik; aplikasi tidak membuat tabel otomatis. Pool dibuka saat dibutuhkan, maksimal lima koneksi per proses. `npm run db:cleanup` menghapus sesi, state OAuth, dan penghitung kedaluwarsa; jalankan berkala melalui cron.

Database menyimpan identitas akun, hash password scrypt, hash token sesi, state OAuth sementara dan penghitung limit. Password dan token sesi mentah tidak disimpan. Cookie sesi HttpOnly, SameSite=Lax, Secure di production, berlaku 24 jam. Login merotasi sesi lama secara atomik; logout mencabut sesi. Email dinormalisasi dan unik. Akun Google diikat ke `sub`; email yang sama tidak otomatis menggabungkan akun. Pemulihan password dan verifikasi email belum tersedia.

## Google OAuth

Buat OAuth Client ID jenis Web application di Google Cloud, konfigurasi consent dan test users bila diperlukan, lalu daftarkan redirect URI `AUTH_URL/api/auth/google/callback`. Isi `AUTH_URL`, `GOOGLE_CLIENT_ID`, dan `GOOGLE_CLIENT_SECRET`. `AUTH_URL` adalah origin publik kanonik, HTTPS di production (contoh lokal `http://localhost:3000`). Alur menggunakan authorization code, state sekali pakai terikat cookie, PKCE S256, nonce, dan verifikasi signature/issuer/audience/expiry ID token. Email Google harus terverifikasi; token Google tidak disimpan.

## Akun demo

Halaman `/masuk` menampilkan tombol "Masuk dengan akun demo" yang dapat dipakai setelah `LUMINA_DEMO_EMAIL` dan `LUMINA_DEMO_PASSWORD` diisi. Keduanya hanya dibaca di server oleh server action; password tidak pernah dikirim ke browser dan tidak ada password literal di kode. Bila salah satu kosong, tombol tetap tampil tetapi menolak dengan pesan "Akun demo belum dikonfigurasi." Login demo memakai akun PostgreSQL sungguhan: akun dibuat otomatis saat pertama dipakai jika belum ada, lalu diautentikasi lewat jalur email/password yang sama, termasuk rotasi sesi dan batas percobaan. Jangan mengisi kredensial ini di lingkungan yang tidak boleh memiliki akun bersama.

## Batas dan ketersediaan

Login dibatasi 10 percobaan per email dan daftar 5 per email per 15 menit, ditambah batas global. Endpoint AI dibatasi 10 teks dan 3 vision per IP per menit, serta batas global `LUMINA_AI_GLOBAL_LIMIT` per menit (default 200). `TRUST_PROXY=true` hanya boleh dipasang saat app hanya dapat dicapai melalui Caddy yang menimpa header `X-Lumina-Client-IP`. Tanpa itu semua pengguna anonim berbagi satu kunci; `X-Forwarded-For` tidak dipercaya. Jika DB tidak tersedia, login dan AI yang membutuhkan limit tidak tersedia; pemeriksaan lokal dan `/darurat` tetap tersedia. `GET /api/health` memeriksa DB, bukan provider AI.

## Impor SQLite lama

Cutover membutuhkan jendela pemeliharaan: hentikan perubahan akun, buat backup SQLite yang konsisten termasuk WAL menggunakan SQLite backup API, lalu jalankan migrasi PostgreSQL. Jalankan `npm run db:import-sqlite -- PATH_KE_BACKUP.sqlite` dengan `DATABASE_URL` tujuan. Import membaca sumber secara read-only, hanya mengimpor users beserta UUID dan hash, dan membatalkan seluruh transaksi bila ada konflik. Sesi dan state OAuth tidak diimpor; semua pengguna masuk ulang. Verifikasi akun dan login sebelum membuka akses. Simpan sumber dan backup sampai verifikasi selesai. Kembali ke SQLite setelah PostgreSQL menerima perubahan baru dapat kehilangan akun baru.

## Tes

Gunakan database PostgreSQL khusus bernama dengan akhiran `_test`, terpisah dari `DATABASE_URL` lain. Jalankan migrasi pada database tes kosong dengan `DATABASE_URL` diarahkan ke database tes, lalu jalankan suite dengan `TEST_DATABASE_URL` diarahkan ke database itu dan `DATABASE_URL` berbeda atau tidak disetel. Suite menghapus data tes. Jest menjalankan suite secara serial saat `TEST_DATABASE_URL` terisi agar reset data tidak bertabrakan. Tanpa variabel ini suite integrasi PostgreSQL dilewati. Jalankan `npm run verify`; uji Google nyata memerlukan kredensial proyek dan domain sendiri.
