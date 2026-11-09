import type { ModuleContent } from "@/data/modul-schema";

/**
 * Modul 7 — Phishing tautan & akun. Facts from `modus.json` (13.386 laporan,
 * ±Rp507 M). The example is a link; the address bar is the lesson, so the
 * frame is `tautan` and the dangerous segment is the domain itself.
 */

export const MODUL_07 = {
  no: 7,
  ringkasan:
    "Pesan meniru bank atau e-wallet dengan nada darurat dan mengarahkanmu ke halaman login palsu. Begitu nomor, PIN, dan OTP dimasukkan, pelaku memakai kredensial itu untuk masuk dan memindahkan dana sebelum kamu sadar.",
  tujuan: [
    "Membaca domain tautan sebelum mengetuknya.",
    "Menjelaskan mengapa halaman login tiruan bisa terlihat identik dengan aslinya.",
    "Menghentikan kebocoran akun setelah kredensial terlanjur dimasukkan.",
  ],
  poinKunci: [
    "Bank tidak meminta login lewat tautan yang dikirim ke pesan.",
    "Periksa domain, bukan tampilan; halaman tiruan bisa menyalin logo dan warna.",
    "PIN dan OTP tidak pernah diisi di halaman yang dibuka dari chat atau SMS.",
    "Kalau sudah masuk, ubah password dan hubungi bank lewat nomor resmi segera.",
  ],
  estimasiMenit: 8,
  anatomi: [
    {
      judul: "Pesan meniru bank dengan nada darurat",
      teks: "Pesan mengabarkan akun diblokir, transaksi mencurigakan, atau hadiah, lalu meminta verifikasi dalam waktu singkat. Nama dan logo bank dipakai agar korban tidak memeriksa lagi.",
    },
    {
      judul: "Tautan mengarah ke halaman login tiruan",
      teks: "Alamatnya mirip, tetapi tidak persis sama dengan domain resmi: huruf ditukar, tambahan kata, atau domain lain sekali pandang. Halaman menyalin tampilan asli dengan sangat rapi.",
    },
    {
      judul: "Korban memasukkan nomor, PIN, dan OTP",
      teks: "Formulir meminta data yang tidak seharusnya diketik di halaman mana pun. Kode OTP yang masuk justru diteruskan ke pelaku secara real time.",
    },
    {
      judul: "Pelaku masuk dan memindahkan dana",
      teks: "Dengan kredensial yang sudah dikumpulkan, pelaku login dari perangkat lain, mengubah kontak, dan mengirim dana sebelum korban menyadari ada yang salah.",
    },
    {
      judul: "Notifikasi asli sengaja tidak sampai",
      teks: "Pelaku bisa mengubah nomor atau email pemulihan agar peringatan transaksi tidak diterima korban. Keterlambatan menyadari membuat dana sulit ditarik kembali.",
    },
  ],
  contohJudul:
    "Contoh tautan phishing (dianonimkan) — bagian merah yang berbahaya",
  contohJenis: "tautan",
  contohSumber: "SMS · pengirim tak dikenal · tautan login",
  contohIsi: [
    { text: "Akun Anda diblokir sementara. ", berbahaya: true },
    { text: "Verifikasi sekarang di ", berbahaya: false },
    { text: "https://bank-anda.example/login", berbahaya: true },
    { text: " sebelum 24 jam.", berbahaya: true },
  ],
  checklist: [
    "Domain tidak persis sama dengan situs resmi yang biasa kamu pakai",
    "Diminta login lewat tautan yang dikirim di pesan, bukan aplikasi resmi",
    "Nada darurat dengan batas waktu yang menekan",
    "Halaman meminta PIN atau OTP di luar aplikasi resmi",
    "Alamat situs memakai tambahan kata, tanda hubung, atau ejaan yang aneh",
  ],
  kuis: [
    {
      id: "phish-q1",
      prompt:
        "SMS mengabarkan akun diblokir dan meminta login lewat tautan. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Ketuk tautan dan login supaya akun aktif lagi" },
        {
          id: "b",
          label: "Buka aplikasi resmi langsung, tanpa mengetuk tautan",
        },
        { id: "c", label: "Balas SMS untuk memastikan pengirimnya" },
      ],
      correctId: "b",
      rationale:
        "Bank tidak meminta login lewat tautan di SMS. Membuka aplikasi resmi memutus jalur phishing tanpa harus menebak apakah tautannya asli.",
    },
    {
      id: "phish-q2",
      prompt:
        "Halaman login menampilkan logo bank yang sama persis. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Masukkan data karena tampilannya identik" },
        {
          id: "b",
          label: "Periksa domain di address bar sebelum mengetik apa pun",
        },
        { id: "c", label: "Masukkan PIN saja tanpa OTP" },
      ],
      correctId: "b",
      rationale:
        "Logo dan warna mudah disalin; domain tidak. Alamat yang tidak persis sama dengan situs resmi berarti halaman itu bukan milik bank.",
    },
    {
      id: "phish-q3",
      prompt:
        "Halaman meminta kode OTP yang baru masuk ke SMS. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Masukkan OTP untuk menyelesaikan verifikasi" },
        {
          id: "b",
          label:
            "Tutup halaman; OTP tidak pernah diisi di situs yang dibuka dari pesan",
        },
        { id: "c", label: "Kirim OTP ke nomor yang tertera di halaman" },
      ],
      correctId: "b",
      rationale:
        "OTP adalah kunci transaksi. Halaman phishing memintanya justru untuk meneruskannya ke pelaku; tidak ada verifikasi sah yang membutuhkan OTP di halaman web.",
    },
    {
      id: "phish-q4",
      prompt:
        "Kamu terlanjur mengetik password dan OTP di halaman itu. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Ubah password, hubungi bank lewat nomor resmi, dan minta blokir",
        },
        { id: "b", label: "Tunggu apakah ada transaksi aneh" },
        { id: "c", label: "Hapus riwayat browser saja" },
      ],
      correctId: "a",
      rationale:
        "Setelah kredensial bocor, kecepatan menentukan. Mengubah password dan memblokir akses lewat bank resmi menghentikan pelaku sebelum dana dipindahkan.",
    },
    {
      id: "phish-q5",
      prompt:
        "Kamu menerima tautan login dari nomor yang mengaku bank. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Hapus pesan, blokir pengirim, lalu laporkan nomornya ke bank dan IASC",
        },
        { id: "b", label: "Teruskan ke teman supaya mereka waspada" },
        { id: "c", label: "Simpan tautannya untuk dicek nanti" },
      ],
      correctId: "a",
      rationale:
        "Melaporkan nomor membantu bank memblokir kampanye yang sama. Meneruskan tautan memperluas risiko; menyimpannya membuatmu bisa mengetuknya tanpa sengaja.",
    },
  ],
  lapor: [
    "Jangan mengetuk tautan lagi dan hapus pesannya dari perangkat.",
    "Buka aplikasi resmi atau ketik alamat bank sendiri, lalu ubah password dan PIN.",
    "Hubungi bank lewat nomor resmi untuk meminta blokir dan memeriksa transaksi terakhir.",
    "Laporkan nomor dan tautan ke IASC, bank terkait, dan polisi setempat.",
  ],
  scenarioId: null,
} satisfies ModuleContent;
