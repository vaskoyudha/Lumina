<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/lumina-lockup-light.png">
    <img src="public/brand/lumina-lockup.png" alt="Lumina" width="340">
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
  <img src="https://img.shields.io/badge/Node.js-24-5FA04E?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 24">
  <img src="https://img.shields.io/badge/tests-1.286-2E7D32?style=flat-square&logo=jest&logoColor=white" alt="1.286 test cases">
</p>

<p align="center">
  <a href="#ringkasan">Ringkasan</a> ·
  <a href="#fitur-utama">Fitur</a> ·
  <a href="#arsitektur-singkat">Arsitektur</a> ·
  <a href="#mulai-cepat">Mulai cepat</a> ·
  <a href="#konfigurasi">Konfigurasi</a> ·
  <a href="#pengujian-dan-kualitas">Pengujian</a> ·
  <a href="#dokumentasi">Dokumentasi</a>
</p>

---

## Ringkasan

Lumina adalah aplikasi web untuk membantu masyarakat Indonesia mengenali
penipuan digital sebelum kerugian terjadi. Pengguna dapat memeriksa pesan,
memahami alasan di balik penilaian, mempelajari modus yang sedang beredar,
berlatih menghadapi percakapan penipu, dan berdiskusi dengan komunitas.

Produk ini dibangun di sekitar satu prinsip:

> **Penilaian risiko bersifat deterministik dan dihitung di perangkat.
> Model bahasa hanya membantu menjelaskan, tidak pernah menentukan skor.**

Empat permukaan produk berbagi satu akun, satu basis data, dan satu mesin
deteksi:

| Permukaan | Rute | Peran |
| --- | --- | --- |
| **Companion** | `/companion` | Titik masuk: periksa pesan, tanyakan penjelasan, lanjutkan kasus. |
| **Belajar** | `/belajar` | Materi terstruktur: anatomi modus, contoh, checklist, kuis, langkah pelaporan. |
| **Simulasi** | `/simulasi` | Percakapan interaktif dengan penipu; keputusan dinilai di server. |
| **Komunitas** | `/komunitas` | Diskusi publik, pelaporan konten, dan moderasi. |

Fitur pendukung: pencarian lowongan dengan dua penilaian independen,
verifikasi tautan opsional, akun dan progres, serta halaman profil.

---

## Daftar isi

