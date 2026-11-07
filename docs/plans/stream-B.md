# Stream B — Belajar

Nama: ____________ · Stream: B · Tanggal: 4 November 2026

> Ringkasan eksekusi — **Goal:** modul 10 (File APK via WhatsApp) bisa
> diselesaikan ujung ke ujung: baca anatomi → kenali contoh → cek checklist →
> lulus kuis → badge muncul → tautan simulasi jalan.
> **Arsitektur:** konten statis bertipe di `src/data/`, logika progres murni +
> zod di `src/lib/progress.ts` (localStorage, SSR-aman), komponen `"use client"`
> kecil sebagai island di dalam route server yang sudah ada.
> **Tech stack:** Next.js App Router, shadcn/ui (Card, Badge, Button),
> zod, Jest + Testing Library. **Spec:** `docs/plan.md` §5-B, §4
> (kontrak + routing), §11.2 (tabel modus), §11.4 (learning curve).
> **Constraints global:** `asChild` bukan `render`; skor/`risk`/`signals`
> hanya dari `score.ts` (B tidak menyentuh); kontrak `lib/contracts/` beku;
> test merender komponen sungguhan; shell 380px tanpa scroll horizontal;
> `npm run verify` lulus sebelum commit.

> **Status 4 Nov 2026 — Task 1–5 selesai dan terverifikasi.** Kuis terkunci +
> tombol “Soal berikutnya” (bukan auto-advance); tombol selesai hanya
> muncul setelah lulus ≥60%. Modul 1, 2, 7 tetap cut bersyarat (Gate 2).
> Lihat Task 7 untuk pekerjaan visual terbaru.

## 1. Versi terkecil yang jalan end to end

Jalur terpendek dari klik sampai hasil — bangun **ini** dulu:

a. `src/lib/progress.ts` — `loadProgress()` / `completeModule()` jalan di
   Node/jsdom, localStorage di-mock jsdom, data korup jatuh ke `EMPTY`.
b. `src/components/belajar/quiz.tsx` — props-driven, dirender dengan 1 soal
   dummy: klik jawaban salah → rationale merah muncul; klik benar → skor naik.
c. `src/data/modul-10.ts` — konten modul 10 bertipe: anatomi 5 langkah, 1
   contoh pesan dengan segmen berbahaya ditandai, checklist 5, kuis 4 soal
   (tiap opsi salah ada penjelasan), lapor 4 langkah berurutan.
d. `src/app/belajar/[modul]/page.tsx` — `no === 10` merender konten nyata
   (Card + Quiz + tombol selesai); nomor lain tetap "segera".
e. Tombol selesai → `completeModule(10)` → badge `penjaga-apk` muncul +
   tautan `/simulasi/L1-kurir-apk` (dari `scenarioId` modus 10, hardcode href
   + `TODO(stream-C)` sampai runner C siap divalidasi).
f. List `/belajar` menampilkan centang "selesai (perangkat ini)" setelah mount
   tanpa hydration mismatch.

## 2. Yang saya cut

Ditulis sekarang, bukan hari keenam:

a. **`adaptive.ts` → cut.** `missedPatterns` tetap disimpan di `progress.ts`
   (siap dibaca C/simulasi), tapi tidak ada logika adaptif. Urutan modul
   mengikuti `BUILD_ORDER` (10 → 1 → 2 → 7).
b. **Modul 1, 2, 7 → cut bersyarat.** Dibangun hanya kalau Task 1–5 selesai
   dan Gate 2 lolos. Isinya meniru struktur modul 10, komponen dipakai ulang.
c. **Modul 3–6, 8, 9, 11, 12 → tidak dibangun minggu ini.** Tetap "segera".
d. **Badge sosial / ringkasan share keluarga (§11.4 level 5) → cut.** Satu
   badge lokal `penjaga-apk` cukup untuk demo.
e. **Radar/Kalender/Paket sosialisasi (§11.5) → cut** kecuali paket cetak 1
   halaman, dan itu pun paling akhir.
f. **Radio-group registry → tidak ditambah.** Opsi kuis memakai `Button`
   (sentuh-jari, tanpa dependensi/registry baru, aman dari aturan hari ke-3).

## 3. Yang saya butuh (nama, apa, tanggal)

| Dari | Apa | Tanggal |
|---|---|---|
| A | `relatedModule` tetap nomor 1–12 dari `modus.json` (link `/belajar/10` dari companion sudah jalan — jangan diubah jadi slug tanpa pemberitahuan sebelum commit) | sudah OK, konfirmasi |
| A | `modus.json` tidak perlu diubah B; `modulStatus` modul 10 sudah `"lengkap"` — klaim itu jadi benar saat konten Task 3 mendarat. Status "11 segera" milik B: jangan disentuh A | — |
| C | `scenarioId: "L1-kurir-apk"` stabil (tautan B→C). Sampai runner C tervalidasi, href hardcode + `TODO(stream-C)` | konfirmasi 6 Nov |
| D | tidak ada | — |

