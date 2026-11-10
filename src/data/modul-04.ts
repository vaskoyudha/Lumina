import type { ModuleContent } from "@/data/modul-schema";

/**
 * Modul 4 — Lowongan kerja & tugas berbayar. Facts from `modus.json` (18.220
 * laporan, ±Rp656 M). The scheme starts as a job offer and turns into a
 * top-up loop; the example keeps that two-stage structure visible.
 */

export const MODUL_04 = {
  no: 4,
  ringkasan:
    "Tawaran kerja mudah dengan gaji tidak wajar berubah menjadi tugas like dan subscribe yang dibayar kecil. Setelah korban percaya, ia diminta top-up untuk membuka tugas lebih besar; saldo di aplikasi bertambah, tetapi penarikan selalu tertahan biaya baru.",
  tujuan: [
    "Membedakan lowongan sah dari skema tugas berbayar.",
    "Menjelaskan mengapa pembayaran kecil di awal adalah bagian dari umpan.",
    "Mengenali permintaan top-up sebagai titik berhenti, bukan peluang.",
  ],
  poinKunci: [
    "Pekerjaan sah tidak meminta kamu membayar untuk mulai bekerja.",
    "Saldo di aplikasi bukan uang nyata sampai bisa ditarik tanpa syarat baru.",
    "Top-up untuk membuka tugas adalah pola kerugian, bukan promosi.",
    "Rekrutmen resmi memakai kanal perusahaan, bukan akun chat pribadi.",
  ],
  estimasiMenit: 8,
  anatomi: [
    {
      judul: "Tawaran kerja mudah dengan gaji tidak wajar",
      teks: "Pesan menawarkan admin online, penerjemah, atau penguji aplikasi dengan gaji besar tanpa pengalaman. Syaratnya dibuat sangat ringan agar korban merasa ini kesempatan langka.",
    },
    {
      judul: "Tugas ringan dibayar kecil di awal",
      teks: "Korban diminta like, subscribe, atau memberi rating, lalu dibayar beberapa puluh ribu. Pembayaran kecil ini membangun keyakinan bahwa sistemnya benar-benar membayar.",
    },
    {
      judul: "Top-up diminta untuk membuka tugas lebih besar",
      teks: "Muncul paket tugas dengan komisi lebih tinggi, tetapi korban harus menyetor saldo lebih dulu. Setoran itu disebut deposit yang akan kembali bersama komisi.",
    },
    {
      judul: "Saldo tampak bertambah, penarikan tertahan",
      teks: "Angka di aplikasi naik, tetapi saat ditarik muncul biaya pajak, verifikasi, atau target tugas yang belum selesai. Setiap syarat baru meminta setoran berikutnya.",
    },
    {
      judul: "Korban terus menyetor sampai admin menghilang",
      teks: "Pelaku memakai harapan agar modal kembali. Semakin besar dana yang sudah masuk, semakin sulit korban berhenti; akhirnya grup dibubarkan dan admin memblokir.",
    },
  ],
  contohJudul:
    "Contoh pesan rekrutmen (dianonimkan) — bagian merah yang berbahaya",
  contohJenis: "pesan",
  contohSumber: "WhatsApp · nomor tak dikenal · mengaku HRD",
  contohIsi: [
    {
      text: "Lowongan admin online, gaji Rp8 juta, tanpa pengalaman. ",
      berbahaya: false,
    },
    {
      text: "Tugasnya hanya like dan subscribe, dibayar Rp50 ribu per tugas. ",
      berbahaya: true,
    },
    { text: "Untuk mulai, ", berbahaya: false },
    { text: "top-up saldo Rp300 ribu dulu", berbahaya: true },
    { text: ". Saldo kembali plus komisi.", berbahaya: true },
  ],
  checklist: [
    "Gaji besar untuk pekerjaan yang syaratnya hampir tidak ada",
    "Diminta membayar, top-up, atau menyetor deposit sebelum bekerja",
    "Komunikasi hanya lewat chat pribadi, tanpa kanal perusahaan",
    "Aplikasi atau situs tugas tidak jelas dan di luar toko resmi",
    "Penarikan saldo selalu muncul biaya atau syarat baru",
  ],
  kuis: [
    {
      id: "job-q1",
      prompt:
        "Lowongan menawarkan gaji besar tanpa pengalaman dan meminta top-up untuk mulai. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Top-up karena akan kembali bersama komisi" },
        {
          id: "b",
          label: "Tolak, karena pekerjaan sah tidak meminta uang muka",
        },
        { id: "c", label: "Top-up setengah dulu untuk mencoba" },
      ],
      correctId: "b",
      rationale:
        "Pekerjaan yang meminta kamu membayar untuk mulai adalah skema, bukan lowongan. Uang muka adalah modal pelaku, bukan biaya administrasi.",
    },
    {
      id: "job-q2",
      prompt:
        "Kamu dibayar Rp50 ribu setelah menyelesaikan tugas like. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Ambil paket tugas lebih besar dengan top-up" },
        {
          id: "b",
          label: "Berhenti, karena pembayaran kecil adalah umpan kepercayaan",
        },
        { id: "c", label: "Ajak teman supaya dapat bonus rekrutmen" },
      ],
      correctId: "b",
      rationale:
        "Pembayaran kecil dirancang agar kamu percaya dan mau menyetor lebih besar. Berhenti saat untung kecil lebih baik daripada mengejar saldo yang tidak bisa ditarik.",
    },
    {
      id: "job-q3",
      prompt:
        "Saldo di aplikasi bertambah, tetapi penarikan diminta biaya pajak. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Bayar pajak agar saldo bisa dicairkan" },
        {
          id: "b",
          label: "Berhenti dan anggap saldo itu tidak nyata",
        },
        { id: "c", label: "Pinjam uang untuk membayar pajak" },
      ],
      correctId: "b",
      rationale:
        "Saldo yang hanya bisa keluar setelah biaya baru adalah tampilan, bukan aset. Membayar biaya berikutnya memperbesar kerugian tanpa pernah mencairkan dana.",
    },
    {
      id: "job-q4",
      prompt:
        "Admin meminta data rekening dan foto KTP untuk mengirim gaji. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Kirim semuanya karena itu syarat gaji" },
        {
          id: "b",
          label: "Jangan kirim; hentikan komunikasi dan laporkan akunnya",
        },
        { id: "c", label: "Kirim KTP saja tanpa rekening" },
      ],
      correctId: "b",
      rationale:
        "Data pribadi bisa dipakai untuk pinjaman atau penipuan lanjutan. Perusahaan sah tidak meminta KTP dan rekening lewat chat pribadi sebelum ada kontrak yang jelas.",
    },
    {
      id: "job-q5",
      prompt:
        "Grup tugas dibubarkan dan admin memblokir kamu. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Simpan bukti transfer dan chat, lalu lapor ke IASC dan polisi",
        },
        { id: "b", label: "Cari admin lewat akun baru" },
        { id: "c", label: "Diamkan karena malu" },
      ],
      correctId: "a",
      rationale:
        "Bukti transfer dan percakapan adalah dasar laporan. Rasa malu membuat pola yang sama terus berulang pada korban lain.",
    },
  ],
  lapor: [
    "Hentikan semua top-up dan jangan mengejar saldo dengan setoran baru.",
    "Simpan tangkapan layar lowongan, percakapan, bukti transfer, dan nama rekening tujuan.",
    "Laporkan akun dan aplikasi ke platform tempat pesan diterima serta ke IASC.",
    "Laporkan ke polisi setempat dan beri tahu orang lain yang mungkin sudah kamu ajak.",
  ],
  scenarioId: "L3-lowongan-berbayar",
} satisfies ModuleContent;
