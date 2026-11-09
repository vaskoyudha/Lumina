export type NavLink = { label: string; id: string };

export const navLinks: NavLink[] = [
  { label: "Beranda", id: "section-home" },
  { label: "Tentang", id: "section-about" },
  { label: "Modus", id: "section-programs" },
  { label: "Akses", id: "section-pricing" },
  { label: "Kontak", id: "section-contact" },
];

export const brand = {
  name: "lumina",
  navCta: "Periksa pesan",
  heroBadge: "PENDAMPING PENCEGAHAN PENIPUAN & EDUKASI",
  heroTitle: ["Kenali penipuannya", "sebelum uangnya hilang"],
  heroBody:
    "Tempel pesan, tautan, atau tawaran yang membuatmu ragu. Lumina menyebut pola yang dikenali, mengutip bagian yang memicunya, lalu menyiapkan langkah berikutnya.",
  primaryCta: "Periksa pesan sekarang",
  secondaryCta: "Kenali polanya",
};

export const heroPerks = [
  { title: "Langsung pakai", body: "Tempel pesan, tanpa daftar." },
  { title: "Di perangkat", body: "Pemeriksaan berjalan lokal." },
  { title: "Bisa dijelaskan", body: "Setiap skor punya alasan." },
];

export const aboutCopy = {
  badge: "TENTANG LUMINA",
  title: ["Membantu orang membaca pola,", "sebelum uangnya hilang"],
  body: "Kami percaya keamanan dimulai dari penjelasan yang bisa dibaca, bukan dari rasa takut. Lumina menunjukkan apa yang memicu penilaian, supaya kamu bisa menilai sendiri.",
  cta: "Kenali cara kerjanya",
  portraits: [
    { alt: "Pria berkacamata hitam tersenyum di luar ruangan" },
    { alt: "Pria berkaos putih menatap kamera dengan langit biru" },
    { alt: "Pria berkaos abu-abu bersandar di tepi pantai" },
    { alt: "Pria berkaos marun berjalan di bawah sinar matahari" },
    { alt: "Pria berkaos gelap tersenyum ke arah kamera" },
  ],
};

export const aboutStats = [
  { value: "20/20", label: "Pesan penipuan tertangkap" },
  { value: "18/20", label: "Langsung dinilai tinggi" },
  { value: "0/23", label: "Pesan sah salah dituduh" },
  { value: "184.302", label: "Laporan IASC OJK" },
];

export const stepsCopy = {
  intro:
    "Tiga langkah yang sama untuk setiap pemeriksaan. Tidak ada langkah tersembunyi, tidak ada data yang dikirim untuk disimpan.",
  steps: [
    {
      no: "STEP 01",
      title: "Ceritakan",
      body: "Tempel pesan, tautan, atau tawaran yang membuatmu ragu. Tidak perlu merapikan apa pun.",
    },
    {
      no: "STEP 02",
      title: "Pahami",
      body: "Lumina menyebut pola yang dikenali, mengutip bagian yang memicunya, lalu menjelaskan modusnya.",
    },
    {
      no: "STEP 03",
      title: "Bertindak",
      body: "Dapatkan langkah konkret sesuai kondisimu — belum terjadi apa-apa, sudah klik, atau sudah transfer.",
    },
  ],
};

export const programsCopy = {
  badge: "YANG KAMI BANTU KENALI",
  title: "Enam modus yang paling sering mendarat di ponselmu",
  cta: "Periksa pesan seperti ini",
};