Keputusan privasi milik A (sinyal vs teks mentah ke LLM) tidak memengaruhi B:
konten modul statis, progres di localStorage, tanpa unggahan.

## 4. Selesai berarti

Bisa diperiksa orang lain tanpa bertanya:

a. `npm run verify` lulus (typecheck + biome + jest + build).
b. `/belajar` merender 12 baris dari `modus.json` (tidak mengetik ulang daftar);
   modul 10 berstatus "Lengkap", 11 lainnya "Segera".
c. `/belajar/10` menampilkan: anatomi 5 langkah · 1 contoh pesan anonim dengan
   segmen berbahaya ditandai · checklist 5 tanda bahaya · kuis 4 soal yang
   masing-masing menanyakan "apa yang kamu lakukan sekarang?" dan tiap jawaban
   salah memunculkan penjelasan · langkah lapor berurutan · tautan
   `/simulasi/L1-kurir-apk`.
d. Menyelesaikan kuis modul 10 menulis `lumina-progress-v1` ke localStorage,
   badge `penjaga-apk` muncul, dan kunjungan ulang `/belajar` menandai modul 10
   selesai (render setelah mount, tanpa hydration error).
e. Test Jest merender komponen sungguhan: `progress.test.ts`,
   `quiz.test.tsx`, dan satu test halaman/badan modul 10 (bukan cek tipe).
f. Di lebar 380px: tanpa scroll horizontal, target sentuh ≥ 44px, kontrol
   ikon-saja bernama.
g. Tidak ada hex literal, tidak ada `bg-red-500`-sejenis, komposisi shadcn
   (`Card`, `Badge`, `Button asChild`), link navigasi via `Button asChild`.

## Batas

Saya tidak mengerjakan: engine skor, kontrak, runner simulasi, PDF, navigasi.
Tautan ke halaman lain cukup `href`; halaman tujuannya bukan urusan saya.
`modus.json` milik A — saya baca, tidak saya tulis.

---

## Task 1 — `progress.ts` + test

**Files:**
- Create: `src/lib/progress.ts`
- Create: `src/lib/progress.test.ts`

**Interfaces:**
- Consumes: `zod` (sudah terpasang).
- Produces: `loadProgress(): Progress`, `saveProgress(p: Progress): void`,
  `completeModule(prev: Progress, no: number): Progress`,
  `ProgressSchema`, `type Progress`, `BADGE_FOR_MODULE: Record<number, string>`,
  `STORAGE_KEY = "lumina-progress-v1"`. Dipakai Task 4 (tombol selesai) dan
  Task 5 (island list).

```ts
// src/lib/progress.ts
import { z } from "zod";

export const ProgressSchema = z.object({
  version: z.literal(1),
  completedModules: z.array(z.number().int().min(1).max(12)),
  badges: z.array(z.string()),
  missedPatterns: z.array(z.string()),
  updatedAt: z.string(),
});

export type Progress = z.infer<typeof ProgressSchema>;

export const STORAGE_KEY = "lumina-progress-v1";

const EMPTY: Progress = {
  version: 1,
  completedModules: [],
  badges: [],
  missedPatterns: [],
  updatedAt: new Date(0).toISOString(),
};

/** Modul 10 memberi badge pertama. Modul lain belum memberi badge (cut §11.4). */
export const BADGE_FOR_MODULE: Record<number, string> = {
  10: "penjaga-apk",
};

export function loadProgress(): Progress {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = ProgressSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function saveProgress(p: Progress): void {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...p, updatedAt: new Date().toISOString() }),
  );
}

export function completeModule(prev: Progress, no: number): Progress {
  const completedModules = prev.completedModules.includes(no)
    ? prev.completedModules
    : [...prev.completedModules, no];
  const badge = BADGE_FOR_MODULE[no];
  const badges =
    badge && !prev.badges.includes(badge) ? [...prev.badges, badge] : prev.badges;
  return { ...prev, completedModules, badges };
}
```

- [x] **Step 1: tulis test yang gagal** — `src/lib/progress.test.ts`:
  `loadProgress()` tanpa localStorage mengembalikan `completedModules: []`;
  `completeModule(EMPTY, 10)` memuat `10` + badge `penjaga-apk`;
  `completeModule` dua kali tidak menduplikasi; string korup di localStorage
  (`"{{{"`) jatuh ke `EMPTY`, tidak throw; nomor di luar 1–12 ditolak
  `ProgressSchema`.

