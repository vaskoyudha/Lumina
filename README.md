# Lumina

Kenali penipuannya sebelum uangnya hilang.

Empat permukaan, satu loop: **companion** melihat pesan mencurigakan →
**belajar** menjelaskan polanya → **simulasi** menguji keputusan di bawah
tekanan → **komunitas** berbagi modus baru dan berdiskusi.

- Rencana produk dan pembagian empat stream: [`docs/plan.md`](docs/plan.md)
- Aturan teknis yang mengikat (termasuk aturan keras shadcn/ui):
  [`AGENTS.md`](AGENTS.md)
- Status implementasi per stream: [`STATUS.md`](STATUS.md)

## Menjalankan

```bash
npm ci
# Isi DATABASE_URL di .env.local; jalankan PostgreSQL terlebih dahulu.
npm run db:migrate
npm run db:seed    # 12 modul + satu skenario, tidak menimpa konten yang sudah ada
npm run dev        # http://localhost:3000
```

Node.js 24. Akun email/password menggunakan PostgreSQL; Google OAuth
memerlukan konfigurasi di `.env.local`. Panduan: [`docs/auth.md`](docs/auth.md).
Paket VPS (Docker Compose, Caddy, backup/restore, rollback): [`docs/deploy.md`](docs/deploy.md).

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
| Lint + format | Biome | 2.x |
| Test | Jest (`next/jest`) + React Testing Library | 30.x |

Alasan tiap pilihan ada di `AGENTS.md` §Stack.

## Struktur

```
src/
├── app/
│   ├── page.tsx                 home, pemeriksaan dan pembelajaran
│   ├── companion/               A · percakapan + panel bukti
│   ├── belajar/[modul]/         B · daftar + modul
│   ├── simulasi/[id]/           C · daftar + runner
│   └── komunitas/[id]/          diskusi publik + akun
├── components/
│   ├── ui/                      shadcn — sumber primitive
│   ├── shell/                   nav + layout
│   ├── companion/               score card, panel bukti
│   └── community/               feed, editor, balasan, moderasi
├── lib/
│   ├── contracts/               BEKU — ScoreResult, EvidenceBundle
│   ├── scoring/                 message.ts, link.ts, score.ts
│   └── modus.ts                 pembaca modus.json (zod)
└── data/
    ├── modus.json               12 modus, sumber kebenaran A + B
    ├── official-domains.json    daftar domain resmi
    └── tactics.ts               panduan tindakan per modus
```

## Prinsip yang menentukan

**LLM adalah suara, bukan hakim.** Skor dan alasan selalu datang dari
`src/lib/scoring/score.ts`, deterministik dan tanpa jaringan. Kalau model bahasa
mati di venue, deteksi tetap tampil.

**Akun opsional untuk membaca.** Identitas, progres belajar, dan hasil simulasi tersimpan di PostgreSQL. Komunitas terbuka untuk dibaca; menulis dan membalas memerlukan akun. Percakapan Companion hilang saat tab ditutup.

**Kejujuran di atas kelengkapan.** Modul yang belum ditulis berstatus `segera`,
agent yang belum dibangun ditandai `belum aktif`, simulasi yang belum jadi
ditandai `Rencana`. Yang tidak dibuat disebut "rencana", bukan didemokan.
