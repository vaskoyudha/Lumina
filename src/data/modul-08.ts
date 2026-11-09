import type { ModuleContent } from "@/data/modul-schema";

/**
 * Modul 8 — Social engineering & share screen. Facts from `modus.json` (9.436
 * laporan, ±Rp361 M). The example is a chat from a fake "CS"; the dangerous
 * step is remote access, not a link.
 */

export const MODUL_08 = {
  no: 8,
  ringkasan:
    "Pelaku mengaku customer service resmi dan menawarkan bantuan atas transaksi yang katanya gagal. Korban diarahkan memasang aplikasi remote atau membagikan layar, lalu membuka m-banking. Dari layar itulah pelaku melihat OTP dan PIN, kemudian menjalankan transaksi.",
  tujuan: [
    "Mengenali social engineering yang mengaku customer service.",
    "Menjelaskan mengapa share screen dan aplikasi remote berbahaya.",
    "Menolak remote access tanpa harus bersikap kasar atau panik.",
  ],
  poinKunci: [
    "Customer service resmi tidak menghubungi lewat chat pribadi untuk meminta remote access.",
    "Share screen memperlihatkan semua yang muncul di layar, termasuk OTP.",
    "Tidak ada prosedur bank yang meminta kamu membuka m-banking saat layar dibagikan.",
    "Tutup aplikasi remote, putus koneksi, lalu hubungi bank lewat nomor resmi.",
  ],
  estimasiMenit: 7,
  anatomi: [
    {
      judul: "Pelaku mengaku customer service resmi",
      teks: "Pesan datang dari akun yang memakai nama dan logo perusahaan. Nadanya membantu dan sopan, seolah mereka sudah tahu masalah yang kamu alami.",
    },
    {
      judul: "Korban diarahkan memasang aplikasi remote",
      teks: "Pelaku mengirim tautan atau file aplikasi yang katanya alat bantu resmi. Setelah dipasang, aplikasi itu memberi akses ke layar dan terkadang ke ketukan tombol.",
    },
    {
      judul: "Layar dibagikan dan semua terlihat",
      teks: "Korban diminta share screen agar masalahnya bisa diperiksa. Di layar itu muncul notifikasi, kode OTP, saldo, dan aplikasi perbankan yang sedang dibuka.",
    },
    {
      judul: "Korban diarahkan membuka m-banking dan mengetik PIN",
      teks: "Pelaku memandu langkah demi langkah, sering sambil meminta korban tetap tenang. Setiap ketukan dan kode yang muncul direkam atau dilihat langsung.",
    },
    {
      judul: "Transaksi dijalankan dari layar korban",
      teks: "Dengan akses yang sudah diberikan, pelaku memindahkan dana atau mengubah pengaturan. Korban baru sadar setelah saldo berkurang dan akses remote ditutup.",
    },
  ],
  contohJudul:
    "Contoh pesan CS palsu (dianonimkan) — bagian merah yang berbahaya",
  contohJenis: "pesan",
  contohSumber: "WhatsApp · akun mengaku CS e-wallet",
  contohIsi: [
    { text: "Halo, saya CS resmi. ", berbahaya: false },
    { text: "Ada transaksi gagal, kami bantu perbaiki. ", berbahaya: false },
    {
      text: "Silakan unduh aplikasi remote dan bagikan layar, lalu buka m-banking.",
      berbahaya: true,
    },
    { text: "Jangan tutup, ini prosedur.", berbahaya: true },
  ],
  checklist: [
    "Customer service menghubungi lewat chat pribadi, bukan kanal resmi",
    "Diminta memasang aplikasi remote atau alat bantu yang dikirim lewat chat",
    "Diminta membagikan layar saat membuka m-banking",
    "Diminta mengetik PIN atau menyebut OTP saat layar dibagikan",
    "Diminta tetap di telepon atau chat agar tidak memeriksa sendiri",
  ],
  kuis: [
    {
      id: "screen-q1",
      prompt:
        "Akun mengaku CS meminta kamu memasang aplikasi remote. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Pasang karena aplikasinya dikirim CS resmi" },
        {
          id: "b",
          label: "Tolak, tutup chat, lalu hubungi CS lewat aplikasi resmi",
        },
        { id: "c", label: "Pasang sebentar lalu hapus setelah selesai" },
      ],
      correctId: "b",
      rationale:
        "CS resmi tidak mengirim aplikasi remote lewat chat. Menghapus setelahnya tidak membatalkan akses yang sudah diberikan selama sesi berlangsung.",
    },
    {
      id: "screen-q2",
      prompt:
        "Pelaku meminta kamu membagikan layar saat membuka m-banking. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Bagikan layar supaya masalahnya cepat selesai" },
        {
          id: "b",
          label: "Hentikan share screen dan tutup m-banking",
        },
        { id: "c", label: "Bagikan hanya bagian atas layar" },
      ],
      correctId: "b",
      rationale:
        "Share screen memperlihatkan OTP dan saldo secara utuh. Tidak ada dukungan sah yang membutuhkan akses ke layar perbankanmu.",
    },
    {
      id: "screen-q3",
      prompt:
        "Pelaku meminta kode OTP yang muncul saat layar dibagikan. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Sebutkan OTP karena mereka sedang membantu" },
        {
          id: "b",
          label: "Tolak, tutup aplikasi remote, dan putus koneksi",
        },
        { id: "c", label: "Kirim OTP lewat chat supaya lebih jelas" },
      ],
      correctId: "b",
      rationale:
        "OTP tidak pernah diberikan kepada siapa pun, termasuk yang mengaku CS. Menutup remote access menghentikan penglihatan pelaku atas kode berikutnya.",
    },
    {
      id: "screen-q4",
      prompt:
        "Kamu sudah memasang aplikasi remote dan melihat layar bergerak sendiri. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Matikan data/Wi-Fi, hapus aplikasi remote, lalu hubungi bank resmi",
        },
        { id: "b", label: "Tunggu sampai pelaku selesai membantu" },
        {
          id: "c",
          label: "Kirim pesan untuk bertanya apa yang sedang dilakukan",
        },
      ],
      correctId: "a",
      rationale:
        "Layar yang bergerak sendiri berarti kendali sudah berpindah. Memutus koneksi adalah cara tercepat menghentikan transmisi data dan transaksi.",
    },
    {
      id: "screen-q5",
      prompt:
        "Saldo berkurang setelah sesi share screen. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Hubungi bank lewat nomor resmi, minta blokir, lalu laporkan ke IASC",
        },
        { id: "b", label: "Hubungi kembali akun CS palsu itu" },
        { id: "c", label: "Tunggu notifikasi berikutnya" },
      ],
      correctId: "a",
      rationale:
        "Langkah pertama adalah menghentikan akses dan mencatat transaksi. Menghubungi pelaku lagi hanya memberi mereka kesempatan meminta uang tambahan.",
    },
  ],
  lapor: [
    "Putus koneksi, hapus aplikasi remote, dan cabut izin aksesibilitas yang mungkin diberikan.",
    "Hubungi bank atau e-wallet lewat nomor resmi untuk memblokir akses dan memeriksa mutasi.",
    "Ubah password dan PIN dari perangkat yang bersih, bukan dari sesi yang pernah dibagikan.",
    "Laporkan akun pelaku ke platform, IASC, dan polisi setempat dengan bukti tangkapan layar.",
  ],
  scenarioId: null,
} satisfies ModuleContent;
