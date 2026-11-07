# AGENTS.md — Lumina

Empat orang, submission 10 November 2026. Branch stream sudah di-merge ke
`main`; `main` adalah cabang integrasi. Aturan di file ini mengikat semua agent.
Baca `docs/plan.md` (sumber kebenaran produk) dan `STATUS.md` (status per stream)
sebelum menyentuh kode.

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
literal, `bg-red-500`, `text-emerald-600` dilarang. Aksen tunggal Lumina adalah
jingga `--lumina-brand` / `bg-brand` — `--accent` adalah surface hover shadcn,
bukan warna merek. Status memakai `bg-brand-soft` / `text-brand-ink`, bukan hijau.

**4. Skor, `risk`, dan `signals` hanya lahir dari `src/lib/scoring/score.ts`.**
`scoreText()` adalah entrypoint; `scoreWithTrace()` menambahkan jejak agent. LLM
adalah suara, bukan hakim. Routing giliran (`periksa`/`tanya`/`lanjutan`/`obrolan`)
ada di `src/lib/companion/turn.ts` dan deterministik — model tidak boleh memutuskan
apakah engine berjalan. Tidak ada jalur di `companion/` yang boleh menghitung atau
menggeser skor.

**5. Kontrak di `src/lib/contracts/` dibekukan** (`score.ts`, `evidence.ts`,
`answer.ts`, `vision.ts`, `agent-run.ts`). Mengubah satu field berarti memberi
tahu tiga orang lain **sebelum** commit, bukan sesudah (§9).

**6. Jangan memblokir menunggu stream lain.** Hardcode, tinggalkan
`TODO(stream-X)`, lanjut.

**7. Tidak ada dependensi baru setelah hari ke-3** (§9).

**8. `/darurat` tidak pernah dijaga login.** Mode darurat harus terbuka tanpa
akun, sekarang dan setelah perubahan akses apa pun. Kalau middleware ditambahkan
nanti, pengecualian `/darurat` masuk di commit yang sama.

**9. Auth menyimpan akun sungguhan.** Keputusan pemilik produk 7 November 2026
mengizinkan database akun dan Google OAuth, menggantikan fasad demo. PostgreSQL
menyimpan identitas, hash scrypt password, hash token sesi, dan transaksi OAuth
sementara. Progres dan percakapan tidak masuk database akun. Node 24 dan
volume PostgreSQL persisten wajib; konfigurasi serta batas hosting ada di `docs/auth.md`.
`google-auth-library`, `pg`, dan `@types/pg` adalah tambahan dependensi yang diizinkan untuk perubahan
ini. Jangan mengembalikan password literal atau sesi demo.

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
npm run dev            # dev server (Turbopack)
npm run verify         # typecheck + lint + test + build — gate sebelum commit
npm run test           # jest, semua
npm test -- src/lib/scoring/score.test.ts   # satu file
npm test -- -t "nama test"                  # satu test
npm run test:coverage  # jest --coverage
npm run typecheck      # tsc --noEmit
npm run lint:fix       # biome check --write (format + lint)
npm run format         # biome format --write
```

`npm run verify` harus lulus sebelum commit. Kalau gagal, perbaiki — jangan
melewati gate.

### Jebakan Next 16 di repo ini

a. `cacheComponents` aktif, jadi `export const runtime` / `export const dynamic`
   di route atau page ditolak. Halaman dinamis memakai `export const instant =
   false` (lihat `src/app/(chat)/belajar/[modul]/page.tsx`); route handler tanpa
   segment config (lihat `src/app/api/companion/answer/route.ts`).
b. Membaca cookie di layout membuat semua rute dinamis. Bungkus pembaca sesi
   dalam `Suspense` seperti `NavWithSession`
   (`src/components/shell/nav-with-session.tsx`).
c. Baca panduan versi ini di `node_modules/next/dist/docs/` sebelum memakai API
   Next yang kamu hafal dari versi lama (lihat blok di akhir file).

## Env dan lapisan LLM

`.env.example` adalah daftar variabel; `.env.local` tidak di-commit.

- `DATABASE_URL` — koneksi PostgreSQL runtime; jalankan `npm run db:migrate` sebelum app.
- `TEST_DATABASE_URL` — database khusus pengujian (nama berakhiran `_test`); jangan gunakan database produksi.
- `AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth; lihat `docs/auth.md`.
- `LUMINA_LLM_URL`, `LUMINA_LLM_MODEL`, `LUMINA_LLM_KEY` — endpoint
  OpenAI-compatible. Kalau URL atau model kosong, companion tidak melakukan
  panggilan jaringan dan jatuh ke `src/lib/companion/reply.ts`; route
  `/api/companion/{answer,vision,voice}` membalas 503 `not-configured`. Itu jalur
  demo offline, bukan kerusakan.

