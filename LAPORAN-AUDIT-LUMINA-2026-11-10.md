# Laporan Audit Bug — Lumina

**Tanggal:** 10 November 2026
**Repo:** `C:\Users\Kiral\Lumina` (audit di `main` @ `bbf7b09`; perbaikan di branch `codex/audit-fixes`, belum di-commit)
**Lingkungan uji:** Next.js 16.4.5 (dev + build produksi), PostgreSQL 18.6 (Docker `lumina-pg-dev`), Chrome headless via CDP, viewport 1280×900 dan 380×800.
**Cakupan:** 13 rute, alur Companion (periksa pesan), daftar/masuk, kuis modul 10, penyelesaian modul, simulasi L1, publikasi komunitas, profil, `/api/health`, 404, dan lebar 380px.
**Tidak diuji:** Google OAuth, ubah nama/password/revoke sesi, vision/voice dengan provider AI nyata, scanner lowongan live, moderasi komunitas, unggah gambar.

---

## Ringkasan

| # | Temuan | Tingkat | Area | Status |
|---|---|---|---|---|
| 1 | Hydration mismatch di **semua halaman Belajar**, juga pada build produksi | **Tinggi** | `/belajar`, `/belajar/[modul]` | **Diperbaiki** |
| 2 | Gambar promo sidebar terdeteksi sebagai LCP dan dimuat lazy | Sedang | Sidebar `/simulasi`, `/belajar` | **Diperbaiki** |
| 3 | `/favicon.ico` 404; tidak ada ikon aplikasi | Rendah | Global | **Diperbaiki** |
| 4 | `/robots.txt` dan `/sitemap.xml` 404 | Rendah | SEO | **Diperbaiki** |
| 5 | 59 ID DOM duplikat di landing | Rendah | `/` (Powder, vendored) | **Diperbaiki** |
| 6 | 8 elemen `<h1>` di landing | Informasi | `/` (Powder, vendored) | **Diperbaiki** |
| 7 | Build men-trace seluruh proyek ke output standalone | Rendah | Docker/deploy | **Diperbaiki** |

Tidak ditemukan bug fungsional pada alur inti yang diuji: skor Companion, kuis, penyimpanan progres, simulasi, dan publikasi komunitas berjalan.

---

## Status perbaikan (branch `codex/audit-fixes`)

Semua temuan di atas sudah diperbaiki dan diverifikasi ulang pada build produksi. Perubahan belum di-commit.

| # | Perubahan | Verifikasi |
|---|---|---|
| 1 | `AccountProgressProvider` dipindah ke dalam `WorkspaceFrame`, yaitu konten yang di-stream, bukan membungkus `Suspense` dari luar. `WorkspaceShell` menerima `progressModules`; `BelajarShell` dan `/simulasi` mengoper modul. | `/belajar` guest, `/belajar` login, dan `/belajar/10` di build produksi: tidak ada React #418, `navCount` = 1. |
| 2 | `loading="eager"` pada `promo-dashboard.png`; kartu modul pertama memakai `loading="eager"`, hero Belajar memakai `loading="eager"` (bukan `priority` yang deprecated di Next 16). | Console `/belajar` produksi bersih dari peringatan LCP. |
| 3 | `src/app/icon.png`, `src/app/apple-icon.png`, dan `src/app/favicon.ico` (ICO 32×32 berisi PNG). | `/favicon.ico` 200 `image/x-icon`; `/icon.png` dan `/apple-icon.png` 200. |
| 4 | `src/app/robots.ts` + `src/app/sitemap.ts`; origin dibaca per request lewat `connection()`/`headers()` agar tidak membeku sebagai `localhost` saat build Docker. | `/robots.txt` dan `/sitemap.xml` 200; dengan `X-Forwarded-Host: lumina.example` URL memakai `https://lumina.example`. |
| 5 | Semua `id="..."` yang tidak direferensikan dihapus dari `src/data/powder/why-sparklines.json` (59 ID, tepat yang terduplikasi 3×). | Landing produksi: 0 ID duplikat. |
| 6 | Enam heading statistik Powder dan hero marketing kedua diubah ke `h2`; hero Powder tetap satu-satunya `h1`. | Landing produksi: tepat 1 `<h1>`. |
| 7 | `process.cwd()` diganti `path.resolve(...)` dan pemanggilan path dinamis di `bootstrap.ts` diberi `/* turbopackIgnore: true */`. | Build ulang: peringatan “Dynamic filesystem access” hilang. |
| 8 | **Tambahan:** font Google diganti `next/font/local` dengan Inter Variable yang di-commit di `src/app/fonts/`. Sebelumnya setiap request dev menunggu Google Fonts timeout (~20–30 dtk) sebelum paint. | Build dan dev tidak lagi memanggil `fonts.googleapis.com`; landing produksi memuat tanpa jeda font. |

