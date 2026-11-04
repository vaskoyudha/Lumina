# Stream A — Companion

Nama: Vasco · Stream: A · Tanggal: 4 November 2026

## 1. Versi terkecil yang jalan end to end

Tempel teks di `/companion` → `scoreText()` mengembalikan `ScoreResult` →
kartu hasil muncul di aliran dengan skor, alasan yang mengutip pesan, saran
berurutan, dan tautan ke modul terkait. **Sudah jalan** hari ini; sisa kerja
adalah percakapan, bukan jalur itu.

Jalur terpendek, dalam urutan yang sudah dibangun:

a. `modus.json` → 12 modus, tervalidasi `zod`. Membuka jalan B.
b. `message.ts` → sinyal pertama dengan kutipan. CLI-only, tanpa UI.
c. `score.ts` → `ScoreResult` valid, invarian diuji.
d. Panel bukti kanan → mengisi dari `signals[].agent`, agent belum jadi
   ditandai `belum aktif`.
e. Kartu hasil di aliran → skor, kutipan, saran, handoff ke B.
f. `link.ts` → sinyal tautan.

## 2. Yang saya cut

Ditulis sekarang, bukan hari keenam:

a. **LLM → cut, pakai template.** Kalau hari ke-4 belum stabil, companion
   memakai balasan template. Deteksi tetap penuh; hanya bahasanya yang kaku.
b. **Identity Agent (SPF/DKIM/DMARC) → cut** kalau tidak selesai hari ke-4.
   `signals` tidak akan memuat temuan identitas, dan panel menandainya
   `belum aktif`. Kejujuran lebih murah daripada karangan.
c. **Conversation Agent → cut.** Eskalasi tetap ada sebagai aturan di
   `score.ts` (`hardOverride` + `advice`), bukan sebagai agent terpisah.
d. **Learning Agent → cut.** Handoff ke B memakai `relatedModule` dari
   klasifikasi modus, bukan dari riwayat kesalahan.
e. **`/belajar?modul=N` → diganti `/belajar/[modul]`.** Rencana menyebut query
   param; rute dinamis lebih murah dan statis. Sudah diberitahukan.

## 3. Yang saya butuh (nama, apa, tanggal)

a. **D · EvidenceBundle → PDF.** Saya kirim bentuk `EvidenceBundle` (boleh
   hardcoded) **6 November**. D memakainya untuk template PDF. Tiga handoff
   resmi, tidak lebih.
b. **B · `modul` numbering tetap.** Saya mengirim `relatedModule` sebagai
   nomor 1..12 dari `modus.json`. Kalau B memakai slug, beri tahu sebelum
   commit — kontraknya berubah.
c. **Tidak ada dari stream lain.** Semua kebutuhan A sudah tersedia.

### Keputusan terbuka milik A (bukan blocker tim)

**Privasi LLM** (§11.7): apakah teks pengguna ikut dikirim ke model. Ini milik
Stream A, diputuskan sebelum lapisan percakapan ditulis. Tiga pilihan:

| Opsi | Yang dikirim | Konsekuensi |
|---|---|---|
| a. sinyal saja | label + bobot + id modus | janji proposal utuh; balasan lebih datar |
| b. teks pesan | pesan mentah + pemberitahuan | demo lebih hidup; klaim privasi harus diucapkan ulang |
| c. tanpa LLM | tidak ada | janji utuh; balasan template |

Belum diputuskan.

## 4. Selesai berarti

Bisa diperiksa orang lain tanpa bertanya:

a. `npm run verify` lulus — typecheck, lint, test, build.
b. Tes `score.test.ts` membuktikan: `signals` tidak pernah kosong, urut bobot,
   OTP memaksa `tinggi`, kutipan berasal dari input, dan analisis < 2 detik
   tanpa jaringan.
c. Tiga contoh §11.6 menghasilkan `risk` yang benar dari tombol "coba contoh",
   dan tautan modul menuju nomor yang benar.
d. Panel bukti menampilkan jumlah temuan nyata per agent, dan menandai agent
   yang belum dibangun sebagai `belum aktif` — bukan angka palsu.
e. Di lebar 380px, form + kartu hasil + panel tidak menghasilkan scroll
   horizontal.

## Batas

Saya tidak mengerjakan: isi modul, runner simulasi, PDF, navigasi. Tombol ke
halaman lain cukup `href`; halaman tujuannya bukan urusan saya.

## Catatan kontrak yang harus diumumkan

a. Token hijau dinamai `--lumina-safe`, bukan `--accent` — shadcn sudah memakai
   `--accent` untuk hover netral. Nilai identik.
b. `ScoreResult.hardOverride: boolean` ditambahkan agar UI bisa menjelaskan
   override OTP tanpa menghitung ulang skor.
c. `Signal.agent?: AgentId` ditambahkan agar panel bukti bisa mengelompokkan
   temuan per agent.
d. Contoh 2 (§11.6) terukur **85/100**, bukan 88. Klaim di presentasi mengikuti
   hasil ukur.