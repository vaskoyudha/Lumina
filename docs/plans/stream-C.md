# Stream C — Simulasi (FIRST90)

Nama: Person C · Stream: C · Tanggal: 4 November 2026

Satu skenario yang bisa dimainkan: `/simulasi/L1-kurir-apk`. Bukan engine umum,
bukan editor skenario. Kalau juri bisa duduk, klik, panik, dan ingat empat
kalimat debrief — stream ini selesai.

## 1. Versi terkecil yang jalan end to end

Jalur terpendek dari klik sampai lulus/gagal:

a. `src/lib/simulasi/scenario.ts` — tipe skenario + skenario L1 ditulis sebagai
   objek TypeScript, **bukan** dibaca dari JSON saat runtime. Tidak perlu loader,
   tidak perlu fetch, tidak ada state loading.
b. `Runner.tsx` — satu komponen client. Node aktif + riwayat pesan + deck kanan.
   `message` → tampil. `choice` → tombol. `ending` → layar akhir.
c. Dua meter: `panic` (naik saat pilihan salah) dan `intrusion` (naik tiap detik
   di node keputusan). Satu `useEffect` untuk interval, `clearInterval` di
   cleanup.
d. Layar akhir: `debrief[]` empat kalimat + tombol "ulangi" dan "coba simulasi
   lain" (link ke `/simulasi`).

Itu sudah mainable. Baru setelah itu:

e. `tool_task` — tiga tool deck benar-benar mengubah state, bukan tombol "next"
   berkedok: sakelar isolasi, inspektur izin, penyusun laporan.
f. `validate.ts` — cek `next` menggantung, node tak tercapai, `tool` tak
   dideklarasikan, `grades` tidak urut. Dipanggil di `jest`, bukan di build step
   terpisah (§9e: tidak ada dependensi baru setelah hari 3).

## 2. Yang saya cut

Ditulis sekarang, bukan Hari 5:

a. **Level 2-4 → cut.** `modus.json` sudah menandainya `scenarioPlanned`
   (L2/L3/L4) dan halaman daftar menampilkannya sebagai `Rencana`. Jujur, tidak
   dimainkan.
b. **Timer 420 detik → cut.** Dua meter sudah cukup menghasilkan tekanan. Timer
   menambah satu angka yang terus turun dan satu jalur gagal lagi.
c. **Grading / skor akhir → cut.** Yang diingat juri adalah debrief, bukan
   angka. Tidak ada `scoring.weights` yang dipakai.
d. **`tool_task` diport terakhir**, dan kalau mepet: sisakan dua tool
   (isolasi + laporan), buang inspektur izin.
e. **Port dari FIRST90 vanilla → tidak dikerjakan.** Sumbernya tidak ada di
   mesin ini (sudah dicek: `/root/FIRST90`, `~/FIRST90`, `~/Projects/FIRST90`,
   `find scenario.level*.json` — kosong). Skenario L1 dibangun dari skema
   kontrak §4 plan.md. Ini fallback yang plan izinkan, bukan jalan pintas.

Yang **tidak** pernah aku cut, walau waktu habis: debrief, `rationale` yang
muncul seketika, layar akhir.

## 3. Yang saya butuh (nama, apa, tanggal)

| Dari | Apa | Tanggal |
|---|---|---|
| D | Token `--lumina-*` di `globals.css` | ✅ sudah ada |
| A | `modus.json` entri 10 dengan `scenarioId: "L1-kurir-apk"` | ✅ sudah ada |
| B | Rute `/belajar/[modul]` untuk tombol "pelajari polanya" di layar akhir | ✅ sudah ada |
| — | Tidak ada yang memblokir. Semua di atas sudah tersedia. | — |

Tidak ada handoff keluar dari C. `unlocksScenario` (B→C) dibaca sebagai link
biasa ke `/simulasi/L1-kurir-apk`; bentuk datanya bukan urusan C.

## 4. Selesai berarti

Bisa diperiksa orang lain tanpa bertanya:

a. Buka `/simulasi/L1-kurir-apk`, mainkan sampai layar akhir tanpa error
   console, di lebar 380px tanpa scroll horizontal.
b. Memilih jawaban salah memunculkan `rationale` merah seketika dan cerita
   **tetap lanjut** — tidak memblokir.
c. Kedua meter bergerak: panic naik saat salah, intrusion naik sambil menunggu
   di node keputusan.
d. Layar akhir menampilkan empat kalimat debrief dan tombol ulangi benar-benar
   mengembalikan ke node awal (state bersih, bukan sisa percobaan sebelumnya).
e. `npm run verify` lulus. Test `validate.test.ts` membuktikan validator
   menangkap skenario rusak (next menggantung, node yatim, tool tak terdaftar).

## Batas

Tidak dikerjakan: isi modul (B), engine skor dan companion (A), PDF dan
navigasi (D). Tombol ke halaman lain cukup `href`.

## Catatan teknis yang mengikat

a. Setiap `setTimeout` / `setInterval` wajib punya cleanup di `useEffect`.
   Tanpa itu, callback menembak ke komponen mati dan scene berikutnya jalan dua
   kali di depan juri.
b. Skenario adalah sumber kebenaran. Tidak ada `if (node.id === "n04")` di dalam
   komponen — semua perilaku khusus ada di data.
c. `"use client"` hanya di `Runner.tsx`; halaman `page.tsx` tetap server
   component yang mengambil `modus.json`.
d. Komponen memakai primitive shadcn yang sudah ada (`Card`, `Button`, `Badge`,
   `Progress`, `Alert`, `Empty`). Tidak ada markup sendiri, tidak ada warna
   hardcoded — `bg-safe` / `bg-warn` / `bg-danger`.