export const serviceRows = [
  {
    slot: "01",
    modusNo: 1,
    title: "Jual-beli online palsu",
    features: ["Harga jauh di bawah pasar", "Transfer di luar marketplace"],
    body: "Toko yang hanya hidup di percakapan. Lumina menandai permintaan transfer langsung dan harga yang terlalu rapi.",
  },
  {
    slot: "02",
    modusNo: 2,
    title: "Mengaku pihak lain & minta OTP",
    features: ["Mengaku bank atau kurir", "Minta OTP sekarang"],
    body: "Satu permintaan OTP sudah cukup untuk menaikkan skor ke risiko tinggi. Tidak perlu menunggu pola lain muncul.",
  },
  {
    slot: "03",
    modusNo: 3,
    title: "Investasi bodong & kripto",
    features: ["Janji untung pasti", "Setoran ke rekening pribadi"],
    body: "Keuntungan yang dijamin dan tekanan waktu adalah dua sinyal yang paling sering muncul bersamaan.",
  },
  {
    slot: "04",
    modusNo: 4,
    title: "Lowongan & tugas berbayar",
    features: ["Tugas like dan subscribe", "Top-up makin membesar"],
    body: "Dibayar kecil di awal supaya kamu percaya, lalu diminta menyetor lebih besar untuk mencairkan sisanya.",
  },
  {
    slot: "05",
    modusNo: 7,
    title: "Phishing tautan & akun",
    features: ["Domain mirip merek resmi", "Formulir login tiruan"],
    body: "Lumina membaca hostname dan pola tautan, bukan tampilan halamannya, supaya domain samaran tetap tertangkap.",
  },
  {
    slot: "06",
    modusNo: 10,
    title: "File APK lewat WhatsApp",
    features: ["APK di luar Play Store", "Pengirim tak dikenal"],
    body: "Modul yang sudah lengkap di perpustakaan Lumina. File APK dari chat langsung memicu risiko tinggi.",
  },
];

export const transformationCopy = {
  badge: "PETA PERUBAHAN",
  title: ["Langkah yang lebih tenang,", "dimulai dari satu pemeriksaan"],
  helper: "Pilih kondisimu di kiri untuk melihat langkah yang tersedia.",
  leftLabel: "Kondisimu sekarang",
  rightLabel: "Yang bisa kamu dapatkan",
  cta: "Mulai periksa sekarang",
};

export const transformationPairs = [
  { left: "Pesan terasa aneh", right: "Pola yang dikenali" },
  { left: "Takut salah tuduh", right: "Alasan yang bisa dibaca" },
  { left: "Tautan sudah diklik", right: "Langkah pertama jelas" },
  { left: "OTP sudah diberikan", right: "Arahan ke kanal resmi" },
  { left: "Uang sudah terkirim", right: "Kanal resmi tersedia" },
  { left: "Bingung harus lapor ke mana", right: "Urutan laporan tersusun" },
  { left: "Data pribadi terasa bocor", right: "Data tetap di perangkat" },
];

export const pricingCopy = {
  badge: "AKSES LUMINA",
  promoLabel: "Tandai harga pendukung awal (50%)",
  title: "Jelas sejak awal, termasuk yang belum jadi",
  body: "Pemeriksaan pesan selalu gratis. Paket pendukung menandai fitur yang masih rencana, bukan menjualnya sebagai fitur jadi.",
};

export const plans = [
  {
    id: "gratis",
    ribbon: "COCOK UNTUK MULAI",
    ribbonClass: "bg-ls-solid text-ls-solid-ink",
    icon: "✦",
    iconClass: "bg-ls-solid text-ls-solid-ink",
    bulletClass: "text-ls-ink-2",
    name: "Gratis",
    desc: "Semua yang dibutuhkan untuk memeriksa satu pesan hari ini.",
    features: [
      "Pemeriksaan pesan & tautan tanpa batas",
      "Skor 0–100 dengan kutipan alasan",
      "Dua belas modus, dibaca bebas",
      "Komunitas berbagi modus dan diskusi",
      "Kanal resmi OJK & Komdigi",
      "Tanpa simpan teks di server",
      "Bahasa Indonesia sehari-hari",
    ],
    price: "Rp0",
    oldPrice: "",
    suffix: "/ Tanpa kartu kredit",
    cta: "Mulai periksa",
    action: "scroll" as const,
  },
  {
    id: "pendukung",
    ribbon: "RENCANA — BELUM TERSEDIA",
    ribbonClass: "bg-ls-accent text-ls-accent-ink",
    icon: "★",
    iconClass: "bg-ls-accent text-ls-accent-ink",
    bulletClass: "text-ls-accent-text",
    name: "Pendukung",
    desc: "Untuk yang ingin modul belajar lengkap dan simulasi.",
    features: [
      "Semua yang ada di paket Gratis",
      "Modul belajar lengkap (modul 10 selesai)",
      "Simulasi roleplay — rencana",
      "Laporan siap kirim — rencana",
      "Ringkasan pola yang kamu temui",
      "Dukungan prioritas lewat email",
      "Membiayai modul berikutnya",
    ],
    price: "Rp49.000",
    oldPrice: "Rp98.000",
    suffix: "/ Status pendukung awal",
    cta: "Ikuti perkembangan",
    action: "waitlist" as const,
  },
];

