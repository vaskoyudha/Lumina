# Pelaksanaan tiga rencana — 10 November 2026

Permintaan pemilik produk: jalankan seluruh task; pekerjaan voice dikecualikan.
Branch: `codex/learning-detection-agents`.

Aturan integrasi: progres/review/attempt per akun di PostgreSQL, bukan localStorage.
Dokumen sumber disalin ke direktori ini agar setiap task bisa diaudit. A6 (Pi
voice) tidak dikerjakan. Phase 4 yang secara eksplisit deferred tetap deferred.
A7 memakai decision gate di dokumen: runtime model hanya jika ada tool dependen.
Tidak menghidupkan lagi halaman Darurat atau ekspor PDF.

## Irisan pekerjaan

- [ ] L1–L4: taksonomi, snapshot v2, review dan nextStep.
- [ ] L5–L7/L9–L11: dashboard, remediation, latihan, profil, handoff dan pengukuran.
- [ ] L8: tutor satu modul dari materi PostgreSQL, tanpa jawaban kuis.
- [ ] A1–A3: mechanism, validator, evidence-strength UI.
- [ ] D1–D6: benchmark 120, normalisasi, injection, IDN, rule packs, QRIS/escalation.
- [ ] D7–D10: email, OCR entities, ledger opt-in dan fingerprint lokal.
- [ ] D11–D13/A4–A5: verifikasi URL aman, blocklist/cache, enrichment opsional.
- [ ] D14–D17: hash-only file, phone/account/crypto, forensics di luar skor.
- [ ] A7: evaluasi decision gate dan batas tool.
- [ ] A8–A9: case metadata tanpa isi pesan, TTL, export dan eval.
- [ ] Gate akhir: database integration, npm run verify, UI 380px, commit/push.

## Baseline

`npm test -- --runInBand src/lib/scoring/eval.test.ts` lulus sebelum perubahan.
Korpus awal: 29 scam, 28 sah; test baseline menegakkan 29 tertangkap dan 0 FP.
Angka sesudah perubahan akan ditulis dari `runEval()`, bukan perkiraan.
