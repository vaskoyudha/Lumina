# Status — per 5 November 2026

Gate 0 tercapai. Gate 1 tercapai untuk A dan D.

| Stream | Gate 1 target | Status |
|---|---|---|
| A · Companion | tempel teks → `ScoreResult` valid | ✅ plus UI berjalan |
| B · Belajar | `progress.ts` + modul 10 + list page | ◐ list page jadi, modul 10 belum |
| C · Simulasi | runner Level 1 sampai choice pertama | ✗ sumber FIRST90 belum ada |
| D · Darurat + Shell | nav + home + token + lima rute | ✅ |

## Yang sudah ada

a. Repo ter-scaffold: Next.js 16, React 19, Tailwind v4, shadcn/ui, Biome, Jest.
b. Design tokens dari §4 hidup di `src/app/globals.css` sebagai `--lumina-*`.
c. Semua rute render: `/`, `/companion`, `/belajar`, `/belajar/[modul]`,
   `/simulasi`, `/simulasi/[id]`, `/darurat`.
d. `modus.json`: 12 modus tervalidasi zod, satu sumber kebenaran untuk A dan B.
e. Engine skor deterministik: Message Agent, Link Agent, Scoring Orchestrator.
f. Panel bukti per agent, dengan penandaan `belum aktif` yang jujur.
g. Tiga contoh §11.6 sebagai tombol di companion.
h. Mode darurat: tiga kasus, checklist bernomor, kanal resmi, cetak.
i. 98 test Jest, termasuk yang merender komponen React sungguhan.
j. Korpus bench 43 pesan (`src/lib/scoring/bench-cases.ts`) sebagai instrumen
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
| `pdf.ts` + `ReportPreview` | D | `@react-pdf/renderer` sudah terpasang |

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

### Akurasi terukur — 5 November 2026

Korpus 43 pesan (20 scam lintas 12 modus + 23 pesan sah yang sengaja memuat
jebakan false-positive klasik). Dijalankan oleh `score.bench.test.ts`, jadi
angka ini bisa diverifikasi ulang oleh siapa pun, kapan pun.

| Ukuran | Sebelum perbaikan | Sesudah | Target |
|---|---|---|---|
| Scam tertangkap (`mencurigakan`/`tinggi`) | 19/20 | **20/20** | ≥ 0.95 |
| Scam langsung `tinggi` | 17/20 | **18/20** | ≥ 0.80 |
| False positive pada pesan sah | 2/20 (10%) | **0/23** | < 5% |

Tiga defect yang diukur dan diperbaiki di commit `6e70f5e`:

a. Notifikasi OTP dari bank sendiri terbaca sebagai permintaan OTP (100/tinggi).
   Sekarang `otp-request` menuntut kata kerja permintaan; notifikasi berbobot
   0.15 dan berhenti di `rendah`.
b. Pesan kurir sah berbobot 70/tinggi karena menyebut institusi saja. Otoritas
   sekarang bergerbang konteks: 0.25, atau 0.7 hanya bila pesan juga meminta
   pembayaran/konfirmasi/klik/berbagi.
c. Scam stiker QRIS tidak tertangkap sama sekali (0/bersih). Sekarang 70/tinggi
   dan terklasifikasi `quishing-qris`.

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

Angka bench tidak berubah oleh lintasan kombinasi itu sendiri: 20/20
tertangkap, 17/20 langsung `tinggi`, 0/20 false positive. Perubahannya ada di
kualitas penjelasan, bukan di volume deteksi — dan itu memang tujuannya.
Perbaikan presisi di bagian berikutnya yang menggeser angkanya.