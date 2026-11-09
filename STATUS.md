# Status — per 8 November 2026

**9 November 2026 — database Belajar dan Simulasi (permintaan pemilik produk).** Materi dan kuis 12 modul serta satu skenario yang benar-benar tersedia dipindahkan ke PostgreSQL. Progres belajar dan hasil simulasi disimpan per akun, bukan localStorage. Kuis dinilai ulang di server dan hasil simulasi direkam per percobaan. Migrasi `003_learning_simulation.sql`, kemudian `npm run db:seed`, wajib dijalankan pada deployment. Skenario level lain tetap Rencana. Panduan: `docs/learning-database.md`.

**8 November 2026 — backend PostgreSQL dan paket VPS.** Akun, sesi, transaksi
OAuth dan limit berpindah ke PostgreSQL dengan pool async, migrasi bernomor,
impor SQLite read-only, serta cleanup expiry. Endpoint AI memiliki batas body
dan kuota persisten; `/api/health` memeriksa DB dengan deadline dua detik.
Dockerfile standalone non-root, Compose app/db/proxy dan Caddy tersedia.
Progres tetap lokal dan `/darurat` tetap publik, termasuk saat DB gagal.
Panduan deploy/backup/restore/rollback: `docs/deploy.md`. Bukti dan batas
verifikasi: `docs/backend-validation.md`. Docker/VPS dan OAuth Google nyata
masih memerlukan pengujian di lingkungan deployment.

**7 November 2026 — autentikasi sungguhan (permintaan pemilik produk).**
`/daftar` dan `/masuk` menjadi halaman terpisah. Akun email/password disimpan
di SQLite dengan scrypt, sesi dapat dicabut, dan Google OAuth memakai state,
PKCE, nonce serta verifikasi ID token. Kredensial Google perlu diisi lewat
`.env.local`. Progres tetap lokal. Panduan dan batas hosting: `docs/auth.md`.

Gate 0 tercapai. Gate 1 tercapai untuk A dan D.

| Stream | Gate 1 target | Status |
|---|---|---|
| A · Companion | tempel teks → `ScoreResult` valid | ✅ plus UI berjalan |
| B · Belajar | `progress.ts` + modul 10 + list page | ✅ modul 10 + katalog + admin course |

**5 Nov 2026 — admin course (Stream B).** `/admin` mengelola isi course:
create/read/update/delete draf di perangkat, pratinjau dengan `ModulBody`
asli, lalu ekspor tiga potongan yang di-commit. Tidak ada DB, tidak ada login,
tidak ada tombol yang menulis ke repo; `/belajar` tetap statis. "Lengkap"
sekarang diturunkan dari `src/data/kurikulum.ts`, bukan dari `modulStatus`.
| C · Simulasi | runner Level 1 sampai choice pertama | ✗ sumber FIRST90 belum ada |
| D · Darurat + Shell | nav + home + token + lima rute | ✅ |

## Yang sudah ada

a. Repo ter-scaffold: Next.js 16, React 19, Tailwind v4, shadcn/ui, Biome, Jest.
b. Design tokens dari §4 hidup di `src/app/globals.css` sebagai `--lumina-*`.
c. Semua rute render: `/`, `/companion`, `/belajar`, `/belajar/[modul]`,
   `/simulasi`, `/simulasi/[id]`, `/darurat`.
d. `modus.json`: 12 modus tervalidasi zod, satu sumber kebenaran untuk A dan B.
e. Engine skor deterministik: delapan agen pemeriksa (Message, Link, Identity,
   Conversation, Job, Marketplace, QRIS, Evidence) plus Scoring Orchestrator.
f. Panel bukti dan bubble per agent; agen yang tidak melapor menyebut alasannya
   (`dilewati`), tanpa label `belum aktif`.
g. Tiga contoh §11.6 sebagai tombol di companion.
h. Mode darurat: lima kasus, checklist bernomor, kanal resmi, cetak.
i. Laporan darurat: pratinjau + `pdf.tsx` (`@react-pdf/renderer`) yang
   menghasilkan PDF nyata di perangkat, lengkap dengan kronologi, rekening
   pelaku, nominal, dan kolom tanda tangan.
