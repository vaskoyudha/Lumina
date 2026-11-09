import type { ModuleContent } from "@/data/modul-schema";

/**
 * Modul 1 — Jual-beli online palsu. Facts come from `modus.json` (53.928
 * laporan IASC, ±Rp988 M). The example is a fake storefront, because this
 * scheme hides its danger in a checkout page, not only in a chat bubble.
 * Content is anonymised; no real merchant, rekening, or phone number.
 */

export const MODUL_01 = {
  no: 1,
  ringkasan:
    "Toko palsu memakai foto dan ulasan curian, memasang harga jauh di bawah pasar, lalu mengarahkan pembeli keluar marketplace. Setelah DP atau pembayaran penuh masuk ke rekening pribadi, barang tidak pernah dikirim dan penjual memblokir pembeli.",
  tujuan: [
    "Membedakan toko resmi dari toko yang hanya menumpang foto dan ulasan.",
    "Menjelaskan mengapa pembayaran di luar marketplace menghapus perlindungan pembeli.",
    "Menyusun bukti yang berguna saat mengajukan sengketa atau laporan.",
  ],
  poinKunci: [
    "Harga jauh di bawah pasar adalah umpan, bukan keberuntungan.",
    "Rekening pribadi atas nama orang lain adalah tanda berhenti paling jelas.",
    "Marketplace hanya melindungi transaksi yang diselesaikan di dalamnya.",
    "Jangan pernah mengirim biaya tambahan setelah pembayaran pertama gagal.",
  ],
  estimasiMenit: 8,
  anatomi: [
    {
      judul: "Toko dibuat mendadak dengan foto curian",
      teks: "Akun toko baru muncul, foto produk diambil dari penjual lain, dan deskripsi disalin apa adanya. Ulasan bisa dipenuhi akun-akun palsu dengan kalimat yang seragam.",
    },
    {
      judul: "Harga dipotong jauh di bawah pasar",
      teks: "Barang populer ditawarkan setengah harga atau lebih murah. Selisih besar itulah umpan: calon korban dibuat merasa menemukan penawaran langka yang harus segera diambil.",
    },
    {
      judul: "Pembeli diarahkan keluar marketplace",
      teks: "Penjual meminta pindah ke WhatsApp atau menawarkan diskon tambahan bila transaksi dilakukan langsung. Tujuannya satu: keluar dari sistem yang menahan pembayaran sampai barang diterima.",
    },
    {
      judul: "Pembayaran masuk ke rekening pribadi",
      teks: "Korban diminta transfer DP atau harga penuh ke rekening pribadi, kadang atas nama pihak ketiga. Tidak ada escrow, tidak ada penahanan dana, dan tidak ada jalur sengketa yang bisa dipakai.",
    },
    {
      judul: "Barang tidak dikirim dan penjual menghilang",
      teks: "Setelah dana masuk, penjual memblokir nomor korban atau terus meminta biaya tambahan: ongkir, bea, asuransi. Rekening penerima biasanya cepat dikosongkan.",
    },
  ],
  contohJudul:
    "Contoh halaman toko (dianonimkan) — bagian merah yang berbahaya",
  contohJenis: "situs",
  contohSumber: "https://toko-gadget-murah.example/checkout",
  contohIsi: [
    { text: "Toko Resmi Gadget — ponsel flagship hanya ", berbahaya: false },
    { text: "Rp4.999.000, stok terakhir 2 unit", berbahaya: true },
    {
      text: ". Untuk mengunci pesanan, ",
      berbahaya: false,
    },
    {
      text: "transfer DP 50% ke rekening pribadi a.n. A. sebelum barang dikirim",
      berbahaya: true,
    },
    { text: ". Chat admin di WhatsApp untuk konfirmasi.", berbahaya: false },
  ],
  checklist: [
    "Harga jauh di bawah pasaran untuk barang yang sedang dicari banyak orang",
    "Penjual meminta transaksi dipindahkan ke chat pribadi atau di luar marketplace",
    "Rekening tujuan atas nama pribadi, bukan nama badan usaha yang tertera di toko",
    "Toko baru dengan ulasan seragam, singkat, dan tidak menjelaskan pengalaman nyata",
    "Desakan stok terakhir atau DP sekarang untuk menutup celah berpikir",
  ],
  kuis: [
    {
      id: "market-q1",
      prompt:
        "Toko menawarkan ponsel setengah harga dan meminta DP ke rekening pribadi. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Transfer DP cepat sebelum stok habis" },
        { id: "b", label: "Minta nomor rekening toko resmi lalu transfer" },
        {
          id: "c",
          label:
            "Batalkan, cari penjual di marketplace resmi dengan perlindungan pembeli",
        },
      ],
      correctId: "c",
      rationale:
        "Rekening pribadi untuk pembelian toko menghapus perlindungan pembeli. Harga setengah pasar adalah umpan; transaksi aman tetap di dalam marketplace yang menahan dana sampai barang diterima.",
    },
    {
      id: "market-q2",
      prompt:
        "Penjual meminta pindah ke WhatsApp agar katanya lebih cepat. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Pindah ke WhatsApp dan lanjutkan transaksi" },
        {
          id: "b",
          label: "Tetap di marketplace dan selesaikan pembayaran di sana",
        },
        { id: "c", label: "Kirim DP lewat WhatsApp supaya dianggap serius" },
      ],
      correctId: "b",
      rationale:
        "Pindah ke chat pribadi memindahkan transaksi keluar dari sistem sengketa. Penjual yang menolak transaksi di marketplace biasanya menolak karena riwayatnya bisa diperiksa.",
    },
    {
      id: "market-q3",
      prompt:
        "Nama rekening penerima berbeda dari nama toko yang kamu lihat. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Tetap transfer, mungkin itu rekening pemilik" },
        { id: "b", label: "Minta transfer ke rekening lain yang juga pribadi" },
        {
          id: "c",
          label: "Berhenti dan laporkan toko ke marketplace sebagai penipuan",
        },
      ],
      correctId: "c",
      rationale:
        "Rekening yang tidak cocok dengan identitas toko adalah tanda paling jelas. Jangan menebak alasannya; hentikan transaksi dan laporkan supaya akun itu diperiksa.",
    },
    {
      id: "market-q4",
      prompt:
        "Kamu sudah transfer DP, lalu penjual meminta biaya ongkir tambahan. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Kirim biaya tambahan agar paket segera dikirim" },
        {
          id: "b",
          label: "Berhenti mengirim uang, simpan bukti, dan ajukan sengketa",
        },
        { id: "c", label: "Negosiasi supaya biaya tambahan dipotong setengah" },
      ],
      correctId: "b",
      rationale:
        "Permintaan biaya berulang setelah pembayaran pertama adalah pola pemerasan bertahap. Setiap transfer tambahan memperbesar kerugian tanpa mendekatkan barang.",
    },
    {
      id: "market-q5",
      prompt:
        "Barang tidak datang dan penjual memblokir nomor kamu. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Kumpulkan tangkapan layar, lapor marketplace dan bank, lalu laporkan ke IASC",
        },
        { id: "b", label: "Buat akun baru untuk mengejar penjual" },
        { id: "c", label: "Diamkan karena uangnya kecil" },
      ],
      correctId: "a",
      rationale:
        "Bukti chat, nomor rekening, dan waktu transfer adalah dasar sengketa dan laporan. Diam membuat pola yang sama terus menimpa korban lain.",
    },
  ],
  lapor: [
    "Hentikan semua pembayaran. Jangan kirim biaya tambahan apa pun, sekecil apa pun.",
    "Simpan tangkapan layar toko, percakapan, nomor rekening, dan bukti transfer.",
    "Laporkan akun dan transaksi ke marketplace serta bank penerima untuk meminta penelusuran.",
    "Laporkan ke IASC (iasc.ojk.go.id) dan polisi setempat dengan bukti yang sudah dikumpulkan.",
  ],
  scenarioId: null,
} satisfies ModuleContent;
