/** Synthetic paraphrases of public scheme descriptions, not benchmark fixtures. */
export const SCAM_TEMPLATES = [
  [
    "otp-bank",
    "credential-request",
    "Saya dari bagian keamanan bank. Sebutkan kode verifikasi yang masuk ke ponsel agar pembatalan transaksi bisa dilakukan.",
  ],
  [
    "otp-akun",
    "credential-request",
    "Ada perubahan akses akun. Kirim kode OTP terbaru kepada petugas supaya akun tidak dibekukan permanen.",
  ],
  [
    "undangan-apk",
    "attachment-risk",
    "Kami membagikan undangan acara keluarga melalui aplikasi. Pasang berkas Undangan-Acara.apk dan aktifkan izin SMS untuk melihat lokasinya.",
  ],
  [
    "resi-apk",
    "attachment-risk",
    "Paket kiriman tertunda. Instal berkas Pelacakan-Barang.apk dari chat ini dan berikan izin yang diminta aplikasi.",
  ],
  [
    "tugas-like",
    "payment-redirect",
    "Tugas menekan like akan memberi komisi harian. Untuk mengaktifkan penarikan saldo Anda perlu menambah deposit ke rekening admin.",
  ],
  [
    "tugas-vip",
    "payment-redirect",
    "Naik ke misi premium agar komisi tugas bertambah. Setor dana tambahan sebelum saldo hasil pekerjaan bisa ditarik.",
  ],
  [
    "job-fee",
    "payment-redirect",
    "Selamat diterima bekerja tanpa seleksi lanjutan. Bayar biaya pelatihan dan seragam melalui rekening personal perekrut hari ini.",
  ],
  [
    "job-overseas",
    "payment-redirect",
    "Penempatan kerja ke luar negeri tersedia segera. Transfer biaya pengurusan visa kepada perekrut sebelum kontrak dapat diterbitkan.",
  ],
  [
    "investasi-tetap",
    "reward-lure",
    "Program investasi kami menjamin laba tetap tiap hari tanpa kerugian. Modal akan dikembalikan utuh beserta keuntungan berlipat.",
  ],
  [
    "investasi-withdraw",
    "payment-redirect",
    "Penarikan hasil trading menunggu pelunasan pajak. Kirim biaya pencairan ke rekening pengelola agar saldo investasi dibuka.",
  ],
  [
    "hadiah-pajak",
    "reward-lure",
    "Nomor Anda memenangkan undian kendaraan. Lunasi biaya pajak hadiah kepada panitia sebelum pengiriman dapat dimulai.",
  ],
  [
    "hadiah-ongkir",
    "payment-redirect",
    "Anda terpilih menerima bingkisan eksklusif. Kirim uang pengiriman dan administrasi lebih dahulu untuk mengklaim hadiah.",
  ],
  [
    "love-customs",
    "relationship-lure",
    "Sayang, bingkisan dari luar negeri tertahan petugas. Bantu kirim uang untuk bea masuk agar paket untukmu segera dilepas.",
  ],
  [
    "love-mule",
    "payment-redirect",
    "Kita sudah saling percaya walau belum bertemu. Tolong tampung dana di rekeningmu lalu teruskan ke rekening temanku.",
  ],
  [
    "pinjol-fee",
    "payment-redirect",
    "Pinjaman langsung cair tanpa pemeriksaan kredit. Bayar administrasi pertama sebelum dana pinjaman ditransfer kepada pemohon.",
  ],
  [
    "pinjol-data",
    "urgency-pressure",
    "Data kontak pemohon sudah kami simpan. Bila pembayaran tidak masuk hari ini kami akan menyebarkan foto dan menghubungi keluarga.",
  ],
  [
    "market-outside",
    "platform-evasion",
    "Barang tersedia dengan harga khusus kalau transaksi di luar aplikasi. Kirim pembayaran langsung ke rekening penjual lewat chat pribadi.",
  ],
  [
    "market-refund",
    "payment-redirect",
    "Refund pesanan harus diverifikasi melalui QR pembayaran. Pindai kode ini lalu konfirmasikan transaksi supaya dana kembali.",
  ],
  [
    "remote-support",
    "credential-request",
    "Tim dukungan ingin memperbaiki akses layanan. Pasang aplikasi remote dan bagikan layar saat membuka aplikasi bank Anda.",
  ],
  [
    "bansos-biaya",
    "authority-claim",
    "Program bantuan pemerintah menetapkan Anda sebagai penerima. Kirim biaya aktivasi ke rekening petugas supaya dana bantuan dilepas.",
  ],
] as const;
