# Stream C — Simulasi FIRST90

Pemilik: Person 3 / C. Diperbarui 5 November 2026.
Branch kerja: `feat/stream-c-runner`.

Sumber produk tetap `docs/plan.md`. Arahan terbaru pemilik: perdalam pengalaman
simulasi agar menarik dan dapat menjadi acuan visual bagi permukaan lain.
Riset dan alasan desain ada di [catatan riset](../research/simulasi.md).

## 1. Versi terkecil yang berjalan dari awal sampai akhir

Satu misi publik: `/simulasi/L1-kurir-apk`, berjudul **Paket sebelum pulang**.
Pemain menjadi Raka, yang menunggu hadiah ulang tahun Ibu dan menerima pesan
kurir. Tujuannya memeriksa kabar paket tanpa menyerahkan kendali perangkat.

Alur yang dibangun:

1. Briefing dengan tujuan, perkiraan waktu membaca, serta mode Santai/Tantangan.
2. Percakapan bertahap, pemeriksaan lampiran fiktif, dan keputusan bercabang.
3. Verifikasi mandiri menghasilkan jalur pencegahan. Memasang APK fiktif membuka
   jalur pemulihan, termasuk isolasi dan pencabutan dua izin sensitif.
4. Bukti memerlukan setidaknya dua item aman. Kode OTP/PIN tidak boleh masuk.
5. Tiga akhir yang berbeda: pencegahan, awal pemulihan, dan kode dibagikan.
   Semua akhir memiliki empat poin debrief, jejak keputusan, dan replay.
6. Kartu taktik menghubungkan kutipan pesan dengan manipulasi yang dialami.

Panik merespons pilihan; Tarik napas mengurangi panik sekali per putaran.
Intrusi berbasis waktu hanya berjalan pada mode Tantangan setelah aplikasi dan
izin sensitif aktif, sampai koneksi diputus. Jeda menghentikan gameplay dan
pengatur waktu; berpindah tab juga menjeda. Meter adalah mekanik fiktif,
bukan hasil pemindaian perangkat nyata.

## 2. Yang dicut dan batas

- Level 2–4 tetap **Rencana**, tanpa tautan bermain.
- Hitung mundur total, grading, ranking, dan skor akhir dicut.
- Tidak ada akun, database, persistensi, upload, LLM, atau dependensi baru.
- Sumber FIRST90 vanilla belum tersedia pada mesin; misi dibangun dari skema
  kontrak yang diizinkan sebagai fallback oleh rencana produk.
- Isolasi dan izin tidak dijalankan pada jalur yang tidak memasang APK.
- Permukaan lain dan token global tidak diubah untuk mendukung desain baru.

Yang wajib tetap ada: rationale langsung, alat yang mengubah state, empat
kalimat debrief pada akhir biasa maupun kegagalan, reset bersih, dan akses
Belajar/Darurat. Mencabut izin tidak diklaim menjamin perangkat sudah bersih.

## 3. Kebutuhan dan handoff

| Dari | Kebutuhan | Status |
|---|---|---|
| A | `modus.json` nomor 10 menunjuk `L1-kurir-apk` | Tersedia |
| B | Modul 10 dan handoff dari modul ke simulasi | Rute tersedia; isi modul masih milik B |
| D | Token dan shell | Tersedia |

ID rute tetap sama sehingga handoff stream lain tidak berubah. Kontrak di
`src/lib/contracts/` tidak disentuh. Ekstensi skema internal stream C mencakup
bab, penundaan pesan, lampiran, taktik, efek pemasangan/kode, dan varian akhir.
Bentuk baru ada di `src/lib/simulasi/scenario.ts`, tetap data TypeScript lokal.

## 4. Kriteria selesai

- Misi dapat diselesaikan lewat jalur aman, pemulihan, dan kode dibagikan.
- Pilihan sungguh mengubah cerita dan akhir, tidak sekadar warna tombol.
- Intrusi tidak berjalan hanya karena membaca pesan, serta berhenti pada
  Santai, jeda, isolasi, akhir, reset, dan unmount.