### Batas privasi yang tidak boleh digeser

a. Pesan yang diperiksa tidak pernah meninggalkan perangkat. Yang dikirim ke
   `/api/companion/answer` hanya pertanyaan/riwayat obrolan pengguna, digest
   temuan lossy tanpa kutipan, dan fakta publik dari `modus.json`/`tactics.ts`.
   Giliran yang pernah diperiksa difilter dari riwayat obrolan di klien.
b. `/api/companion/vision` hanya menyalin teks dari gambar. Kontraknya tidak punya
   field skor/risk/signal; hasilnya hanya boleh masuk kembali ke `scoreText()`.
c. Model tidak pernah diminta memberi skor dan tidak boleh menambah atau
   menurunkan `signals` (plan §3b, §11.6a).

## Skills

Skill tinggal di **`.agents/skills/`** — lokasi netral yang dibaca OpenCode,
Claude Code, Codex, Hermes, dan harness lain. `.opencode/skills/<nama>` adalah
symlink ke sana, bukan salinan.

```
.agents/skills/shadcn-ui/SKILL.md      konfigurasi shadcn proyek ini
.agents/skills/appnext-design/SKILL.md sistem desain AppNext (light-first)
```

Aturannya: **sunting `.agents/skills/`**, jangan `.opencode/skills/` — yang kedua
mengikuti yang pertama. Kalau menambah skill baru, buat di `.agents/skills/` lalu

```bash
ln -sfn "../../.agents/skills/<nama>" ".opencode/skills/<nama>"
```

Harness lain memakai symlink yang sama: `.claude/skills/<nama>`. Menghapus skill
dari `.agents/` meninggalkan symlink rusak di `.opencode/` dan `.claude/`; hapus
symlink-nya juga.

Frontmatter wajib `name` dan `description`; deskripsi memuat *kapan* skill
dipakai, bukan hanya isinya, karena itu yang memicu pemanggilan.

## Rute dan shell

| Grup | Shell | Token | Isi |
|---|---|---|---|
| `(marketing)` | `SiteHeader` + `Footer` + `QuickDrawer` | `.landing` (cream/espresso) | `/` landing |
| `(app)` | `SiteNav` + footer | `--lumina-*` via `.appnext` | simulasi, darurat, profil |
| `(chat)` | tanpa nav, sidebar sendiri | `--lumina-*` via `.appnext` | `/companion`, `/belajar` |
| `admin/` | `AdminNav` sendiri | `--lumina-*` | `/admin`, `/admin/[no]` |
| `/masuk`, `/daftar` | tanpa chrome | `--lumina-*` | auth email/password + Google |
| `api/companion/*` | route handler | — | `answer`, `vision`, `voice` |

Route group tidak mengubah URL. `/` dilayani `(marketing)/page.tsx`; tidak boleh
ada `(app)/page.tsx`, karena keduanya akan bertabrakan di `/`.

`/admin` sengaja tidak ada di nav: itu workbench penulis kurikulum, bukan
permukaan produk. Draf tinggal di perangkat; publikasi adalah ekspor + commit,
bukan tombol. Jangan menambahkan tautan admin ke nav publik.

### Titik masuk auth

Navigasi membuka satu dialog bersama; halaman langsung tersedia di `/masuk` dan `/daftar`:
`AuthDialog` (`src/components/auth/auth-dialog.tsx`), trigger-less dan
controlled, dengan tab Masuk/Daftar dari `AuthPanel`.

| Permukaan | Komponen | Catatan |
|---|---|---|
| `SiteHeader` marketing | `MarketingAuth` | nada espresso/amberwarm, tetap tanpa sesi |
| `SiteNav` `(app)` | `AuthNav` | masukan paling kanan setelah Darurat |
| Rail + sidebar companion | `CompanionAuth` | `iconsOnly` memakai tombol ikon saja; nama aksesibel wajib |

Sesudah masuk, ketiganya menampilkan `UserMenu` (atau kartu profil) yang menuju
`/profil`. `/masuk` dan `/daftar` adalah halaman langsung untuk login dan register;
keduanya menyusun `AuthPanel` yang sama. Logika sesi tetap di `lib/auth/`.

## Tiga lapisan token, jangan dicampur

| Lapisan | Di mana | Dipakai untuk |
|---|---|---|
| `--lumina-*` | `src/app/globals.css` `:root` | nama kanonik; utility Tailwind `bg-brand`, `text-danger`, `border-line`, … |
| `.appnext` | dipasang **sekali di `<body>`** (`src/app/layout.tsx`), definisi di `src/styles/appnext-tokens.css` | meremap `--lumina-*` ke palet terang AppNext, plus `--appnext-*` dan kelas `.appnext-*` |
| `.landing` | `src/styles/landing-tokens.css` | landing marketing: cream/espresso/amberwarm |

