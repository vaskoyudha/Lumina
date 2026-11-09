import type { ModuleContent } from "@/data/modul-schema";

/**
 * Modul 5 — Undian & hadiah palsu. Facts from `modus.json` (15.477 laporan,
 * ±Rp189,9 M). The example is a WhatsApp prize message; the tell is the fee
 * demanded before a prize that was never entered for.
 */

export const MODUL_05 = {
  no: 5,
  ringkasan:
    "Pesan mengabarkan kamu menang hadiah besar meskipun tidak pernah ikut undian. Untuk mencairkan hadiah, kamu diminta membayar pajak atau biaya admin lebih dulu, lalu mengirim data pribadi; hadiahnya tidak pernah ada dan permintaan uang berulang.",
  tujuan: [
    "Mengenali undian palsu dari syarat biaya di muka.",
    "Menjelaskan mengapa menang tanpa pernah ikut adalah tanda bahaya mutlak.",
    "Melindungi data pribadi dan rekening dari permintaan klaim hadiah.",
  ],
  poinKunci: [
    "Hadiah sah tidak meminta pemenang membayar untuk menerimanya.",
    "Kalau kamu tidak pernah ikut undian, tidak ada hadiah yang bisa diklaim.",
    "Nama institusi besar mudah dicatut; periksa kanal resminya, bukan pesannya.",
    "Jangan pernah mengirim foto KTP, kartu, atau kode OTP untuk klaim hadiah.",
  ],
  estimasiMenit: 7,
  anatomi: [
    {
      judul: "Pesan menang datang dari sumber tak dikenal",
      teks: "Pesan mengabarkan nomor atau akunmu menang mobil, uang tunai, atau perjalanan. Pengirimnya bukan kanal resmi dan sering memakai nama institusi besar.",
    },
    {
      judul: "Nama institusi dicatut untuk kredibilitas",
      teks: "Logo dan nama perusahaan dipakai agar pesan terlihat resmi. Namun tautan, nomor kontak, dan rekeningnya tidak pernah cocok dengan kanal resmi institusi itu.",
    },
    {
      judul: "Hadiah besar, syaratnya biaya kecil di muka",
      teks: "Korban diminta membayar pajak, biaya admin, atau ongkir agar hadiah dikirim. Nominalnya sengaja dibuat lebih kecil dari hadiah supaya terasa masuk akal.",
    },
    {
      judul: "Data pribadi dan rekening diminta untuk klaim",
      teks: "Formulir klaim meminta KTP, nomor kartu, dan kode OTP. Data ini dipakai untuk mengambil alih akun atau menguras rekening, bukan untuk mengirim hadiah.",
    },
    {
      judul: "Setelah bayar, hadiah tidak ada dan biaya bertambah",
      teks: "Pelaku meminta biaya berikutnya: bea cukai, asuransi, atau verifikasi. Korban yang sudah mengeluarkan uang merasa harus melanjutkan sampai sadar tidak ada hadiah sama sekali.",
    },
  ],
  contohJudul:
    "Contoh pesan undian (dianonimkan) — bagian merah yang berbahaya",
  contohJenis: "pesan",
  contohSumber: "WhatsApp · nomor tak dikenal · mengaku panitia undian",
  contohIsi: [
    {
      text: "Selamat! Nomor Anda terpilih menang mobil. ",
      berbahaya: true,
    },
    {
      text: "Untuk klaim, transfer pajak Rp2,5 juta ke rekening panitia. ",
      berbahaya: true,
    },
    { text: "Hadiah dikirim setelah pembayaran diterima.", berbahaya: true },
  ],
  checklist: [
    "Mengaku kamu menang padahal tidak pernah mengikuti undian",
    "Diminta membayar pajak, admin, ongkir, atau bea cukai lebih dulu",
    "Batas waktu klaim sangat mendesak dan tidak masuk akal",
    "Formulir meminta KTP, nomor kartu, PIN, atau kode OTP",
    "Pengirim bukan kanal resmi institusi yang namanya dicatut",
  ],
  kuis: [
    {
      id: "prize-q1",
      prompt:
        "Pesan mengabarkan kamu menang mobil dan meminta pajak Rp2,5 juta. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Bayar pajak karena hadiahnya jauh lebih besar" },
        {
          id: "b",
          label: "Abaikan; hadiah sah tidak meminta pemenang membayar dulu",
        },
        { id: "c", label: "Minta bukti undian lalu bayar" },
      ],
      correctId: "b",
      rationale:
        "Biaya di muka untuk menerima hadiah adalah inti penipuan undian. Bukti yang dikirim pelaku juga bisa dibuat; tidak ada hadiah tanpa undian yang kamu ikuti.",
    },
    {
      id: "prize-q2",
      prompt:
        "Kamu tidak pernah ikut undian, tetapi pesan menyebut nomormu terpilih. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label: "Ikuti instruksi karena mungkin ini hadiah otomatis",
        },
        { id: "b", label: "Hapus pesan dan blokir pengirimnya" },
        { id: "c", label: "Balas untuk menanyakan asal undian" },
      ],
      correctId: "b",
      rationale:
        "Undian sah mensyaratkan partisipasi yang bisa dilacak. Membalas hanya memberi pelaku konfirmasi bahwa nomormu aktif.",
    },
    {
      id: "prize-q3",
      prompt:
        "Formulir klaim meminta foto KTP dan kode OTP. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Kirim karena itu syarat pencairan hadiah" },
        {
          id: "b",
          label: "Tutup formulir; data itu bisa dipakai mengambil alih akun",
        },
        { id: "c", label: "Kirim KTP tanpa OTP" },
      ],
      correctId: "b",
      rationale:
        "Tidak ada klaim hadiah sah yang membutuhkan OTP. Data pribadi yang lengkap bisa dipakai untuk pinjaman, pembukaan akun, atau penipuan berikutnya.",
    },
    {
      id: "prize-q4",
      prompt:
        "Setelah membayar pajak, panitia meminta biaya bea cukai tambahan. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Bayar agar hadiah tidak tertahan" },
        {
          id: "b",
          label: "Berhenti, simpan bukti, dan laporkan sebagai penipuan",
        },
        { id: "c", label: "Negosiasi supaya biaya berikutnya lebih kecil" },
      ],
      correctId: "b",
      rationale:
        "Biaya yang terus bertambah adalah pola pemerasan bertahap. Setiap pembayaran baru hanya memperpanjang rangkaian permintaan.",
    },
    {
      id: "prize-q5",
      prompt:
        "Kamu sudah terlanjur mengirim data dan uang. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Blokir kartu/rekening, ubah PIN, lalu lapor bank, IASC, dan polisi",
        },
        { id: "b", label: "Tunggu panitia menghubungi lagi" },
        { id: "c", label: "Hubungi pelaku dan memohon uangnya kembali" },
      ],
      correctId: "a",
      rationale:
        "Menghentikan akses ke rekening lebih mendesak daripada mengejar uang kembali. Laporan resmi membuat transaksi tercatat dan menghambat pelaku memakai data yang sama.",
    },
  ],
  lapor: [
    "Hentikan semua pembayaran dan jangan kirim data pribadi tambahan.",
    "Blokir pengirim, simpan tangkapan layar pesan, formulir, dan bukti transfer.",
    "Hubungi bank untuk memblokir kartu atau rekening yang datanya sudah kamu berikan.",
    "Laporkan ke IASC (iasc.ojk.go.id) dan polisi setempat dengan bukti lengkap.",
  ],
  scenarioId: null,
} satisfies ModuleContent;
