import type { ModuleContent } from "@/data/modul-schema";

/**
 * Modul 9 — Pinjol fiktif & teror data. Facts from `modus.json` (4.793
 * laporan, ±Rp40,6 M). The example is an SMS offer; the scheme's real weapon
 * is the personal data collected before the loan is refused.
 */

export const MODUL_09 = {
  no: 9,
  ringkasan:
    "Pinjaman cepat tanpa syarat ditawarkan lewat SMS atau WhatsApp. Sebelum dana cair, korban diminta biaya admin dan menyerahkan KTP, selfie, serta akses kontak. Pinjaman tidak pernah datang, tetapi data itu dipakai untuk meneror dan memeras korban.",
  tujuan: [
    "Mengenali pinjol ilegal dari biaya di muka dan permintaan data berlebihan.",
    "Menjelaskan mengapa akses kontak dan galeri adalah senjata pemerasan.",
    "Menghentikan teror data dengan bukti dan pelaporan, bukan dengan membayar.",
  ],
  poinKunci: [
    "Pinjaman sah tidak meminta biaya admin sebelum dana cair.",
    "Akses kontak dan galeri dipakai untuk meneror, bukan untuk menilai kredit.",
    "Membayar sekali hanya membuka permintaan berikutnya.",
    "Cek izin OJK dan laporkan ancaman sebar data sebagai pemerasan.",
  ],
  estimasiMenit: 7,
  anatomi: [
    {
      judul: "Iklan pinjaman cepat datang tanpa diminta",
      teks: "SMS atau WhatsApp menawarkan dana cair dalam hitungan menit, tanpa cek BI, dan tanpa syarat rumit. Nomor pengirim tidak bisa diverifikasi sebagai perusahaan resmi.",
    },
    {
      judul: "Data pribadi diminta sebelum pinjaman disetujui",
      teks: "Korban diminta foto KTP, selfie memegang KTP, nomor kontak, dan kadang akses galeri. Permintaan ini jauh lebih besar dari yang dibutuhkan pinjaman sah.",
    },
    {
      judul: "Biaya admin diminta lebih dulu",
      teks: "Sebelum dana cair, korban harus mentransfer biaya admin, asuransi, atau verifikasi. Setelah dibayar, muncul syarat baru atau pinjaman tidak pernah dikirim.",
    },
    {
      judul: "Data dipakai untuk meneror korban",
      teks: "Pelaku menghubungi kontak yang tersimpan, menyebarkan foto, atau mengancam membuka data pribadi. Tekanan ini membuat korban merasa tidak punya pilihan selain membayar.",
    },
    {
      judul: "Korban ditekan membayar berkali-kali",
      teks: "Setiap pembayaran dianggap sebagai kesediaan membayar lebih. Ancaman meningkat, sementara pinjaman yang dijanjikan tidak pernah ada.",
    },
  ],
  contohJudul: "Contoh SMS pinjol (dianonimkan) — bagian merah yang berbahaya",
  contohJenis: "pesan",
  contohSumber: "SMS · nomor tak dikenal · pinjaman cepat",
  contohIsi: [
    { text: "Pinjaman cair 5 menit, ", berbahaya: false },
    { text: "tanpa cek BI. ", berbahaya: true },
    { text: "Cukup kirim foto KTP dan kontak. ", berbahaya: true },
    { text: "Biaya admin Rp250 ribu ditransfer dulu.", berbahaya: true },
  ],
  checklist: [
    "Pinjol tidak terdaftar OJK atau menawarkan tanpa cek BI",
    "Diminta biaya admin, asuransi, atau verifikasi sebelum dana cair",
    "Diminta akses kontak, galeri, atau lokasi yang tidak relevan",
    "Ancaman menyebarkan data pribadi atau menghubungi kontak",
    "Bunga dan biaya tidak dijelaskan sejak awal",
  ],
  kuis: [
    {
      id: "pinjol-q1",
      prompt:
        "SMS menawarkan pinjaman cair dan meminta biaya admin lebih dulu. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Transfer biaya admin agar pinjaman segera cair" },
        {
          id: "b",
          label: "Abaikan; pinjaman sah tidak meminta biaya di muka",
        },
        { id: "c", label: "Transfer setengah biaya sebagai percobaan" },
      ],
      correctId: "b",
      rationale:
        "Biaya di muka adalah inti pinjol fiktif. Pinjaman yang sah memotong biaya dari dana yang dicairkan, bukan meminta transfer terpisah lebih dulu.",
    },
    {
      id: "pinjol-q2",
      prompt:
        "Aplikasi pinjaman meminta akses kontak dan galeri. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Izinkan karena itu syarat penilaian kredit" },
        {
          id: "b",
          label: "Tolak dan hapus aplikasinya; akses itu dipakai meneror",
        },
        { id: "c", label: "Izinkan hanya kontak, tanpa galeri" },
      ],
      correctId: "b",
      rationale:
        "Penilaian kredit tidak membutuhkan seluruh daftar kontak atau galeri. Akses itu adalah bahan pemerasan yang dipakai setelah pinjaman gagal cair.",
    },
    {
      id: "pinjol-q3",
      prompt:
        "Setelah kamu menolak membayar, pelaku mengancam menyebarkan fotomu. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Simpan bukti ancaman, laporkan ke polisi dan OJK, jangan membayar",
        },
        { id: "b", label: "Bayar supaya data tidak disebarkan" },
        { id: "c", label: "Hapus semua akun dan berhenti berkomunikasi" },
      ],
      correctId: "a",
      rationale:
        "Membayar pemerasan tidak menghapus data dan justru menandakan korban masih bisa ditekan. Bukti ancaman adalah dasar laporan pidana dan pengaduan OJK.",
    },
    {
      id: "pinjol-q4",
      prompt:
        "Pinjaman tidak cair, tetapi pelaku meminta biaya verifikasi kedua. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Bayar agar pinjaman pertama ikut cair" },
        {
          id: "b",
          label: "Berhenti mengirim uang dan anggap pinjaman itu tidak ada",
        },
        { id: "c", label: "Pinjam dari tempat lain untuk membayar biaya itu" },
      ],
      correctId: "b",
      rationale:
        "Biaya kedua menandakan tidak akan ada pencairan. Berutang di tempat lain untuk membayar biaya palsu memperbesar kerugian.",
    },
    {
      id: "pinjol-q5",
      prompt:
        "Kamu sudah menyerahkan KTP dan data kontak. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Lapor OJK dan polisi, beri tahu kontak terdekat, dan pantau pinjaman atas namamu",
        },
        { id: "b", label: "Tunggu sampai ada yang menghubungi" },
        { id: "c", label: "Ganti nomor tanpa memberi tahu siapa pun" },
      ],
      correctId: "a",
      rationale:
        "Data yang sudah bocor bisa dipakai untuk pinjaman atas namamu. Melapor dan memantau membuat penyalahgunaan tercatat lebih cepat.",
    },
  ],
  lapor: [
    "Hentikan semua pembayaran dan jangan menuruti ancaman pelaku.",
    "Simpan bukti SMS, aplikasi, transfer, dan ancaman yang diterima.",
    "Laporkan pinjol ke OJK dan IASC; sertakan nama aplikasi serta nomor pelaku.",
    "Laporkan pemerasan ke polisi dan beri tahu kontak terdekat agar tidak panik.",
  ],
  scenarioId: null,
} satisfies ModuleContent;