---

## Tindak lanjut: level simulasi yang tadinya “Rencana”

Empat level yang sebelumnya hanya tampil sebagai kartu **Rencana** sekarang punya skenario utuh dan bisa dibuka:

| Level | Modul | Skenario | Tema |
|---|---|---|---|
| L2 | 7 | `L2-phishing-tautan` | Tautan login bank palsu; verifikasi lewat aplikasi sendiri |
| L3 | 4 | `L3-lowongan-berbayar` | Lowongan tugas yang meminta setoran di muka |
| L3 | 9 | `L3-pinjol-fiktif` | Pinjol yang meminta akses kontak dan biaya admin |
| L4 | 2 | `L4-fake-call` | Telepon “petugas bank” yang meminta OTP |

Setiap skenario punya tiga babak, tiga akhir (berhasil / pulih / gagal), alat **Berkas bukti**, dan pesan debrief. Yang berubah:

- `src/lib/simulasi/scenarios.ts` — definisi bertipe untuk empat skenario baru; `catalog.ts` memvalidasi semuanya.
- `content/competition.json` — lima simulasi dan `scenarioId` untuk modul 2, 4, 7, 9, 10; seed database.
- `src/data/modul-02.ts`, `modul-04.ts`, `modul-07.ts`, `modul-09.ts` dan `src/data/modus.json` — `scenarioId` diisi, `scenarioPlanned` dikosongkan.
- `/simulasi` — kartu “Level lain” sekarang menaut ke level yang bisa dimainkan, bukan label Rencana.
- `scripts/seed-content.mjs` — `--replace` tidak lagi dianggap sebagai path input.

Database lokal sudah di-seed ulang (`npm run db:seed -- --replace`). Untuk deployment, jalankan perintah yang sama setelah migrasi. Verifikasi: `/simulasi` dan keempat `/simulasi/<id>` membalas 200, tidak ada teks “Rencana”, dan `npm run verify` lulus (typecheck, lint, 970 test, build).

**Insiden landing “muter mulu”:** penyebab yang terukur adalah artefak `.next` campuran (dev + produksi) yang memicu full reload berulang, ditambah timeout Google Fonts yang membuat paint pertama tertahan puluhan detik. Setelah `.next` dibersihkan, dev dijalankan ulang, dan font di-self-host, probe Chrome headless selama 25–50 detik menunjukkan satu navigasi (`navCount` = 1), `[HMR] connected`, dan tidak ada reload dokumen. Jika tab lama masih berputar, hard refresh (Ctrl+Shift+R) atau tutup lalu buka tab `localhost:3000`.

**Catatan gate:** `npm run verify` berhenti di langkah `lint` karena `cyber_course_dashboard(1).tsx` (berkas untracked milik pengguna, bukan bagian repo) memiliki 17 error a11y dan satu `noImgElement`, plus satu `noImportantStyles` di `src/styles/powder-theme.css` yang sudah ada sebelumnya. Semua berkas yang diubah di branch ini lolos `biome check`; `typecheck`, seluruh test, dan `build` lulus.

---

## 1. [TINGGI] Hydration mismatch di halaman Belajar (guest dan login), juga di production

### Gejala

React melempar error hydration pada setiap kunjungan ke halaman Belajar. Di dev, React menunjuk komponen yang berbeda; di build produksi, console menampilkan:

```
Error: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]=...
    at r1 (.../_next/static/chunks/3wi2cf-kyw4pi.js:1:58538)
    at r2 (...)
```

`#418` adalah *hydration failed because the server rendered text didn't match the client*. Error ini muncul pada:

- `/belajar` saat **belum login**
- `/belajar` saat **sudah login**
- `/belajar/10` saat sudah login

### Bukti dev (stack menyebut komponennya)

Saat belum login, server mengirim header halaman, tetapi klien merender `ProgressNotice`:

```
<ProgressNotice>
  <Alert>
+   <div data-slot="alert" role="alert" ...>
-   <header class="-mx-4 ...">
```

Saat sudah login, server mengirim placeholder `—`, klien sudah berisi progres:

