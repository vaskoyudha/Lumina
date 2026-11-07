# Panel bukti — grafik alur agen (rencana)

Nama: Vasco · Stream: A · Tanggal: 7 November 2026

Rencana ini hanya menyentuh `src/components/companion/signal-panel.tsx` dan satu
sumber data di `companion-chat.tsx`. Tidak ada kode ditulis sebelum disetujui.

## 0. Masalah yang diukur, bukan dikira

Diukur di 1440px, state kosong, kanvas 367px (ril kiri 60 + rail bukti 396):

| Objek | Nilai nyata | Akibat |
|---|---|---|
| `FanOut` svg | `viewBox 0 0 320 44`, kotak 367×44 | `sx = 1.147`, `sy = 1` → garis tidak pernah sampai titik port |
| Ujung kabel fan-out | x = 36…284 (viewBox) → 41…326 px | titik masuk kartu ada di x = 16, keluar di 354 → selisih 25–28 px |
| `RootNode` | tidak punya port keluaran | asal `M 296 0` menggantung di udara |
| Spines `BranchList` | x = 4 dan 362 | tidak menyentuh port mana pun (16 / 354) |
| `Convergence` | `M 310 0 … 160 34` tetap | ujungnya bukan port sintesis yang sebenarnya |
| `scale(zoom/100)` | 85–115% | stroke 1.4px jadi 1.19–1.61px, kabur |

Dua sistem konektor hidup berdampingan: kurva SVG dengan angka ajaib, dan garis
CSS `left-1`/`right-1` di `BranchList` — keduanya tidak pernah bertemu. Referensi
(`cortex_ui.tsx` L2008–2200) boleh memakai angka tetap karena ia menggambar
tepat 4 cabang di posisi tetap; kita punya 5 agen + sintesis + voice, jadi
geometri harus **diturunkan dari DOM**, bukan dari `320`.

Cacat kedua, lebih besar: `latestCheck` (`companion-chat.tsx:209`) hanya
mengambil turn yang sudah punya `result`. Turn yang sedang streaming — satu-
satunya yang membawa `trace` dengan stage `voice: "berjalan"` — tidak pernah
sampai ke panel. Jadi saat AI benar-benar memeriksa, grafik tetap menampilkan
keadaan kosong atau hasil lama. Grafik tidak "hidup" karena datanya tidak
dikirim, bukan karena animasinya kurang.

## 1. Versi terkecil yang jalan end to end

a. **Satu sistem konektor, jangkar diukur.** Buang `BranchList` spines, angka
   `320`, `296`, `36`, `248`, dan path `Convergence` tetap. Ganti dengan satu
   `<svg>` overlay `absolute inset-0` di dalam kanvas yang sudah di-`scale`.
   `viewBox` = ukuran kanvas nyata (`offsetWidth × offsetHeight`); koordinat
   setiap kabel diambil dari `offsetLeft/Top` port sungguhan, jadi `scale()`
   tidak pernah menggeser sambungan.

b. **Port menjadi kontrak DOM.** Setiap node memasang `data-node` dan port
   `data-port="in" | "out"`. Hook `useGraphWires(canvasRef)` membaca
   `[data-port]`, mengukur ulang lewat `ResizeObserver` + `useLayoutEffect`,
   dan menghasilkan daftar kabel. Tidak ada angka posisi di dalam JSX.

c. **Akar punya port keluaran.** `RootNode` mendapat dot + batang pendek di
   tengah bawah; semua kabel fan-out berangkat dari titik itu (trunk bersama
   ±8px, lalu menyebar), sehingga lima kurva tidak bertaut di satu titik.

d. **Konvergensi dari port nyata.** Setiap kartu punya `data-port="out"` di
   kanan; sintesis punya `data-port="in"` di atas. Kabel keluar→sintesis
   memakai kurva yang sama, jadi tidak ada lagi spine kanan yang tidak nyambung.

e. **Node voice.** Stage `voice` sudah ada di trace tapi tidak pernah digambar
   (grepping `signal-panel.tsx`: tidak ada `voice`). Tambah node terminal
   `Q{6+n}` "Penyusun bahasa" di bawah sintesis, dengan statusnya sendiri —
   inilah satu-satunya stage yang benar-benar `berjalan` saat AI menulis
   jawaban, jadi grafik punya sesuatu yang jujur untuk dinyalakan.

