import type { ModuleContent } from "@/data/modul-schema";

/**
 * Modul 11 — Quishing QRIS & QR palsu. `modus.json` records OJK's warning
 * instead of a complaint count, so no number is invented here. The example is
 * a payment chat; the tell is the recipient name on the QRIS confirmation.
 */

export const MODUL_11 = {
  no: 11,
  ringkasan:
    "Stiker QRIS palsu ditempel di atas QRIS asli di meja kasir atau tempat umum. Korban memindai tanpa memeriksa nama penerima, dana masuk ke rekening pelaku, dan merchant tidak pernah menerima pembayaran.",
  tujuan: [
    "Membaca nama penerima pada konfirmasi QRIS sebelum membayar.",
    "Mengenali stiker QRIS yang ditimpa atau ditempel ulang.",
    "Memastikan pembayaran sampai ke merchant yang benar.",
  ],
  poinKunci: [
    "Nama penerima di layar konfirmasi harus cocok dengan nama merchant.",
    "Stiker yang mudah mengelupas atau ditempel di atas stiker lain patut dicurigai.",
    "Merchant tidak pernah meminta transfer ke rekening pribadi sebagai ganti QRIS.",
    "Simpan bukti transaksi dan laporkan ke penyedia QRIS serta bank.",
  ],
  estimasiMenit: 7,
  anatomi: [
    {
      judul: "QRIS asli ditimpa atau ditempel ulang",
      teks: "Pelaku menempelkan stiker QRIS baru di atas kode asli. Dari luar tampak seperti QRIS biasa, tetapi arah pembayarannya sudah dialihkan.",
    },
    {
      judul: "Korban memindai tanpa memeriksa nama penerima",
      teks: "Layar konfirmasi menampilkan nama penerima, tetapi banyak orang langsung menekan bayar. Nama yang tidak cocok dengan merchant adalah satu-satunya peringatan yang muncul.",
    },
    {
      judul: "Dana masuk ke rekening pelaku",
      teks: "Pembayaran diterima oleh rekening yang terdaftar pada QRIS palsu, bukan rekening merchant. Uang berpindah dalam hitungan detik.",
    },
    {
      judul: "Merchant tidak menerima pembayaran",
      teks: "Kasir tetap menagih karena sistemnya tidak mencatat transaksi. Korban sudah membayar dua kali atau berselisih tanpa bukti yang jelas.",
    },
    {
      judul: "Pelaku memindahkan dana dengan cepat",
      teks: "Dana diteruskan ke rekening lain sebelum dilaporkan. Karena itu, bukti transaksi dan nama penerima harus disimpan segera setelah pembayaran.",
    },
  ],
  contohJudul:
    "Contoh pembayaran QRIS (dianonimkan) — bagian merah yang berbahaya",
  contohJenis: "pesan",
  contohSumber: "Stiker QRIS di meja kasir · nama penerima tidak sesuai",
  contohIsi: [
    { text: "Scan QRIS ini untuk bayar. ", berbahaya: false },
    {
      text: "Nama penerima: TOKO MAJU JAYA, bukan nama merchant yang kamu lihat. ",
      berbahaya: true,
    },
    { text: "Konfirmasi pembayaran sekarang.", berbahaya: false },
  ],
  checklist: [
    "Nama penerima pada konfirmasi tidak cocok dengan nama merchant",
    "Stiker QRIS ditempel di atas stiker lain atau mudah terkelupas",
    "Nominal tidak muncul otomatis dan diminta mengetik manual",
    "Merchant tidak mengenali kode QRIS yang kamu pindai",
    "Diminta buru-buru menyelesaikan pembayaran tanpa memeriksa layar",
  ],
  kuis: [
    {
      id: "qris-q1",
      prompt:
        "Layar konfirmasi QRIS menampilkan nama penerima yang berbeda dari nama toko. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Tetap bayar karena QRIS ada di meja kasir" },
        {
          id: "b",
          label: "Batalkan pembayaran dan tanyakan langsung ke kasir",
        },
        { id: "c", label: "Bayar lalu tunjukkan bukti ke kasir" },
      ],
      correctId: "b",
      rationale:
        "Nama penerima adalah pemeriksaan utama pada QRIS. Membatalkan sebelum membayar mencegah dana masuk ke rekening pelaku.",
    },
    {
      id: "qris-q2",
      prompt:
        "Stiker QRIS di meja terlihat ditempel di atas stiker lama. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Pindai saja, semua QRIS sama" },
        {
          id: "b",
          label: "Jangan pindai; minta kasir menunjukkan QRIS resmi",
        },
        { id: "c", label: "Pindai lalu periksa nama setelah membayar" },
      ],
      correctId: "b",
      rationale:
        "Stiker yang ditimpa adalah cara paling umum menyisipkan QRIS palsu. Memeriksa setelah membayar sudah terlambat karena dana langsung berpindah.",
    },
    {
      id: "qris-q3",
      prompt:
        "Kasir meminta kamu transfer ke rekening pribadi karena QRIS sedang bermasalah. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Transfer karena kasirnya yang meminta" },
        {
          id: "b",
          label:
            "Minta QRIS resmi atau bayar tunai, jangan ke rekening pribadi",
        },
        { id: "c", label: "Transfer lalu minta struk manual" },
      ],
      correctId: "b",
      rationale:
        "Pembayaran resmi tidak dialihkan ke rekening pribadi tanpa alasan yang bisa diverifikasi. Minta kanal resmi atau bayar tunai di tempat.",
    },
    {
      id: "qris-q4",
      prompt:
        "Kamu sudah membayar dan kasir bilang pembayaran tidak masuk. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Simpan bukti dan nama penerima, lalu hubungi penyedia QRIS dan bank",
        },
        { id: "b", label: "Bayar lagi supaya tidak menghambat antrean" },
        { id: "c", label: "Tinggalkan tempat tanpa bukti" },
      ],
      correctId: "a",
      rationale:
        "Bukti transaksi dan nama penerima adalah dasar sengketa. Membayar lagi tanpa menyimpan bukti membuat kerugian bertambah tanpa jejak.",
    },
    {
      id: "qris-q5",
      prompt:
        "Kamu menemukan QRIS palsu di tempat umum. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Laporkan ke merchant, penyedia QRIS, dan bank; jangan pindai lagi",
        },
        { id: "b", label: "Pindai untuk melihat siapa penerimanya" },
        { id: "c", label: "Diamkan karena bukan uangmu" },
      ],
      correctId: "a",
      rationale:
        "Melapor membantu merchant mencabut kode palsu dan mencegah korban berikutnya. Memindai hanya untuk memeriksa tetap berisiko membuka halaman pembayaran.",
    },
  ],
  lapor: [
    "Batalkan pembayaran bila nama penerima belum cocok; jangan menekan bayar.",
    "Simpan tangkapan layar konfirmasi, nama penerima, dan bukti transaksi.",
    "Laporkan ke merchant dan penyedia QRIS agar kode palsu dicabut.",
    "Hubungi bank penerima dan laporkan ke IASC bila dana sudah berpindah.",
  ],
  scenarioId: null,
} satisfies ModuleContent;
