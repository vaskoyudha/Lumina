# Arah visual simulasi: papan permainan

Pemilik stream C meminta penggantian UI yang masih terlalu datar dan secara
eksplisit mengesampingkan aturan visual Markdown proyek untuk area simulasi.
Arah ini berlaku pada `/simulasi` beserta turunannya. Semua logika permainan,
ID rute, kontrak antar-stream, dan isi skenario tetap.

## Bahasa visual

- Latar kertas krem dengan titik kecil, tinta plum, serta aksen koral, mint,
  lilac, dan kuning.
- Judul berukuran besar dengan potongan warna miring seperti stiker.
- Tombol taktil dengan garis tegas dan bayangan bergeser saat ditekan.
- Ilustrasi ponsel, hadiah, dan perisai berbahan clay untuk halaman misi.
- Briefing berbentuk dua tiket mode; percakapan memakai bingkai ponsel,
  gelembung berwarna, dan pilihan dengan penanda A/B/C.
- Alat memakai warna mint; kartu taktik seperti kartu koleksi; hasil misi
  mendapat bidang warna yang berbeda sesuai akhir cerita.

Implementasi terisolasi di `src/app/simulasi/playground.css` dan layout rute.
Komponen `PlaygroundTheme` memasang atribut tema pada body selama layout
simulasi aktif, lalu membersihkannya saat keluar. Ini juga menjaga tema tidak
bocor lewat rute lama yang tetap berada di cache DOM Next.js. Navigasi/footer
hanya berubah warna saat simulasi aktif; file shell tidak diubah.
Palet berada pada variabel `--sim-*`. Semua interaksi tetap memiliki fokus
keyboard, target sentuh, dan alternatif reduced motion.

## Aset dan asal

- File proyek: `public/simulasi/parcel-playground.png`.
- URL aplikasi: `/simulasi/parcel-playground.png`.
- Format: PNG dengan alpha transparan, 1254 × 1254.
- Dibuat menggunakan tool bawaan `image_gen.imagegen`, bukan CLI/API terpisah.
- Aset asli tetap disimpan pada direktori generated_images Codex; salinannya
  berada di proyek dan dioptimalkan saat disajikan oleh Next Image.
- Aset dekoratif menggunakan alt kosong; informasi permainan tetap berupa teks.

Prompt akhir yang dipakai:

> Use case: stylized-concept. Asset type: decorative hero illustration for a joyful Indonesian anti-scam browser game called Lumina, with a cream canvas, deep plum outlines, coral, mint, butter-yellow and lilac accents. Create a premium playful 3D clay / soft vinyl toy still life: a chunky lilac smartphone tilted at a jaunty angle behind a warm coral-and-cream parcel gift box with a mint ribbon, a small friendly mint shield with two simple eyes in the foreground, and a few small rounded chat bubbles and star-shaped paper confetti. The phone screen contains only abstract simple colorful chat shapes, no text, no letters, no numbers, no logos. It should feel like an inviting educational indie game for young adults, not corporate dashboard clipart and not a childish cartoon. Square composition, entire objects visible with generous breathing room, soft studio light from upper left, soft contact shadows, rounded sculptural forms, tactile matte surfaces. Objects form one cohesive clustered composition suitable to sit in the right half of a website hero. Background genuinely transparent. No surrounding UI layout, no watermark.

## Pemeriksaan

Pemeriksaan browser menggunakan viewport 380px dan 1280px, termasuk halaman
misi, briefing, ketiga akhir, jeda, serta alat. Tidak ada scroll horizontal;
kontrol utama minimal 44px. Responsivitas dan keterbacaan diperiksa melalui
screenshot nyata, bukan hanya deklarasi class. Tes perilaku yang sudah ada
menjaga alur tetap sama selama penggantian tampilan.

Verifikasi akhir: `npm run verify` lulus (57 tes dalam 6 suite, TypeScript,
Biome, dan build produksi). Pengujian perpindahan halaman lewat Link juga
memastikan body kembali gelap pada Companion setelah meninggalkan simulasi,
meskipun layout simulasi lama tetap tersimpan dalam cache DOM Next.js.