```ts
import { completeModule, loadProgress, ProgressSchema } from "@/lib/progress";

test("modul 10 memberi badge penjaga-apk, sekali saja", () => {
  const once = completeModule(loadProgress(), 10);
  expect(once.completedModules).toContain(10);
  expect(once.badges).toContain("penjaga-apk");
  const twice = completeModule(once, 10);
  expect(twice.completedModules.filter((n) => n === 10)).toHaveLength(1);
});
```

- [x] **Step 2: jalankan, pastikan gagal** — `npx jest src/lib/progress.test.ts`.
  Expected: FAIL, modul tidak ditemukan.
- [x] **Step 3: tulis implementasi minimal** — kode di atas, tanpa hook dulu.
- [x] **Step 4: jalankan, pastikan lulus** — `npx jest src/lib/progress.test.ts`.
  Expected: PASS.
- [x] **Step 5: commit** — `b8ef3a0` (di branch `feat/stream-b-belajar`,
  diteruskan ke `feat/light-appnext-restyle`).

## Task 2 — `Quiz.tsx` props-driven + test

**Files:**
- Create: `src/components/belajar/quiz.tsx` (`"use client"`)
- Create: `src/components/belajar/quiz.test.tsx`

**Interfaces:**
- Consumes: `Button`, `Progress`, `Alert` dari `@/components/ui/*`;
  token `--lumina-*` saja.
- Produces: `<Quiz questions onDone(score, total) />` dengan tipe
  `QuizOption { id, label }`, `QuizQuestion { id, prompt, options[],
  correctId, rationale }`. Dipakai Task 4 dengan konten Task 3.

Aturan main (dikunci di sini): satu soal tampil per langkah; opsi berupa baris
pilihan setinggi ≥ 44px (AppNext `.appnext-quiz-option` — bukan `Button`
shadcn, agar huruf A/B/C + state benar/salah jelas di ground terang); jawaban
terkunci setelah dipilih; yang salah memunculkan penjelasan `rationale`
seketika (tidak memblokir lanjut — meniru `rationale` simulasi); track progres
menunjukkan soal ke-n dari total; selesai → `onDone` hanya bila lulus (≥60%) +
ringkasan skor + tombol ulangi. Sebelum interaksi, tidak ada klaim skor
(kejujuran: jangan tampilkan "0 temuan" ala panel A).

- [x] **Step 1: tulis test yang gagal** — render `<Quiz>` dengan 2 soal dummy:
  klik opsi salah → `rationale` muncul dan tombol lanjut aktif; klik benar di
  soal 2 → `onDone` dipanggil dengan `(1, 2)`; teks skor tidak ada sebelum soal
  pertama dijawab.

```tsx
render(<Quiz questions={DUMMY} onDone={done} />);
await user.click(screen.getByRole("button", { name: /instal dan buka/i }));
expect(screen.getByText(/izin sms/i)).toBeInTheDocument();
```

- [x] **Step 2: jalankan, pastikan gagal** — `npx jest src/components/belajar/quiz.test.tsx`.
- [x] **Step 3: implementasi minimal** — state `index`, `locked`, `score`;
  opsi `.appnext-quiz-option` + penjelasan inline + track progres.
- [x] **Step 4: jalankan, pastikan lulus.**
- [x] **Step 5: commit** — `6be0da4`.

Catatan skill: sebelum menulis JSX task ini, muat skill `lumina-ui` +
`appnext-design` (permukaan terang, bukan token gelap).

## Task 3 — konten modul 10 bertipe + shape test

**Files:**
- Create: `src/data/modul-10.ts`
- Create: `src/data/modul-10.test.ts`

**Interfaces:**
- Consumes: tipe `QuizQuestion` dari Task 2; fakta `modus.json` no 10
  (nama, laporan 3.684, kerugian ±Rp134 M, `scenarioId: "L1-kurir-apk"`).
- Produces: `MODUL_10: ModuleContent` — `anatomi[5]`, `contohIsi`
  (segmen `{ text, berbahaya }`, bentuk `contohJenis: "pesan"` +
  `contohSumber`), `checklist[5]`, `kuis[4]`, `lapor[]`
  berurutan. Dipakai Task 4.

Isi yang dikunci (sudah riset, tinggal tulis):

- **Anatomi 5 langkah:** 1) kontak awal dari nomor tak dikenal, sapaan umum;
  2) umpan file `.apk` (undangan/kurir/tilang); 3) korban diminta instal +
  memberi izin SMS/notifikasi; 4) malware mencuri SMS OTP & data m-banking;
  5) transaksi senyap menguras rekening.
- **Contoh pesan (anonim):** undangan pernikahan WA + `Undangan-Pernikahan.apk
  (20 MB)` — segmen berbahaya: nama file `.apk`, ukuran file, kalimat
  "instal untuk membuka undangan".
- **Checklist 5:** `.apk` di luar Play Store · pengirim tak dikenal / tak bisa
  ditelepon balik · diminta instal + izinkan akses SMS · bahasa mendesak ·
  nama file tak masuk akal (undangan kok `.apk`).
