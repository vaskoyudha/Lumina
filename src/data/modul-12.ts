import type { ModuleContent } from "@/data/modul-schema";

/**
 * Modul 12 — Musiman & catut institusi. `modus.json` records "Ikut momen
 * tahunan" instead of a count, so this module makes no numeric claim. The
 * example is a fake government aid site because the scheme recruits through
 * seasonal registration pages.
 */

export const MODUL_12 = {
  no: 12,
  ringkasan:
    "Momen tahunan seperti Ramadan, musim pajak, bantuan sosial, atau penerimaan CPNS dipakai untuk mencatut nama institusi. Korban diminta mengisi data pribadi lengkap dan membayar biaya administrasi ke rekening pribadi; bantuan tidak pernah ada.",
  tujuan: [
    "Mengenali penipuan yang menumpang momen resmi.",
    "Memeriksa kanal resmi sebelum mengisi data atau membayar biaya.",
    "Melindungi data pribadi dari formulir bantuan palsu.",
  ],
  poinKunci: [
    "Program resmi tidak memungut biaya administrasi ke rekening pribadi.",
    "Domain pemerintah memakai kanal resmi yang bisa diperiksa, bukan tautan pendek.",
    "Data berlebihan pada formulir bantuan adalah tanda bahaya.",
    "Konfirmasi ke kantor atau kanal resmi sebelum mengirim uang atau dokumen.",
  ],
  estimasiMenit: 7,
  anatomi: [
    {
      judul: "Momen tahunan dipakai untuk menciptakan urgensi",
      teks: "Ramadan, musim pajak, bantuan sosial, atau pembukaan CPNS dipakai sebagai latar. Korban merasa ini kesempatan yang hanya datang sekali dan harus segera diambil.",
    },
    {
      judul: "Situs atau akun meniru institusi resmi",
      teks: "Nama, logo, dan istilah resmi disalin, tetapi alamatnya bukan domain pemerintah. Tautan disebar lewat grup chat dan media sosial, bukan kanal pengumuman resmi.",
    },
    {
      judul: "Korban diminta mengisi data pribadi lengkap",
      teks: "Formulir meminta KTP, kartu keluarga, nomor rekening, dan kadang foto selfie. Data ini jauh lebih lengkap dari yang dibutuhkan pendaftaran yang bisa diverifikasi.",
    },
    {
      judul: "Biaya administrasi diminta ke rekening pribadi",
      teks: "Setelah mengisi formulir, korban diminta membayar biaya verifikasi atau administrasi. Rekening tujuan atas nama pribadi, bukan nama instansi.",
    },
    {
      judul: "Bantuan tidak ada dan data dipakai lagi",
      teks: "Program yang dijanjikan tidak pernah cair. Data yang sudah dikumpulkan dipakai untuk penipuan berikutnya atau pinjaman atas nama korban.",
    },
  ],
  contohJudul:
    "Contoh situs bantuan (dianonimkan) — bagian merah yang berbahaya",
  contohJenis: "situs",
  contohSumber: "https://bansos-resmi.example/daftar",
  contohIsi: [
    {
      text: "Pendaftaran bantuan sosial pemerintah dibuka. ",
      berbahaya: false,
    },
    {
      text: "Isi data KTP, KK, dan nomor rekening. ",
      berbahaya: true,
    },
    {
      text: "Biaya administrasi Rp150 ribu untuk verifikasi.",
      berbahaya: true,
    },
  ],
  checklist: [
    "Momen resmi dipakai untuk mendesak pendaftaran hari ini juga",
    "Alamat situs bukan domain resmi pemerintah atau instansi",
    "Diminta membayar biaya administrasi ke rekening pribadi",
    "Formulir meminta data pribadi berlebihan, termasuk foto selfie",
    "Pengumuman hanya beredar lewat grup chat, bukan kanal resmi",
  ],
  kuis: [
    {
      id: "season-q1",
      prompt:
        "Situs bantuan sosial meminta biaya administrasi ke rekening pribadi. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Bayar karena bantuannya lebih besar" },
        {
          id: "b",
          label: "Tutup situs; program resmi tidak memungut biaya ke pribadi",
        },
        { id: "c", label: "Bayar sebagian lalu minta nomor resmi" },
      ],
      correctId: "b",
      rationale:
        "Biaya administrasi ke rekening pribadi adalah tanda penipuan. Program resmi punya kanal dan rekening yang bisa diverifikasi, bukan instruksi transfer pribadi.",
    },
    {
      id: "season-q2",
      prompt:
        "Formulir bantuan meminta KTP, KK, rekening, dan selfie. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Isi semuanya karena syarat pencairan" },
        {
          id: "b",
          label: "Berhenti dan verifikasi program lewat kanal resmi dulu",
        },
        { id: "c", label: "Isi KTP saja tanpa rekening" },
      ],
      correctId: "b",
      rationale:
        "Data berlebihan adalah bahan penipuan lanjutan. Verifikasi program lewat kanal resmi memastikan formulir itu memang ada sebelum data diserahkan.",
    },
    {
      id: "season-q3",
      prompt:
        "Tautan pendaftaran beredar di grup chat dan bukan domain pemerintah. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Buka karena dikirim oleh teman" },
        {
          id: "b",
          label: "Jangan buka; cari pengumuman di situs resmi instansinya",
        },
        { id: "c", label: "Buka lalu periksa setelah mengisi data" },
      ],
      correctId: "b",
      rationale:
        "Teman bisa meneruskan tanpa memeriksa. Kanal resmi instansi adalah satu-satunya sumber yang bisa memastikan program dan alamat pendaftarannya.",
    },
    {
      id: "season-q4",
      prompt:
        "Kamu sudah mengisi formulir dan membayar biaya verifikasi. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Simpan bukti, hubungi bank, dan laporkan situs ke IASC serta instansi resmi",
        },
        { id: "b", label: "Tunggu bantuan cair" },
        { id: "c", label: "Kirim data tambahan bila diminta" },
      ],
      correctId: "a",
      rationale:
        "Setelah data dan uang keluar, kecepatan pelaporan menentukan. Menunggu hanya memberi pelaku waktu memakai data untuk penipuan lain.",
    },
    {
      id: "season-q5",
      prompt:
        "Kamu menerima pengumuman bantuan yang mendesak dan meminta transfer. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Abaikan, verifikasi ke kantor resmi, dan ingatkan pengirim agar tidak menyebar",
        },
        { id: "b", label: "Teruskan ke grup keluarga supaya cepat diketahui" },
        { id: "c", label: "Transfer kecil untuk mengetes keasliannya" },
      ],
      correctId: "a",
      rationale:
        "Verifikasi ke kantor resmi memutus rantai tanpa menyebarkan tautan. Transfer kecil tetap memberi pelaku dana dan konfirmasi bahwa kamu bisa ditekan.",
    },
  ],
  lapor: [
    "Hentikan pengisian data dan jangan transfer biaya apa pun.",
    "Simpan tangkapan layar situs, tautan, formulir, dan bukti transfer.",
    "Laporkan situs dan nomor pelaku ke instansi yang namanya dicatut serta ke IASC.",
    "Hubungi bank bila data rekening sudah diberikan, lalu laporkan ke polisi setempat.",
  ],
  scenarioId: null,
} satisfies ModuleContent;
