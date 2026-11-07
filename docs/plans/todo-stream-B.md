# TODO Stream B — Belajar

Status: 5 November 2026 · branch `feat/stream-b-belajar-user&admin`
Sumber kebenaran produk: `docs/plan.md` §5-B, §11.2, §11.4.

Legenda: `[x]` selesai dan terverifikasi · `[ ]` belum · `[-]` sengaja di-cut.

---

## 0. Fondasi data & kontrak

- [x] `src/lib/progress.ts` — `ProgressSchema`, `loadProgress`, `saveProgress`,
      `completeModule`, `BADGE_FOR_MODULE`, `STORAGE_KEY`.
- [x] `PROGRESS_EVENT` + listener `storage` supaya island lain ikut menyegarkan
      tanpa provider.
- [x] `recordMissed()` — menyimpan pola yang salah untuk dibaca nanti.
- [x] `src/lib/modus.ts` — `no` 1..99, daftar `.min(12)`, cek nomor duplikat.
- [x] `ProgressSchema.completedModules` 1..99 (bukan 1..12).
- [x] `src/data/modul-schema.ts` — `ModuleContentSchema` dengan aturan pedagogis
      (minimal 3 anatomi, minimal satu segmen berbahaya, 3–6 soal, `correctId`
      harus ada di `options`).
- [x] Empat bentuk contoh: `pesan`, `tautan`, `situs`, `panggilan`
      (`ContohJenisSchema`), plus `contohSumber` wajib untuk `situs`.
- [x] Rename `contohPesan` → `contohIsi`, `MessageSegment` → `ContohSegment`.
- [x] `src/data/kurikulum.ts` — registri `KURIKULUM`, `courseFor`, `isPublished`,
      `PUBLISHED_COUNT`; "lengkap" tidak lagi dibaca dari `modulStatus`.
- [x] `src/data/modul-10.ts` — modul APK WhatsApp lengkap, `satisfies ModuleContent`.
- [ ] Modul 1 — jual-beli online palsu.
- [ ] Modul 2 — fake call / mengaku pihak lain.
- [ ] Modul 7 — phishing tautan & akun.
- [ ] Modul 3–6, 8, 9, 11, 12.
- [ ] Pre-test / post-test untuk mengukur kenaikan kemampuan (§11.7).
- [ ] `adaptive.ts` — urutan/rekomendasi dari `missedPatterns`.
- [ ] Level 5 — ringkasan/badge komunitas (sekarang baru `penjaga-apk`).

---

## 1. Halaman Belajar

- [x] `/belajar` — daftar digenerate dari `modus.json`, urut nomor, status jujur
      "Lengkap"/"Segera" dari `kurikulum.ts`.
- [x] Modul unggulan = course terbit pertama, bukan hardcode nomor 10.
- [x] Penghitung progres dinamis (`{complete} dari {MODUS.length}`).
- [x] Centang "selesai (perangkat ini)" hanya muncul setelah mount — tanpa
      hydration mismatch.
- [x] `/belajar/[modul]` — hanya nomor terbit yang merender isi; sisanya "segera".
- [x] Badan modul: anatomi, contoh, checklist, kuis, langkah lapor, CTA simulasi.
- [x] Kuis satu soal per langkah; jawaban terkunci; rationale muncul seketika;
      skor dari `attempts` (mengulang menimpa, tidak menggandakan).
- [x] Layar akhir: "Tinjau yang kamu lewatkan" + "Coba soal ini lagi".
- [x] Tombol "Tandai selesai" + badge, hanya setelah lulus ≥60%.
- [x] Empat bingkai contoh (gelembung chat, kartu tautan, jendela browser,
      kartu panggilan) dengan penanda bahaya identik.
- [x] Copy tidak lagi mengasumsikan semua penipuan berupa pesan.
- [x] Jumlah anatomi/checklist/kuis diturunkan dari konten, bukan hardcode
      "5 tanda bahaya"/"empat situasi".
- [x] Layout aman 380px secara kelas (nav membungkus, tanpa scroller horizontal).
- [ ] Cek visual 380px di browser sungguhan (belum bisa; browser tidak terhubung).
- [ ] Halaman modul 1, 2, 7 (mengikuti pola modul 10).

---

## 2. Admin course (`/admin`)

- [x] Inventory seluruh katalog + draf perangkat, tombol "Course baru".
- [x] Nomor course baru dihitung dari nomor pertama yang kosong (bukan hardcode 13).
- [x] `/admin/[no]` — editor metadata, anatomi, contoh, checklist, kuis, lapor,
      simulasi.
- [x] Tiga tab: **Isi**, **Pratinjau** (memakai `ModulBody` asli), **Terbitkan**.
- [x] Draf di `localStorage` (`lumina-admin-draft-v1`), tidak pernah menyentuh produk.
- [x] Migrasi draf lama: `contohPesan` → `contohIsi`, `contohJenis` absen → `"pesan"`,
      `contohSumber` non-string → `""`.
- [x] `validateDraft` mengembalikan semua masalah (maks 8 + "…dan N masalah lain")
      dengan label manusia: "Ciri ke-1", "Anatomi langkah 2 — penjelasan",
      "Kuis 1 — opsi 2".
