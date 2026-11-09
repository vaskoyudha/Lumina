import type { ModuleContent } from "@/data/modul-schema";

/**
 * Modul 3 — Investasi bodong & kripto. Facts from `modus.json` (19.850
 * laporan, ±Rp1,09 T). The example is a shortened link because the scheme
 * recruits through group chats and DMs. No real platform or wallet.
 */

export const MODUL_03 = {
  no: 3,
  ringkasan:
    "Investasi palsu menjanjikan untung tetap atau pasti, lalu membayar sedikit di awal agar korban percaya. Setelah modal membesar, penarikan dikunci dengan alasan pajak, verifikasi, atau biaya admin sampai platform dan adminnya menghilang.",
  tujuan: [
    "Mengenali janji imbal hasil yang tidak masuk akal sebagai tanda bahaya utama.",
    "Menjelaskan mengapa pembayaran kecil di awal adalah alat pembangun kepercayaan.",
    "Memeriksa legalitas platform sebelum menyetor dana apa pun.",
  ],
  poinKunci: [
    "Tidak ada investasi yang menjamin untung tetap setiap hari.",
    "Pembayaran awal yang lancar adalah umpan, bukan bukti keaslian.",
    "Biaya pajak atau verifikasi untuk menarik dana adalah pola penipuan.",
    "Cek izin OJK sebelum menyetor; tautan pendek dan aplikasi luar store bukan bukti.",
  ],
  estimasiMenit: 8,
  anatomi: [
    {
      judul: "Iklan untung besar muncul di grup dan media sosial",
      teks: "Konten menampilkan keuntungan harian, tangkapan layar saldo, dan testimoni. Sumbernya sering akun baru atau grup yang dimasuki tanpa diminta.",
    },
    {
      judul: "Korban diberi untung kecil agar percaya",
      teks: "Setoran awal dibayar tepat waktu, kadang dengan bunga besar. Uang itu berasal dari setoran orang lain, bukan dari investasi nyata, sehingga korban mengira platformnya benar-benar bekerja.",
    },
    {
      judul: "Modal diminta ditambah atau anggota baru direkrut",
      teks: "Setelah percaya, korban didorong menambah modal atau mengajak orang lain. Semakin besar dana yang masuk, semakin lama skema bisa bertahan sebelum runtuh.",
    },
    {
      judul: "Penarikan dipersulit dengan biaya baru",
      teks: "Saat korban ingin menarik dana, muncul syarat pajak, biaya verifikasi, atau saldo minimum. Setiap pembayaran baru membuka syarat berikutnya, bukan mencairkan uang.",
    },
    {
      judul: "Platform hilang dan admin memblokir korban",
      teks: "Aplikasi atau situs tiba-tiba tidak bisa diakses, grup dibubarkan, dan admin tidak lagi membalas. Dana yang sudah masuk tidak bisa dilacak lewat platform.",
    },
  ],
  contohJudul:
    "Contoh tautan investasi (dianonimkan) — bagian merah yang berbahaya",
  contohJenis: "tautan",
  contohSumber: "Tautan dari grup WhatsApp · bit.ly/untungpasti",
  contohIsi: [
    {
      text: "Investasi emas digital, untung tetap 2% per hari, ",
      berbahaya: true,
    },
    { text: "modal aman 100% dijamin. ", berbahaya: true },
    { text: "Daftar lewat tautan ini: ", berbahaya: false },
    { text: "bit.ly/untungpasti", berbahaya: true },
    { text: " — slot terbatas hari ini.", berbahaya: false },
  ],
  checklist: [
    "Imbal hasil tetap atau pasti, apalagi harian, tanpa risiko yang dijelaskan",
    "Penarikan dana diminta biaya tambahan: pajak, verifikasi, atau admin",
    "Platform tidak punya izin OJK atau tidak bisa ditemukan di situs resmi",
    "Diminta merekrut anggota baru untuk menambah penghasilan",
    "Tautan pendek, aplikasi di luar toko resmi, dan admin hanya lewat chat pribadi",
  ],
  kuis: [
    {
      id: "invest-q1",
      prompt:
        "Grup menawarkan untung tetap 2% per hari dan modal dijamin. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Ikut dengan modal kecil dulu" },
        {
          id: "b",
          label: "Abaikan, lalu periksa izin platform di situs OJK",
        },
        { id: "c", label: "Minta bukti transfer dari anggota grup lain" },
      ],
      correctId: "b",
      rationale:
        "Untung tetap harian yang dijamin tidak ada dalam investasi sah. Tangkapan layar anggota grup bisa dibuat atau berasal dari korban lain; satu-satunya pemeriksaan yang berguna adalah izin resmi.",
    },
    {
      id: "invest-q2",
      prompt:
        "Setoran awalmu dibayar untung tepat waktu. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Tambah modal karena platformnya terbukti membayar" },
        {
          id: "b",
          label: "Berhenti, karena pembayaran awal adalah umpan kepercayaan",
        },
        { id: "c", label: "Ajak teman supaya komisi bertambah" },
      ],
      correctId: "b",
      rationale:
        "Pembayaran awal dibiayai setoran berikutnya, bukan keuntungan nyata. Semakin besar modal yang masuk, semakin besar kerugian saat skema berhenti membayar.",
    },
    {
      id: "invest-q3",
      prompt:
        "Untuk menarik saldo, kamu diminta membayar pajak 10% lebih dulu. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Bayar pajaknya karena saldo sudah besar" },
        {
          id: "b",
          label: "Tolak, karena biaya penarikan adalah tanda skema penipuan",
        },
        { id: "c", label: "Bayar sebagian dan minta saldo dicairkan bertahap" },
      ],
      correctId: "b",
      rationale:
        "Biaya baru untuk mencairkan dana adalah inti penipuan investasi. Setelah satu biaya dibayar, akan muncul biaya berikutnya; saldo di layar hanyalah angka.",
    },
    {
      id: "invest-q4",
      prompt:
        "Admin meminta kamu merekrut lima orang agar komisi naik. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Rekrut karena ini peluang penghasilan tambahan" },
        { id: "b", label: "Rekrut hanya keluarga dekat supaya aman" },
        {
          id: "c",
          label: "Berhenti dan ingatkan orang yang sudah kamu ajak",
        },
      ],
      correctId: "c",
      rationale:
        "Skema yang membayar dari anggota baru adalah piramida. Merekrut orang memperbesar kerugian mereka dan memindahkan masalah, bukan menyelesaikannya.",
    },
    {
      id: "invest-q5",
      prompt:
        "Aplikasi investasi tiba-tiba tidak bisa dibuka dan admin memblokir kamu. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Kumpulkan bukti setoran, lapor OJK dan polisi, lalu hubungi bank",
        },
        { id: "b", label: "Cari admin lewat akun baru dan minta refund" },
        { id: "c", label: "Tunggu aplikasinya kembali normal" },
      ],
      correctId: "a",
      rationale:
        "Bukti setoran dan identitas rekening tujuan adalah dasar pelaporan. Menghubungi pelaku lagi hanya membuka permintaan uang baru.",
    },
  ],
  lapor: [
    "Hentikan semua setoran dan jangan bayar biaya penarikan apa pun.",
    "Simpan bukti transfer, tangkapan layar platform, tautan, dan percakapan dengan admin.",
    "Laporkan platform ke OJK dan IASC; sertakan nama rekening tujuan serta kronologi.",
    "Hubungi bank untuk meminta penelusuran transaksi dan laporkan ke polisi setempat.",
  ],
  scenarioId: null,
} satisfies ModuleContent;
