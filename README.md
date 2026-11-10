<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/lumina-lockup-light.png">
    <img src="public/brand/lumina-lockup.png" alt="Lumina" width="320">
  </picture>
</p>

<h1 align="center">Kenali penipuannya sebelum uangnya hilang.</h1>

<p align="center">
  Teman untuk memahami pesan mencurigakan, mempelajari modus penipuan,<br>
  melatih keputusan, dan berbagi pengetahuan bersama komunitas.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-171717?style=flat-square&logo=next.js" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-087EA4?style=flat-square&logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/PostgreSQL-18-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 18">
</p>

<p align="center">
  <a href="#fitur-utama">Fitur</a> ·
  <a href="#mulai-cepat">Mulai cepat</a> ·
  <a href="#panduan-penggunaan">Panduan penggunaan</a> ·
  <a href="#privasi-dan-cara-kerja">Privasi</a> ·
  <a href="#dokumentasi">Dokumentasi</a>
</p>

---

Lumina membantu pengguna mengenali tanda-tanda penipuan digital dalam bahasa yang mudah dipahami. Perjalanan dimulai dari pemeriksaan di **Companion**, berlanjut ke **Belajar** dan **Simulasi**, serta didukung ruang diskusi publik di **Komunitas**.

## Fitur utama

| Fitur | Yang bisa dilakukan |
| --- | --- |
| **Companion** | Periksa pesan mencurigakan, lihat skor dan sinyal yang ditemukan, lalu tanyakan penjelasan atau langkah selanjutnya. |
| **Belajar** | Pelajari 12 modul tentang modus penipuan dan kerjakan kuis. Progres tersimpan pada akun. |
| **Simulasi** | Latih pengambilan keputusan dalam skenario interaktif; hasil percobaan tersimpan pada akun. Level yang belum tersedia ditandai **Rencana**. |
| **Komunitas** | Baca diskusi publik, cari topik, dan berbagi lewat postingan atau balasan. Pengguna dapat melaporkan konten untuk ditinjau moderator. |
| **Pencarian lowongan** | Cari lowongan yang terkumpul dari pemindai dan lihat penilaian kehati-hatian pada setiap kartu. Ketersediaan hasil bergantung pada data pemindaian. |
| **Verifikasi tautan** | Secara opsional, periksa tautan tertentu melalui layanan url.vet untuk memperoleh informasi tambahan. |

## Mulai cepat

### Prasyarat

- **Node.js 24 atau lebih baru** dan npm.
- **PostgreSQL** yang berjalan, dengan database dan pengguna yang dapat menjalankan migrasi.
- Git untuk menyalin repositori.

### Instalasi lokal

```bash
git clone https://github.com/vaskoyudha/Lumina.git
cd Lumina
npm ci
```

Salin `.env.example` menjadi `.env.local` (`cp .env.example .env.local` di macOS/Linux atau `Copy-Item .env.example .env.local` di PowerShell). Ubah `DATABASE_URL` sesuai database PostgreSQL lokal; nilai bawaan hanyalah contoh. `AUTH_URL` untuk pengembangan lokal adalah `http://localhost:3000`. Jangan memasukkan kredensial asli ke repositori.

```bash
npm run db:migrate  # membuat dan memperbarui skema database
npm run db:seed     # mengisi modul, kuis, dan skenario yang tersedia
npm run dev
```

