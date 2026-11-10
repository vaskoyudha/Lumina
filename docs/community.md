# Komunitas Lumina — versi lomba

Keputusan pemilik produk 9 November 2026 mengganti seluruh fitur Darurat dengan
Komunitas diskusi. Route `/darurat`, triage, pembuat laporan dan PDF dihapus;
`@react-pdf/renderer` juga dihapus. Tautan produk sekarang menuju `/komunitas`.
Saran Companion untuk menghentikan komunikasi dan menghubungi bank/penyedia akun
melalui kanal resmi tetap ada; forum tidak diposisikan sebagai penanganan langsung.

## Alur yang tersedia

- Semua orang membaca feed dan detail topik tanpa akun. Pencarian, tiga kategori
  (Modus baru, Tanya komunitas, Berbagi pengalaman), urutan Terbaru/Ramai/Belum
  dibalas dan paginasi membaca PostgreSQL.
- Akun yang masuk membuat/mengubah topik dan balasan; penulis menghapus kontennya
  sendiri. Identitas penulis diambil dari sesi. Email tidak dicetak dalam feed,
  detail, atau respons publik.
- Reaksi Membantu tersimpan satu per akun per topik. Banyak reaksi tidak berarti
  informasi terverifikasi. Postingan diberi label sebagai kiriman anggota.
- Anggota melaporkan data pribadi, spam, atau konten berbahaya. Laporan tersimpan
  satu per pelapor per konten. Moderator meninjau dan menyembunyikan atau tetap
  menampilkan konten; keputusan menyelesaikan laporan yang menunggu.
- Topik dan balasan berupa teks biasa, tanpa HTML/Markdown aktif atau unggah
  berkas. Tautan sumber opsional hanya http/https tanpa kredensial, dibuka dengan
  `nofollow`, `ugc`, dan `noopener noreferrer`; Lumina tidak mengambil URL itu.

Frontend: `components/community/` dan `app/(chat)/komunitas/`. Backend:
Server Actions dalam `lib/community/actions.ts`, validasi zod, query terparameter
di `lib/community/store.ts`, dan pool PostgreSQL yang sama dengan akun.

## Data dan batas lomba

Migrasi `004_community.sql` menambah `community_posts`, `community_replies`,
`community_helpful`, dan `community_reports`. Migrasi `005_community_images.sql`
menambah kolom `image_url` yang dibatasi ke awalan `/images/community/`, dan
`006_community_gallery.sql` menambah `image_urls` (maksimal 8) agar satu kiriman
bisa memuat beberapa sampul; baris lama diisi ulang dari `image_url`. Akun dan
progres yang ada tidak dihapus. Migrasi 004 juga mengganti hanya kalimat bawaan
skenario yang masih mengarahkan ke panduan Darurat. `007_community_saves.sql`
menambah `community_saves` untuk daftar "Disimpan" per akun; simpanan bersifat
pribadi dan tidak menambah penghitung publik pada kiriman.

Seed demo opsional tersedia lewat `npm run db:seed:community`. Perintah itu
membuat beberapa anggota contoh, sembilan ringkasan modus penipuan Indonesia
beserta sampul, balasan, dan reaksi Membantu agar feed tidak kosong saat
presentasi lokal. Ringkasan itu fiktif, tidak mengutip korban atau media nyata,
dan setiap `source_url` tetap null. Sampul hanya aset seed di
`public/images/community/` (sumber dan lisensi dicatat di folder itu), bukan
unggahan anggota. Di feed, seluruh kartu kiriman membuka halaman diskusinya, dan
sampul membuka penampil gambar dengan navigasi antar-sampul alih-alih ikut
bernavigasi. Data seed diberi tanda domain `@contoh.lumina`, idempoten
(boleh diulang), dan **tidak boleh dijalankan pada database produksi**; produksi
tetap memakai percakapan anggota sungguhan.

Penghapusan penulis menghapus isi asli dari baris konten, lalu menandai baris
sebagai dihapus. Topik yang dihapus/ditahan tidak muncul di publik beserta
balasannya. Peninjauan moderator menyembunyikan konten untuk publik sambil
mempertahankan data di DB. Laporan tidak terbuka untuk pembaca biasa.

Posting/balasan adalah konten yang sengaja diterbitkan. Pemeriksaan dan riwayat
Companion tidak otomatis dikirim ke komunitas; editor baru selalu kosong.
Form memberi tahu bahwa isi dan nama tampil publik serta meminta data korban
disamarkan. Draf hanya berada dalam state tab, tidak disimpan di localStorage.

Batas tulis persisten per akun per menit: 5 penulisan topik, 15 penulisan balasan,
60 aksi lain. Tamu/sesi kedaluwarsa ditolak; server memeriksa kepemilikan setiap
edit/hapus. Akses moderator diperiksa kembali pada setiap aksi, bukan dari UI.
Versi ini tidak memuat DM, realtime, email/notifikasi, unggah gambar anggota,
karma, penggabungan topik, analitik, atau CMS besar. Sampul seed adalah
pengecualian: kolomnya tidak diekspos ke editor.

## Menjalankan dan deploy

Jalankan `npm run db:migrate` sebelum aplikasi versi ini menerima trafik.
`npm run db:seed` tetap hanya untuk materi Belajar dan Simulasi.

