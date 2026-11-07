# Autentikasi Lumina

Keputusan pemilik produk, 7 November 2026: akun demo diganti dengan akun
email/password sungguhan dan Google OAuth. Ini menggantikan pengecualian demo
di plan §8. Database menyimpan identitas akun dan sesi; progres belajar dan
pesan yang diperiksa tetap di perangkat.

## Menjalankan

Gunakan Node.js **22.13 atau lebih baru** (termasuk Node 24). SQLite memakai
modul bawaan `node:sqlite`, tanpa instalasi database terpisah.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

`/daftar` membuat akun dan langsung masuk. Setelah keluar, kredensial yang
sama bisa dipakai di `/masuk`, termasuk setelah server dimulai ulang. Tabel
dibuat otomatis pada akses pertama. Akun demo Siti/Budi dan password publik
tidak lagi diterima. Cookie demo lama tidak berlaku.

`AUTH_DATABASE_PATH` menentukan file database, default `./data/auth.sqlite`.
File ini serta journal/WAL tidak masuk Git. Nama, email, tanggal pendaftaran,
hash password (bila ada), Google subject (bila ada), hash token sesi, batas
percobaan dan transaksi OAuth sementara tersimpan di database. Token Google
tidak disimpan. Tidak ada tabel percakapan atau progres belajar.

## Google OAuth

1. Buat/pilih proyek di Google Cloud Console, lalu atur Google Auth Platform
   Branding dan Audience. Jika masih Testing, masukkan akun penguji sebagai
   test users.
2. Buat OAuth Client ID dengan jenis **Web application**.
3. Daftarkan Authorized redirect URI persis:
   `http://localhost:3000/api/auth/google/callback`.
4. Isi `.env.local`:

   ```dotenv
   AUTH_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=client-id-dari-google
   GOOGLE_CLIENT_SECRET=client-secret-dari-google
   ```

5. Mulai ulang server. Uji tombol Google pada halaman daftar dan masuk.
   Untuk deployment, ubah `AUTH_URL` ke origin HTTPS dan daftarkan origin
   tersebut dengan path `/api/auth/google/callback` di Google Console.

Alur mengikuti [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect):
authorization code, state sekali pakai yang terikat cookie browser, PKCE S256,
nonce, dan verifikasi signature/issuer/audience/expiry ID token melalui
`google-auth-library`. Email Google harus terverifikasi. Izin hanya `openid
email profile`. Membatalkan Google mengembalikan pengguna ke halaman asal
dengan pesan yang dapat dibaca, tanpa membuat sesi.

Identitas Google diikat ke `sub`, bukan email. Bila email sudah terdaftar
dengan password, akun tidak digabung otomatis: masuk dengan password yang
sebelumnya dipakai. Penggabungan akun belum tersedia.

## Password dan sesi

Password 8–128 karakter di-hash dengan scrypt (`N=32768, r=8, p=3`) dan salt
acak per akun. Perbandingan hash memakai `timingSafeEqual`. Nama dibatasi
80 karakter dan email 254 karakter. Email dinormalisasi dan unik di database.
Kegagalan login tidak menyebut apakah email terdaftar. Verifikasi email dan
pemulihan password belum tersedia; UI menyatakan batas ini.

Cookie sesi memuat token acak 256-bit; database hanya menyimpan SHA-256 token.
Cookie `HttpOnly`, `SameSite=Lax`, `Secure` di production, berlaku 24 jam.
Login baru merotasi sesi browser saat ini; logout mencabut sesi di database
sehingga salinan token lama juga ditolak. `AUTH_SECRET` lama tidak diperlukan.
Server Actions menyediakan pengecekan origin untuk form email/password.

Percobaan dibatasi secara persisten per email: 10 login atau 5 pendaftaran
per 15 menit. Batas global per 15 menit: 200 login, 50 pendaftaran, 200 mulai
Google. Untuk trafik publik besar, tambahkan batas per IP pada reverse proxy
dan sesuaikan batas global; batas global saat ini ditujukan untuk skala demo.

## Hosting

SQLite memerlukan **disk persisten yang dapat ditulis**, pada satu host aplikasi.
Pasang volume persisten dan set `AUTH_DATABASE_PATH` ke file di volume itu;
batasi akses file ke pengguna proses aplikasi dan buat backup database.
Filesystem sementara pada serverless/Vercel tidak cocok untuk konfigurasi ini.
Gunakan database terkelola dan adapter yang sesuai sebelum deploy ke platform
tersebut atau menjalankan beberapa host aplikasi. Endpoint Google memerlukan
koneksi keluar ke Google. Email/password tetap berfungsi tanpa Google.

## Pemeriksaan

```powershell
npm run verify
```

Tes meliputi daftar → sesi → logout → login ulang, password salah, email
duplikat, hash password/token, expiry/revocation, batas percobaan, callback
OAuth palsu/kedaluwarsa/replay/dibatalkan, serta token Google tidak valid.
Tes Google memalsukan respons jaringan dan verifikasi token; pengujian akun
Google nyata tetap memerlukan kredensial proyek di atas.