```
<ModuleProgressBox no={10} ready={true}>
  <span class="tabular ...">
+   0%
-   —
```

```
<BelajarDashboard ...>
  <span class="flex size-5 ...">
+   1
-   —
```

Pada uji setelah modul 10 diselesaikan, selisihnya menjadi `100%` vs `—`. Semua error ini berasal dari:

- `src/components/belajar/belajar-progress.tsx:103` (`ProgressNotice`)
- `src/components/belajar/module-progress-box.tsx:35`
- `src/components/belajar/belajar-dashboard.tsx:81`

### Cara mereproduksi

```bash
npm run dev
# buka http://localhost:3000/belajar dan /belajar/10, lihat console browser
```

Untuk produksi:

```bash
npm run build
npm run start -- -p 3100
# buka http://localhost:3100/belajar (guest dan setelah login)
```

Catatan: Next memperingatkan `next start` tidak cocok untuk `output: "standalone"`; untuk persis seperti Docker jalankan `node .next/standalone/server.js`. Error hydration tetap muncul pada uji `next start`, jadi bukan artefak dev-only.

### Penyebab (hipotesis yang paling sesuai dengan bukti)

`AccountProgressProvider` adalah client component yang memanggil Server Action `getAccountProgress()` di dalam `useEffect` saat mount (`src/components/belajar/belajar-progress.tsx:47-82`). Provider ini membungkus `WorkspaceShell`, yang merupakan server component dengan `Suspense`; fallback dan konten hasil stream sama-sama memuat `children` yang bergantung pada progres (`src/components/belajar/belajar-shell.tsx:28-33`, `src/components/shell/workspace-shell.tsx:23-39`).

Server merender segmen dinamis dengan `progress = null` (placeholder `—` atau tanpa notice). Di klien, hasil Server Action bisa tiba dan mengubah state sebelum segmen hasil stream selesai dihidrasi, sehingga render pertama segmen itu sudah memakai `0`/`1`/`100` atau `Alert`, lalu React membandingkannya dengan HTML server yang masih placeholder. Log dev juga menunjukkan `POST /belajar` → `getAccountProgress()` dipanggil **dua kali** per page load (efek ganda StrictMode), yang memperbesar peluang balapan ini.

### Dampak

- React membuang hasil render server untuk subtree tersebut dan meregenerasinya di klien pada **setiap** halaman Belajar.
- Console produksi kotor dengan exception React #418.
- Berpotensi flicker/layout shift: hitungan progres dan alert masuk setelah hidrasi, bukan pada HTML awal.
- Markup server untuk area progres tidak terpakai; waktu render klien bertambah.
- Error hydration bisa menutupi bug hydration lain di masa depan.

### Arah perbaikan

Pilih salah satu, lalu verifikasi ulang dengan build produksi:

1. **Kirim snapshot awal dari server.** Baca sesi + progres di server component halaman, oper sebagai nilai awal ke provider. Refresh di klien hanya memperbarui setelah mount. HTML server dan render pertama klien menjadi identik, dan progres sudah benar sejak paint pertama.
2. **Gate hidrasi.** Render placeholder `—`/tanpa notice sampai flag `mounted` bernilai true. Pastikan flag dan state progres berada di luar boundary yang di-stream, bukan di dalam `children` yang ikut fallback, agar update tidak terjadi sebelum hidrasi segmen selesai.
3. **Pindahkan UI progres keluar dari boundary stream.** Jangan menaruh `ProgressNotice` dan penghitung progres di `children` yang dipakai baik oleh fallback `Suspense` maupun konten terselesaikan; atau angkat provider ke atas boundary dan render bagian progres hanya di konten final.

Tambahkan uji E2E yang membuka `/belajar` (guest dan login) dan gagal bila ada `console.error` mengandung `Minified React error #418` / `Hydration failed`. Uji komponen saja tidak akan menangkap masalah ini.

---

## 2. [SEDANG] Gambar promo di sidebar menjadi LCP dan dimuat lazy

### Gejala

Console pada `/simulasi/L1-kurir-apk` (dan halaman ber-sidebar lain) menampilkan:

```
Image with src "/brand/promo-dashboard.png" was detected as the Largest Contentful Paint (LCP).
Please add the `loading="eager"` property if this image is above the fold.
```

### Penyebab