Moderator menggunakan akun Lumina biasa. Isi UUID akun yang dipercaya pada
`.env.production` (atau `.env.local` untuk lokal):

```dotenv
COMMUNITY_MODERATOR_IDS=UUID_AKUN_PENGELOLA
```

Kosong berarti tidak ada akun moderator; isi dengan UUID akun pengelola sebenarnya
sebelum komunitas dibuka. Route peninjauan: `/komunitas/moderasi`, juga ditautkan
di panel panduan untuk moderator. Laporan tetap tersimpan bila moderator belum
dikonfigurasi. Tidak ada hak moderator dari input browser atau registrasi umum. UUID diambil dari akun yang telah dibuat dan dikuasai pengelola, misalnya lewat SQL `SELECT id FROM users WHERE email = 'pengelola@example.com';`. Allowlist memakai UUID, bukan email, karena pendaftaran saat ini belum memverifikasi kepemilikan email.

Setelah branch di-merge, di direktori checkout VPS yang sudah memakai Compose:

```sh
git switch main
git pull --ff-only origin main
sh deploy/backup.sh
export APP_IMAGE="lumina:$(git rev-parse --short HEAD)"
docker compose --env-file .env.production build app
docker compose --env-file .env.production run --rm --no-deps app npm run db:migrate
docker compose --env-file .env.production up -d --no-build app proxy
```

Pertahankan volume PostgreSQL dan simpan tag image rilis sesuai `docs/deploy.md`.
Uji akun A membuat topik, akun B membalas dan memberi reaksi, lalu buka di browser
lain. Akun B tidak boleh mengedit/menghapus konten A. Laporkan satu konten dan
tinjau memakai akun moderator. Route lama `/darurat` kini 404.

## Referensi desain

Revisi 10 November 2026: `/komunitas` memakai **shell workspace yang sama**
dengan Companion, Belajar, dan Simulasi (`WorkspaceShell`), bukan sidebar
Twitter-clone tersendiri. Sidebar kiri, kolom konten yang menggulir, dan rail
kanan 340px berbagi navigasi, akun, dan token `--lumina-*`. Rail kanan hanya
memuat pencarian, aturan komunitas, dan pintu moderasi. Palet biru Twitter dan
`src/styles/community-twitter.css` dihapus; warna mengikuti AppNext (brand
oranye, panel terang, garis `--lumina-line`) dan tombol memakai komponen
`Button` yang sama dengan halaman lain. Pola kartu, metadata penulis, dan
composer tetap diadaptasi dari [ccrsxx/twitter-clone](https://github.com/ccrsxx/twitter-clone)
(MIT) tanpa mempertahankan kerangka kolomnya.

Composer di feed menerbitkan teks melalui Server Actions yang sama; judul
diturunkan dari baris pertama (atau teks awal bila baris pertama terlalu pendek).
Linimasa dan halaman diskusi tidak mencetak ulang baris yang sudah menjadi judul,
jadi teks kiriman tidak muncul dua kali. Pintu "Jelajahi" di rail membuka panel
cari/filter, bukan hanya menggulir ke panel yang masih tertutup.
Editor lengkap tetap tersedia di `/komunitas/baru`, termasuk tautan sumber.
Reaksi Membantu, opsi edit/hapus/lapor, balasan, pencarian dan paginasi memakai
PostgreSQL yang sudah ada. Next tetap **16.4.5**, React **19.3.0**; Firebase,
Pages Router, dan dependensi Next 12 upstream tidak diinstal.

Revisi sumber dan pemetaan file tersedia di [riset UI](community-ui-research.md);
notice MIT upstream disertakan di [lisensi](licenses/twitter-clone-MIT.txt).

- [Discourse](https://meta.discourse.org/t/understanding-discourse-for-new-users/96331):
  kategori, daftar topik, pencarian, dan balasan kronologis.
- [GitHub Discussions](https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/about-discussions):
  berbagi informasi, pertanyaan, dan diskusi terbuka.
- [Reddit Help](https://support.reddithelp.com/hc/en-us/articles/7419626610708-What-are-upvotes-and-downvotes):
  penanda kontribusi yang membantu; Lumina tidak menambahkan downvote/karma.

## Bukti verifikasi lokal

- Gate `npm run verify` lulus: typecheck, lint, 869 tes, dan build. Suite integrasi
  yang membutuhkan database tes terpisah dilewati pada gate default.
- Lima tes PostgreSQL komunitas dijalankan terpisah pada database khusus
  `lumina_learning_test` dan lulus: persistensi, filter/pencarian, kepemilikan,
  balasan/paginasi, reaksi/laporan unik, peninjauan, dan penghapusan.
- Browser lokal pada 380px: feed, editor, dan thread tanpa scroll horizontal.
  Login akun demo lokal, terbitkan topik, balas, beri reaksi, lalu refresh:
  data tetap tampil. Data topik pengujian dibersihkan setelahnya.
- HTTP lokal `/komunitas` dan `/komunitas/baru` 200; `/darurat` 404. Tidak ada
  referensi route atau import Darurat/PDF tersisa dalam source produk.
- Build masih memuat peringatan tracing scanner lowongan yang sudah ada sebelum
  perubahan ini. Deploy VPS belum dilakukan; moderator perlu dikonfigurasi.