- **Kuis 4 soal** ("apa yang kamu lakukan sekarang?"): APK undangan dari nomor
  asing → hapus tanpa instal; "Paket-Kurir.apk" → cek aplikasi resmi, jangan
  instal; APK dari "teman" → konfirmasi lewat kanal lain (nomornya mungkin
  dibajak); sudah terlanjur instal → matikan data, hapus, cek mutasi, hubungi
  bank. Tiap opsi salah punya `rationale` sendiri.
- **Lapor 4 langkah:** hapus APK (jangan dibuka) → kalau sempat dibuka:
  matikan data + cabut izin aplikasi → hubungi bank/e-wallet lewat nomor
  resmi → lapor IASC + blokir nomor pelaku.

- [x] **Step 1: tulis shape test yang gagal** — panjang `anatomi === 5`,
  `checklist === 5`, `kuis.length` 3–5, tiap soal punya `correctId` valid dan
  `rationale` non-kosong, tiap segmen berbahaya `contohIsi` muncul di
  input mentah, `lapor.length >= 3` dan berurutan.
- [x] **Step 2: jalankan, pastikan gagal.**
- [x] **Step 3: tulis konten** — Bahasa Indonesia, tanpa menyalahkan korban,
  tanpa nomor rekening/nama asli.
- [x] **Step 4: jalankan, pastikan lulus.**
- [x] **Step 5: commit** — `8be8c1e`.

## Task 4 — wire `/belajar/10`: badan modul + tombol selesai + test halaman

**Files:**
- Create: `src/components/belajar/modul-body.tsx` (`"use client"` — memegang
  state `passed`; route di atasnya tetap server)
- Create: `src/components/belajar/complete-button.tsx` (`"use client"`,
  memanggil Task 1, menampilkan badge; tombol hanya tampil setelah lulus)
- Modify: `src/app/belajar/[modul]/page.tsx` (cabang `no === 10`)
- Create: `src/components/belajar/modul-body.test.tsx`

**Interfaces:**
- Consumes: `MODUL_10` (Task 3), `<Quiz>` (Task 2), `loadProgress/
  saveProgress/completeModule` (Task 1), `MODUS_BY_NO` (kontrak baca).
- Produces: halaman `/belajar/10` lengkap. Tidak mengubah kontrak, tidak
  menyentuh `modus.json`.

- [x] **Step 1: tulis test halaman yang gagal** — render `<ModulBody/>`:
  5 heading/langkah anatomi tampil; segmen `.apk` ditandai (mis.
  `mark`/`text-danger`); 5 item checklist; `<Quiz>` hadir; link
  "Latih pola ini di simulasi" ber-`href="/simulasi/L1-kurir-apk"`;
  `complete-button`: klik "Tandai selesai" → localStorage berisi modul 10 +
  badge `penjaga-apk` tampil.

```tsx
render(<ModulBody />);
expect(screen.getAllByRole("heading").length).toBeGreaterThanOrEqual(5);
expect(
  screen.getByRole("link", { name: /latih pola ini di simulasi/i }),
).toHaveAttribute("href", "/simulasi/L1-kurir-apk");
```

- [x] **Step 2: jalankan, pastikan gagal.**
- [x] **Step 3: implementasi** — route server tetap (plus `generateStaticParams`
  yang ada); island client hanya `Quiz` + `CompleteButton`. Link simulasi
  adalah pill AppNext (`.appnext-button`) dengan `TODO(stream-C)` sampai
  runner C tervalidasi. Segmen berbahaya memakai `<mark>`, tidak pernah hex.
- [x] **Step 4: jalankan + cek 380px** — tanpa scroll horizontal.
- [x] **Step 5: commit** — `4191dbf`, `c79eba9`, `785c3ea`.

Kejujuran yang ditutup task ini: klaim "Lengkap" di list untuk modul 10 menjadi
benar; 11 modul lain tetap "Segera", tanpa stub.

## Task 5 — island progres di list `/belajar` + test

**Files:**
- Create: `src/components/belajar/belajar-progress.tsx` (`"use client"`,
  baca `loadProgress()` di `useEffect`, render setelah mount)
- Modify: `src/app/belajar/page.tsx` (sisipkan island + centang per baris)
- Create: `src/components/belajar/belajar-progress.test.tsx`

**Interfaces:**
- Consumes: `loadProgress()` (Task 1). Tidak mengubah daftar statis dari
  `modus.json` (sumber kebenaran daftar tetap di sana).

Aturan hidrasi: server merender daftar persis seperti sekarang; centang
"selesai" dan penghitung "1 dari 12 selesai (perangkat ini)" hanya muncul
setelah mount (`mounted` state). Tidak ada flash klaim sebelum data ada.

