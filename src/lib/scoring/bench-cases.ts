/**
 * Bench corpus — 57 messages that span the 12 modus families (29 scams)
 * plus 28 messages an Indonesian phone user legitimately receives,
 * chosen so the FALSE-POSITIVE traps sit where they really hide:
 * an OTP the user's own bank sent, a verification reminder from a
 * legitimate product, a flash sale with real urgency.
 *
 * This corpus first existed only inside a past analysis; it is committed
 * so the false-positive claim in STATUS.md is reproducible by anyone:
 *   - scam recall  = share of scams caught as mencurigakan+ (detectable)
 *   - FP rate      = share of legit messages scored mencurigakan/tinggi
 *
 * Rules of the corpus:
 *   a. Every scam must name at most its modus family; no cases were
 *      reverse-designed from the regexes (that would make the bench a
 *      self-fulfilling check of the rules, not of the product).
 *   b. Every legit message is abbreviated from a real-world shape.
 */

export interface BenchCase {
  id: string;
  text: string;
  /** Only for scam cases: expected modus classification, 1..12. */
  wantModus?: string;
  tag: string;
}

export const SCAM_CASES: BenchCase[] = [
  {
    id: "s01",
    tag: "apk-whatsapp",
    wantModus: "apk-whatsapp",
    text: "Halaman undangan digital! Buka file undangan-nikah.apk untuk melihat detail acara. Unduh sekarang sebelum tautannya kedaluwarsa ya.",
  },
  {
    id: "s02",
    tag: "fake-call OTP",
    wantModus: "fake-call",
    text: "Dari Bank BCA: Akun Anda akan diblokir dalam 2 jam. Segera berikan kode OTP yang kami kirim untuk membatalkan transaksi Rp2.500.000.",
  },
  {
    id: "s03",
    tag: "fake-call OTP",
    wantModus: "fake-call",
    text: "Halo, saya petugas BNI. Ada transaksi anomali Rp1.900.000 di kartu ATM Anda. Untuk pembatalannya saya perlu kode OTP yang masuk di HP Anda sekarang.",
  },
  {
    id: "s04",
    tag: "investasi bodong WA",
    wantModus: "investasi-bodong",
    text: "Modal Rp100.000 untung Rp700.000 tiap hari. Untung pasti, dijamin cuan. Top up sekarang untuk mulai trading dengan robot kami.",
  },
  {
    id: "s05",
    tag: "investasi bodong",
    wantModus: "investasi-bodong",
    text: "Paket staking XRP dijamin profit 15% per hari, fixed return. Biaya aktivasi Rp200.000, transfer ke rekening a.n. Putri Lestari.",
  },
  {
    id: "s06",
    tag: "lowongan tugas",
    wantModus: "lowongan-tugas-berbayar",
    text: "Lowongan kerja terbatas! Tugas: like & subscribe video, komisi Rp500 ribu/hari. Untuk pencairan, top up dulu Rp100.000 agar saldo bisa dicairkan.",
  },
  {
    id: "s07",
    tag: "undian hadiah",
    wantModus: "undian-hadiah-palsu",
    text: "Selamat! Anda menang undian berhadiah utama motor Rp32 juta. Untuk pajak hadiah kirim Rp1.200.000 sekarang sebelum batas waktu malam ini.",
  },
  {
    id: "s08",
    tag: "undian + shortlink",
    wantModus: "undian-hadiah-palsu",
    text: "Anda terpilih sebagai pemenang undian berhadiah Rp5 juta. Klaim hadiah utama via transfer biaya admin di s.id/klaim2000.",
  },
  {
    id: "s09",
    tag: "love scam",
    wantModus: "love-scam",
    text: "Sayang, paketku tertahan di imigrasi. Kirim uang biaya bea masuknya ke rekening pribadi pak imigrasinya ya. Aku rindu, video call besok?",
  },
  {
    id: "s10",
    tag: "phishing tautan",
    wantModus: "phishing-tautan",
    text: "Akun Anda mengubah password. Verifikasi akun dalam 12 jam lewat bca-mobile.web.id/login sebelum akun diblokir permanen.",
  },
  {
    id: "s11",
    tag: "jual-beli",
    wantModus: "jual-beli-palsu",
    text: "Barang ready sis! Transfer langsung ke rekening pribadi aja via WA saja biar cepat. DP dulu Rp100 ribu baru barang dikirim.",
  },
  {
    id: "s12",
    tag: "kurir palsu",
    wantModus: "jual-beli-palsu",
    text: "Paket Anda tertahan di gudang kurir, nomor pelacakan tidak valid. Konfirmasi alamat lewat bit.ly/kurircek untuk pembukaan kembali pengiriman.",
  },
  {
    id: "s13",
    tag: "pinjol fiktif",
    wantModus: "pinjol-fiktif",
    text: "Pinjaman online dana cepat cair 5 menit, tanpa jaminan, tanpa cek BI. Segera ajukan via tautan sebelum kuota hari ini habis.",
  },
  {
    id: "s14",
    tag: "social engineering",
    wantModus: "social-engineering",
    text: "Ini Kominfo. Komputer Anda terkirim virus ke server nasional. Segera pasang aplikasi AnyDesk QuickSupport dan izinkan remote akses untuk diperiksa petugas.",
  },
  {
    id: "s15",
    tag: "catut institusi",
    wantModus: "musiman-catut-institusi",
    text: "Dinas Sosial: bantuan BLT tahap 11 dicairkan hari ini. Segera konfirmasi NIK Anda dan bayar biaya data Rp50.000 ke rekening kurir.",
  },
  {
    id: "s16",
    tag: "QRIS palsu",
    wantModus: "quishing-qris",
    text: "Barang sudah dikemas, bayar sisa ongkir via QRIS pada stiker ini (nama penerima a.n. Hadi Wibowo).",
  },
  {
    id: "s17",
    tag: "OTP + link",
    wantModus: "fake-call",
    text: "Kode verifikasi 4 digit sudah dikirim ke SMS. Masukkan kode OTP di halaman bca-dafar.com/otp agar akun tidak diblokir.",
  },
  {
    id: "s18",
    tag: "topup stream",
    wantModus: "lowongan-tugas-berbayar",
    text: "Agar bisa withdraw profit kamu, gan top up lagi Rp3.000.000 ke saldo mutasi supaya komisi masuk malam ini.",
  },
  {
    id: "s19",
    tag: "catut polisi",
    wantModus: "social-engineering",
    text: "Kepolisian Polres: SIM Anda akan dibekukan dalam 12 jam karena tunggakan tilang. Bayar denda ke rekening petugas a.n. Roni Saputra, segera.",
  },
  {
    id: "s20",
    tag: "OTP request bank",
    wantModus: "fake-call",
    text: "Saya CS Bank Mandiri. OTP dipakai transaksi Rp700 ribu di perangkat tak dikenal. Berikan kode OTP 4 digit untuk menonaktifkan fitur tersebut.",
  },
  {
    id: "job-s01",
    tag: "lowongan biaya",
    wantModus: "lowongan-tugas-berbayar",
    text: "Lowongan admin online, gaji Rp6 juta. Biaya pelatihan Rp150.000 ditransfer dulu sebelum training.",
  },
  {
    id: "job-s02",
    tag: "tugas like berbayar",
    wantModus: "lowongan-tugas-berbayar",
    text: "Tugas harian like dan subscribe video. Komisi Rp50.000 per tugas, top up saldo Rp100.000 dulu untuk membuka level.",
  },
  {
    id: "job-s03",
    tag: "penempatan luar negeri",
    wantModus: "lowongan-tugas-berbayar",
    text: "Penempatan kerja ke luar negeri tanpa ijazah. Biaya visa dan tiket pesawat ditanggung pelamar.",
  },
  {
    id: "mkt-s01",
    tag: "bayar luar marketplace",
    wantModus: "jual-beli-palsu",
    text: "Barang ready. Jangan lewat Shopee ya, transfer langsung ke rekening pribadi saya biar lebih murah.",
  },
  {
    id: "mkt-s02",
    tag: "gift card",
    wantModus: "jual-beli-palsu",
    text: "Untuk DP sepatu, bayar pakai voucher Google Play atau USDT. Nanti sisanya bisa dicicil.",
  },
  {
    id: "mkt-s03",
    tag: "refund qris",
    wantModus: "quishing-qris",
    text: "Refund gagal karena sistem. Scan QRIS ini dulu supaya dana kembali ke rekening kamu.",
  },
  {
    id: "qris-s01",
    tag: "qris quishing",
    wantModus: "quishing-qris",
    text: "Scan QRIS ini untuk membayar: 00020101021226660014ID.CO.QRIS.WWW01189360001400000000000215ID10240000000000303UMI5204581253033605802ID5920https://evil.example6007JAKARTA610512345630441C7",
  },
  {
    id: "qris-s02",
    tag: "qris crc rusak",
    wantModus: "quishing-qris",
    text: "Scan QRIS ini: 00020101021226660014ID.CO.QRIS.WWW01189360001400000000000215ID10240000000000303UMI5204581253033605802ID5909TOKO JAYA6007JAKARTA61051234563040000",
  },
  {
    id: "qris-s03",
    tag: "qris stiker diganti",
    text: "Bayar ke Warung Bu Siti: 00020101021226660014ID.CO.QRIS.WWW01189360001400000000000215ID10240000000000303UMI5204581253033605802ID5909TOKO JAYA6007JAKARTA61051234563042908",
  },
];

