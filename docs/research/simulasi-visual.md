# Arah visual simulasi: satu sistem dengan produk

Awalnya area simulasi memakai pulau tema sendiri — latar kertas krem, tinta
plum, aksen koral/mint/lilac, garis tebal, dan bayangan bergeser — dengan
argumen bahwa permainan boleh keluar dari aturan visual proyek. Arah itu
dicabut. `/simulasi` sekarang memakai sistem desain produk yang sama dengan
`/belajar` dan `/companion`: token `--lumina-*`, kelas `--appnext-*` untuk
tipografi dan bentuk, serta primitive shadcn/ui. Logika permainan, ID rute,
kontrak antar-stream, isi skenario, dan salinan teks tidak berubah.

## Bahasa visual

- Permukaan putih di atas ground `bg-bg`; tidak ada lagi latar bertitik atau
  palet `--sim-*`. Semua warna lewat token, tidak ada hex literal.
- Tipografi memakai skala AppNext (`.appnext-caption`, `h1`, `h2`) dan
  `.appnext-lead`; angka meter memakai `.tabular`.
- Kartu memakai `Card` shadcn dengan radius `--appnext-r-card` dan satu lapis
  elevasi `--appnext-shadow-ambient`; cincin bawaan shadcn dimatikan oleh
  `.appnext`, jadi tidak ada kartu bergaris ganda.
- Tombol memakai `Button` shadcn: aksi utama pill `--appnext-accent-deep`,
  aksi sekunder `variant="outline"`, dan label yang membungkus tetap
  `min-h-11` agar target sentuh 44px terjaga.
- Briefing disusun dua kolom di layar lebar: narasi misi di kiri, pemilih mode
  (tombol `aria-pressed`) dan tombol mulai di kanan dalam blok `bg-panel-2`.
- Percakapan tetap berbentuk gelembung, tetapi memakai radius sudut asimetris
  yang lebih sederhana, `bg-panel-2` untuk ground transkrip, dan
  `--appnext-accent-wash` untuk balasan pemain. Lampiran memakai catatan
  datar di dalam gelembung, bukan Alert bersarang.
- Panel alat, status perangkat, dan koleksi taktik memakai `Card` yang sama;
  tidak ada lagi panel bergaya tiket atau kartu koleksi.
- Akhir misi memakai `Badge` untuk status dan `Alert` untuk penjelasan pilihan
  berisiko, dengan aksi berbentuk pill yang konsisten.
- Kemajuan babak tampil sebagai satu baris `Tahap n dari 3` dengan titik status
  (selesai, sekarang, berikutnya), bukan tiga badge setara. Nomornya datang dari
  `chapter` di data skenario, jadi tidak ada progres karangan.
- Halaman akhir dibatasi `max-w-3xl` agar paragraf debrief dan daftar empat
  pelajaran tidak melebar sampai ~140 karakter per baris di layar 1280px.

## Struktur berkas

```
src/app/(app)/simulasi/
├── layout.tsx          pass-through; tidak ada tema lokal
├── page.tsx            daftar misi + level yang masih "Rencana"
└── [id]/
    ├── page.tsx        header misi + Runner
    ├── loading.tsx     skeleton memakai Card + Skeleton
    └── Runner.tsx      alur permainan, shadcn + token
```

Tidak ada lagi `playground.css` maupun `PlaygroundTheme`. `body` tetap hanya
mendapat satu `.appnext` dari `src/app/layout.tsx`, sehingga tidak ada atribut
tema yang perlu dibersihkan saat berpindah rute dan tidak ada remap token
lokal yang bisa bocor.

## Yang sengaja dipertahankan

- Identitas misi datang dari isi, bukan hiasan: judul "Paket sebelum pulang",
  tokoh Raka, dan alur tiga babak.
- Meter Panik dan Intrusi tetap merah/amber dengan tinggi `h-4` agar terbaca
  dari jauh; bahaya tidak dikodekan lewat warna saja — nilai dan label selalu
  tampil sebagai teks.
- Fokus keyboard tetap dipindah ke judul prompt saat pilihan/tugas muncul dan
  ke judul akhir saat misi selesai. Transkrip tetap `role="log"` dan dapat
  difokus untuk digulir.
- Mode `santai` dan `tantangan` tetap tombol dengan `aria-pressed`, bukan
  tautan. Level yang belum jadi tetap ditandai `Rencana` dan tidak bisa
  dimainkan.

## Aset dan asal

- File proyek: `public/simulasi/parcel-playground.png`.
- URL aplikasi: `/simulasi/parcel-playground.png`.
- Format: PNG dengan alpha transparan, 1254 × 1254.
- Dibuat menggunakan tool bawaan `image_gen.imagegen`, bukan CLI/API terpisah.
- Aset asli disimpan pada direktori generated_images Codex; salinannya berada
  di proyek dan dioptimalkan saat disajikan oleh Next Image.
- Aset dekoratif memakai `alt=""` dan `aria-hidden`; informasi permainan tetap
  berupa teks.

Prompt akhir yang dipakai:

> Use case: stylized-concept. Asset type: decorative hero illustration for a joyful Indonesian anti-scam browser game called Lumina, with a cream canvas, deep plum outlines, coral, mint, butter-yellow and lilac accents. Create a premium playful 3D clay / soft vinyl toy still life: a chunky lilac smartphone tilted at a jaunty angle behind a warm coral-and-cream parcel gift box with a mint ribbon, a small friendly mint shield with two simple eyes in the foreground, and a few small rounded chat bubbles and star-shaped paper confetti. The phone screen contains only abstract simple colorful chat shapes, no text, no letters, no numbers, no logos. It should feel like an inviting educational indie game for young adults, not corporate dashboard clipart and not a childish cartoon. Square composition, entire objects visible with generous breathing room, soft studio light from upper left, soft contact shadows, rounded sculptural forms, tactile matte surfaces. Objects form one cohesive clustered composition suitable to sit in the right half of a website hero. Background genuinely transparent. No surrounding UI layout, no watermark.

Ilustrasi tetap dipakai sebagai gambar hero, tetapi gayanya sekarang menjadi
satu-satunya jejak "playful" di halaman; sisanya mengikuti sistem.

## Pemeriksaan

Browser diperiksa pada viewport 380px dan 1280px, termasuk halaman daftar,
briefing, ketiga akhir, jeda, dan panel alat. Tidak ada scroll horizontal;
kontrol utama minimal 44px. Responsivitas dan keterbacaan diperiksa lewat
screenshot nyata, bukan hanya deklarasi class.

Verifikasi akhir: `npm run verify` (typecheck, Biome, seluruh tes Jest, dan
build produksi).