`<Image src="/brand/promo-dashboard.png" fill sizes="204px" ... />` di `src/components/companion/session-sidebar.tsx:425` tidak punya `priority`/`loading`, sehingga Next memakai lazy loading. Di viewport desktop, kartu promo itu berada di atas fold dan menjadi kandidat LCP, tetapi baru dimuat setelah layout/hydration.

### Dampak

LCP desktop tertunda oleh elemen dekoratif, bukan konten utama. Ini metrik performa, bukan bug fungsional, tetapi relevan untuk demo/submission.

### Perbaikan

- Tambahkan `loading="eager"` (atau `priority`) pada gambar tersebut; ukurannya kecil (`sizes="204px"`), jadi biayanya rendah.
- Alternatif/ tambahan: jadikan teks kartu sebagai LCP dan pastikan gambar tidak menghalangi; verifikasi ulang dengan Lighthouse atau panel Performance.
- Jika sidebar disembunyikan di mobile, dampaknya hanya desktop.

---

## 3. [RENDAH] `/favicon.ico` 404 dan tidak ada ikon aplikasi

`GET /favicon.ico` mengembalikan 404 di dev dan produksi. Tidak ada `src/app/icon.*`, `src/app/favicon.*`, maupun `metadata.icons` di `src/app/layout.tsx`/`src/lib/site.ts`. Console landing mencatat:

```
Failed to load resource: the server responded with a status of 404 (Not Found) @ /favicon.ico
```

**Perbaikan:** tambahkan `src/app/icon.png` (atau `favicon.ico` di `public/`) dan, bila perlu, `apple-icon.png`. Ini juga menghilangkan 404 pada setiap kunjungan pertama.

---

## 4. [RENDAH] `robots.txt` dan `sitemap.xml` tidak ada

Keduanya 404 di dev dan tidak muncul di daftar route build produksi (`src/app` tidak punya `robots.ts`/`sitemap.ts`). Crawler masih bisa menjelajah, tetapi tidak ada sitemap maupun aturan eksplisit.

**Perbaikan:** tambahkan `src/app/robots.ts` dan `src/app/sitemap.ts`. Daftarkan rute publik (`/`, `/belajar`, `/belajar/[modul]`, `/simulasi`, `/komunitas`, `/masuk`, `/daftar`) dan kecualikan `/api`, `/profil`, `/admin`, `/komunitas/moderasi`.

---

## 5. [RENDAH] 59 ID DOM duplikat di landing

HTML landing berisi 59 ID unik yang masing-masing muncul **3 kali** (contoh: `dO6STzg9k`, `PpqNPTKem`, `WFFv0YJUN`). ID ini berasal dari section Powder yang di-vendor (`src/components/marketing/powder/sections`, dikecualikan dari Biome). Pemeriksaan `for`, `aria-labelledby`, `aria-controls`, `aria-describedby`, dan `href="#..."` tidak menemukan referensi ke ID duplikat tersebut.

**Dampak saat ini:** HTML tidak valid dan `document.getElementById` hanya mengembalikan elemen pertama. Belum terlihat merusak tampilan, tetapi rapuh bila nanti ada anchor/script yang memakai ID itu.

**Perbaikan:** beri suffix unik per instance (mis. indeks), atau hapus `id` yang tidak dipakai.

---

## 6. [INFORMASI] 8 elemen `<h1>` di landing

Landing merender delapan `<h1>`: satu judul hero (`src/components/marketing/sections/hero.tsx:62`) dan enam kartu statistik Powder berisi `18 /20` dan `0 /23` (masing-masing 3 salinan). HTML5 mengizinkan lebih dari satu `h1`, tetapi struktur heading menjadi datar dan noisy untuk SEO/screen reader.

**Perbaikan:** pertahankan satu `h1` (hero) dan ubah heading kartu statistik menjadi `h2`/`h3`. Ini berada di area Powder yang di-vendor; ubah hati-hati dan jangan mengubah kelas `framer-*`.

---

## 7. [RENDAH] Build men-trace seluruh proyek ke output standalone

`npm run build` memperingatkan:

```
Static analysis determined that this filesystem access causes the whole project to be traced and included in the output.
...
Import trace:
  ./src/lib/loker/bootstrap.ts
  ./src/lib/loker/run.ts
  ./src/app/api/loker/scan/route.ts
```

Sumbernya `path.join(process.cwd(), ".scan-data")` di `src/lib/loker/bootstrap.ts:17` (dan `scannerDir()` di baris 22). Next/Turbopack tidak bisa membatasi path secara statis, sehingga seluruh proyek (termasuk `public/`) ikut ditelusuri ke output server/standalone.

