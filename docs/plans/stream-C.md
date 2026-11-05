# Stream C — Simulasi (FIRST90)

Nama: Person 3 / C · Stream: C · Diperbarui: 5 November 2026

Branch kerja: `feat/stream-c-runner`.

Pelaksanaan paralel melalui `collaboration.spawn_agent` (model di bawah adalah
nilai parameter `model` pada pemanggilan tool):

| Agent | Model | Tugas |
|---|---|---|
| `/root/runner` | `gpt-6.1-terra` | Runner, alat, ending, dan tes interaksi |
| `/root/validator` | `gpt-6-luna` | Validasi graph/HUD dan 20 tes validator |
| `/root/pages` | `gpt-6-luna` | Daftar/detail, katalog, dan tes daftar |

Orchestrator mengintegrasikan hasil, menambahkan tes routing dan loading,
memperbaiki navigasi sempit, serta menjalankan browser dan verifikasi global.
Ketiga agent melaporkan selesai melalui tool kolaborasi; riwayat pemanggilan
dan balasan pada percakapan adalah jejak eksekusinya.

Satu skenario yang bisa dimainkan: `/simulasi/L1-kurir-apk`. Bukan engine umum,
bukan editor skenario. Kalau juri bisa duduk, klik, panik, dan ingat empat
kalimat debrief — stream ini selesai.

## 1. Versi terkecil yang jalan end to end

Jalur terpendek dari klik sampai lulus/gagal:

a. `src/lib/simulasi/scenario.ts` — tipe skenario + skenario L1 ditulis sebagai
   objek TypeScript, **bukan** dibaca dari JSON saat runtime. Tidak perlu loader,
   tidak perlu fetch atau state loading di runner. Loading rute ditangani
   secara terpisah oleh App Router.
b. `Runner.tsx` — satu komponen client. Node aktif + riwayat pesan + deck kanan.
   `message` → tampil. `choice` → tombol. `ending` → layar akhir.
c. Dua meter: `panic` (naik saat pilihan salah) dan `intrusion` (naik tiap detik
   di node keputusan dan alat sampai perangkat diisolasi). Satu `useEffect`
   untuk interval, `clearInterval` di cleanup.
d. Semua layar akhir, termasuk gagal: `debrief[]` empat kalimat + tombol
   "Ulangi simulasi", "Semua simulasi", Belajar 10, dan Darurat.

Itu sudah mainable. Baru setelah itu:

e. `tool_task` — tiga tool deck benar-benar mengubah state, bukan tombol "next"
   berkedok: sakelar isolasi, inspektur izin, penyusun laporan.
f. `validate.ts` — cek `next` menggantung, node tak tercapai, `tool` tak
   dideklarasikan, `grades` tidak urut, serta jalur buntu dan unlock alat.
   `catalog.ts` memanggil validator saat modul halaman dimuat, termasuk saat
   build. Tidak ada build step atau dependensi baru.

## 2. Yang saya cut

Ditulis sekarang, bukan Hari 5:

a. **Level 2-4 → cut.** `modus.json` sudah menandainya `scenarioPlanned`
   (L2/L3/L4) dan halaman daftar menampilkannya sebagai `Rencana`. Jujur, tidak
   dimainkan.
b. **Timer 420 detik → cut.** Dua meter sudah cukup menghasilkan tekanan. Timer
   menambah satu angka yang terus turun dan satu jalur gagal lagi.
c. **Grading / skor akhir → cut.** Yang diingat juri adalah debrief, bukan
   angka. Tidak ada `scoring.weights` yang dipakai.
d. **Ketiga `tool_task` selesai.** Isolasi menghentikan intrusi, pemeriksaan
   izin mewajibkan pencabutan SMS dan aksesibilitas satu per satu, dan laporan
   mewajibkan pemilihan setidaknya satu bukti aman.
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
   **tetap lanjut** sampai ambang gagal; pada ambang itu, penjelasan tetap
   terlihat bersama debrief.
c. Kedua meter bergerak: panic naik saat salah, intrusion naik sambil menunggu
   di node keputusan dan alat sebelum isolasi. Intrusi berhenti setelah
   isolasi, saat gagal, selesai, reset, dan unmount.
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
   component yang membaca katalog skenario tervalidasi. Daftar rencana tetap
   berasal dari `modus.json`.
d. Komponen memakai primitive shadcn yang sudah ada (`Card`, `Button`, `Badge`,
   `Progress`, `Alert`, `Empty`). Tidak ada markup sendiri, tidak ada warna
   hardcoded — `bg-safe` / `bg-warn` / `bg-danger`.

## Pemeriksaan dan demo

Jalur browser yang diperiksa pada 380px dan desktop 1280px: daftar → Level 1
→ pilihan → tiga alat → selesai → ulangi, serta dua pilihan berisiko → gagal.
Pemeriksaan mencakup lebar dokumen, satu landmark main, target tombol minimal
44px, dan error runtime. Shell sempat memotong tautan Simulasi pada 380px;
perubahan kecil di `site-nav.tsx` membuat navigasi membungkus ke baris kedua.
Pengecualian batas stream D ini diumumkan sebelum penyuntingan.

Hasil verifikasi 5 November 2026: `npm run verify` lulus (typecheck, Biome,
48 tes dalam 6 suite, dan build produksi). Skenario L1 diprerender oleh build;
ID skenario yang belum tersedia mengarah ke 404, bukan memutar L1 diam-diam.
`loading.tsx` memberikan batas Suspense bagi pembacaan parameter rute agar
navigasi juga bersih dari diagnostik Next.js tentang instant shell.

Skrip demo sekitar 90 detik:

1. Buka `/simulasi` dan pilih **Mulai latihan**. Jelaskan bahwa ini perangkat
   fiktif, sehingga tidak ada file yang dipasang atau laporan yang dikirim.
2. Klik **Lanjut**, tunggu beberapa detik untuk memperlihatkan intrusi yang
   bergerak, lalu pilih memasang APK agar rationale dan kenaikan panik terlihat.
3. Aktifkan mode pesawat; tunjukkan bahwa intrusi berhenti. Cabut kedua izin
   dan lanjutkan ke permintaan OTP.
4. Tolak permintaan OTP. Pilih bukti, siapkan laporan, lalu baca empat kalimat
   debrief dan tinjauan pilihan berisiko. Akhir ini tidak mengklaim semua
   keputusan pemain aman.
5. Tunjukkan tautan Belajar 10 dan Darurat, lalu **Ulangi simulasi** untuk
   memperlihatkan bahwa meter, izin, bukti, dan status alat kembali bersih.

Uji cadangan: tunggu 50 detik di keputusan pertama untuk kegagalan intrusi;
atau pilih memasang APK lalu mengirim OTP untuk kegagalan panik. Keduanya
tetap menampilkan empat kalimat debrief dan pilihan mengulangi latihan.