- [x] Pesan validasi berbahasa Indonesia, bukan pesan Zod mentah.
- [x] Tombol **Terbitkan** di header + tab; inventory hanya menautkan
      `/admin/[no]#terbit` untuk draf yang lolos validasi.
- [x] Ekspor tiga potongan: file `modul-XX.ts`, entri `kurikulum.ts`, objek `modus.json`.
- [x] Escape tanda kutip dan `*/` di file hasil ekspor (bug ditemukan & diperbaiki).
- [x] "Ubah" pada course terbit memuat isi live, bukan formulir kosong.
- [x] Hapus draf; ganti nomor draf.
- [x] Pemisahan shell: `/admin` punya `AdminNav`, tanpa tautan murid.
- [ ] Guardrail slug duplikat — dua nama sama bisa menghasilkan `id` yang sama.
- [ ] Tangani `QuotaExceededError` saat `localStorage` penuh.
- [ ] Impor/ekspor semua draf (backup sebelum browser dibersihkan).
- [ ] Duplikat course sebagai titik awal course baru.
- [ ] Cari/filter di inventory saat course bertambah banyak.
- [ ] Panduan `git rm` untuk menghapus course yang sudah terbit.
- [ ] Test komponen `course-editor.tsx` (buat → isi → validasi → terbit).
- [ ] Test `field-editors.tsx`.
- [ ] Publikasi satu klik (butuh API/DB) — Track 3, ditunda.
- [ ] Login/role admin — Track 3, ditunda.

---

## 3. Shell, token, dan aturan visual

- [x] Ground terang AppNext: `src/styles/appnext-tokens.css` + remap `--lumina-*`
      di dalam `.appnext`.
- [x] Root layout hanya dokumen + `body.appnext`; nav murid pindah ke
      `src/app/(user)/layout.tsx`.
- [x] Shell admin terpisah di `src/app/admin/layout.tsx`.
- [x] Nav murid & admin: pill, membungkus di 380px, satu aksi solid di kanan.
- [x] Perbaikan import `cn` di `src/components/ui/*` (sebelumnya `from "cn"`).
- [x] Tidak ada hex literal / utility warna mentah (`bg-red-500` dsb.) di TSX.
- [x] Tidak ada `render={...}`; memakai `asChild` (Radix).
- [x] `.gitattributes` → LF, supaya `npm run verify` konsisten di Windows.
- [ ] Beri tahu Stream A/C/D: shell terpisah, nomor 13+, empat bentuk contoh,
      `score.test.ts` dilonggarkan.

---

## 4. Test & verifikasi

- [x] `npm run typecheck` bersih.
- [x] `npm run lint` (Biome) bersih — 80 file.
- [x] `npm run test` — **85 test / 14 suite** lulus.
- [x] `npm run build` lulus.
- [x] `npm run verify` lulus penuh (typecheck + lint + test + build).
- [x] 11 rute mengembalikan 200: `/`, `/companion`, `/belajar`, `/belajar/10`,
      `/simulasi`, `/simulasi/L1-kurir-apk`, `/darurat`, `/admin`, `/admin/10`,
      `/admin/13`, `/admin/14`.
- [x] Isolasi shell diperiksa dari HTML: `/admin*` tanpa "Navigasi utama",
      rute murid tanpa "Navigasi admin".
- [x] Jalur nomor 13+ diuji dengan `modul-14.ts` sementara (84 test saat itu),
      lalu file dihapus — repo kembali tanpa course 14.
- [ ] Test komponen editor (lihat §2).
- [ ] Cek visual browser desktop + 380px.
- [ ] Uji end-to-end: buat course → isi → validasi → ekspor → tempel → commit.

---

## 5. Git & rilis

- [x] Branch `feat/stream-b-belajar-user&admin` dibuat dari `main`.
- [x] 13 commit di atas `origin/main`, tidak ada commit tertinggal dari `main`.
- [x] Push ke `origin` — remote HEAD sama dengan lokal (`2ca21eb`).
- [ ] Buka PR (gh tidak terpasang; pakai URL compare manual).
- [ ] Review + merge.
- [ ] Kabari Stream A/C/D sebelum merge.

URL PR manual:

```text
https://github.com/vaskoyudha/Lumina/compare/main...feat/stream-b-belajar-user%26admin?expand=1
```

---

## 6. Sengaja tidak dibangun (cut)

- [-] `adaptive.ts` (sekarang hanya menyimpan `missedPatterns`).
- [-] Badge sosial / ringkasan share keluarga.
- [-] Radar / Kalender / Paket sosialisasi.
- [-] Modul 3–6, 8, 9, 11, 12.
- [-] Radio-group registry (opsi kuis memakai `Button`).
- [-] Editor skenario simulasi (milik Stream C).
- [-] Publikasi otomatis dari browser (File System Access).
- [-] DB / auth / API (Track 3, ditunda sampai stream lain selesai).

---

## 7. Urutan kerja berikutnya

1. **Modul 1, 2, 7** — dampak demo terbesar, pola sama dengan modul 10.
2. **Guardrail admin** — slug duplikat, quota localStorage, impor/ekspor draf.
3. **Test `course-editor`** — alur terbit belum diuji sebagai komponen.
4. **Adaptive ringan** — tandai modul yang disarankan dari `missedPatterns`.
5. **Track 3 (DB/API/auth)** — jangan sebelum submission 10 November.
