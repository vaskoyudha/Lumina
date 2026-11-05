# AGENTS.md — Lumina

Empat orang, enam hari, submission 10 November 2026. Aturan di file ini
mengikat semua agent dan semua stream. Baca `docs/plan.md` sebelum menyentuh
kode; file itu sumber kebenaran produk.

## Aturan keras — palang pintu

**1. shadcn/ui dulu, selalu.**

`src/components/ui/` berisi primitive yang sudah terpasang. Pakai dan susun.
Menulis `div` bergaya sendiri padahal komponennya ada adalah defect, bukan gaya.

```tsx
// BENAR — pakai komponen
<Card><CardHeader><CardTitle>…</CardTitle></CardHeader><CardContent>…</CardContent></Card>

// SALAH — markup sendiri
<div className="rounded-xl border bg-slate-900 p-4"><h3>…</h3></div>
```

Komponen yang belum ada: `npx shadcn@latest add <nama> --yes`, lalu **baca file
yang dihasilkan** dan perbaiki (lihat skill `shadcn-ui`). Jangan pernah menjawab
"tidak ada komponennya" sebelum menjalankan `npx shadcn@latest info --json`.

**2. Base-nya Radix, jadi `asChild`, bukan `render`.**

```tsx
<Button asChild variant="outline"><Link href="/darurat">…</Link></Button>
```

`render={<Link/>}` adalah API Base UI dan gagal di typecheck proyek ini.

**3. Warna hanya dari token.** `--lumina-*` di `src/app/globals.css`. Hex
literal, `bg-red-500`, `text-emerald-600` dilarang. Hijau aman bernama
`--lumina-safe` / `bg-safe` — `--accent` adalah surface hover shadcn, bukan hijau.

**4. Skor, `risk`, dan `signals` hanya lahir dari `src/lib/scoring/score.ts`.**
LLM adalah suara, bukan hakim. Tidak ada satu pun jalur di `companion/` yang boleh
menghitung atau menggeser skor.

**5. Kontrak di `src/lib/contracts/` dibekukan.** Mengubah satu field berarti
memberi tahu tiga orang lain **sebelum** commit, bukan sesudah (§9).

**6. Jangan memblokir menunggu stream lain.** Hardcode, tinggalkan
`TODO(stream-X)`, lanjut.

**7. Tidak ada dependensi baru setelah hari ke-3** (§9).

## Stack — jangan diganti tanpa kesepakatan

| Lapisan | Pilihan | Versi terpasang |
|---|---|---|
| Framework | Next.js App Router + Turbopack | 16.4.5 |
| UI runtime | React | 19.3 |
| Bahasa | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS v4 (`@theme inline`) | 4.x |
| Komponen | shadcn/ui, base **radix**, style `radix-nova` | CLI 4.x |
| Ikon | `lucide-react` | 1.x |
| Validasi | `zod` | 4.x |
| PDF | `@react-pdf/renderer` | 4.x |
| Lint/format | Biome (bukan ESLint) | 2.x |
| Test | Jest via `next/jest` + React Testing Library | 30.x |

Alasan singkat: App Router karena `routing` di plan sudah berbentuk App Router
dan Streaming cocok untuk panel bukti yang mengisi bertahap. Tailwind v4 karena
token bisa dideklarasikan sekali di CSS tanpa file config. Radix karena
`asChild` adalah API yang sudah stabil untuk komponen yang membungkus `Link`.
Biome karena satu tool untuk format + lint, dan `next lint` sudah deprecated.

## Perintah

```bash
npm run dev          # dev server
npm run verify       # typecheck + lint + test + build — jalankan sebelum commit
npm run test         # jest
npm run typecheck    # tsc --noEmit
npm run lint:fix     # biome, menulis
```

`npm run verify` harus lulus sebelum commit. Kalau gagal, perbaiki — jangan
melewati gate.

## Skills

Skill tinggal di **`.agents/skills/`** — lokasi netral yang dibaca OpenCode,
Claude Code, Codex, Hermes, dan harness lain. `.opencode/skills/<nama>` adalah
symlink ke sana, bukan salinan.

```
.agents/skills/lumina-ui/SKILL.md      aturan visual + token + batas demo
.agents/skills/shadcn-ui/SKILL.md      konfigurasi shadcn proyek ini
.agents/skills/appnext-design/SKILL.md sistem desain AppNext (light-first)
```

Aturannya: **sunting `.agents/skills/`**, jangan `.opencode/skills/` — yang kedua
mengikuti yang pertama. Kalau menambah skill baru, buat di `.agents/skills/` lalu

```bash
ln -sfn "../../.agents/skills/<nama>" ".opencode/skills/<nama>"
```

Frontmatter wajib `name` dan `description`; deskripsi memuat *kapan* skill
dipakai, bukan hanya isinya, karena itu yang memicu pemanggilan.

## Dua sistem desain, satu ground terang