- [x] **Step 1: test gagal** — dengan localStorage berisi modul 10, island
  menampilkan teks progres; tanpa localStorage, tidak ada centang.
- [x] **Step 2–5:** implementasi → lulus → commit `c79eba9`, `785c3ea`,
  `3d7d2c6`.

## Task 6 — modul 1, 2, 7 (cut bersyarat, pola sama)

Hanya dikerjakan kalau Task 1–5 lolos Gate 2. Tiap modul = satu file
`src/data/modul-<no>.ts` + cabang render di `[modul]/page.tsx` + shape test
meniru Task 3. Urutan: 1 (jual-beli palsu, laporan terbanyak) → 2 (fake call,
kerugian terbesar) → 7 (phishing, jembatan ke L2-cut). Tidak ada komponen baru;
`Quiz`, `ModulBody`, `CompleteButton` dipakai ulang. Satu commit per modul.
Kalau hari ke-4 belum mulai → cut semuanya, demo hanya modul 10.

## Task 7 — AppNext di seluruh permukaan (restyle terang)

**Konteks:** `docs/design-system/appnext.md` mengunci dua sistem (Lumina gelap
untuk produk, AppNext terang untuk marketing). Keputusan pengguna 4 Nov 2026
membatalkan pemisahan itu: **semua halaman terang**, nav ikut terang. Ini
menyimpang dari `AGENTS.md` + skill `appnext-design` yang tertulis, jadi
perubahan aturan harus diumumkan/diubah terpisah — restyle tidak menimpa
kontrak skor apa pun.

**Yang dikerjakan (branch `feat/light-appnext-restyle`):**

- [x] Fondasi token di `src/styles/appnext-tokens.css`: `.appnext-hero/lead/
  caption/container/band`, `.appnext-step-dot`, `.appnext-danger-dot`,
  override `:focus-visible`, normalisasi `Card` (ring shadcn dihapus di luar
  layer), dan bridge remap utility lama (`bg-panel→putih`,
  `text-dim→#606060`, dsb.) di dalam `.appnext` saja.
  Kelas `.appnext-panel` / `.appnext-button*` / `.appnext-card` /
  `.appnext-quiz-*` **dihapus** setelah semua pemakaian pindah ke `Button`,
  `Card`, `Progress`, `Tabs` — tidak boleh ada dua sistem gaya berdampingan.
- [x] Ekstensi terukur (di luar sumber Framer, didokumentasikan di file):
  `--appnext-danger #dc2626`, `--appnext-danger-deep #991b1b`,
  `--appnext-danger-wash #fef2f2`, `--appnext-warn #d97706`,
  `--appnext-accent-deep #0e7c36`, wash aksen, `--appnext-ink-3`. Tanpa ini
  status salah/bahaya tidak terbaca di ground putih.
- [x] Root layout memakai `body.appnext` tunggal (bukan nested ganda);
  variabel shadcn `:root` dibuat terang; `.dark` gelap dipertahankan untuk
  subtree legacy. `color-scheme: light`.
- [x] Semua rute dirender terang: `/`, `/companion` (+ ScoreCard/SignalPanel),
  `/belajar`, `/belajar/[modul]`, `/simulasi`, `/simulasi/[id]`, `/darurat`
  (+ triage). Kartu produk: putih, radius 24px, ambient shadow, tanpa border.
