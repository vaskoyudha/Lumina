# Status — per 4 November 2026

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
i. 19 test Jest yang merender komponen React sungguhan.

## Yang belum ada

| Item | Stream | Catatan |
|---|---|---|
| Lapisan percakapan + LLM | A | template dulu, LLM kalau waktu |
| `evidence.ts` → `EvidenceBundle` | A | handoff ke D tanggal 6 Nov |
| Identity Agent (SPF/DKIM/DMARC) | A | cuttable |
| `progress.ts` + modul 10 | B | modul 10 = angka IASC terkuat |
| `Quiz.tsx` | B | penentu apakah terasa kursus |
| Runner Level 1 (port React) | C | butuh sumber FIRST90 dipulihkan |
| `validate.ts` untuk skenario | C | edge rusak = layar kosong saat demo |
| `pdf.ts` + `ReportPreview` | D | `@react-pdf/renderer` sudah terpasang |

## Dua hal yang perlu diputuskan sebelum kode berikutnya

a. **Sumber FIRST90.** Rencana menunjuk `/root/FIRST90/app/` dan
   `design/scenario.level1.json`. Keduanya tidak ada di mesin ini. Stream C
   harus memulihkannya, atau Level 1 dibangun dari skema kontrak di
   `docs/plan.md` §3.
b. **Privasi LLM.** Default yang diusulkan di `docs/plans/stream-A.md`: kirim
   hanya sinyal (label, bobot, id modus), bukan teks pengguna. Ini janji yang
   mengikat (§11.7), jadi harus disepakati sebelum lapisan percakapan ditulis.

## Catatan kejujuran

Contoh kasus 2 ("tugas like & top-up") diukur **85/100** oleh engine saat ini,
sedangkan proposal menyebut 88/100. Klaim di presentasi mengikuti hasil ukur
(§11.8). Selisih ini dicatat juga di `src/lib/scoring/score.test.ts`.