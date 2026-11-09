# Riset UI Komunitas: clone Reddit dan X

Ditinjau 9 November 2026. Tindak lanjut pekerjaan Komunitas di
`codex/community-discussions`, pada branch baru `codex/community-social-ui`.
Backend dan cakupan produk mengacu ke [community.md](community.md).

**Pilihan pemilik produk, 10 November 2026:** gunakan Twitter clone ccrsxx dan
ikuti layout sumbernya. Implementasi memakai branch yang sama, dengan port
App Router yang dijelaskan di bawah. Perbandingan awal tetap dicatat untuk
menelusuri pemilihan kandidat.

## Rekomendasi

Rekomendasi awal untuk opsi Reddit: **Shreddit**. Feed berbasis judul topik,
ringkasan, kategori, dan balasan cocok dengan Komunitas Lumina yang sudah ada.
Versi framework juga paling dekat. Ini penilaian dari pemeriksaan sumber,
bukan hasil menjalankan atau menguji aplikasi kandidat.

Adaptasi komponen presentasinya ke data dan Server Actions Lumina. Jangan
mengimpor seluruh aplikasi: autentikasi, database, moderasi, dan batas privasi
Komunitas sudah tersedia.

## Perbandingan

Versi berikut dibaca dari `package.json` upstream, bukan hanya deskripsi README.