j. Korpus bench 57 pesan (`src/lib/scoring/bench-cases.ts`) sebagai instrumen
   di balik setiap klaim akurasi; angkanya diukur, bukan dikutip.
k. `src/lib/evidence/`: producer `EvidenceBundle` pertama (artefak → timeline →
   narasi). Panel bukti menampilkan artefaknya; kode OTP sengaja **tidak**
   pernah diekstrak karena bundel ini keluar perangkat sebagai PDF.
l. 6 November 2026 — companion merutekan giliran secara deterministik: `periksa`
   menjalankan engine lalu menyusun jawaban; `tanya`, `lanjutan`, dan `obrolan`
   dijawab tanpa kartu skor dan tanpa jejak agent. Pesan yang diperiksa tidak
   pernah meninggalkan perangkat — yang dikirim hanya pertanyaan pengguna dan
   ringkasan temuan tanpa kutipan, dan tidak ada riwayat percakapan di server.

## Yang belum ada

| Item | Stream | Catatan |
|---|---|---|
| Lapisan percakapan | A | ✅ LLM tersambung lewat rute jawaban; pesan yang diperiksa tetap di perangkat |
| `evidence.ts` → `EvidenceBundle` | A | ✅ producer jadi; D memakai `buildEvidenceBundle()` untuk PDF |
| Identity Agent (SPF/DKIM/DMARC) | A | cuttable |
| `progress.ts` + modul 10 | B | modul 10 = angka IASC terkuat |
| `Quiz.tsx` | B | penentu apakah terasa kursus |
| Runner Level 1 (port React) | C | butuh sumber FIRST90 dipulihkan |
| `validate.ts` untuk skenario | C | edge rusak = layar kosong saat demo |

## Yang memblokir stream lain

a. **Sumber FIRST90.** Rencana menunjuk `/root/FIRST90/app/` dan
   `design/scenario.level1.json`. Keduanya tidak ada di mesin ini. Stream C
   harus memulihkannya, atau Level 1 dibangun dari skema kontrak di
   `docs/plan.md` §4.

Privasi LLM bukan blocker lintas stream: itu keputusan Stream A, dicatat sebagai
item terbuka di `docs/plans/stream-A.md`.

## Catatan kejujuran

Contoh kasus 2 ("tugas like & top-up") diukur **85/100** oleh engine saat ini,
sedangkan proposal menyebut 88/100. Klaim di presentasi mengikuti hasil ukur
(§11.8). Selisih ini dicatat juga di `src/lib/scoring/score.test.ts`.

### Akurasi terukur — 8 November 2026

Korpus 57 pesan (29 scam lintas 12 modus + 28 pesan sah yang sengaja memuat
jebakan false-positive klasik). Dijalankan oleh `score.bench.test.ts`, dan
angkanya kini juga lahir dari satu fungsi, `runEval()` di `eval.ts`, sehingga
klaim di pitch adalah keluaran mesin, bukan salinan terminal. Penambahan
terakhir: tiga detektor baru (Job, Marketplace, QRIS) beserta kasus bench-nya,
lalu UI kru di thread (`AgentRun`) yang menampilkan orkestrator dan bubble
persisten untuk setiap agen.

| Ukuran | Sebelum (korpus 45) | Sesudah (korpus 57) | Target |
|---|---|---|---|
| Scam tertangkap (`mencurigakan`/`tinggi`) | 19/20 | **29/29** | ≥ 0.95 |
| Scam langsung `tinggi` | 17/20 | **25/29** (0.86) | ≥ 0.80 |
| False positive pada pesan sah | 2/20 (10%) | **0/28** | < 5% |

Tiga defect yang diukur dan diperbaiki di commit `6e70f5e`:

a. Notifikasi OTP dari bank sendiri terbaca sebagai permintaan OTP (100/tinggi).
   Sekarang `otp-request` menuntut kata kerja permintaan; notifikasi berbobot
   0.15 dan berhenti di `rendah`.
