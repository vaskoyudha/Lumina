# Pelaksanaan tiga rencana — 10 November 2026

Permintaan pemilik produk: jalankan seluruh task; pekerjaan voice dikecualikan.
Branch: `codex/learning-detection-agents`. PR: `#85`.

Aturan integrasi: progres/review/attempt per akun di PostgreSQL, bukan localStorage.
Dokumen sumber disalin ke direktori ini agar setiap task bisa diaudit. A6 (Pi
voice) tidak dikerjakan. Phase 4 yang secara eksplisit deferred tetap deferred.
A7 memakai decision gate di dokumen: runtime model hanya jika ada tool dependen.
Tidak menghidupkan lagi halaman Darurat atau ekspor PDF.

## Irisan pekerjaan

- [x] L1–L4: taksonomi, snapshot v2, review dan nextStep.
- [x] L5–L7/L9–L11: dashboard, remediation, latihan, profil, handoff dan pengukuran.
- [x] L8: tutor satu modul dari materi PostgreSQL, tanpa jawaban kuis.
- [x] A1–A3: mechanism, validator, evidence-strength UI.
- [x] D1–D6: benchmark 120, normalisasi, injection, IDN, rule packs, QRIS/escalation.
- [x] D7–D10: email, OCR entities, ledger opt-in dan fingerprint lokal.
- [x] D11–D13/A4–A5: verifikasi URL aman, blocklist/cache, enrichment opsional.
- [x] D14–D17: hash-only file, phone/account/crypto, forensics di luar skor.
- [x] A7: evaluasi decision gate dan batas tool — **hasil: tidak dipasang**. Tidak
      ada panggilan tool dependen yang dibutuhkan demo; `src/lib/agent/` hanya
      berisi case store.
- [x] A8–A9: case metadata tanpa isi pesan, TTL, export dan eval.
- [x] Gate akhir: database integration, npm run verify, UI 380px, commit/push.

## Hasil ukur — 10 November 2026

Dari `runEval()` (`src/lib/scoring/eval.ts`), bukan perkiraan:

| Ukuran | Nilai |
|---|---|
| Korpus | 120 kasus: 60 scam, 60 sah |
| Scam tertangkap (`mencurigakan`/`tinggi`) | 60/60 |
| Scam langsung `tinggi` | 49/60 |
| False positive pada pesan sah | 0/60 |
| Klasifikasi modus benar (di mana `wantModus` ada) | 56/56 |
| CPU terlambat per kasus | < 1 ms |

Gate pengujian:

- `npm run typecheck` bersih.
- `npm test` dengan `TEST_DATABASE_URL`: 172 suite, 1320 tes, 0 gagal, 0 dilewati.
- `npm run build` sukses.
- `npx biome check src` tanpa error (3 peringatan lama di CSS powder).
- 380px: `/belajar`, `/belajar/latihan`, `/belajar/10`, `/companion` — `scrollWidth`
  380 = `clientWidth` 380, tidak ada scroll horizontal.

## Yang tidak dikerjakan dan alasannya

- **A6 — Pi voice.** Dikecualikan pemilik produk. Jalur `fetch` yang ada tidak diubah.
- **A7 — tool loop `pi-agent-core`.** Decision gate tidak terpenuhi: verifikasi URL
  dan hash selesai dalam satu panggilan, tidak ada tool dependen berantai.
- **Phase 4 deteksi.** Parser APK, sandbox PDF, reputasi nomor/rekening skala besar,
  forensik screenshot di dalam skor, dan label wallet — semuanya butuh dependensi,
  partner, atau korpus berlabel yang belum ada.
- **Verifikasi jaringan nyata.** `/api/verify-link` dan `/api/verify-file` hanya
  aktif bila `VERIFY_LINK=on`/`VERIFY_FILE=on`; demo berjalan dengan keduanya mati
  dan trace menyebut `dilewati`.
