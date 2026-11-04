# Lumina

Kenali penipuannya sebelum uangnya hilang.

Empat permukaan, satu loop: **companion** melihat pesan mencurigakan →
**belajar** menjelaskan polanya → **simulasi** menguji keputusan di bawah
tekanan → **darurat** menyiapkan laporan untuk dibawa ke bank.

- Rencana produk dan pembagian empat stream: [`docs/plan.md`](docs/plan.md)
- Aturan teknis yang mengikat (termasuk aturan keras shadcn/ui):
  [`AGENTS.md`](AGENTS.md)
- Status implementasi per stream: [`STATUS.md`](STATUS.md)

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
```

## Perintah

```bash
npm run verify     # typecheck + lint + test + build — gate sebelum commit
npm run test       # Jest, merender komponen React sungguhan
npm run typecheck  # tsc --noEmit
npm run lint:fix   # Biome
```

## Stack

| Lapisan | Pilihan | Versi |
|---|---|---|
| Framework | Next.js (App Router, Turbopack, Cache Components) | 16.4.5 |
| UI runtime | React | 19.3 |
| Bahasa | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS v4, token di `@theme inline` | 4.x |
| Komponen | shadcn/ui (base **radix**, style `radix-nova`) | CLI 4.x |
| Ikon | lucide-react | 1.x |
| Validasi data | zod | 4.x |
| PDF | @react-pdf/renderer | 4.x |
| Lint + format | Biome | 2.x |
| Test | Jest (`next/jest`) + React Testing Library | 30.x |

Alasan tiap pilihan ada di `AGENTS.md` §Stack.

## Struktur

```
src/
├── app/
│   ├── page.tsx                 home, tiga pilar + darurat
│   ├── companion/               A · percakapan + panel bukti
│   ├── belajar/[modul]/         B · daftar + modul
│   ├── simulasi/[id]/           C · daftar + runner
│   └── darurat/                 D · triage + PDF
├── components/
│   ├── ui/                      shadcn — sumber primitive
│   ├── shell/                   nav + layout
│   ├── companion/               score card, panel bukti
│   └── darurat/                 checklist
├── lib/
│   ├── contracts/               BEKU — ScoreResult, EvidenceBundle
│   ├── scoring/                 message.ts, link.ts, score.ts
│   └── modus.ts                 pembaca modus.json (zod)
└── data/
    ├── modus.json               12 modus, sumber kebenaran A + B
    ├── official-domains.json    daftar domain resmi
    └── triage.ts                tiga kasus darurat
```

## Prinsip yang menentukan

**LLM adalah suara, bukan hakim.** Skor dan alasan selalu datang dari
`src/lib/scoring/score.ts`, deterministik dan tanpa jaringan. Kalau model bahasa
mati di venue, deteksi tetap tampil.

**Tanpa akun, tanpa simpan.** Progres belajar di localStorage. Percakapan hilang
saat tab ditutup.

**Kejujuran di atas kelengkapan.** Modul yang belum ditulis berstatus `segera`,
agent yang belum dibangun ditandai `belum aktif`, simulasi yang belum jadi
ditandai `Rencana`. Yang tidak dibuat disebut "rencana", bukan didemokan.