`.appnext` sudah ada di `body`, jadi jangan menambah wrapper `.appnext` kedua —
ia menggandakan custom property dan membuat "pulau" warna sulit dilacak. Jangan
menaruh hex di komponen; pakai utility yang dipetakan `@theme inline`. Detail:
`docs/design-system/appnext.md`.

## Layout

```
src/
├── app/
│   ├── (marketing)/          landing `/` — SiteHeader + Footer + QuickDrawer
│   ├── (app)/                SiteNav + footer
│   │   ├── simulasi/         C · daftar + [id] + layout runner
│   │   ├── darurat/          D · triage + PDF (tidak pernah dijaga login)
│   │   └── profil/           akun demo + kemajuan perangkat
│   ├── (chat)/               tanpa nav, footer ada di sidebar
│   │   ├── companion/        A · percakapan + panel bukti
│   │   └── belajar/          B · katalog + [modul], sidebar Companion
│   ├── admin/                workbench kurikulum, AdminNav sendiri
│   ├── api/companion/        answer, vision, voice (route handler)
│   ├── masuk/ daftar/        auth akun, tanpa chrome
│   └── layout.tsx            `body.appnext`, font, token ground
├── components/
│   ├── ui/                   shadcn — jangan diedit kecuali perbaikan registry
│   ├── shell/                nav + AuthNav + pembaca sesi
│   ├── auth/                 AuthDialog, AuthPanel, UserMenu
│   ├── marketing/            sections landing
│   ├── admin/                admin inventory/nav
│   └── belajar/ companion/ darurat/ profil/
├── lib/
│   ├── contracts/            BEKU — score, evidence, answer, vision, agent-run
│   ├── scoring/              engine deterministik: score, message, link, identity, conversation
│   ├── companion/            turn, reply, explain, answer-client, vision-client, voice-stream
│   ├── auth/                 database, accounts, password, google, session, actions
│   ├── simulasi/             catalog, scenario, validate
│   ├── darurat/              report, pdf
│   ├── evidence/             bundle, extract, timeline, narrative
│   ├── admin/                draft-store, export-course
│   ├── progress.ts
│   └── modus.ts              pembaca modus.json, tervalidasi zod
├── data/                     modus.json, official-domains.json, kurikulum.ts, modul-10.ts, tactics.ts, triage.ts
└── styles/                   appnext-tokens.css, landing-tokens.css
```

## Batas stream

Branch stream sudah merge ke `main`; tabel ini soal kepemilikan kode, bukan
branch. Jangan menyentuh milik stream lain tanpa memberi tahu. Kalau butuh
sesuatu, minta bentuk datanya, bukan filenya.

| Stream | Boleh | Jangan |
|---|---|---|
| A | `lib/scoring/`, `lib/contracts/`, `components/companion/`, `app/(chat)/companion/`, `data/modus.json` | isi modul, runner, PDF |
| B | `app/(chat)/belajar/`, `components/belajar/`, `data/kurikulum.ts`, `data/modul-10.ts`, `lib/progress.ts`, `app/admin/` | engine skor, navigasi |
| C | `app/(app)/simulasi/`, `lib/simulasi/`, `components/` milik simulasi | konten modul, PDF |
| D | `app/(app)/darurat/`, `components/darurat/`, `lib/darurat/`, `app/layout.tsx`, `globals.css`, `styles/` | engine skor, konten modul |

## Kejujuran yang diuji

a. Panel bukti hanya mencetak temuan engine, bukan temuan karangan. Setiap agent
   dalam urutan panel benar-benar berjalan; label `belum aktif` sudah tidak ada,
   dan Identity Agent memilih tidak melapor daripada mengarang.
b. Modul yang belum ditulis berstatus "Segera", bukan stub kosong.
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

Test tinggal di samping sumbernya (`src/**/*.test.ts?(x)`). `jest.setup.ts`
sudah menambal gap jsdom yang dipakai app ini: `matchMedia`, `ResizeObserver`,
`window.print`, dan object URL. Komponen yang memakai API browser baru butuh
stub di sana sebelum test-nya bermakna.

## Aksesibilitas dan lebar

Shell harus jalan di **380px**. Sebelum bilang sebuah halaman selesai, periksa
lebar sempit: nav membungkus, tidak ada scroll horizontal, target sentuh cukup.
Kontrol ikon-saja wajib punya nama aksesibel.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