f. **Data hidup sampai ke panel.** Di `companion-chat.tsx`, tambah memo
   `liveCheck` yang mengambil turn streaming terakhir yang punya `trace`, dan
   kirim `trace` itu + `running` ke `SignalPanel` selama `busy`. Panel memakai
   hasil sungguhan dari detektor (sudah selesai) + voice `berjalan`. Tidak ada
   progres palsu per agen: detektor memang berjalan sinkron, jadi yang boleh
   tampak "sedang berjalan" hanya stage yang trace-nya memang `berjalan`.

## 2. Yang saya cut

a. **Drag / sambung-titik manual → cut.** Ini penggambar alur, bukan editor
   graf. User menyeret node bukan jalur yang dipakai siapa pun.
b. **Animasi "marching ants" di semua kabel → cut.** Satu jalur aktif dengan
   `animate-pulse` (keyframe bawaan) cukup; keyframe baru berarti menyentuh
   `globals.css` milik D untuk hiasan.
c. **Reveal berurutan per agen saat memeriksa → cut, karena tidak jujur.**
   `scoreWithTrace` selesai dalam satu lintasan; menampilkan agen menyala satu
   per satu berarti mengarang waktu yang tidak ada.
d. **Label baru di kontrak `AgentTrace` → cut.** Semua status yang dibutuhkan
   (`berjalan`, `dilewati`, `gagal`, `temuan`, `selesai`) sudah ada di
   `src/lib/contracts/agent-run.ts`. Kontrak tetap beku.
e. **Nomor ulang `Q4…Qn` → cut.** Penomoran yang ada sudah dipakai tes dan
   judul; voice memakai nomor berikutnya, bukan menomori ulang.

## 3. Yang saya butuh (nama, apa, tanggal)

| Dari | Apa | Tanggal |
|---|---|---|
| D | Konfirmasi tidak ada token/keyframe baru di `globals.css`; semua warna memakai `--lumina-brand-*` yang sudah ada | 7 Nov |
| B, C | Tidak tersentuh — tidak ada perubahan rute atau konten | — |

## 4. Selesai berarti

a. Di 1440px dan 380px, setiap ujung kabel berada ≤1px dari pusat port yang
   dituju, diukur lewat skrip CDP (`getBoundingClientRect` relatif kanvas),
   bukan dilihat mata.
b. Zoom 85% dan 115% tidak mengubah ketebalan garis (`vector-effect:
   non-scaling-stroke`); tidak ada ujung kabel yang bergeser.
c. Tidak ada garis CSS kedua di `BranchList`; hanya satu sistem kabel, dan
   `RootNode` punya port keluaran yang terlihat.
d. Lima cabang + sintesis + voice tergambar tanpa kurva bersilangan atau
   simpul; `data-port` tiap node unik.
e. Saat memeriksa: node dengan `status: "berjalan"` memasang `data-live="true"`,
   kabelnya 2.2px/opacity 1 + `motion-safe:animate-pulse`, dot-nya `animate-ping`;
   `prefers-reduced-motion` mematikan denyut, bukan statusnya. Tes baru
   membuktikan `data-live` muncul hanya untuk stage berjalan.
f. Status `dilewati` tetap putus-putus dan menyimpan alasannya; `gagal` memakai
   warna danger; tidak ada kabel yang menyala hanya karena node itu ada.
g. `npx tsc --noEmit` 0 error, Biome bersih, `NODE_ENV=test npx jest
   src/components/companion` hijau (55 tes lama + tes baru), `npm run verify`
   lulus.

## 5. Urutan kerja

1. `signal-panel.tsx`: tambah `NodeStatus "live"`, label `Berjalan`, `data-node`
   + `data-port` pada `RootNode`, `AgentNode`, sintesis, `EntryPort`, voice.
2. Hook `useGraphWires` (file lokal di komponen yang sama, tanpa dependensi
   baru): ukur port, hasilkan `{d, active, muted}` per kabel.
3. Hapus `FanOut`, `Convergence`, dan dua spine `BranchList`; ganti dengan
   overlay `<svg>` + `vector-effect="non-scaling-stroke"`.
4. Tambah node voice + cabang `berjalan` pada turunan `nodes`.
5. `companion-chat.tsx`: `liveCheck` memo + prop `running`; subtitle header
   "Pemeriksaan sedang berjalan" saat hidup.
6. Ukur ulang lewat CDP di 1440/380, zoom 85/115, dan satu tangkapan layar
   saat voice masih `berjalan`.

## Batas

Tidak menyentuh `src/components/ui/*`, `src/lib/contracts/*`,
`src/lib/scoring/*`, `globals.css`, rute, atau konten stream B/C. Tidak ada
dependensi baru. Tidak ada perubahan pada kabel data jaringan; semua keadaan
grafik berasal dari `AgentTrace` yang sudah beku.
