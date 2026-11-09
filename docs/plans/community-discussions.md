# Komunitas menggantikan Darurat — 9 November 2026

Permintaan pemilik produk: hapus fitur Darurat sepenuhnya dan ganti komunitas
diskusi dengan frontend, backend, dan PostgreSQL. Aturan lama `/darurat` publik
digantikan oleh keputusan ini. Semua perubahan dikerjakan pada
`codex/community-discussions`, dari `main` terbaru `fcdfb02`.

1. Slice end to end: baca daftar dan detail publik; akun membuat topik modus baru,
   pertanyaan, atau pengalaman; balas diskusi; tandai membantu. Konten tersimpan
   di DB lintas browser. Pengguna mengubah/menghapus konten sendiri. Laporan
   pelanggaran dapat ditinjau moderator yang UUID akunnya ditetapkan server.
2. Batas lomba: tanpa unggah berkas, DM, realtime, notifikasi, reputasi/karma,
   atau layanan baru. Teks biasa dan tautan sumber opsional. Tidak ada postingan,
   jumlah anggota, atau balasan karangan sebagai konten komunitas nyata.
3. Area bersama: D (penghapusan Darurat/PDF), shell/marketing/auth, Companion,
   Simulasi, migrasi. Kontrak scoring tidak berubah dan tidak ada dependensi baru.
4. Selesai: CRUD, balasan, pencarian/filter/paginasi, membantu dan laporan bekerja
   pada PostgreSQL; sesi menentukan penulis; akses dan otorisasi diuji; link
   Darurat tidak tersisa dalam produk; verify lulus; panduan migrasi VPS tersedia.

Postingan adalah konten publik yang sengaja ditulis pengguna. Pemeriksaan dan
riwayat Companion tidak pernah otomatis disalin atau dikirim ke komunitas.
Saran cepat Companion tetap merujuk kanal resmi, bukan mengalihkan korban ke
forum sebagai pengganti penanganan langsung. Diskusi bukan putusan penipuan.

## Referensi yang dipakai

- Discourse: kategori, daftar Latest/Top, thread dan balasan kronologis.
  https://meta.discourse.org/t/understanding-discourse-for-new-users/96331
- GitHub Discussions: berbagi informasi, pertanyaan, dan diskusi per kategori.
  https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/about-discussions
- Reddit Help: vote menandai kontribusi bermanfaat. Lumina memakai satu reaksi
  Membantu tanpa downvote atau klaim bahwa jumlah reaksi membuktikan kebenaran.
  https://support.reddithelp.com/hc/en-us/articles/7419626610708-What-are-upvotes-and-downvotes