export const LEGIT_CASES: BenchCase[] = [
  {
    id: "l01",
    tag: "OTP notification (benar-benar aman)",
    text: "OTP Anda: 483221. Jangan berikan kode ini kepada siapa pun, termasuk petugas bank. Trx Rp250.000 untuk Tokopedia.",
  },
  {
    id: "l02",
    tag: "sapaan",
    text: "Halo kak, gimana kabarnya? Kemarin makasih ya sudah mampir ke toko.",
  },
  {
    id: "l03",
    tag: "kurir asli",
    text: "[JNE Express] Paket JD04492332 sudah tiba di gudang kota Anda, estimasi besok pagi. Salam, tim kurir.",
  },
  {
    id: "l04",
    tag: "jadwal kampus",
    text: "Meeting reviewer skripsi digeser ke hari Kamis jam 10, ruang H204. Bawa cetakan bab 3 ya.",
  },
  {
    id: "l05",
    tag: "keluarga",
    text: "Nak, kalau lewat warung beli minyak goreng 1 liter ya. Kasih tahu bapak sudah makan belum.",
  },
  {
    id: "l06",
    tag: "struk e-wallet",
    text: "[OVO] Pembayaran Rp45.000 untuk Kopi Kenangan berhasil. Saldo tersisa Rp152.000.",
  },
  {
    id: "l07",
    tag: "kampus",
    text: "Sistem SIAKAD: nilai praktikum Anda sudah keluar, lihat di laman nilai. Bagus, pertahankan.",
  },
  {
    id: "l08",
    tag: "promo operator",
    text: "[Telkomsel] Paket kuota 25GB Rp75rb berlaku 30 hari. Tekan *363# untuk aktif. Berlaku s.d. akhir bulan.",
  },
  {
    id: "l09",
    tag: "reminder klinik",
    text: "Klinik Pratama mengingatkan kunjungan Jumat 14.00 dr. Andini. Jawab YA untuk konfirmasi, NO untuk ubah jadwal.",
  },
  {
    id: "l10",
    tag: "marketplace asli",
    text: "Pesanan #SPO-220202 telah dikirim. Gratis ongkir s.d. 25 Nov. Lihat pengiriman di aplikasi Shopee.",
  },
  {
    id: "l11",
    tag: "mutasi bank",
    text: "[BCA] Mutasi rek. 731xx bulan ini: masuk Rp9.500.000, keluar Rp4.300.000. Rincian via m-BCA.",
  },
  {
    id: "l12",
    tag: "verifikasi produk asli",
    text: "Harap konfirmasi email akun kamu di laman organisasi sebelum 24 jam agar hak akses repositori aktif kembali.",
  },
  {
    id: "l13",
    tag: "tagihan PLN",
    text: "[PLN] Tagihan Nov Rp278.400 jatuh tempo 15 Nov. Bayar via VA 778820083xx atau saldoku.",
  },
  {
    id: "l14",
    tag: "Samsat asli",
    text: "[Samsat Kota] Pajak kendaraan B 4372 UB jatuh tempo 20 Nov 2026, nominal 1.920.000. Info cekplat resmi.",
  },
  {
    id: "l15",
    tag: "beasiswa resmi",
    text: "Pendaftaran beasiswa gelombang 2 dibuka sampai 30 November. Siapkan transkrip dan surat rekening aktivitas.",
  },
  {
    id: "l16",
    tag: "chat kerja",
    text: "Update proses build: tiga kasus bug di pengujian sudah selesai. Jangan lupa review kode teman sebelum standup besok.",
  },
  {
    id: "l17",
    tag: "panitia lomba",
    text: "Panitia lomba sains Nasional: batas pengumpulan proposal diperpanjang menjadi 19 November. Kirim berkas ke drive panitia.",
  },
  {
    id: "l18",
    tag: "flash sale asli",
    text: "Flash sale 11.11: diskon 70% berlaku sampai tengah malam. Aktifkan pengingat di aplikasi agar tidak ketinggalan.",
  },
  {
    id: "l19",
    tag: "update aplikasi resmi",
    text: "Versi terbaru aplikasi mobile banking tersedia di Play Store. Unduh hanya lewat Play Store, bukan dari tautan lain.",
  },
  {
    id: "l20",
    tag: "edukasi OJK",
    text: "[SIKAPI OJK] Jangan menyerahkan rekening atau kartu ATM Anda kepada orang lain. Data Anda bisa dipakai untuk pinjaman ilegal.",
  },
  {
    // Found by sampling replies rather than by the bench: urgency alone used
    // to carry enough weight to cross into `mencurigakan`, so an ordinary
    // promo read as a scam. Urgency is now gated on a demand.
    id: "l21",
    tag: "promo singkat",
    text: "Promo berakhir malam ini, segera pesan sebelum kehabisan.",
  },
  {
    id: "l22",
    tag: "tenggat tanpa permintaan uang",
    text: "Pendaftaran ditutup dalam 2 jam. Segera lengkapi berkas kamu.",
  },
  {
    // A real KTA sold by a real bank: "tanpa jaminan" is a legitimate loan
    // product. Only the illegal markers (tanpa cek BI, tidak terdaftar OJK)
    // belong in the pinjol rule.
    id: "l23",
    tag: "kredit bank resmi",
    text: "Kredit tanpa jaminan dari bank resmi, bunga 1,2% per bulan. Ajukan di kantor cabang.",
  },
  {
    // A defensive instruction: naming a recipient ("a.n.") is how every
    // honest transfer screen asks the payer to double-check, not a scheme.
    id: "l24",
    tag: "nasihat cocokkan nama penerima",
    text: "Sebelum menekan bayar, cocokkan nama penerima di layar aplikasi pembayaran. Kalau a.n. tidak cocok, batalkan transaksi.",
  },
  {
    // A warning *about* an APK is the opposite of an APK delivery. The APK
    // rule must read the whole sentence before treating the extension as a
    // request to install anything.
    id: "l25",
    tag: "peringatan file APK",
    text: "Jangan buka file undangan.apk dari pengirim yang tidak dikenal, langsung hapus.",
  },
  {
    id: "job-l01",
    tag: "lowongan resmi",
    text: "Lowongan staf administrasi di PT Sumber Rejeki. Biaya tes kesehatan dan pelatihan ditanggung perusahaan. Kirim CV ke karier@sumberrejeki.co.id.",
  },
  {
    id: "mkt-l01",
    tag: "struk marketplace asli",
    text: "Pesanan Shopee sudah dibayar lewat Shopee. Paket dikirim dengan JNE dan resi bisa dilacak di aplikasi.",
  },
  {
    id: "qris-l01",
    tag: "qris merchant cocok",
    text: "Bayar ke Toko Jaya: 00020101021226660014ID.CO.QRIS.WWW01189360001400000000000215ID10240000000000303UMI5204581253033605802ID5909TOKO JAYA6007JAKARTA61051234563042908",
  },
];