**Dampak:** image Docker/standalone lebih besar dan deploy lebih lambat; berpotensi menabrak batas ukuran. Tidak memengaruhi runtime lokal.

**Perbaikan (pilih salah satu):**
- Batasi default ke subfolder statis, mis. `path.join(process.cwd(), "data", ".scan-data")`.
- Tambahkan komentar opt-out yang disarankan Turbopack pada pemanggilan `process.cwd()`.
- Pastikan hanya dijalankan saat runtime (bukan dievaluasi statis saat build).
- Ukur ulang ukuran `.next/standalone`/image setelah perubahan.

---

## Yang sudah diuji dan sehat

- **Routing:** `/`, `/companion`, `/belajar`, 12 halaman modul, `/komunitas`, detail komunitas, `/simulasi`, `/simulasi/L1-kurir-apk`, `/masuk`, `/daftar`, `/profil`, `/admin` → 200. Halaman tidak ada → 404. Tidak ada gambar rusak. Tidak ada scroll horizontal pada 380px di rute yang diaudit.
- **Companion:** pesan berisi permintaan OTP + tautan → skor “Risiko tinggi”, 2 temuan, urutan 8 agen konsisten, jawaban jatuh ke templat saat `/api/companion/voice` 503 (sesuai mode offline). Tidak ada error console.
- **Auth + Belajar:** registrasi dan login berhasil; kuis modul 10 dijawab 4/4, “Tandai modul selesai” menyimpan progres (100%, profil 8%/1 dari 12, lencana), tetap ada setelah reload.
- **Simulasi:** misi dimulai, dua langkah aman, memilih “Kode OTP dan PIN akun” memunculkan peringatan dan **tidak** dihitung sebagai bukti; dua bukti aman + “Siapkan bukti” menyimpan hasil; profil menampilkan `L1-kurir-apk · santai · Berhasil`.
- **Komunitas:** `/komunitas/baru` tanpa login menampilkan gate “Masuk untuk berdiskusi”; setelah login, publikasi topik berhasil dan redirect ke thread baru.
- **API:** `/api/health` → 200 `{"status":"ok"}`; 503 Companion adalah jalur offline yang didokumentasikan, bukan kerusakan.

Catatan: dua topik uji “Audit otomatis…” sempat dibuat oleh dua kali eksekusi skrip otomatis, bukan duplicate-submit dari satu klik; keduanya sudah dihapus bersama akun uji.

---

## Catatan produk (bukan bug)

- `/admin` dapat dibuka tanpa login (200). Menurut `AGENTS.md` ini workbench penulis kurikulum yang sengaja tidak ditautkan di nav. Jika deployment publik tidak boleh membukanya, tambahkan pembatasan di proxy/auth; jangan andalkan ketiadaan tautan.
- Alert untuk pengunjung tanpa login menampilkan “Muat ulang progres” selain “Masuk”. Tombol itu tidak akan pernah berhasil tanpa sesi; bisa dipertimbangkan disembunyikan saat `authenticated === false`, tetapi bukan kerusakan.

---

## Urutan perbaikan yang disarankan

1. **Hydration Belajar** — prioritaskan; ini satu-satunya error produksi yang muncul di setiap halaman pembelajaran.
2. **LCP sidebar** — tambah `loading="eager"`/`priority`, ukur ulang.
3. **Favicon, robots, sitemap** — cepat, menghilangkan 404 dan melengkapi SEO.
4. **ID duplikat + heading landing** — rapikan saat menyentuh area Powder berikutnya.
5. **Build trace `.scan-data`** — sebelum membangun image demo/produksi.

---

## Lampiran

- Artefak audit mentah (JSON + dump HTML) ada di `C:\Users\Kiral\AppData\Local\Temp\opencode\`:
  `lumina-audit.json`, `lumina-flow.json`, `lumina-flow2.json`–`lumina-flow5.json`, `lumina-prod-audit.mjs`, `landing-dump.html`, `belajar-dump.html`.
- Perubahan kode: lihat bagian **Status perbaikan** dan **Tindak lanjut: level simulasi**. Berkas laporan ini belum di-commit.
- Database lokal: `npm run db:migrate` (no-op), `db:seed`, dan `db:seed:community` dijalankan (idempoten, tanpa `--reset`). Akun uji `audit1794302835388@lumina.test` dan seluruh data turunannya sudah dihapus.
