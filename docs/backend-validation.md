# Verifikasi backend — 8 November 2026

Branch `codex/backend-postgres-vps`. Lingkungan: Windows, Node 24.21.0,
PostgreSQL 18.6 asli dan Caddy 2.11.9 asli. Database uji terpisah,
loopback saja, role aplikasi bukan superuser. SQLite asal diperiksa read-only:
0 akun; backup konsisten dibuat dan sumber tidak dihapus.

## Pemeriksaan yang dijalankan

- `npm run verify` dengan `TEST_DATABASE_URL`: typecheck, lint, 64 suite /
  402 tes, build standalone tanpa `DATABASE_URL` saat build. Lint memiliki
  3 peringatan lama di marketing, tanpa error.
- Jest serial saat database uji diaktifkan, karena suite berbagi DB dan
  mereset data. Tidak ada kenaikan timeout. Setelah pool dibuat singleton
  lintas hot reload, 14 tes integrasi PostgreSQL juga diulang dan lulus.
- Migrasi bernomor pada DB kosong dan pengulangan idempoten; impor users
  SQLite mempertahankan hash, konflik membatalkan seluruh transaksi;
  cleanup hanya menghapus expiry.
- Daftar, email duplikat/race, password salah, rotasi sesi atomik/rollback,
  expiry/revocation, quota bersamaan, OAuth palsu/nonce salah/replay/batal.
  Verifikasi Google dan respons token menggunakan mock; bukan akun Google nyata.
- Request oversized, kuota AI, IP proxy tepercaya, kegagalan DB/provider,
  kegagalan Server Actions dan pembacaan sesi anonim diuji.
- Smoke HTTP aplikasi standalone melalui Caddy: daftar, profil akun, logout
  mencabut token di DB, lalu login kembali. Callback palsu mengarah ke
  origin publik `AUTH_URL`, bukan hostname app.
- Akun dan sesi yang valid tetap terbaca setelah PostgreSQL dimulai ulang
  dan aplikasi standalone dibangun serta dijalankan ulang.
- Stream provider lokal tiruan diterima melalui Caddy dalam dua potongan
  terpisah sekitar 650 ms. Header IP palsu yang berubah pada setiap request
  tetap ditolak setelah 10 request/IP/menit. Body berlebih menghasilkan 413.
- Provider dimatikan: AI 503, health tetap 200. PostgreSQL dimatikan:
  health 503 tanpa detail koneksi, AI 503, `/darurat` tetap 200 meski
  browser membawa cookie sesi. Scoring lokal dan jalur UI dilindungi suite asli.
- `pg_dump -Fc` dan `pg_restore` ke DB terpisah: satu akun, UUID dan hash
  password identik, tabel dapat dibaca role aplikasi. Restore memakai
  `--role=lumina_app` agar objek tidak dimiliki superuser.
- Compose diparse; hanya proxy memublikasikan port. Caddyfile divalidasi
  menggunakan binary resminya. Error proxy 502 juga diuji untuk memastikan
  query OAuth dan cookie tidak muncul di log. Skrip shell diperiksa dengan `bash -n`.

## Yang belum diverifikasi

Docker Engine/CLI tidak tersedia: image Linux dan Compose belum dibangun/
dijalankan; recreate container, jaringan Docker dan rollback image harus diuji
di mesin Linux yang memiliki Docker. Native standalone dan PostgreSQL bukan
pengganti pengujian container tersebut.

Belum ada akses VPS, domain/DNS publik, penerbitan TLS nyata, kredensial Google,
atau provider AI produksi. Alur Google nyata, stream melalui HTTPS publik,
backup terjadwal/off-VPS dan latihan demo di VPS masih perlu dijalankan.
Tidak ada publikasi ke VPS dalam pekerjaan ini.

Artefak dan log lokal ada di `.cache/backend-validation/`, tidak masuk Git
atau Docker build context karena dapat memuat kredensial uji dan backup akun.
