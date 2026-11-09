import type { ModuleContent } from "@/data/modul-schema";

/**
 * Modul 2 — Mengaku pihak lain (fake call). Facts from `modus.json` (31.299
 * laporan, ±Rp1,31 T). The example is a call transcript because the danger is
 * spoken, not typed. No real institution, number, or name.
 */

export const MODUL_02 = {
  no: 2,
  ringkasan:
    "Penelepon mengaku dari bank, polisi, kurir, atau keluarga, lalu membangun cerita darurat agar kamu tetap di telepon. Tujuannya bukan membuatmu panik saja, tetapi membuatmu menyerahkan OTP, PIN, atau transfer ke rekening yang mereka sebut aman.",
  tujuan: [
    "Mengenali pola panggilan palsu yang mengaku institusi resmi.",
    "Menjelaskan mengapa tetap di telepon dan merahasiakan panggilan adalah taktik kontrol.",
    "Memutus panggilan dengan aman lalu memverifikasi lewat nomor resmi.",
  ],
  poinKunci: [
    "Bank, polisi, dan kurir tidak pernah meminta OTP atau PIN lewat telepon.",
    "Tidak ada rekening aman untuk menampung uangmu; rekening aman adalah rekening pelaku.",
    "Tutup telepon, lalu hubungi nomor resmi dari kartu atau situs lembaga itu.",
    "Jangan pernah memasang aplikasi remote karena diminta seseorang di telepon.",
  ],
  estimasiMenit: 8,
  anatomi: [
    {
      judul: "Penelepon mengaku institusi yang kamu percaya",
      teks: "Nomor bisa tampak mirip nomor resmi, dan penelepon menyebut jabatan serta nama yang terdengar meyakinkan. Tujuannya membuatmu berhenti memeriksa dan mulai menurut.",
    },
    {
      judul: "Data pribadi disebut sebagian untuk membangun kepercayaan",
      teks: "Pelaku menyebut nama, empat digit terakhir kartu, atau alamat. Data itu bisa berasal dari kebocoran lama, jadi kesesuaiannya bukan bukti bahwa panggilan itu asli.",
    },
    {
      judul: "Cerita darurat membuat kamu tidak sempat berpikir",
      teks: "Transaksi mencurigakan, paket ilegal, atau keluarga kecelakaan dipakai untuk menciptakan rasa urgensi. Korban diarahkan mengambil keputusan dalam hitungan menit.",
    },
    {
      judul: "Kamu diminta tetap di telepon dan tidak memberi tahu siapa pun",
      teks: "Pelaku melarang menutup telepon atau bertanya ke keluarga. Isolasi ini memutus akses korban ke orang lain yang bisa melihat polanya dengan lebih tenang.",
    },
    {
      judul: "Permintaan terakhir: OTP, PIN, transfer, atau aplikasi remote",
      teks: "Setelah kepercayaan terbangun, pelaku meminta kode OTP, PIN, transfer ke rekening tertentu, atau pemasangan aplikasi remote. Di titik ini pencurian benar-benar terjadi.",
    },
  ],
  contohJudul: "Contoh panggilan (dianonimkan) — bagian merah yang berbahaya",
  contohJenis: "panggilan",
  contohSumber:
    "Panggilan masuk · nomor tak dikenal · mengaku bagian keamanan bank",
  contohIsi: [
    {
      text: "Selamat siang, saya dari bagian keamanan bank. ",
      berbahaya: false,
    },
    {
      text: "Ada transaksi mencurigakan di rekening Bapak/Ibu. ",
      berbahaya: true,
    },
    {
      text: "Sebutkan kode OTP yang kami kirim ke SMS sekarang, atau rekening diblokir. ",
      berbahaya: true,
    },
    { text: "Jangan tutup telepon, ini prosedur resmi.", berbahaya: true },
  ],
  checklist: [
    "Penelepon tak dikenal mengaku dari bank, polisi, kurir, atau keluarga",
    "Diminta menyebutkan OTP, PIN, atau password",
    "Diminta tetap di telepon dan tidak memberi tahu orang lain",
    "Diminta transfer ke rekening yang disebut aman atau rekening baru",
    "Diminta memasang aplikasi remote atau membagikan layar",
  ],
  kuis: [
    {
      id: "call-q1",
      prompt:
        "Penelepon mengaku dari bank dan meminta kode OTP yang baru masuk. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Sebutkan OTP karena penelepon tahu nama kamu" },
        {
          id: "b",
          label: "Tutup telepon, lalu hubungi bank lewat nomor resmi di kartu",
        },
        { id: "c", label: "Kirim OTP lewat SMS supaya lebih aman" },
      ],
      correctId: "b",
      rationale:
        "Bank tidak pernah meminta OTP. Menutup telepon dan menelepon nomor resmi memutus kontrol pelaku, sekaligus memastikan apakah transaksi itu benar ada.",
    },
    {
      id: "call-q2",
      prompt:
        "Penelepon melarangmu menutup telepon dan bilang ini prosedur rahasia. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Tetap di telepon sampai urusan selesai" },
        { id: "b", label: "Minta izin keluarga dulu, tetap di telepon" },
        {
          id: "c",
          label: "Tutup telepon dan bicarakan dengan orang yang kamu percaya",
        },
      ],
      correctId: "c",
      rationale:
        "Larangan menutup telepon adalah tanda kontrol, bukan prosedur resmi. Institusi sungguhan tidak melarang kamu memverifikasi atau meminta pendapat orang lain.",
    },
    {
      id: "call-q3",
      prompt:
        "Penelepon meminta transfer ke rekening aman milik kepolisian. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label: "Transfer karena rekeningnya katanya atas nama negara",
        },
        {
          id: "b",
          label:
            "Tolak dan verifikasi ke kantor polisi atau bank lewat nomor resmi",
        },
        { id: "c", label: "Transfer sebagian dulu sebagai bukti itikad baik" },
      ],
      correctId: "b",
      rationale:
        "Tidak ada rekening aman untuk menampung uang korban. Transfer sekali pun tidak bisa ditarik kembali; verifikasi lewat kanal resmi adalah satu-satunya langkah aman.",
    },
    {
      id: "call-q4",
      prompt:
        "Penelepon meminta kamu memasang aplikasi agar bisa membantu memeriksa HP. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label: "Tolak, tutup telepon, dan jangan pasang aplikasi apa pun",
        },
        { id: "b", label: "Pasang aplikasinya karena dikirim oleh bank" },
        { id: "c", label: "Pasang lalu hapus setelah panggilan selesai" },
      ],
      correctId: "a",
      rationale:
        "Aplikasi remote memberi pelaku kendali atas layar dan kode yang muncul di HP. Menghapusnya setelah panggilan tidak membatalkan data yang sudah terkirim.",
    },
    {
      id: "call-q5",
      prompt:
        "Kamu sudah menyebutkan OTP dan saldo mulai berkurang. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Hubungi bank lewat nomor resmi, minta blokir, lalu laporkan ke IASC",
        },
        { id: "b", label: "Tunggu sampai penelepon menelepon lagi" },
        { id: "c", label: "Transfer sisa saldo ke rekening keluarga" },
      ],
      correctId: "a",
      rationale:
        "Langkah pertama adalah menghentikan akses: blokir kartu dan rekening lewat bank resmi. Setelah itu kumpulkan bukti dan laporkan; jangan menunggu pelaku menghubungi lagi.",
    },
  ],
  lapor: [
    "Tutup panggilan dan jangan menghubungi balik nomor pelaku.",
    "Hubungi bank atau e-wallet lewat nomor resmi, minta blokir sementara dan cek mutasi.",
    "Ubah PIN dan password akun yang mungkin sudah disebutkan atau dikirim lewat OTP.",
    "Laporkan nomor dan kronologi ke IASC (iasc.ojk.go.id) serta polisi setempat.",
  ],
  scenarioId: null,
} satisfies ModuleContent;