export const testimonialCopy = {
  title: "Bukti dari uji internal dan data OJK, bukan testimoni karangan.",
  items: [
    {
      quote:
        "Dua puluh dari dua puluh pesan penipuan di korpus uji tertangkap. Delapan belas di antaranya langsung dinilai risiko tinggi.",
      author: "— Uji internal Lumina",
      meta: "Korpus 43 pesan, dua belas modus",
      progress: "33.3%",
    },
    {
      quote:
        "Nol dari dua puluh tiga pesan sah salah dituduh, termasuk pesan sah yang sengaja memuat jebakan klasik.",
      author: "— Uji internal Lumina",
      meta: "Fokus: temuan palsu",
      progress: "66.6%",
    },
    {
      quote:
        "184.302 laporan penipuan di IASC OJK, dijumlahkan dari sepuluh modus yang punya angka resmi.",
      author: "— IASC OJK",
      meta: "Dijumlahkan dari tabel OJK",
      progress: "100%",
    },
  ],
};

export const contactCopy = {
  headerBadge: "KONTAK LUMINA",
  headerTitle: "Hubungi tim Lumina",
  headerBody:
    "Kalau ada yang belum jelas soal pemeriksaan, privasi, atau modul belajar, tulis saja. Kami membaca setiap pesan.",
  formBadge: "FORMULIR KONTAK",
  formTitle: "Mari mulai percakapan",
  formBody:
    "Ceritakan pertanyaanmu tentang cara kerja pemeriksaan atau fitur yang sedang disiapkan. Semakin spesifik, semakin cepat kami bisa membantu.",
  info: [
    { label: "Waktu balasan", value: "1–2 hari kerja", icon: "✆" },
    { label: "Jam kerja", value: "Senin–Jumat, 09.00–18.00 WIB", icon: "◷" },
    { label: "Basis tim", value: "Jakarta, Indonesia", icon: "◎" },
  ],
  submit: "Kirim pesan ke Lumina",
  consent: "Kamu setuju dengan kebijakan privasi kami.",
  privacyToast:
    "Privasi Lumina: teks pemeriksaan tidak disimpan di server. Detailnya ada di bagian pertanyaan umum.",
  demoNote:
    "Demo ini belum mengirim data ke server — pesan hanya tampil di peramban ini.",
};

export const contactEmails = [
  { label: "Pertanyaan umum:", value: "HALO@LUMINA.ID" },
  { label: "Laporan & masukan:", value: "LAPOR@LUMINA.ID" },
];

export const faqCopy = {
  badge: "FAQ",
  title: "Pertanyaan yang sering muncul",
  body: "Semua yang perlu kamu tahu sebelum memeriksa pesan pertama.",
};

export const faqCategories = [
  "Umum",
  "Pemeriksaan",
  "Privasi",
  "Batasan",
] as const;

export type FaqCategory = (typeof faqCategories)[number];