| Kandidat | Stack yang diperiksa | Bagian yang berguna | Pekerjaan adaptasi / kekurangan |
| --- | --- | --- | --- |
| [peterkibuchi/shreddit](https://github.com/peterkibuchi/shreddit) | Next 16.4.3, React 19.3.1, Tailwind 4.3.3, TypeScript; MIT | Kartu topik, composer ringkas, feed, tampilan komentar | shadcn `base-vega` memakai Base UI, berbeda dari Radix Lumina. Komponen terkait tipe Drizzle, NextAuth, EditorJS, React Query, Redis, dan upload; ambil pola tampilannya lalu hubungkan ke kontrak kita. **Pilihan utama.** |
| [TheUzair/Reddit-Clone](https://github.com/TheUzair/Reddit-Clone) | Next 15.1.11, React 19, Tailwind 3.4, JavaScript; MIT | Daftar post, kategori/filter, sidebar | Frontend membaca Reddit API; perlu TS dan penyesuaian Tailwind 4. Sidebar berisi contoh komunitas/jumlah statis. Tombol vote pada `Post.js` yang diperiksa tidak memiliki handler. Cocok untuk referensi visual tambahan. |
| [ccrsxx/twitter-clone](https://github.com/ccrsxx/twitter-clone) | Next 12.3, React 18.2, Tailwind 3.2, TypeScript; MIT | Timeline, avatar/metadata, susunan aksi post, rail navigasi | README menyatakan proyek diarsipkan; flag API saat pemeriksaan justru `archived: false`. Pages Router, Firebase, Headless UI, dan API Link lama membutuhkan port lebih besar. **Pilihan gaya X**, dengan biaya integrasi lebih tinggi. |
| [joschan21/breadit](https://github.com/joschan21/breadit) | Next 13.4.4, React 18.2, Tailwind 3.3, TypeScript | Feed dan komentar bertingkat; referensi asal pendekatan serupa Shreddit | Stack lebih lama, Prisma/NextAuth/Redis/EditorJS. README menyatakan MIT, tetapi file LICENSE tidak ditemukan pada pohon revisi yang diperiksa dan metadata API lisensinya kosong. Shreddit punya file MIT yang eksplisit sehingga lebih jelas untuk dipilih. |

## Sumber yang bisa ditinjau langsung

Revisi dipatok agar rencana implementasi dapat ditelusuri meskipun upstream berubah.

- Shreddit [`0c86c0c`](https://github.com/peterkibuchi/shreddit/tree/0c86c0c3f0c1ad45cd2327c1acf63292df955738):
  [kartu post](https://github.com/peterkibuchi/shreddit/blob/0c86c0c3f0c1ad45cd2327c1acf63292df955738/src/components/post/post.tsx),
  [composer ringkas](https://github.com/peterkibuchi/shreddit/blob/0c86c0c3f0c1ad45cd2327c1acf63292df955738/src/components/mini-create-post.tsx),
  [konfigurasi komponen](https://github.com/peterkibuchi/shreddit/blob/0c86c0c3f0c1ad45cd2327c1acf63292df955738/components.json),
  [package](https://github.com/peterkibuchi/shreddit/blob/0c86c0c3f0c1ad45cd2327c1acf63292df955738/package.json),
  [LICENSE](https://github.com/peterkibuchi/shreddit/blob/0c86c0c3f0c1ad45cd2327c1acf63292df955738/LICENSE).
- TheUzair [`7281b1a`](https://github.com/TheUzair/Reddit-Clone/tree/7281b1a8d27c8b93f67a03c3b6ad531e8e1c815e):
  [post](https://github.com/TheUzair/Reddit-Clone/blob/7281b1a8d27c8b93f67a03c3b6ad531e8e1c815e/components/Feed/Post.js),
  [sidebar](https://github.com/TheUzair/Reddit-Clone/blob/7281b1a8d27c8b93f67a03c3b6ad531e8e1c815e/components/Sidebar.js),
  [package](https://github.com/TheUzair/Reddit-Clone/blob/7281b1a8d27c8b93f67a03c3b6ad531e8e1c815e/package.json),
  [LICENSE](https://github.com/TheUzair/Reddit-Clone/blob/7281b1a8d27c8b93f67a03c3b6ad531e8e1c815e/LICENSE).
- ccrsxx [`62a9588`](https://github.com/ccrsxx/twitter-clone/tree/62a9588577ec6f5ce6d28b50d30bf46d2229453d):
  [tweet](https://github.com/ccrsxx/twitter-clone/blob/62a9588577ec6f5ce6d28b50d30bf46d2229453d/src/components/tweet/tweet.tsx),
  [layout](https://github.com/ccrsxx/twitter-clone/blob/62a9588577ec6f5ce6d28b50d30bf46d2229453d/src/components/layout/main-layout.tsx),
  [package](https://github.com/ccrsxx/twitter-clone/blob/62a9588577ec6f5ce6d28b50d30bf46d2229453d/package.json),
  [LICENSE](https://github.com/ccrsxx/twitter-clone/blob/62a9588577ec6f5ce6d28b50d30bf46d2229453d/LICENSE).
- Breadit [`60cf197`](https://github.com/joschan21/breadit/tree/60cf197005033ecd26a06998fa3fd0686d02061f):
  [README dan pernyataan lisensi](https://github.com/joschan21/breadit/blob/60cf197005033ecd26a06998fa3fd0686d02061f/README.md),
  [package](https://github.com/joschan21/breadit/blob/60cf197005033ecd26a06998fa3fd0686d02061f/package.json).

## Pemetaan ke pekerjaan Komunitas yang sudah ada

| Pola upstream | Tujuan di Lumina | Bentuk adaptasi yang disarankan |
| --- | --- | --- |
| Shreddit `post.tsx` dan `post-feed.tsx` | `src/components/community/community-view.tsx` / `CommunityFeed` | Judul topik dominan, ringkasan terbatas, metadata penulis, kategori, serta baris jumlah balasan dan Membantu. |
| Shreddit `mini-create-post.tsx` | Bagian atas feed → `/komunitas/baru` | Ajakan menulis singkat dengan jalur masuk untuk tamu; tanpa tombol media yang belum didukung. |
| Shreddit tampilan komentar | `CommunityThread`, `ReplyEditor`, `ContentControls` | Hierarki post dan balasan lebih jelas; tetap balasan kronologis sesuai model saat ini. |
| Sidebar informasi komunitas | `CommunityRules` melalui `WorkspaceShell.aside` | Panduan, privasi, dan akses moderasi yang sudah ada; navigasi utama tetap memakai shell Lumina. |

Implementasi berikutnya tetap memakai token AppNext, komponen Radix yang sudah
terpasang, autentikasi Lumina, PostgreSQL melalui `pg`, serta kontrak
`CommunityPost`/`CommunityReply`. Reaksi tetap Membantu. Feed kosong tetap jujur;
tidak mengadopsi angka anggota/contoh aktivitas upstream sebagai data produk.

Jika menyalin atau mengadaptasi bagian substansial sumber MIT, sertakan notice
hak cipta dan teks lisensi upstream bersama kode yang diambil.

Riset ini tidak menjalankan demo upstream. Implementasi Lumina diverifikasi
terpisah sesuai catatan di `docs/community.md`.

## Implementasi Twitter yang dipilih

Sumber: ccrsxx/twitter-clone `62a9588577ec6f5ce6d28b50d30bf46d2229453d`.

| Sumber clone | Port Lumina |
| --- | --- |
| `layout/main-layout.tsx`, `sidebar/sidebar.tsx`, `sidebar/sidebar-link.tsx`, `sidebar/sidebar-profile.tsx` | `src/components/community/community-frame.tsx`: susunan kolom, sidebar tetap, rail ikon, navigasi bawah, tombol menulis, dan menu akun. Destinasi memakai rute Lumina yang tersedia. |
| `home/main-container.tsx`, `home/main-header.tsx` | `app/(chat)/komunitas/layout.tsx` dan header feed/detail: timeline maksimal `max-w-xl`, pembatas vertikal, header sticky. Pembaca sesi berada dalam Suspense. |
| `input/input.tsx` | `TimelineComposer` dalam `community-editor.tsx`: grid avatar/textarea, status publik, kategori, tombol kirim. Mutasi memakai `publishPost`, tanpa Firebase atau unggah media. |
| `tweet/tweet.tsx` | `community-view.tsx`: baris avatar dan metadata, teks, menu opsi, aksi balasan/Membantu; detail serta balasan menggunakan model Komunitas. Link dipisahkan dari tombol untuk menghindari elemen interaktif bersarang. |
| `styles/globals.scss`, `tailwind.config.js` | `src/styles/community-twitter.css`: palet terang upstream dengan token scoped; breakpoint `xs:500px` diubah menjadi utility Tailwind 4 `min-[500px]`. Font menggunakan Arial/Helvetica, tanpa menyalin font Twitter. |

File sumber tambahan yang ditinjau: [sidebar](https://github.com/ccrsxx/twitter-clone/blob/62a9588577ec6f5ce6d28b50d30bf46d2229453d/src/components/sidebar/sidebar.tsx),
[main container](https://github.com/ccrsxx/twitter-clone/blob/62a9588577ec6f5ce6d28b50d30bf46d2229453d/src/components/home/main-container.tsx),
[header](https://github.com/ccrsxx/twitter-clone/blob/62a9588577ec6f5ce6d28b50d30bf46d2229453d/src/components/home/main-header.tsx),
[composer](https://github.com/ccrsxx/twitter-clone/blob/62a9588577ec6f5ce6d28b50d30bf46d2229453d/src/components/input/input.tsx).

Lisensi lengkap: [twitter-clone-MIT.txt](licenses/twitter-clone-MIT.txt).