- [x] Migrasi primitive (audit skill `lumina-ui` + `shadcn-ui`):
  kuis memakai `Button` (opsi, "Soal berikutnya", "Coba lagi", "Coba soal ini
  lagi") + `Alert` + `Progress`; `LessonSection` / stat / TOC / completion
  memakai `Card` + `CardHeader/Title/Description/Content`; triage memakai
  `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` (roving focus + panah dari
  Radix) menggantikan `role="tablist"` tangan; CTA link memakai
  `Button asChild` (bukan pill `<Link>`), tidak ada `<button>` mentah lagi.
- [x] Kuis: fokus pindah ke prompt baru, jawaban salah tampil `Alert`,
  layar akhir punya "Tinjau yang kamu lewatkan" + "Coba soal ini lagi"
  per soal; skor dihitung dari `attempts` (mengulang menimpa, bukan
  menggandakan). Mengulang soal dari tinjauan kini kembali ke ringkasan
  (`reviewing` flag), bukan lanjut ke soal berikutnya. `onDone` juga mengirim
  `missed`, dan `modul-body` menyimpannya lewat `recordMissed()`.
- [x] Tanpa gaya paralel: setelah migrasi, pencarian `appnext-panel`,
  `appnext-button`, `appnext-quiz-*`, `appnext-card`, `appnext-course-*`
  menghasilkan **0 pemakaian** di TSX dan 0 aturan di CSS.
- [x] Sinkronisasi progres: `saveProgress()` memancarkan `PROGRESS_EVENT`;
  header katalog, tanda selesai, dan kartu completion membaca ulang tanpa
  provider. `subscribe()` juga mendengar `storage` untuk tab lain.
- [x] Verifikasi: jest 44/44, `tsc --noEmit` bersih, `next build` lolos,
  delapan rute HTTP 200, CSS terkompilasi memuat `#0e7c36`/`#dc2626`/
  `#b45309` dan aturan `[data-slot=card]`. `biome check` pada
  `src/components|app|lib|styles|data/modul-10.ts` → 0 error. Screenshot
  visual tidak bisa diambil (browser desktop tidak terhubung) — cek manual
  380px masih terbuka.
- [ ] `npm run verify` masih gagal **hanya** di langkah lint, pada file akar
  repo yang tidak disentuh: `biome.json`, `components.json`, `jest.config.ts`,
  `jest.setup.ts`, `next.config.ts`, `package.json`, `tsconfig.json`, dan
  `src/data/{modus,official-domains}.json` + `triage.ts` — semuanya karena
  CRLF, sudah begitu di `main`. Jangan diformat otomatis: itu menyentuh file
  milik stream lain dalam diff terpisah tanpa persetujuan.
- [ ] **Keputusan yang belum diputuskan pengguna:** (1) jawaban benar —
  kunci + tombol lanjut eksplisit (dipakai sekarang) vs auto-advance;
  (2) penyelesaian modul — tombol manual "Tandai modul selesai" (dipakai
  sekarang) vs otomatis setelah lulus. Jangan ubah tanpa keputusan.
- [ ] Pengumuman ke stream A/C/D + pemilik aturan: nav/shell dan token
  sekarang terang. `AGENTS.md` (§ dua sistem desain), `docs/plan.md`
  (§ design tokens), `docs/design-system/appnext.md` (§ Using it here), dan
  skill `appnext-design` + `lumina-ui` **sudah diperbarui** 5 Nov 2026;
  stream lain masih perlu diberi tahu langsung.
- [ ] `npm run verify` penuh sebelum commit (lihat §4a). Status 5 Nov:
  typecheck ✅, test ✅ (44), build ✅, lint ❌ hanya pada file akar / data
  milik stream lain yang CRLF sejak `main` (10 error, lihat di atas) —
  jangan klaim hijau, dan jangan "perbaiki" dengan memformat file orang lain.
- [ ] Push/PR hanya setelah pengguna menyetujui (jangan push dulu).

## Task 8 — Admin course (create / read / update / delete)

Dibangun 5 Nov 2026 setelah Stream A (Vasco) menyetujui jumlah course tidak lagi
dikunci 12.

**Arsitektur.** Tiga lapisan: draf di `localStorage`
(`lumina-admin-draft-v1`), seam `src/lib/admin/` (store + export), dan produk
statis (`kurikulum.ts` + `modul-XX.ts`). Draf tidak pernah masuk ke produk tanpa
ekspor + commit, jadi `/belajar` tetap statis dan demo tidak bergantung server.

**Yang selesai:**

a. `src/data/modul-schema.ts` — `ModuleContentSchema` (zod) dengan aturan
   pedagogis: minimal 3 langkah anatomi, minimal satu segmen `berbahaya`, 3–6
   soal, `correctId` wajib ada di `options` (`superRefine`).
b. `src/data/modul-10.ts` — jadi instans `satisfies ModuleContent`; tipe
   diekspor ulang dari schema supaya import lama tidak pecah.
c. `src/data/kurikulum.ts` — registri `KURIKULUM`; `isPublished()` sekarang
   satu-satunya penentu "lengkap" (5 pembacaan `modulStatus` diganti).
d. `src/lib/modus.ts` — `no` 1..99, daftar `.min(12)` + cek duplikat; kursus
   > 12 tidak lagi mematikan build.
e. `src/lib/progress.ts` — `completedModules` 1..99; test batas diperbarui.
f. `src/lib/admin/draft-store.ts` — baca/tulis draf, `nextCourseNo`, `blankDraft`
   (sengaja tidak valid), `validateDraft`.
g. `src/lib/admin/export-course.ts` — tiga potongan: file modul, entri
   kurikulum, objek `modus.json` (JSON ketat).
h. `/admin` — inventory seluruh katalog + draf, tombol "Course baru" (nama dulu).
i. `/admin/[no]` — editor metadata + anatomi + contoh + checklist + kuis +
   lapor + simulasi, tab Pratinjau (`ModulBody` asli) dan Ekspor.
j. `ModulBody` tidak lagi meng-hardcode "5 tanda bahaya" / "empat situasi" /
   "tiga hal yang ditandai" — semua diturunkan dari konten.

**Batas yang dipertahankan:** tidak ada DB, akun, atau API; "hapus course
terbit" menampilkan `git rm`, bukan tombol yang berpura-pura menghapus;
`/admin` tanpa entri nav.

**Pemisahan area (5 Nov, revisi).** Admin dan murid punya shell sendiri:
permukaan murid pindah ke `src/app/(user)/` (nav 4 tujuan + footer privasi),
`src/app/admin/` punya `AdminNav` sendiri tanpa tautan Companion/Belajar/
Simulasi/Darurat. Tautan "Pratinjau" di inventory tidak lagi meninggalkan area
admin — pratinjau memakai tab `ModulBody` di dalam editor. Root layout tinggal
dokumen + `body.appnext`. Konsekuensi untuk login nanti: akun memilih **area**,
bukan menambah kondisi di dalam satu nav. Diverifikasi lewat HTML: `/admin` dan
`/admin/[no]` tidak memuat "Navigasi utama"; semua rute murid tidak memuat
"Navigasi admin".

**Verifikasi:** `tsc` bersih · 65 test / 12 suite lulus · `next build` lulus
(`/admin` statis, `/admin/[no]` `instant = false`) · `/admin` 200 dengan 12 baris
· `/admin/13` dan `/admin/10` 200 dengan 3 tab · biome bersih pada direktori
B yang disentuh.

## Task 9 — Contoh tidak lagi selalu "pesan"

Diminta 5 Nov 2026: *"ini jgn contoh pesan ga si? kan ga semua penipuan
bentuknya pesan bisa aja link."* Disetujui dengan rencana 4 bentuk + rename
`contohPesan` → `contohIsi`.

**Kontrak (`src/data/modul-schema.ts`):**

- `CONTOH_JENIS = ["pesan", "tautan", "situs", "panggilan"]` + `ContohJenisSchema`.
- `contohJenis: ContohJenisSchema.optional()` — opsional supaya konten lama
  (modul terbit, draf di localStorage) tetap valid tanpa migrasi; absen = `"pesan"`.
- `contohSumber: z.string().max(160).optional()` — baris sumber: pengirim,
  address bar, atau nomor pemanggil.
- `superRefine`: `contohJenis === "situs"` **wajib** `contohSumber` — address
  bar tanpa alamat tidak mengajarkan apa pun.
- Rename `MessageSegmentSchema`/`MessageSegment` → `ContohSegmentSchema`/
  `ContohSegment`, `contohPesan` → `contohIsi`.

**Renderer (`modul-body.tsx`):** `CONTOH_SHAPE` memetakan tiap bentuk ke
label TOC, ikon, baris sumber default, dan saran penutup. Empat bingkai:
gelembung chat (`pesan`) · kartu tautan (`tautan`) · jendela browser dengan
address bar berisi `contohSumber` (`situs`) · kartu panggilan (`panggilan`).
Segmen dan tanda merah identik di keempatnya — hanya bingkainya yang berubah.
Copy yang menyiratkan chat ("mirip pesan asli", "Jangan lanjutkan chat-nya",
"bukan gaya penulisan") diganti generik.

**Admin:** 4 tombol bentuk ber-`aria-pressed` (pola sama dengan `SegmentEditor`),
input "Baris sumber" dengan placeholder per bentuk + hint wajib untuk situs,
kartu "Contoh pesan" → "Contoh penipuan", aria-label "Segmen pesan N" →
"Segmen contoh N".

**Ekspor (`export-course.ts`):** mengeluarkan `contohJenis` (fallback
`"pesan"`), `contohSumber` (fallback `""`), `contohIsi`. `modul-10.ts` kini
menulis eksplisit `contohJenis: "pesan"` + `contohSumber` — modul 10 memang
berbentuk pesan, jadi yang berubah hanya label dan copy; bentuk lain muncul
ketika course baru ditulis.

**Test (14 suite / 79 test):** `modul-schema.test.ts` baru (field lama valid,
`contohJenis` di luar empat ditolak, situs tanpa sumber ditolak, kunci
`contohPesan` lama ditolak) · `modul-body.test.tsx` (tautan tanpa jejak chat,
situs menampilkan alamat, panggilan dengan saran telepon, TOC per bentuk,
`contohSumber` dibaca dari data) · `export-course.test.ts` (tiga field baru) ·
`draft-store.test.ts` (`blankDraft` ber-`contohJenis`, situs kosong ditolak).

**Verifikasi:** `tsc` bersih · 79 test / 14 suite lulus · `next build` lulus ·
biome bersih pada 12 file yang disentuh · `/belajar/10` 200 dengan baris sumber
WhatsApp dari data · `/admin/10` 200 dengan "Bentuk contoh" + "Baris sumber".

## Task 10 — Tombol terbit + migrasi draf lama

Dua temuan saat review 5 Nov: `/admin/14` melempar `TypeError: Cannot read
properties of undefined (reading 'map')`, dan tidak ada tombol yang kelihatan
untuk menerbitkan course.

**Migrasi.** Draf 13 dan 14 ditulis sebelum rename, jadi tersimpan dengan
`contohPesan` tanpa `contohIsi`; `exportCourse` lalu memanggil
`contohIsi.map` pada `undefined` dan seluruh halaman crash. `loadDrafts()`
sekarang memigrasikan saat baca: `contohPesan` → `contohIsi` (kalau
`contohIsi` belum ada), `contohJenis` absen → `"pesan"`, `contohSumber`
bukan string → `""`. Tidak ada data pengguna yang hilang dan tidak perlu
reset localStorage. Draf yang benar-benar rusak tetap bisa dibuka lalu
diperbaiki, bukan memutihkan halaman.

**Tombol terbit.** Publikasi tetap tiga potongan + commit (situs statis tidak
bisa menulis repo), tapi sekarang jalurnya kelihatan:

- Editor punya tombol **Terbitkan** di header dan tab ketiga bernama
  "Terbitkan" (bukan "Ekspor"), lengkap dengan langkah 4: `npm run verify`.
- Inventory menampilkan tombol **Terbitkan** hanya untuk draf yang lolos
  `validateDraft`; tautannya ke `/admin/[no]#terbit` sehingga editor langsung
  membuka tab itu. Draf yang belum valid tetap hanya punya "Lanjutkan".
- Tab terbit menyatakan eksplisit bahwa status "Terbit" ditentukan oleh entri
  `kurikulum.ts` yang ikut ter-commit.

**Test:** migrasi draf lama (store) · tombol terbit muncul untuk draf valid dan
tidak muncul untuk draf kosong (inventory). Total 82 test / 14 suite.

## Task 11 — Pesan validasi yang bisa ditindaklanjuti

Review berikutnya menampilkan `Too small: expected string to have >=3
characters` tanpa menyebut field. Sumbernya `ciri` kosong di
`CourseMetaSchema`; `validateDraft` hanya mengembalikan `issues[0].message`
dan membuang `path`, jadi pengguna tidak tahu apa yang harus diisi.

Sekarang `validateDraft`:

- menerjemahkan `too_small` / `too_big` menjadi "minimal N karakter/item" dan
  `invalid_type` menjadi "wajib diisi";
- memetakan path ke label manusia: `ciri.0` → "Ciri ke-1", `anatomi.1.teks` →
  "Anatomi langkah 2 — penjelasan", `kuis.0.options.1.label` → "Kuis 1 — opsi 2";
- mengembalikan **semua** masalah (maksimal 8 baris + "…dan N masalah lain"),
  bukan satu per satu;
- ditampilkan dengan `whitespace-pre-line` di tab Isi, Pratinjau, dan Terbitkan;
- tombol **Perbaiki isi** di alert Terbitkan membawa kembali ke tab Isi.

Catatan "Nomor 14 belum ada di `modus.json`" juga diubah: itu bukan error,
hanya penanda course baru. Objek yang harus ditempel ada di tab **Terbitkan**
langkah 3.

**Test:** label field menggantikan pesan Zod mentah · beberapa masalah tampil
sekaligus. Total 84 test / 14 suite.

## Task 12 — Jalur nomor 13+ tidak lagi dikunci test

Tiga test masih mengasumsikan tepat 12 modul, sehingga course pertama di atas
12 akan membuat `npm run verify` gagal:

- `score.test.ts` (milik Stream A): sekarang menuntut 12 entri awal 1..12 tetap
  ada, bukan jumlah totalnya;
- `admin-inventory.test.tsx`: jumlah "Terbit" mengikuti `PUBLISHED_COUNT`, dan
  nomor course baru dihitung dari nomor pertama yang kosong;
- `belajar-progress.test.tsx`: total progres mengikuti `MODUS.length`.

Diverifikasi dengan modul 14 sementara: `tsc`, 84 test / 14 suite, dan
`next build` lulus; file sementara lalu dihapus sehingga repo kembali ke
kondisi sebelum course 14 ditambahkan.

Sekalian diperbaiki: membuka "Ubah" pada course yang sudah terbit tapi belum
punya draf dulu memulai dari formulir kosong — mengekspornya akan menghapus
isi yang live. Sekarang editor mengambil `courseFor(no)` sebagai isi awal;
draf lokal tetap menang kalau ada.

## Yang eksplisit tidak dibangun (rangkuman cut)

`adaptive.ts` · badge sosial/share · Radar/Kalender/Sosialisasi · modul
3–6/8/9/11/12 · radio-group registry · editor skenario simulasi · publikasi
otomatis dari browser · DB/auth (Track 3 di
`C:\Users\Kiral\.opencode\plan\stream-b-admin-crud.md`).