export const faqData: Record<FaqCategory, { q: string; a: string }[]> = {
  Umum: [
    {
      q: "Apa itu Lumina?",
      a: "Lumina adalah pendamping yang membantu kamu mengenali penipuan sebelum uangnya hilang. Kamu menempelkan pesan atau tautan yang mencurigakan, lalu Lumina menjelaskan pola yang dikenali, mengutip bagian yang memicunya, dan menyiapkan langkah berikutnya.",
    },
    {
      q: "Apakah Lumina menggantikan laporan resmi?",
      a: "Tidak. Lumina membantumu memahami dan menyiapkan langkah, tetapi laporan resmi tetap dibuat lewat kanal bank, IASC OJK, Komdigi, atau Polri. Companion menampilkan kanal yang relevan.",
    },
    {
      q: "Apakah ini hanya untuk orang yang sudah pernah tertipu?",
      a: "Tidak. Lumina paling berguna justru sebelum terjadi apa-apa: saat kamu ragu apakah sebuah pesan, tautan, atau tawaran kerja masuk akal.",
    },
    {
      q: "Apakah Lumina menyalahkan korban?",
      a: "Tidak, dalam kondisi apa pun. Penipuan dirancang untuk menembus kewaspadaan orang biasa. Lumina menjelaskan mekanismenya, lalu menyusun langkah, tanpa kalimat yang menyalahkan.",
    },
    {
      q: "Bagaimana kalau saya sudah terlanjur percaya?",
      a: "Hentikan komunikasi dengan pengirim. Hubungi bank atau penyedia akun melalui kanal resmi dari perangkat lain yang aman. Jangan bagikan OTP, PIN, atau password.",
    },
  ],
  Pemeriksaan: [
    {
      q: "Bagaimana Lumina menentukan skor?",
      a: "Lima detektor berjalan berurutan: pesan, tautan, identitas pengirim, pola percakapan, lalu orkestrator skor. Semuanya aturan deterministik. Model bahasa hanya dipakai untuk menyusun kalimat penjelasan, bukan untuk menentukan angka.",
    },
    {
      q: "Kenapa satu temuan bisa langsung membuat skor tinggi?",
      a: "Permintaan OTP, PIN, atau password adalah indikator keras. Kalau pola itu muncul, Lumina menaikkan skor ke minimal 70 dan menandainya sebagai risiko tinggi, tanpa menunggu temuan lain.",
    },
    {
      q: "Bagaimana kalau Lumina tidak mengenali polanya?",
      a: "Lumina mengatakannya terus terang. Kamu akan melihat satu temuan dengan bobot nol yang menyatakan tidak ada pola penipuan yang dikenali pada teks itu — bukan skor rendah yang menyamar sebagai jawaban pasti.",
    },
  ],
  Privasi: [
    {
      q: "Apakah pesan saya disimpan?",
      a: "Tidak. Pemeriksaan berjalan di perangkatmu dan teks tidak dikirim untuk disimpan. Tidak ada riwayat percakapan pengguna di server.",
    },
    {
      q: "Apakah saya perlu membuat akun?",
      a: "Untuk memeriksa pesan, tidak. Akun hanya diperlukan untuk fitur yang memang menyimpan progres, seperti modul belajar dan simulasi.",
    },
    {
      q: "Apakah model bahasa membaca pesan saya?",
      a: "Bukan untuk menilai. Angka dan temuan berasal dari aturan deterministik. Model bahasa boleh membantu merangkai kalimat, tetapi tidak menjadi hakim atas skormu.",
    },
  ],
  Batasan: [
    {
      q: "Apa yang belum tersedia?",
      a: "Modul belajar selain modul 10, simulasi roleplay, dan pembuatan laporan otomatis masih berstatus segera atau rencana. Lumina menandainya terus terang di antarmuka, bukan menyamarkannya sebagai fitur jadi.",
    },
    {
      q: "Apakah skor 100 berarti pasti penipuan?",
      a: "Tidak. Skor mengukur kecocokan dengan pola penipuan yang dikenal, bukan kepastian hukum. Selalu verifikasi lewat kanal resmi sebelum mengambil keputusan besar.",
    },
    {
      q: "Apakah Lumina bisa salah menuduh pesan biasa?",
      a: "Bisa, meski pada korpus uji 23 pesan sah tidak ada yang salah dituduh. Karena itu setiap temuan selalu disertai kutipan, supaya kamu bisa menilai sendiri apakah alasannya masuk akal.",
    },
  ],
};