b. Pesan kurir sah berbobot 70/tinggi karena menyebut institusi saja. Otoritas
   sekarang bergerbang konteks: 0.25, atau 0.7 hanya bila pesan juga meminta
   pembayaran/konfirmasi/klik/berbagi.
c. Scam stiker QRIS tidak tertangkap sama sekali (0/bersih). Sekarang 70/tinggi
   dan terklasifikasi `quishing-qris`.

d. Dua jebakan baru ditambahkan 8 November 2026: nasihat mencocokkan nama
   penerima (l24) dan peringatan agar tidak membuka file APK (l25). Keduanya
   dulu dituduh (quishing `a.n.`, APK 95/`tinggi` hard); sekarang keduanya
   0/`bersih` tanpa melemahkan scam-nya, dan false positive tetap 0 saat itu
   (0/25).

Batas yang diakui: dua scam (love scam, jual-beli di luar marketplace) berhenti
di `mencurigakan`, bukan `tinggi`; dan merek tiga huruf hanya tertangkap bila
ditempelkan sebagai awalan, bukan sisipan.

### Dua presisi yang ditemukan dengan membaca balasan — 5 November 2026

Angka bench tidak menemukan keduanya; yang menemukan adalah membaca keluaran
`composeReply` untuk kalimat yang tidak ada di korpus. Karena itu keduanya
sekarang jadi kasus korpus, bukan hanya perbaikan sekali jalan.

a. **"Segera" sendirian cukup untuk menuduh.** Bobot `urgency` 0.6 membuat
   "Promo berakhir malam ini, segera pesan" berhenti di 60/`mencurigakan` —
   pesan jualan biasa. Sekarang `urgency` bergerbang konteks seperti
   `fake-authority`: 0.3 sendirian, 0.6 hanya bila pesan juga meminta
   (bayar, transfer, klik, berbagi).

b. **s13 tertangkap karena alasan yang salah.** Pesan pinjol ilegal hanya
   memicu aturan `urgency`; tidak ada satu pun aturan untuk pola pinjol,
   padahal `pinjol-fiktif` sudah jadi modus sejak hari pertama. Aturan `pinjol`
   sekarang menyala pada penanda *ilegal* — `pinjol`, `tanpa cek BI`, `tidak
   terdaftar OJK`, `teror/sebar data` — bukan pada produk pinjamannya, karena
   "kredit tanpa jaminan" adalah KTA yang benar-benar dijual bank resmi.
   Efeknya s13 naik ke 88/`tinggi`: scam langsung `tinggi` 17 → 18.

### Combination pass — 5 November 2026

`score.ts` sekarang punya satu lintasan lagi setelah akumulasi: kalau dua
*vektor* bahaya hidup sekaligus (desakan + permintaan uang, hadiah + biaya,
desakan + permintaan kode, rahasia + uang), ia menjadi temuan tersendiri
dengan kalimat yang menjelaskan mengapa gabungannya lebih buruk daripada
jumlah bagiannya. Itu mekanisme pertama **Conversation Agent**, yang sejak
commit ini berstatus aktif di panel.

Gerbangnya yang menjaga presisi: sebuah vektor hanya dihitung bila aturannya
sendiri sudah menyala ≥ 0.5, dan vektor "uang" hanya dinyalakan oleh aturan
yang benar-benar menyebut permintaan (biaya admin, top-up berulang, transfer
di luar marketplace, stiker QRIS). Tagihan sah tanpa satu pun aturan menyala
karena itu tidak pernah bisa mencapai kombinasi.

Angka bench saat itu (korpus 45) tidak berubah oleh lintasan kombinasi itu
sendiri: 20/20 tertangkap, 17/20 langsung `tinggi`, 0/20 false positive.
Perubahannya ada di kualitas penjelasan, bukan di volume deteksi — dan itu
memang tujuannya. Perbaikan presisi di bagian berikutnya yang menggeser
angkanya.