- Kedua izin wajib dicabut pada jalur pemasangan; bukti wajib dua item aman.
- Pesan dan feedback tetap dapat dibaca; animasi bisa dilewati dan menghormati
  reduced motion; semua kontrol dapat dioperasikan lewat keyboard.
- Pada 380px, HUD berada sebelum cerita, kontrol minimal 44px, tidak ada scroll
  horizontal, dan alat aktif mudah ditemukan.
- Validator menolak graph putus, node tak tercapai, unlock salah, jalur buntu,
  HUD tidak valid, serta data presentasi baru yang tidak valid.
- `npm run verify` lulus dan browser tidak menunjukkan error runtime/Next.js.

`catalog.ts` memvalidasi semua skenario pada evaluasi modul halaman sehingga
skenario rusak juga menggagalkan build. `loading.tsx` menjadi batas Suspense
untuk parameter rute. Semua callback pesan memiliki identitas node dan cleanup
agar tidak menjalankan adegan berikutnya dua kali.

## 5. Delegasi

Pemanggilan `collaboration.spawn_agent` awal menggunakan parameter berikut;
putaran perbaikan menggunakan `followup_task` pada agent yang sama:

| Agent | Model yang diminta | Bagian |
|---|---|---|
| `/root/runner` | `gpt-6.1-terra` | Runner, state machine, alat, dan akhir |
| `/root/validator` | `gpt-6-luna` | Validator, pengujian data, serta audit state |
| `/root/pages` | `gpt-6-luna` | Halaman daftar/detail dan tes UI |

Orchestrator meneliti sumber, menulis cerita, mengintegrasikan hasil, dan menguji
browser. Model yang tercantum adalah parameter tool; riwayat pemanggilan dan
balasan di percakapan menjadi jejak pelaksanaan.

## 6. Demo dan pemeriksaan manusia

Skrip sekitar 90 detik untuk menunjukkan mekanik (durasi membaca normal
3–5 menit masih berupa perkiraan):

1. Pilih Tantangan dan mulai misi. Periksa lampiran untuk melihat jenis berkas.
2. Pilih bertanya ke pengirim, lalu pasang APK ketika ia mendesak lagi. Tunjukkan
   penjelasan, kartu taktik, serta intrusi yang mulai bergerak setelah akses aktif.
3. Jeda, lanjutkan, kemudian aktifkan mode pesawat. Cabut kedua izin sensitif.
4. Tolak OTP. Coba memasukkan kode rahasia sebagai bukti agar penolakannya
   terlihat, lalu pilih dua bukti aman dan siapkan berkas.
5. Tinjau akhir pemulihan, empat kalimat debrief, jejak keputusan, dan kartu.
6. Coba jalur lain dalam mode Santai: verifikasi lewat aplikasi sendiri,
   hentikan chat, simpan dua bukti. Perlihatkan akhir pencegahan tanpa alat yang
   tidak diperlukan.

Jalur cadangan: pilih membagikan OTP untuk akhir akun yang perlu diamankan.
Mode Tantangan dapat mencapai batas intrusi jika dibiarkan setelah pemasangan.
Latihan lima kali di laptop presentasi dan evaluasi kenyamanan oleh manusia
masih diperlukan; hasil tes otomatis tidak membuktikan game sudah enjoyable.

## 7. Hasil verifikasi implementasi

Verifikasi 5 November 2026: `npm run verify` lulus (TypeScript, Biome,
57 tes dalam 6 suite, dan build produksi). Pengujian browser pada 380px dan
1280px meliputi tiga akhir, jeda, bukti rahasia yang ditolak, serta layout
tanpa scroll horizontal dan tombol minimal 44px. Putaran akhir bersih dari
exception dan error console browser.

Pemeriksaan browser tambahan mencakup reduced motion, fokus dan pengguliran
transkrip lewat keyboard, gelembung chat yang tidak memotong isi, jeda saat tab
disembunyikan, serta briefing yang tidak menjeda permainan sebelum mulai.
Skenario masih diprerender pada rute publik yang sama.