export const footerCopy = {
  badge: "BAB BERIKUTNYA",
  title: ["Satu pemeriksaan dulu,", "sebelum memutuskan"],
  body: "Mulai dari pesan yang membuatmu ragu. Tidak perlu menyiapkan apa pun.",
  cta: "Mulai periksa sekarang",
  newsletterTitle: "Ikuti kabar modus baru dan catatan privasi",
  newsletterPlaceholder: "Masukkan email...",
  newsletterCta: "Berlangganan",
  copyright: "© 2026 Lumina. Seluruh hak cipta dilindungi.",
  legal: "Jakarta, Indonesia • Pemeriksaan berjalan di perangkat",
};

export const footerColumns: {
  title: string;
  links: { label: string; href: string; external?: boolean; copy?: string }[];
}[] = [
  {
    title: "TAUTAN CEPAT",
    links: [
      { label: "Beranda", href: "#section-home" },
      { label: "Tentang Kami", href: "#section-about" },
      { label: "Modus", href: "#section-programs" },
      { label: "Akses & Harga", href: "#section-pricing" },
      { label: "Kontak", href: "#section-contact" },
    ],
  },
  {
    title: "SUMBER",
    links: [
      { label: "IASC OJK", href: "https://iasc.ojk.go.id", external: true },
      {
        label: "CekRekening.id",
        href: "https://cekrekening.id",
        external: true,
      },
      { label: "Aduan Nomor", href: "https://aduannomor.id", external: true },
      {
        label: "Patroli Siber",
        href: "https://patrolisiber.id",
        external: true,
      },
    ],
  },
  {
    title: "UTILITAS",
    links: [
      { label: "Kebijakan Privasi", href: "#section-faq" },
      { label: "Ketentuan", href: "#section-faq" },
      { label: "Status Fitur", href: "#section-programs" },
      { label: "Pusat Bantuan", href: "#section-contact" },
    ],
  },
  {
    title: "HUBUNGI",
    links: [
      {
        label: "halo@lumina.id",
        href: "#section-contact",
        copy: "halo@lumina.id",
      },
      {
        label: "lapor@lumina.id",
        href: "#section-contact",
        copy: "lapor@lumina.id",
      },
      { label: "Jakarta, Indonesia", href: "#section-contact" },
      { label: "Senin–Jumat, 09.00–18.00", href: "#section-contact" },
    ],
  },
  {
    title: "STATUS FITUR",
    links: [
      { label: "Pemeriksaan — aktif", href: "#section-home" },
      { label: "Modul belajar — satu selesai", href: "#section-programs" },
      { label: "Simulasi — rencana", href: "#section-programs" },
      { label: "Laporan otomatis — rencana", href: "#section-programs" },
    ],
  },
];

export const bookingCopy = {
  badge: "AKSES LUMINA",
  title: "Ikuti perkembangan Lumina",
  body: "Tinggalkan email supaya kami bisa mengabari saat modul dan simulasi baru tersedia.",
  programLabel: "Pilihan akses",
  formatLabel: "Kanal kabar",
  dayLabel: "Waktu baca",
  formats: ["Email", "Belum diputuskan"],
  days: ["Akhir pekan", "Malam hari", "Kapan saja"],
  submit: "Simpan minat",
  feedback: (email: string) =>
    `✓ ${email} tercatat di peramban ini. Demo ini belum mengirim data ke server.`,
  toast: "Minat tercatat di peramban ini",
  waitlistProgram: "Akses pendukung Lumina",
  newsProgram: "Kabar modus baru",
};

export const promoEnabledMessage =
  "Pemeriksaan contoh aktif — coba tempel pesanmu sendiri.";

export const privacyMessage =
  "Pemeriksaan berjalan di perangkatmu. Teks tidak disimpan di server.";