- [Fitur utama](#fitur-utama)
- [Arsitektur singkat](#arsitektur-singkat)
- [Cara kerja penilaian](#cara-kerja-penilaian)
- [Privasi dan batas data](#privasi-dan-batas-data)
- [Teknologi](#teknologi)
- [Mulai cepat](#mulai-cepat)
- [Konfigurasi](#konfigurasi)
- [Perintah npm](#perintah-npm)
- [Struktur repositori](#struktur-repositori)
- [Panduan penggunaan](#panduan-penggunaan)
- [Pengujian dan kualitas](#pengujian-dan-kualitas)
- [Deployment](#deployment)
- [Dokumentasi](#dokumentasi)
- [Batasan yang diketahui](#batasan-yang-diketahui)
- [Kontribusi](#kontribusi)
- [Atribusi](#atribusi)

---

## Fitur utama

### Companion — periksa, pahami, bertindak

- Tempel pesan mencurigakan dan dapatkan **skor 0–100**, tingkat risiko, sinyal
  yang ditemukan, klasifikasi modus, dan 1–4 langkah tindakan.
- Setiap sinyal menyertakan **kutipan bukti yang persis** dari teks yang
  diperiksa, sehingga pengguna dapat melihat apa yang memicu penilaian.
- Panel bukti dapat dibuka per temuan; agen analis menjelaskan perannya.
- Pertanyaan lanjutan dijawab dengan bahasa alami, dengan fallback templat
  ketika provider AI tidak dikonfigurasi.
- Deteksi berjalan sepenuhnya di browser; pesan yang diperiksa tidak dikirim
  ke server atau provider AI.
- Pemeriksaan tambahan bersifat eksplisit: tautan dapat diperiksa melalui
  url.vet, dan gambar dapat dibaca melalui vision. Keduanya hanya berjalan
  setelah pengguna memilih.

### Belajar — 12 modul terstruktur

- Setiap modul berisi anatomi modus, contoh pesan, checklist tanda bahaya,
  kuis pilihan ganda dengan pembahasan, dan langkah pelaporan.
- Progres, jawaban, dan jadwal pengulangan tersimpan per akun.
- Modul yang belum terbit ditandai **Segera** dan tidak dapat dibuka.
- Status modul diturunkan dari konten yang tersedia, bukan dari teks statis.

### Simulasi — berlatih mengambil keputusan

- Skenario percakapan dengan pilihan tindakan, konsekuensi, dan penilaian.
- Timer instruksi dapat memaksa peristiwa tertentu; status timer disimpan di
  server agar tidak dapat dimanipulasi dari klien.
- Hasil percobaan disimpan per akun, termasuk skor dan rincian keputusan.
- Skenario yang belum tersedia ditandai **Rencana**.

### Komunitas — belajar dari pengalaman orang lain

- Feed publik dengan pencarian, kategori, urutan terbaru/ramai/belum dibalas,
  serta filter postingan milik sendiri dan yang disimpan.
- Postingan, balasan, reaksi **Membantu**, penyimpanan privat, dan pelaporan.
- Moderator dapat meninjau laporan, menyembunyikan konten, dan memverifikasi
  postingan agen.
- Postingan agen ditandai jelas; badge **Terverifikasi** berarti telah ditinjau
  moderator, bukan jaminan fakta.
- Tidak ada unggahan berkas, DM, atau notifikasi email pada versi kompetisi.

### Pencarian lowongan

- Korpus lowongan nyata yang dipindai secara bertahap dari beberapa papan
  lowongan, dengan penilaian ganda: **Sentinel** (struktur dan kepercayaan) dan
  **Lumina** (isi pesan).
- Rekomendasi gabungan mengikuti aturan **kehati-hatian menang**: jika salah
  satu mesin mencurigakan, kartu menampilkan keduanya dan menyarankan waspada
  atau hindari.
- Filter pencarian, lokasi, gaji, dan "sembunyikan yang ditandai" berjalan di
  browser terhadap snapshot korpus.
- Pemindaian berjalan di latar belakang dengan kunci advisory PostgreSQL,
  sehingga tidak pernah ada dua pemindaian bersamaan.

### Akun dan profil

- Daftar dan masuk dengan email/password atau Google.
- Sesi 24 jam, rotasi token saat login, dan pencabutan sesi per perangkat.
- Profil menampilkan progres Belajar, hasil Simulasi, dan aktivitas Komunitas.
- Perubahan password mencabut seluruh sesi lain.

---

## Arsitektur singkat

```mermaid
flowchart TD
    U[Browser] -->|HTML / RSC / Server Action / fetch| P[Caddy<br/>TLS dan reverse proxy]
    P --> N[Next.js 16<br/>App Router, Node 24]

    subgraph B[Browser]
        E[Mesin skor deterministik]
        S[Companion, Belajar, Simulasi, Komunitas]
    end

    N --> DB[(PostgreSQL 18)]
    N -.-> AI[Provider LLM<br/>opsional]
    N -.-> V[url.vet<br/>opsional]
    N -.-> J[Papan lowongan<br/>dan RDAP]

    S --- E
    E -.->|hanya ringkasan tanpa kutipan| AI
```

- **Next.js App Router** melayani Server Components, Server Actions, dan route
  handler API.
- **PostgreSQL** adalah satu-satunya penyimpanan durabel: akun, sesi, progres,
  hasil, komunitas, metadata Companion, dan korpus lowongan.
- **Mesin skor** adalah modul TypeScript murni tanpa I/O, jam, atau randomness.
- **Provider AI bersifat opsional.** Tanpa provider, aplikasi tetap berfungsi
  dengan jawaban templat; fitur vision dan voice dinonaktifkan.
- **Migrasi adalah satu-satunya DDL.** Aplikasi tidak pernah membuat tabel saat
  runtime.

Detail lengkap: [docs/architecture/overview.md](docs/architecture/overview.md).

---

## Cara kerja penilaian

```mermaid
flowchart LR
    T[Teks pesan] --> N[Normalisasi]
    N --> D[Detektor paralel]
    D --> M[Detektor pesan]
    D --> L[Detektor tautan]
    D --> I[Detektor identitas]
    D --> C[Detektor percakapan]
    M --> A[Agregasi sinyal]
    L --> A
    I --> A
    C --> A
    A --> S[Skor 0-100]
    S --> R[Risiko]
    A --> K[Klasifikasi modus]
    S --> V[Validasi kontrak]
    R --> V
    K --> V
    V --> O[Hasil: skor, sinyal, bukti, saran]
```

1. **Normalisasi** menyatukan variasi penulisan tanpa mengubah bukti asli.
2. **Detektor** mencari pola: permintaan OTP, transfer ke rekening pribadi,
   tautan mencurigakan, ketidakcocokan identitas, tekanan waktu, dan lainnya.
3. **Agregasi** memberi bobot setiap sinyal, menerapkan aturan keras, dan
   menghasilkan skor bulat 0–100.
4. **Risiko** diturunkan dari skor: `bersih`, `rendah`, `mencurigakan`, atau
   `tinggi`.
5. **Validasi kontrak** memastikan setidaknya satu sinyal, bukti berupa
   substring persis, urutan sinyal benar, dan saran terdiri dari 1–4 langkah.

Kontrak dan daftar detektor: [docs/architecture/scoring-engine.md](docs/architecture/scoring-engine.md).

---

## Privasi dan batas data

| Data | Meninggalkan perangkat? | Catatan |
| --- | --- | --- |
| Pesan yang diperiksa | **Tidak** | Dinilai di browser; tidak disimpan. |
| Kutipan bukti | **Tidak** | Hanya label dan bobot yang dapat ikut ke ringkasan. |
| Riwayat percakapan Companion | **Tidak** | Tidak disimpan di server. |
| Pertanyaan lanjutan ke AI | Ya, jika AI aktif | Berisi pertanyaan pengguna dan ringkasan temuan tanpa kutipan. |
| Gambar untuk vision | Ya, jika dipilih | Dikirim ke provider untuk ekstraksi teks. |
| URL untuk verifikasi tautan | Ya, jika dipilih | Dikirim ke layanan url.vet; pesan dan skor tidak ikut. |
| Akun, progres, hasil, komunitas | Ya | Disimpan di PostgreSQL; postingan komunitas bersifat publik. |
| Korpus lowongan | Ya | Berisi data lowongan publik dan label turunan. |

Jaminan yang diuji:

- Skema payload AI menggunakan Zod `.strict()`, sehingga field tak dikenal
  ditolak, bukan diteruskan diam-diam.
- Payload voice dan answer tidak memiliki field pesan atau kutipan bukti.
- Skor dan risiko tidak pernah berasal dari model bahasa.
- Verifikasi tautan tidak mengubah skor deterministik.

Rincian threat model dan kontrol: [docs/architecture/security-privacy.md](docs/architecture/security-privacy.md).

---

## Teknologi

| Lapisan | Teknologi | Versi |
| --- | --- | --- |
| Framework | Next.js App Router | 16.4.5 |
| UI | React | 19.3.0 |
| Bahasa | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS | 4.x |
| Komponen | shadcn/ui di atas Radix UI | — |
| Ikon dan animasi | Lucide, Motion | 1.x, 14.x |
| Validasi | Zod | 4.x |
| Database | PostgreSQL, `pg` | 18.x |
| Pengujian | Jest, React Testing Library | 30.x |
| Lint dan format | Biome | 2.4 |
| Deployment | Docker Compose, Caddy | — |

Dependensi lengkap: [`package.json`](package.json).

---

## Mulai cepat

### Prasyarat

- **Node.js 24 atau lebih baru** dan npm.
- **PostgreSQL 18** (versi terbaru juga dapat digunakan untuk pengembangan)
  dengan database dan peran yang dapat menjalankan migrasi.
- Git.

### Instalasi lokal

```bash
git clone https://github.com/vaskoyudha/Lumina.git
cd Lumina
npm ci
```

Salin konfigurasi contoh:

```bash
cp .env.example .env.local
```

Edit `.env.local` dan sesuaikan `DATABASE_URL`. Untuk pengembangan lokal,
`AUTH_URL` adalah `http://localhost:3000`. Jangan pernah memasukkan kredensial
asli ke repositori.

```bash
npm run db:migrate  # menerapkan seluruh migrasi PostgreSQL
npm run db:seed     # mengisi modul, kuis, dan skenario awal
npm run dev         # menjalankan server pengembangan
```

Buka **[http://localhost:3000](http://localhost:3000)**.

Seed bawaan bersifat aditif: konten yang sudah ada tidak ditimpa. Untuk
mengganti konten tertentu secara eksplisit, gunakan `--replace` (lihat
[Perintah npm](#perintah-npm)).

### Menjalankan dengan Docker Compose

```bash
cp .env.example .env.production
chmod 600 .env.production
# isi DOMAIN, AUTH_URL, POSTGRES_DB, POSTGRES_PASSWORD, APP_DB_PASSWORD

docker compose --env-file .env.production build app
docker compose --env-file .env.production up -d db
docker compose --env-file .env.production run --rm --no-deps app npm run db:migrate
docker compose --env-file .env.production run --rm --no-deps app npm run db:seed
docker compose --env-file .env.production up -d app proxy
curl -fsS "https://${DOMAIN}/api/health"
```

Panduan lengkap, termasuk backup, restore, rollback, dan deployment native
systemd: [docs/deploy.md](docs/deploy.md) dan
[docs/architecture/operations.md](docs/architecture/operations.md).

---

## Konfigurasi

### Inti

| Variabel | Wajib | Kegunaan |
| --- | --- | --- |
| `DATABASE_URL` | Ya | Koneksi PostgreSQL untuk aplikasi. |
| `TEST_DATABASE_URL` | Tidak | Database integrasi khusus; nama harus berakhiran `_test`. |
| `AUTH_URL` | Ya untuk OAuth | Origin publik kanonik; wajib HTTPS di produksi. |
| `GOOGLE_CLIENT_ID` | Tidak | Mengaktifkan masuk dengan Google. |
| `GOOGLE_CLIENT_SECRET` | Tidak | Secret OAuth Google; hanya di server. |
| `NODE_ENV` | Otomatis | `production` mengaktifkan cookie `Secure`. |

Callback Google: `AUTH_URL + /api/auth/google/callback`.

### AI dan verifikasi

| Variabel | Bawaan | Kegunaan |
| --- | --- | --- |
| `LUMINA_LLM_URL` | — | Base URL provider yang kompatibel dengan OpenAI. Kosong = mode templat. |
| `LUMINA_LLM_MODEL` | — | Nama model. |
| `LUMINA_LLM_KEY` | — | Bearer token provider; hanya di server. |
| `LUMINA_AI_GLOBAL_LIMIT` | 200 | Batas global permintaan AI per menit (contoh Compose: 100). |
| `URLVET_API_URL` | `https://api.url.vet` | Layanan verifikasi tautan; `off` menonaktifkan. |
| `VERIFY_LINK` | `off` | Mengaktifkan pemeriksaan jaringan `/api/verify-link`. |
| `VERIFY_FILE` | `off` | Mengaktifkan reputasi hash `/api/verify-file`. |

### Fitur dan operasi

| Variabel | Bawaan | Kegunaan |
| --- | --- | --- |
| `LUMINA_DEMO_EMAIL` | — | Akun demo yang dibuat saat pertama dipakai. |
| `LUMINA_DEMO_PASSWORD` | — | Password akun demo; hanya dibaca di server. |
| `COMMUNITY_MODERATOR_IDS` | — | UUID akun moderator, dipisahkan koma. |
| `LOKER_SCAN_DATA_DIR` | `<cwd>/.scan-data` | Direktori data pemindai lowongan; harus dapat ditulis. |
| `LOKER_PREWARM_INTERVAL_MS` | `21600000` (6 jam) | Jadwal pemindaian latar belakang; `0` menonaktifkan. |
| `TRUST_PROXY` | `false` | Percaya `X-Lumina-Client-IP`; hanya di belakang proxy yang menimpa header. |

### Docker Compose

| Variabel | Wajib | Kegunaan |
| --- | --- | --- |
| `DOMAIN` | Ya | Alamat situs untuk Caddy. |
| `POSTGRES_DB` | Ya | Nama database. |
| `POSTGRES_PASSWORD` | Ya | Password superuser PostgreSQL. |
| `APP_DB_PASSWORD` | Ya | Password peran `lumina_app`; gunakan hex. |
| `APP_IMAGE` | `lumina:local` | Tag image rilis untuk rollback. |

Buat password terpisah dengan `openssl rand -hex 32`. Referensi lengkap:
[`.env.example`](.env.example).

---

## Perintah npm

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan Next.js. |
| `npm run build` | Build produksi; juga menjadi gerbang kualitas RSC. |
| `npm run start` | Menjalankan build produksi. |
| `npm run typecheck` | Pemeriksaan tipe `tsc --noEmit`. |
| `npm run lint` | Lint dan pemeriksaan format Biome. |
| `npm run lint:fix` | Memperbaiki lint dan format secara otomatis. |
| `npm run format` | Memformat berkas dengan Biome. |
| `npm test` | Menjalankan seluruh tes Jest. |
| `npm run test:watch` | Jest dalam mode watch. |
| `npm run test:coverage` | Jest dengan laporan cakupan. |
| `npm run verify` | typecheck → lint → test → build. Gerbang rilis. |
| `npm run db:migrate` | Menerapkan migrasi PostgreSQL bernomor. |
| `npm run db:seed` | Mengisi konten awal (aditif). |
| `npm run db:seed -- FILE --replace` | Mengganti konten dari berkas tertentu. |
| `npm run db:seed:community` | Data demo Komunitas (jangan di produksi). |
| `npm run db:seed:community:agents` | Postingan agen contoh (jangan di produksi). |
| `npm run db:cleanup` | Menghapus sesi, state OAuth, dan counter kedaluwarsa. |
| `npm run db:import-sqlite` | Impor akun dari database SQLite lama. |
| `npm run wip` | Laporan pekerjaan yang sedang berjalan. |

---

## Struktur repositori

```text
src/
  app/                 Rute App Router, layout, dan route handler API
  components/          Shell aplikasi, UI, dan komponen per domain
  lib/
    scoring/           Mesin skor deterministik dan detektor
    contracts/         Kontrak Zod yang dibekukan
    companion/         Routing giliran, intent, penjelasan, riwayat
    learning/          Modul, kuis, pengulangan, peta pola
    simulasi/          Skenario, validasi, penilaian
    community/         Store, aksi, moderasi
    loker/             Pemindai lowongan, adapter, audit, verdict
    auth/              Sesi, akun, password, Google OAuth
    verify/            Verifikasi tautan dan berkas
  styles/              Token dan stylesheet global
content/               Materi awal Belajar dan Simulasi
migrations/            Migrasi PostgreSQL bernomor
scripts/               Migrasi, seed, cleanup, impor
scanner/               Engine pemindai lowongan pihak ketiga
deploy/                Caddyfile dan skrip backup
docs/                  Dokumentasi teknis dan produk
public/                Logo, gambar, dan aset publik
```

Aturan rekayasa yang mengikat ada di [AGENTS.md](AGENTS.md).

---

## Panduan penggunaan

1. **Periksa.** Buka `/companion`, tempel pesan yang mencurigakan, lalu baca
   skor, tingkat risiko, sinyal, dan panel bukti. Kutipan bukti menunjukkan
   bagian teks yang memicu setiap temuan.
2. **Pahami.** Ajukan pertanyaan lanjutan tentang temuan atau langkah
   berikutnya. Jawaban tidak mengubah skor.
3. **Pelajari.** Buka `/belajar`, pilih modul, dan selesaikan kuis. Masuk ke
   akun untuk menyimpan progres dan jadwal pengulangan.
4. **Berlatih.** Buka `/simulasi` dan pilih skenario yang tersedia. Ikuti
   percakapan, pilih tindakan, dan tinjau hasil di akhir.
5. **Berdiskusi.** Buka `/komunitas` untuk membaca. Masuk atau daftar untuk
   membuat postingan, membalas, menyimpan, dan melaporkan konten.
6. **Pantau.** Buka `/profil` setelah masuk untuk melihat progres dan hasil yang
   terkait dengan akun.

> Hasil pemeriksaan adalah bantuan untuk mengenali risiko, bukan jaminan bahwa
> suatu pesan, tautan, atau lowongan aman. Selalu verifikasi melalui kanal resmi.

---

## Pengujian dan kualitas

Repositori ini memiliki lebih dari **1.200 kasus tes** dalam **173 berkas tes**
pada baseline dokumentasi ini.

| Lapisan | Cakupan |
| --- | --- |
| Unit dan properti | Kontrak, detektor skor, normalisasi, parser, validasi skenario. |
| Komponen | Composer, panel risiko, dialog, editor komunitas, navigasi responsif. |
| Integrasi | Store dan aksi dengan PostgreSQL nyata: sesi, progres, komunitas, lowongan. |
| Kontrak API | 400/401/403/413/429/504, `no-store`, dan bentuk payload keluar. |
| Build | `next build` menangkap pelanggaran batas server/client dan cache. |

Menjalankan tes integrasi:

```bash
export TEST_DATABASE_URL="postgresql://lumina_app:PASSWORD@127.0.0.1:5432/lumina_test"
npm test
```

Nama database harus berakhiran `_test`; Jest memaksa satu worker agar data tidak
saling menimpa. Tanpa variabel ini, suite integrasi dilewati.

Gerbang rilis:

```bash
npm run verify
```

Tidak ada tes end-to-end browser di repositori; alur klik penuh diverifikasi
secara manual. Detail dan batasan pengujian:
[docs/architecture/testing.md](docs/architecture/testing.md).

---

## Deployment

Dua jalur didukung:

| Jalur | Cocok untuk | Ringkasan |
| --- | --- | --- |
| Docker Compose + Caddy | Deployment portabel | PostgreSQL, app, dan TLS dalam Compose. |
| Native + systemd + nginx | VPS yang sudah berjalan | `next start` di `127.0.0.1:3000`, nginx menangani TLS. |

Urutan rilis yang benar:

1. Backup database.
2. Build image/artifact dengan tag unik.
3. Jalankan `npm run db:migrate` sebagai langkah terpisah.
4. Ganti aplikasi tanpa build ulang saat start.
5. Verifikasi `/api/health` dan satu halaman perwakilan.
6. Gunakan penanda unik commit untuk memastikan bundle yang dilayani benar-benar
   build terbaru.

Migrasi harus tetap kompatibel mundur agar rollback image tidak memerlukan
rollback skema. Jangan menghapus kolom atau tabel dalam jendela rilis yang sama.

Checklist lengkap: [docs/architecture/operations.md](docs/architecture/operations.md).

---

## Dokumentasi

### Referensi arsitektur

| Dokumen | Isi |
| --- | --- |
| [Indeks arsitektur](docs/architecture/README.md) | Peta dokumen, invarian, jalur baca, aturan pemeliharaan. |
| [Ringkasan sistem](docs/architecture/overview.md) | Bentuk produk, prinsip, topologi, siklus hidup request. |
| [Frontend](docs/architecture/frontend.md) | Rute, shell, komponen, token, rendering, aksesibilitas. |
| [Backend](docs/architecture/backend.md) | RSC, Server Actions, route handler, batas body, API. |
| [Model data](docs/architecture/data-model.md) | Tabel, constraint, indeks, migrasi, seed, retensi. |
| [Mesin skor](docs/architecture/scoring-engine.md) | Kontrak, detektor, matematika skor, validator, evaluasi. |
| [Companion](docs/architecture/companion.md) | Routing lane, trace agen, bukti, voice/vision, tools, privasi. |
| [Belajar dan Simulasi](docs/architecture/learning-simulation.md) | Model konten, kuis, SRS, state machine, penilaian server. |
| [Komunitas](docs/architecture/community.md) | Domain diskusi, izin, moderasi, verifikasi, batasan. |
| [Pemindai lowongan](docs/architecture/loker.md) | Pipeline crawl, adapter, dua verdict, lock, penjadwalan. |
| [Keamanan dan privasi](docs/architecture/security-privacy.md) | Threat model, auth, otorisasi, rate limit, batas data. |
| [Operasi](docs/architecture/operations.md) | Build, deploy, migrasi, backup, restore, rollback, observasi. |
| [Pengujian](docs/architecture/testing.md) | Lapisan tes, database integrasi, gerbang rilis. |
| [Keputusan](docs/architecture/decisions.md) | ADR dan konsekuensinya. |
| [Glosarium](docs/architecture/glossary.md) | Istilah produk dan penipuan yang dipakai di kode. |

### Dokumen produk dan fitur

- [Indeks dokumentasi](docs/README.md) — peta seluruh dokumen.
- [Rencana produk](docs/plan.md) dan [status implementasi](STATUS.md).
- [Autentikasi](docs/auth.md) · [Belajar dan Simulasi](docs/learning-database.md) · [Komunitas](docs/community.md)
- [Verifikasi tautan](docs/link-verification.md) · [Pencarian lowongan](docs/loker-tool.md) · [Panduan lowongan](docs/loker-tool-guide.md)
- [Orkestrasi agent](docs/agent-orchestration.md) · [Template laporan](docs/report-template.md)
- [Deployment](docs/deploy.md) · [Sistem desain AppNext](docs/design-system/appnext.md)

---

## Batasan yang diketahui

- **Belum ada verifikasi email dan reset password.** Akun dibuat tanpa
  konfirmasi kepemilikan email; pemulihan dilakukan oleh operator.
- **Belum ada unggahan berkas, DM, realtime, atau notifikasi.** Komunitas
  sengaja dibatasi untuk lingkup kompetisi.
- **Tidak ada tes end-to-end browser.** Alur klik diverifikasi manual.
- **Korpus lowongan bergantung pada pemindaian.** Hasil bukan indeks live dan
  dapat tertinggal; kartu menampilkan jumlah sebenarnya.
- **"Aman dilamar" bukan jaminan.** Panggilan telepon, chat, atau tawaran setelah
  melamar tidak terlihat oleh pemindai.
- **AI bersifat opsional.** Tanpa provider, jawaban memakai templat dan fitur
  vision/voice tidak tersedia.
- **Asumsi satu host.** Lock advisory, direktori pemindaian lokal, dan pool
  proses mengasumsikan satu instance aplikasi.
- **Moderator dikonfigurasi lewat environment.** Belum ada tabel peran atau UI
  pemberian akses.

---

## Kontribusi

1. Baca [AGENTS.md](AGENTS.md) dan dokumen arsitektur untuk area yang diubah.
2. Buat branch terpisah; jangan bekerja langsung di `main`.
3. Perubahan perilaku harus disertai tes dan pembaruan dokumen dalam commit yang
   sama.
4. Migrasi harus aditif dan kompatibel mundur.
5. Jangan mengirim pesan yang diperiksa ke provider AI atau menambah field
   sensitif ke payload keluar.
6. Jalankan `npm run verify` sebelum membuka pull request.
7. Jangan commit rahasia, `.env.local`, atau data pengguna.

---

## Atribusi

Lumina menggunakan perangkat lunak dan aset pihak ketiga berikut. Masing-masing
tetap mengikuti lisensinya sendiri.

- **Framework dan pustaka:** [Next.js](https://nextjs.org/), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/), [Lucide](https://lucide.dev/), [Zod](https://zod.dev/), [node-postgres](https://node-postgres.com/), [Jest](https://jestjs.io/), [Testing Library](https://testing-library.com/), dan [Biome](https://biomejs.dev/). Dependensi lengkap dan versinya tercantum di [`package.json`](package.json) dan lockfile.
- **Tampilan Komunitas:** adaptasi tata letak [ccrsxx/twitter-clone](https://github.com/ccrsxx/twitter-clone), berlisensi MIT. Lihat [pemetaan sumber](docs/community-ui-research.md) dan [teks lisensi](docs/licenses/twitter-clone-MIT.txt).
- **Pemindai lowongan:** engine career-ops yang disertakan di [`scanner/`](scanner/), dengan [lisensi MIT dan pemberitahuan hak cipta](scanner/LICENSE); integrasinya dijelaskan di [panduan lowongan](docs/loker-tool.md).
- **Verifikasi tautan:** [url.vet](https://github.com/urlvet/urlvet), layanan terpisah berlisensi AGPL-3.0; sumber data ancamannya dapat memiliki ketentuan tersendiri. Lihat [panduan verifikasi](docs/link-verification.md).
- **Referensi desain:** [AppNext](https://appnext.framer.website/) untuk sistem desain aplikasi dan aset/tampilan Powder pada landing. Detail AppNext tersedia di [dokumentasi desain](docs/design-system/appnext.md).
- **Foto:** beberapa potret berasal dari Unsplash; sumber tiap foto dan lisensinya dicatat di [atribusi gambar](public/images/ATTRIBUTION.md).

---

<p align="center"><strong>Lumina</strong> · Kenali polanya, ambil keputusan dengan lebih yakin.</p>