| | Lumina (produk) | AppNext |
|---|---|---|
| Ground | terang `#ffffff` | terang `#ffffff` |
| Namespace | `--lumina-*` + `--appnext-*` | `--appnext-*`, di bawah `.appnext` |
| Dipakai di | semua permukaan produk | marketing/template + seluruh shell |
| Alasan | semua layar dibaca di ruang terang, termasuk HP di bawah sinar matahari | mengikuti template SaaS |

**Keputusan 4 Nov 2026 — menyimpang dari aturan awal.** Permukaan produk
(companion, belajar, simulasi, darurat) dan shell **terang**, bukan gelap.
Teks dan meter harus tetap lolos kontras di ground putih; nilai terukur ada di
`src/styles/appnext-tokens.css` (`--appnext-danger #dc2626`,
`--appnext-accent-deep #0e7c36`, `--appnext-muted #606060`).

`.appnext` sekarang dipasang sekali di `body` (`src/app/layout.tsx`) dan
memetakan ulang variabel `--lumina-*` hanya di dalam subtree itu. Nilai gelap
asli tetap ada di `globals.css` di bawah `.dark` untuk subtree legacy; jangan
menambah `.dark` baru. Detail: `docs/design-system/appnext.md`.

## Layout

```
src/
├── app/                  root: dokumen + body.appnext saja
│   ├── (user)/           shell murid: nav 4 permukaan + footer privasi
│   │   ├── page.tsx      beranda
│   │   ├── companion/    A · percakapan + panel bukti
│   │   ├── belajar/      B · daftar + [modul]
│   │   ├── simulasi/     C · daftar + [id]
│   │   └── darurat/      D · triage + PDF
│   └── admin/            B · area kerja kurikulum, shell sendiri
├── components/
│   ├── ui/               shadcn — jangan diedit kecuali perbaikan registry
│   ├── shell/            nav + layout murid
│   ├── companion/        A
│   ├── admin/            B
│   └── darurat/          D
├── lib/
│   ├── contracts/        BEKU — ScoreResult, EvidenceBundle
│   ├── scoring/          A · agent deterministik
│   ├── admin/            B · draf + ekspor course
│   └── modus.ts          pembaca modus.json, tervalidasi zod
└── data/
    ├── modus.json        modus (§11.2), milik A, dibaca B
    ├── kurikulum.ts      B · course yang benar-benar punya isi
    ├── modul-schema.ts   B · kontrak isi course (zod)
    ├── official-domains.json
    └── triage.ts         D
```

**Dua area, dua shell.** `(user)` dan `admin` tidak berbagi nav. Membuka
`/admin` tidak boleh memperlihatkan Companion/Belajar/Simulasi/Darurat; satu-satunya
jalan kembali adalah tautan keluar yang eksplisit. Ini yang membuat login nanti
cukup memilih area — bukan menambah kondisi di dalam satu nav.

## Batas stream

Jangan menyentuh milik orang lain tanpa memberi tahu. Kalau butuh sesuatu,
minta bentuk datanya, bukan filenya.

| Stream | Boleh | Jangan |
|---|---|---|
| A | `lib/scoring/`, `lib/contracts/`, `components/companion/`, `data/modus.json` | isi modul, runner, PDF |
| B | `app/belajar/`, `app/admin/`, `components/admin/`, konten modul, `progress.ts`, `data/kurikulum.ts`, `lib/admin/` | engine skor, navigasi |
| C | `app/simulasi/`, runner, `validate.ts` | konten modul, PDF |
| D | `app/darurat/`, `components/darurat/`, `app/layout.tsx`, `globals.css`, `pdf.ts` | engine skor, konten modul |

## Kejujuran yang diuji

a. Agent yang belum dibangun mengembalikan `signals: []` yang jujur, bukan temuan
   karangan. Panel bukti menandainya `belum aktif`.
b. Modul yang belum ditulis berstatus `"segera"`, bukan stub kosong.
c. Level simulasi yang belum jadi ditandai `Rencana`, tidak dimainkan seolah jadi.
d. Klaim akurasi mengikuti hasil ukur, bukan angka di proposal (§11.8).

## Test

Test merender komponen React sungguhan. Test yang hanya memeriksa tipe tidak
menangkap yang sebenarnya rusak saat demo: hydration, batas `"use client"`,
props yang salah, dan markup yang hilang.

```tsx
render(<CompanionEntry />);
await user.click(screen.getByRole("button", { name: /apk undangan/i }));
expect(screen.getByRole("link", { name: /pelajari pola ini/i }))
  .toHaveAttribute("href", "/belajar/10");
```

Asersi berbasis teks yang muncul berkali-kali by design memakai
`getAllByText(...).length` — bukan `getByText`, yang gagal karena "found multiple
elements".

## Aksesibilitas dan lebar

Shell harus jalan di **380px**. Sebelum bilang sebuah halaman selesai, periksa
lebar sempit: nav membungkus, tidak ada scroll horizontal, target sentuh cukup.
Kontrol ikon-saja wajib punya nama aksesibel.