Buka **[http://localhost:3000](http://localhost:3000)**. Seed bawaan hanya menambahkan konten yang belum ada dan tidak menimpa konten yang sudah tersimpan. Untuk konfigurasi produksi, backup, dan deployment Docker Compose, lihat [panduan deployment](docs/deploy.md).

### Konfigurasi opsional

| Variabel | Kegunaan |
| --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Mengaktifkan masuk dengan Google; callback mengikuti `AUTH_URL`. Lihat [panduan autentikasi](docs/auth.md). |
| `LUMINA_LLM_URL`, `LUMINA_LLM_MODEL`, `LUMINA_LLM_KEY` | Menghubungkan provider AI yang kompatibel dengan OpenAI. Tanpa URL atau model, Companion menggunakan jawaban templat offline; layanan AI seperti vision dan voice tidak tersedia. |
| `URLVET_API_URL` | Mengatur layanan verifikasi tautan. Jika kosong, digunakan layanan publik url.vet; `off` menonaktifkannya. Lihat [verifikasi tautan](docs/link-verification.md). |
| `COMMUNITY_MODERATOR_IDS` | Daftar UUID akun moderator yang dipisahkan koma. Lihat [panduan komunitas](docs/community.md). |
| `TEST_DATABASE_URL` | Database khusus tes integrasi PostgreSQL; namanya harus berakhiran `_test` dan terpisah dari database aplikasi. |

Daftar lengkap variabel dan penjelasannya ada di [`.env.example`](.env.example).

## Panduan penggunaan

1. **Periksa:** buka `/companion`, tempel pesan yang mencurigakan, lalu baca skor, alasan, dan panel bukti. Jika perlu, pilih pemeriksaan tambahan pada tautan yang tersedia.
2. **Pelajari:** buka `/belajar`, pilih modul, dan selesaikan kuis. Masuk ke akun untuk menyimpan progres.
3. **Berlatih:** buka `/simulasi` dan pilih skenario yang tersedia. Ikuti percakapan dan pilih tindakan hingga misi selesai.
4. **Berdiskusi:** buka `/komunitas` untuk membaca. Masuk atau daftar untuk membuat postingan, membalas, dan berinteraksi.
5. **Pantau progres:** buka `/profil` setelah masuk untuk melihat kemajuan dan hasil yang terkait dengan akun.

Hasil pemeriksaan adalah bantuan untuk mengenali risiko, bukan jaminan bahwa suatu pesan atau tautan aman.

## Privasi dan cara kerja

**Penilaian bersifat deterministik.** Engine Lumina menghasilkan skor dan sinyal berdasarkan aturan; model bahasa membantu menyampaikan penjelasan dan tidak menentukan skor. Pemeriksaan teks tetap dapat berjalan tanpa provider AI.

**Pesan yang diperiksa diproses di perangkat.** Pesan tersebut tidak dikirim sebagai isi pemeriksaan ke provider AI. Saat memakai jawaban AI, pertanyaan pengguna dan ringkasan temuan tanpa kutipan dapat dikirim ke provider. Riwayat percakapan Companion tidak disimpan di server.

**Ada tindakan tambahan yang mengirim data.** Jika pengguna memilih verifikasi tautan, URL tersebut dikirim ke layanan url.vet yang dikonfigurasi; pesan dan skor tidak ikut dikirim. Untuk menyalin teks dari gambar, fitur vision mengirim gambar ke provider yang dikonfigurasi. Hasil verifikasi tautan tidak mengubah skor deterministik. Rincian: [verifikasi tautan](docs/link-verification.md).

**Akun dan komunitas tersimpan di database.** Akun, progres belajar, hasil simulasi, serta konten Komunitas disimpan di PostgreSQL. Postingan dan balasan Komunitas dapat dibaca publik; hindari membagikan informasi pribadi.

## Teknologi

| Lapisan | Teknologi |
| --- | --- |
| Aplikasi | Next.js App Router, React, TypeScript |
| Tampilan | Tailwind CSS, shadcn/ui, Radix UI, Lucide |
| Data dan validasi | PostgreSQL, `pg`, Zod |
| Pengujian dan kualitas | Jest, React Testing Library, Biome |
| Deployment | Docker Compose, Caddy |

## Pengembangan

```bash
npm run typecheck  # periksa tipe TypeScript
npm run lint       # periksa lint dan format dengan Biome
npm run test       # jalankan Jest
npm run verify     # typecheck, lint, test, dan build
```

Tes integrasi PostgreSQL dilewati jika `TEST_DATABASE_URL` tidak disediakan. Jalankan `npm run verify` sebelum commit. Informasi struktur dan aturan pengembangan ada di [AGENTS.md](AGENTS.md).

```text
src/app/          Rute aplikasi dan API
src/components/   Komponen antarmuka dan shell
src/lib/          Scoring, autentikasi, komunitas, simulasi, dan integrasi
src/data/         Data dan skema pendukung
content/          Materi awal Belajar dan Simulasi
migrations/       Migrasi PostgreSQL bernomor
scanner/          Engine pemindai lowongan pihak ketiga
public/           Logo, gambar, dan aset publik
docs/             Dokumentasi teknis dan produk
```

## Dokumentasi

- [Rencana produk](docs/plan.md) dan [status implementasi](STATUS.md) — konteks dan perkembangan proyek; catatan terbaru mengoreksi rencana lama.
- [Autentikasi](docs/auth.md) · [Belajar dan Simulasi](docs/learning-database.md) · [Komunitas dan moderasi](docs/community.md)
- [Verifikasi tautan](docs/link-verification.md) · [Pencarian lowongan](docs/loker-tool.md) · [Orkestrasi agent](docs/agent-orchestration.md)
- [Deployment, backup, dan rollback](docs/deploy.md) · [Sistem desain AppNext](docs/design-system/appnext.md)

## Atribusi dan sumber daya pihak ketiga

Lumina menggunakan perangkat lunak dan aset pihak ketiga berikut. Masing-masing tetap mengikuti lisensinya sendiri.

- **Framework dan pustaka:** [Next.js](https://nextjs.org/), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/), [Lucide](https://lucide.dev/), [Zod](https://zod.dev/), [node-postgres](https://node-postgres.com/), [Jest](https://jestjs.io/), [Testing Library](https://testing-library.com/), dan [Biome](https://biomejs.dev/). Dependensi lengkap dan versinya tercantum di [`package.json`](package.json) dan lockfile.
- **Tampilan Komunitas:** adaptasi tata letak [ccrsxx/twitter-clone](https://github.com/ccrsxx/twitter-clone), berlisensi MIT. Lihat [pemetaan sumber](docs/community-ui-research.md) dan [teks lisensi](docs/licenses/twitter-clone-MIT.txt).
- **Pemindai lowongan:** engine career-ops yang disertakan di [`scanner/`](scanner/), dengan [lisensi MIT dan pemberitahuan hak cipta](scanner/LICENSE); integrasinya dijelaskan di [panduan lowongan](docs/loker-tool.md).
- **Verifikasi tautan:** [url.vet](https://github.com/urlvet/urlvet), layanan terpisah berlisensi AGPL-3.0; sumber data ancamannya dapat memiliki ketentuan tersendiri. Lihat [panduan verifikasi](docs/link-verification.md).
- **Referensi desain:** [AppNext](https://appnext.framer.website/) untuk sistem desain aplikasi dan aset/tampilan Powder pada landing. Detail AppNext tersedia di [dokumentasi desain](docs/design-system/appnext.md).
- **Foto:** beberapa potret berasal dari Unsplash; sumber tiap foto dan lisensinya dicatat di [atribusi gambar](public/images/ATTRIBUTION.md).

---

<p align="center"><strong>Lumina</strong> · Kenali polanya, ambil keputusan dengan lebih yakin.</p>
