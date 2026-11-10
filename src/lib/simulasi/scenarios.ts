import type { SimulationContent } from "@/lib/content/schema";

/**
 * Playable missions beyond the first APK level. Every scenario is deliberately
 * short (three chapters, three endings) and uses only the `report` tool: the
 * lesson is about verifying a channel and keeping secrets, not about operating
 * a device. `validateScenario` runs on import through the content schema, so a
 * broken branch fails the build instead of shipping as a dead end.
 */

const BASE_HUD = {
  panic: {
    start: 0,
    max: 100,
    fail_at: 100,
    fail_message:
      "Tekanan sudah terlalu tinggi. Berhenti sejenak, lalu coba lagi dengan langkah yang berbeda.",
  },
  intrusion: {
    start: 0,
    max: 100,
    rate_per_second: 4,
    fail_message:
      "Akses yang kamu berikan dibiarkan terbuka terlalu lama. Dalam latihan ini, tutup akses dan cari bantuan dari perangkat lain yang aman.",
  },
} as const;

const GRADES = [
  { min: 70, label: "mantap" },
  { min: 0, label: "terus belajar" },
];

const REPORT_TOOL = {
  id: "report",
  name: "Berkas bukti",
  unlocked_at: "intro",
} as const;

export const L2_PHISHING_TAUTAN: SimulationContent = {
  moduleNo: 7,
  scenario: {
    scenario: {
      id: "L2-phishing-tautan",
      level: 2,
      title: "Tautan sebelum saldo",
      difficulty: "mudah",
    },
    hud: BASE_HUD,
    tools: [REPORT_TOOL],
    start: "intro",
    nodes: [
      {
        id: "intro",
        chapter: 1,
        type: "message",
        speaker: "CS Bank Nusa · Verifikasi",
        text: "Ibu Nadia, rekening Anda terdeteksi transaksi mencurigakan. Saldo akan diblokir dalam 30 menit. Verifikasi sekarang di bank-nusa-aman.co.id/verifikasi.",
        delay_ms: 800,
        next: "decision",
      },
      {
        id: "decision",
        chapter: 1,
        type: "choice",
        prompt: "Pesan mendesak dengan tautan. Apa langkahmu?",
        choices: [
          {
            label: "Buka aplikasi bank dari layar utama, bukan tautan di pesan",
            verdict: "benar",
            rationale:
              "Kanal yang kamu pilih sendiri tidak bisa dipalsukan oleh pengirim pesan.",
            tactic: "authority",
            next: "verify",
          },
          {
            label: "Klik tautan untuk melihat halaman verifikasinya",
            verdict: "salah",
            rationale:
              "Halaman tiruan bisa menyalin logo dan warna. Yang membedakan adalah domain dan kanal tempat kamu membukanya.",
            panic: 15,
            tactic: "urgency",
            next: "recover",
          },
          {
            label: "Balas pesan dan tanyakan nomor telepon resmi bank",
            verdict: "salah",
            rationale:
              "Nomor yang diberikan pengirim belum tentu nomor resmi. Cari nomor dari aplikasi atau situs bank yang kamu buka sendiri.",
            panic: 10,
            tactic: "authority",
            next: "recover",
          },
        ],
      },
      {
        id: "verify",
        chapter: 2,
        type: "message",
        speaker: "Aplikasi Bank Nusa",
        text: "Kamu membuka aplikasi bank sendiri. Tidak ada notifikasi pemblokiran, dan saldo masih utuh. Nomor CS resmi ada di menu Bantuan.",
        delay_ms: 900,
        next: "report-success",
      },
      {
        id: "report-success",
        chapter: 3,
        type: "tool_task",
        tool: "report",
        prompt:
          "Simpan bukti yang aman sebelum melanjutkan. Pilih dua bukti yang tidak memuat kode rahasia.",
        on_success: "ending-success",
      },
      {
        id: "recover",
        chapter: 2,
        type: "choice",
        prompt:
          "Tautan sudah terbuka. Halaman itu meminta nomor kartu, PIN, dan kode OTP. Apa yang kamu lakukan?",
        choices: [
          {
            label:
              "Tutup halaman, lalu hubungi bank lewat nomor resmi dari aplikasi",
            verdict: "benar",
            rationale:
              "Kamu menghentikan kebocoran sebelum kredensial dikirim.",
            tactic: "urgency",
            next: "report-recovery",
          },
          {
            label: "Isi data agar rekening tidak diblokir",
            verdict: "salah",
            rationale:
              "PIN dan OTP tidak pernah diminta lewat halaman verifikasi. Data itu memberi pelaku akses penuh.",
            panic: 30,
            tactic: "secret",
            sharesOtp: true,
            next: "ending-compromised",
          },
        ],
      },
      {
        id: "report-recovery",
        chapter: 3,
        type: "tool_task",
        tool: "report",
        prompt:
          "Kamu menutup halaman sebelum mengirim data. Simpan bukti percakapan dan alamat tautan untuk laporan.",
        on_success: "ending-recovery",
      },
      {
        id: "ending-success",
        chapter: 3,
        type: "ending",
        variant: "success",
        title: "Saldo aman karena kamu memilih kanal sendiri.",
        text: "Kamu tidak mengetik kredensial di tautan. Verifikasi lewat aplikasi bank menunjukkan tidak ada pemblokiran. Dalam latihan ini, rekening dan kode rahasia tetap aman.",
        debrief: [
          "Buka aplikasi atau situs bank dengan alamat yang kamu ketik sendiri, bukan tautan dari pesan.",
          "Domain tiruan bisa menyalin tampilan resmi. Periksa alamat, bukan hanya logo dan warna.",
          "Bank tidak meminta PIN atau OTP lewat halaman verifikasi.",
          "Simpan bukti percakapan dan laporkan nomor pengirim melalui kanal resmi.",
        ],
      },
      {
        id: "ending-recovery",
        chapter: 3,
        type: "ending",
        variant: "recovery",
        title: "Kamu hampir terjebak, lalu menutup halaman.",
        text: "Halaman tiruan sempat terbuka, tetapi kamu berhenti sebelum mengirim PIN atau OTP. Hubungi bank lewat kanal resmi, pantau mutasi, dan ganti kata sandi dari perangkat lain.",
        debrief: [
          "Menutup halaman sebelum mengirim data membatasi kerugian.",
          "Jika ragu, hubungi bank lewat nomor yang ada di aplikasi resmi.",
          "Pantau mutasi rekening dan aktifkan notifikasi transaksi.",
          "Simpan bukti tautan dan percakapan untuk laporan.",
        ],
      },
      {
        id: "ending-compromised",
        chapter: 3,
        type: "ending",
        variant: "compromised",
        title: "Data telanjur dikirim. Saldo bisa berpindah.",
        text: "Dalam latihan ini PIN dan OTP masuk ke halaman palsu. Segera hubungi bank lewat nomor resmi, blokir kartu, dan ganti kata sandi dari perangkat lain yang aman.",
        debrief: [
          "PIN dan OTP adalah kunci akun. Jangan pernah memasukkannya di halaman yang dibuka dari pesan.",
          "Hubungi bank lewat kanal resmi dari perangkat lain yang aman.",
          "Blokir kartu atau akun yang mungkin sudah diakses pelaku.",
          "Simpan bukti untuk laporan dan pantau transaksi berikutnya.",
        ],
      },
    ],
    scoring: { grades: GRADES },
  },
  mission: {
    title: "Tautan sebelum saldo",
    role: "Kamu adalah Nadia",
    context:
      "Sore ini kamu menerima pesan yang mengaku dari bank. Saldo rekeningmu disebut akan diblokir dalam 30 menit jika tidak segera diverifikasi. Tautan di pesan terlihat mirip dengan aplikasi bankmu.",
    objective:
      "Pastikan status rekening tanpa mengetik kredensial di tautan yang dikirim orang lain.",
    duration: "3–5 menit",
    contact: "CS Bank Nusa · Verifikasi",
    contactDetail: "Nomor tidak tersimpan · tautan belum diverifikasi",
    chapters: ["Pesan masuk", "Periksa kanal", "Amankan bukti"],
  },
  tactics: [
    {
      id: "urgency",
      name: "Diburu waktu",
      quote: "Saldo Anda akan diblokir dalam 30 menit.",
      lesson:
        "Batas waktu buatan membuat kita berhenti memeriksa. Ambil jeda sebelum mengetuk tautan.",
    },
    {
      id: "authority",
      name: "Meminjam kepercayaan",
      quote: "Kami dari bagian verifikasi Bank Nusa.",
      lesson:
        "Nama dan logo bukan verifikasi. Buka aplikasi atau situs bank yang kamu cari sendiri.",
    },
    {
      id: "attachment",
      name: "Tautan menyamar",
      quote: "Verifikasi sekarang di bank-nusa-aman.co.id.",
      lesson:
        "Alamat yang mirip bukan alamat resmi. Periksa domain sebelum mengetik apa pun.",
    },
    {
      id: "secret",
      name: "Memancing kode rahasia",
      quote: "Masukkan PIN dan kode OTP untuk membuka blokir.",
      lesson:
        "PIN dan OTP tidak pernah diminta lewat halaman verifikasi. Jangan pernah membagikannya.",
    },
  ],
  permissions: [
    {
      id: "notifikasi",
      label: "Akses notifikasi",
      detail: "Dapat membaca kode verifikasi yang masuk.",
    },
  ],
  reportArtifacts: [
    { id: "pesan", label: "Tangkapan layar percakapan", safe: true },
    { id: "pengirim", label: "Identitas pengirim yang terlihat", safe: true },
    { id: "tautan", label: "Alamat tautan lengkap", safe: true },
    { id: "otp", label: "PIN, OTP, dan nomor kartu", safe: false },
  ],
  chapterNotes: [
    "Pesan mendesak menekan kamu untuk membuka tautan.",
    "Verifikasi lewat aplikasi atau nomor resmi yang kamu cari sendiri.",
    "Simpan bukti yang aman, lalu tutup akses yang bocor.",
  ],
  summary: [
    "Periksa domain sebelum mengetuk tautan.",
    "Bank tidak meminta PIN atau OTP lewat halaman verifikasi.",
    "Gunakan aplikasi resmi untuk memeriksa status rekening.",
  ],
  tips: [
    "Jangan pernah membagikan PIN atau kode OTP.",
    "Ketik alamat bank sendiri; jangan ikuti tautan dari pesan.",
    "Simpan tangkapan layar sebelum memblokir pengirim.",
  ],
};

export const L3_LOWONGAN_BERBAYAR: SimulationContent = {
  moduleNo: 4,
  scenario: {
    scenario: {
      id: "L3-lowongan-berbayar",
      level: 3,
      title: "Kerja sampingan yang minta modal",
      difficulty: "mudah",
    },
    hud: BASE_HUD,
    tools: [REPORT_TOOL],
    start: "intro",
    nodes: [
      {
        id: "intro",
        chapter: 1,
        type: "message",
        speaker: "Rekruter Tugas Cepat · Grup WhatsApp",
        text: "Halo Bima! Tugas ringan, bayaran cepat. Likes dan subscribe saja, Rp150.000 per hari. Slot tinggal dua. Aktifkan dengan setor saldo tugas Rp250.000, nanti kembali plus komisi.",
        delay_ms: 800,
        next: "decision",
      },
      {
        id: "decision",
        chapter: 1,
        type: "choice",
        prompt:
          "Tawaran terdengar mudah, tetapi ada setoran di depan. Apa responsmu?",
        choices: [
          {
            label:
              "Cari nama perusahaan dan lowongan resminya sebelum membalas",
            verdict: "benar",
            rationale:
              "Perusahaan yang sah tidak meminta calon pekerja menyetor uang untuk memulai.",
            tactic: "authority",
            next: "verify",
          },
          {
            label: "Setor Rp250.000 karena nanti dikembalikan",
            verdict: "salah",
            rationale:
              "Setoran awal adalah inti kerugian. Uang itu biasanya tidak kembali, dan pelaku akan meminta setoran berikutnya.",
            panic: 20,
            tactic: "urgency",
            next: "recover",
          },
          {
            label: "Ikuti grup dan kerjakan tugas pertama tanpa setor",
            verdict: "salah",
            rationale:
              "Tugas pertama yang dibayar kecil dipakai untuk membangun kepercayaan sebelum setoran besar.",
            panic: 10,
            tactic: "urgency",
            next: "recover",
          },
        ],
      },
      {
        id: "verify",
        chapter: 2,
        type: "message",
        speaker: "Hasil pencarian",
        text: "Kamu mencari nama Tugas Cepat di situs perusahaan dan media sosial. Tidak ada badan usaha resmi, alamat, atau kontrak. Beberapa korban menyebut setoran yang tidak kembali.",
        delay_ms: 900,
        next: "report-success",
      },
      {
        id: "report-success",
        chapter: 3,
        type: "tool_task",
        tool: "report",
        prompt:
          "Simpan bukti tawaran dan nomor rekening tujuan. Jangan sertakan data pribadi.",
        on_success: "ending-success",
      },
      {
        id: "recover",
        chapter: 2,
        type: "choice",
        prompt:
          "Rekruter mengirim grup berisi bukti transfer peserta lain dan meminta setoran segera. Apa yang kamu lakukan?",
        choices: [
          {
            label: "Keluar dari grup dan laporkan akun tanpa mengirim uang",
            verdict: "benar",
            rationale:
              "Bukti transfer di grup bisa dibuat-buat. Berhenti sebelum uang berpindah.",
            tactic: "urgency",
            next: "report-recovery",
          },
          {
            label: "Setor sekarang supaya slot tidak diambil orang lain",
            verdict: "salah",
            rationale:
              "Rasa takut kehilangan slot adalah tekanan buatan. Tidak ada pekerjaan sah yang meminta modal.",
            panic: 30,
            tactic: "urgency",
            next: "ending-compromised",
          },
        ],
      },
      {
        id: "report-recovery",
        chapter: 3,
        type: "tool_task",
        tool: "report",
        prompt:
          "Kamu belum mengirim uang. Simpan bukti percakapan dan nomor rekening untuk laporan.",
        on_success: "ending-recovery",
      },
      {
        id: "ending-success",
        chapter: 3,
        type: "ending",
        variant: "success",
        title: "Tawaran palsu berhenti sebelum uang berpindah.",
        text: "Kamu tidak menyetor saldo tugas. Pencarian menunjukkan tidak ada perusahaan resmi di balik tawaran itu. Dalam latihan ini, uangmu tetap utuh.",
        debrief: [
          "Pekerjaan yang sah tidak meminta calon pekerja membayar untuk memulai.",
          "Periksa nama perusahaan, alamat, dan kontrak sebelum membalas.",
          "Bukti transfer di grup bisa dibuat-buat untuk membangun kepercayaan.",
          "Laporkan akun dan simpan bukti sebelum memblokirnya.",
        ],
      },
      {
        id: "ending-recovery",
        chapter: 3,
        type: "ending",
        variant: "recovery",
        title: "Kamu sempat masuk grup, lalu keluar sebelum menyetor.",
        text: "Kamu melihat tekanan dan bukti transfer palsu, tetapi berhenti sebelum mengirim uang. Blokir akun rekruter dan laporkan grupnya.",
        debrief: [
          "Berhenti sebelum uang berpindah adalah keputusan yang tepat.",
          "Jangan percaya bukti transfer yang dikirim orang yang ingin kamu bayar.",
          "Blokir dan laporkan akun rekruter.",
          "Ceritakan pola ini kepada orang lain yang sedang mencari kerja.",
        ],
      },
      {
        id: "ending-compromised",
        chapter: 3,
        type: "ending",
        variant: "compromised",
        title: "Setoran pertama dikirim. Pelaku akan meminta lagi.",
        text: "Dalam latihan ini Rp250.000 berpindah ke rekening pelaku. Hubungi bank lewat kanal resmi, simpan bukti transfer, dan laporkan nomor rekening tujuan.",
        debrief: [
          "Setoran awal pada tawaran kerja adalah tanda penipuan.",
          "Hubungi bank lewat kanal resmi untuk mencoba menghentikan transaksi.",
          "Simpan bukti transfer dan percakapan untuk laporan.",
          "Jangan mengirim setoran berikutnya meskipun dijanjikan pengembalian.",
        ],
      },
    ],
    scoring: { grades: GRADES },
  },
  mission: {
    title: "Kerja sampingan yang minta modal",
    role: "Kamu adalah Bima",
    context:
      "Kamu sedang mencari penghasilan tambahan. Sebuah akun mengirim tawaran tugas like dan subscribe dengan bayaran Rp150.000 per hari. Untuk memulai, kamu diminta menyetor saldo tugas Rp250.000.",
    objective:
      "Pisahkan tawaran kerja yang sah dari skema yang meminta uang di depan.",
    duration: "3–5 menit",
    contact: "Rekruter Tugas Cepat · Grup WhatsApp",
    contactDetail: "Akun baru · tidak ada kontrak atau perusahaan resmi",
    chapters: ["Tawaran masuk", "Periksa perusahaan", "Hentikan setoran"],
  },
  tactics: [
    {
      id: "urgency",
      name: "Slot hampir habis",
      quote: "Slot tinggal dua, aktifkan sekarang.",
      lesson:
        "Kelangkaan buatan membuat kita takut kehilangan kesempatan. Periksa dulu, jangan buru-buru membayar.",
    },
    {
      id: "authority",
      name: "Meminjam kepercayaan",
      quote: "Kami dari Tugas Cepat, sudah banyak member.",
      lesson:
        "Nama dan grup bukan badan usaha. Cari perusahaan, alamat, dan kontraknya.",
    },
    {
      id: "attachment",
      name: "Bukti yang dibuat",
      quote: "Ini bukti transfer peserta lain, semua dibayar.",
      lesson:
        "Tangkapan layar mudah dibuat. Bukti dari orang yang meminta uangmu bukan verifikasi.",
    },
    {
      id: "secret",
      name: "Data yang dipancing",
      quote: "Kirim data diri dan nomor rekening untuk pencairan.",
      lesson:
        "Data pribadi dan rekening tidak diperlukan untuk melamar kerja lewat chat.",
    },
  ],
  permissions: [
    {
      id: "notifikasi",
      label: "Akses notifikasi",
      detail: "Dapat membaca pesan dan kode verifikasi yang masuk.",
    },
  ],
  reportArtifacts: [
    { id: "pesan", label: "Tangkapan layar percakapan", safe: true },
    { id: "pengirim", label: "Identitas pengirim yang terlihat", safe: true },
    { id: "rekening", label: "Nomor rekening tujuan", safe: true },
    { id: "otp", label: "Kode OTP dan PIN", safe: false },
  ],
  chapterNotes: [
    "Tawaran kerja datang dengan tekanan slot dan setoran awal.",
    "Periksa perusahaan dan kontrak sebelum membayar apa pun.",
    "Hentikan setoran, simpan bukti, lalu laporkan.",
  ],
  summary: [
    "Pekerjaan sah tidak meminta modal di depan.",
    "Bukti transfer di grup bisa dibuat-buat.",
    "Periksa nama perusahaan dan kontrak sebelum membalas.",
  ],
  tips: [
    "Jangan menyetor uang untuk mendapatkan pekerjaan.",
    "Cari lowongan di kanal resmi perusahaan.",
    "Simpan bukti transfer dan percakapan jika terlanjur membayar.",
  ],
};

export const L3_PINJOL_FIKTIF: SimulationContent = {
  moduleNo: 9,
  scenario: {
    scenario: {
      id: "L3-pinjol-fiktif",
      level: 3,
      title: "Pinjaman yang meminta akses",
      difficulty: "mudah",
    },
    hud: BASE_HUD,
    tools: [REPORT_TOOL],
    start: "intro",
    nodes: [
      {
        id: "intro",
        chapter: 1,
        type: "message",
        speaker: "Pinjaman Cepat · Admin",
        text: "Butuh dana cepat? Limit Rp5.000.000, cair 10 menit. Cukup pasang aplikasi kami dan izinkan akses kontak. Biaya admin Rp300.000 dibayar di awal.",
        delay_ms: 800,
        next: "decision",
      },
      {
        id: "decision",
        chapter: 1,
        type: "choice",
        prompt:
          "Pinjaman cepat dengan akses kontak dan biaya di muka. Apa langkahmu?",
        choices: [
          {
            label: "Cek izin OJK dan ulasan aplikasi sebelum memasang",
            verdict: "benar",
            rationale:
              "Penyelenggara resmi terdaftar di OJK. Izin dan kanal pengaduan bisa diperiksa sebelum kamu menyerahkan data.",
            tactic: "authority",
            next: "verify",
          },
          {
            label: "Pasang aplikasi karena butuh dana cepat",
            verdict: "salah",
            rationale:
              "Akses kontak bisa dipakai menekan kamu dan menghubungi orang terdekat.",
            panic: 20,
            compromisesDevice: true,
            tactic: "urgency",
            next: "recover",
          },
          {
            label: "Bayar biaya admin dulu supaya pinjaman cair",
            verdict: "salah",
            rationale:
              "Biaya di muka sebelum dana cair adalah pola pinjol ilegal. Dana yang dijanjikan sering tidak pernah masuk.",
            panic: 15,
            tactic: "urgency",
            next: "recover",
          },
        ],
      },
      {
        id: "verify",
        chapter: 2,
        type: "message",
        speaker: "Daftar OJK",
        text: "Kamu memeriksa daftar OJK. Nama aplikasi itu tidak ada. Ulasannya dipenuhi keluhan teror kontak dan biaya yang terus bertambah.",
        delay_ms: 900,
        next: "report-success",
      },
      {
        id: "report-success",
        chapter: 3,
        type: "tool_task",
        tool: "report",
        prompt:
          "Simpan bukti tawaran dan nama aplikasi. Jangan pasang berkasnya.",
        on_success: "ending-success",
      },
      {
        id: "recover",
        chapter: 2,
        type: "choice",
        prompt:
          "Aplikasi sudah terpasang dan meminta izin kontak. Admin menekanmu agar segera menyetujui. Apa yang kamu lakukan?",
        choices: [
          {
            label: "Cabut izin, hapus aplikasi, dan blokir admin",
            verdict: "benar",
            rationale:
              "Menghentikan akses sekarang membatasi data yang bisa diambil.",
            tactic: "urgency",
            next: "report-recovery",
          },
          {
            label: "Setujui akses kontak agar pinjaman segera cair",
            verdict: "salah",
            rationale:
              "Daftar kontak bisa dipakai untuk meneror kamu dan orang lain. Dana yang dijanjikan belum tentu cair.",
            panic: 30,
            compromisesDevice: true,
            tactic: "secret",
            next: "ending-compromised",
          },
        ],
      },
      {
        id: "report-recovery",
        chapter: 3,
        type: "tool_task",
        tool: "report",
        prompt:
          "Kamu menghentikan aplikasi sebelum dana cair. Simpan bukti percakapan dan nama aplikasi.",
        on_success: "ending-recovery",
      },
      {
        id: "ending-success",
        chapter: 3,
        type: "ending",
        variant: "success",
        title: "Pinjaman ilegal dikenali sebelum aplikasi dipasang.",
        text: "Kamu tidak memasang aplikasi atau membayar biaya admin. Pemeriksaan OJK menunjukkan penyelenggara itu tidak terdaftar. Dalam latihan ini, data dan uangmu tetap aman.",
        debrief: [
          "Periksa izin OJK sebelum memakai aplikasi pinjaman.",
          "Biaya di muka sebelum dana cair adalah tanda pinjol ilegal.",
          "Akses kontak bukan syarat wajar untuk pinjaman.",
          "Laporkan tawaran dan simpan bukti tanpa memasang aplikasinya.",
        ],
      },
      {
        id: "ending-recovery",
        chapter: 3,
        type: "ending",
        variant: "recovery",
        title: "Aplikasi sempat terpasang, lalu kamu mencabut aksesnya.",
        text: "Kamu berhenti sebelum memberi izin kontak. Hapus aplikasi, blokir admin, dan pantau apakah ada pesan mencurigakan ke kontakmu.",
        debrief: [
          "Cabut izin dan hapus aplikasi sebelum data diambil.",
          "Blokir admin dan simpan bukti percakapan.",
          "Beri tahu orang terdekat agar waspada pesan mencurigakan.",
          "Periksa izin aplikasi lain dan cabut yang tidak diperlukan.",
        ],
      },
      {
        id: "ending-compromised",
        chapter: 3,
        type: "ending",
        variant: "compromised",
        title: "Akses kontak diberikan. Data pribadi kini di tangan pelaku.",
        text: "Dalam latihan ini daftar kontak terbuka. Pelaku bisa menghubungi orang terdekatmu untuk menekan atau meminta uang. Cabut izin, hapus aplikasi, dan beri tahu kontakmu.",
        debrief: [
          "Akses kontak bisa berubah menjadi teror dan pemerasan.",
          "Cabut izin, hapus aplikasi, dan blokir admin.",
          "Beri tahu orang terdekat agar tidak menanggapi pesan yang mengatasnamakanmu.",
          "Laporkan aplikasi ke OJK dan simpan bukti.",
        ],
      },
    ],
    scoring: { grades: GRADES },
  },
  mission: {
    title: "Pinjaman yang meminta akses",
    role: "Kamu adalah Sari",
    context:
      "Kamu butuh dana cepat untuk biaya kuliah. Sebuah aplikasi pinjaman menawarkan Rp5.000.000 tanpa syarat, tetapi meminta akses kontak dan biaya administrasi di muka.",
    objective:
      "Kenali pinjaman ilegal sebelum memasang aplikasi atau menyerahkan data.",
    duration: "3–5 menit",
    contact: "Pinjaman Cepat · Admin",
    contactDetail: "Aplikasi di luar toko resmi · izin OJK belum jelas",
    chapters: ["Tawaran pinjaman", "Periksa izin", "Lindungi data"],
  },
  tactics: [
    {
      id: "urgency",
      name: "Dana cepat",
      quote: "Limit Rp5.000.000, cair 10 menit.",
      lesson:
        "Kecepatan adalah umpan. Pinjaman resmi tetap punya proses verifikasi dan dokumen.",
    },
    {
      id: "authority",
      name: "Mengaku resmi",
      quote: "Kami penyelenggara pinjaman terdaftar.",
      lesson: "Cek sendiri di daftar OJK. Klaim di chat bukan bukti izin.",
    },
    {
      id: "attachment",
      name: "Aplikasi di luar toko",
      quote: "Pasang aplikasi dari tautan ini.",
      lesson:
        "Aplikasi di luar toko resmi tidak melewati pemeriksaan keamanan yang sama.",
    },
    {
      id: "secret",
      name: "Akses yang berlebihan",
      quote: "Izinkan akses kontak supaya pinjaman cair.",
      lesson:
        "Pinjaman tidak membutuhkan seluruh daftar kontakmu. Izin berlebihan adalah risiko.",
    },
  ],
  permissions: [
    {
      id: "kontak",
      label: "Akses kontak",
      detail: "Dapat membaca seluruh daftar kontak di perangkat.",
    },
  ],
  reportArtifacts: [
    { id: "pesan", label: "Tangkapan layar percakapan", safe: true },
    { id: "pengirim", label: "Identitas pengirim yang terlihat", safe: true },
    { id: "aplikasi", label: "Nama dan sumber aplikasi", safe: true },
    { id: "kontak", label: "Daftar kontak dan kode OTP", safe: false },
  ],
  chapterNotes: [
    "Tawaran pinjaman datang dengan janji cair cepat dan biaya di muka.",
    "Periksa izin OJK sebelum memasang aplikasi atau membayar.",
    "Cabut akses berlebihan dan lindungi kontakmu.",
  ],
  summary: [
    "Pinjaman resmi terdaftar di OJK.",
    "Biaya di muka sebelum dana cair adalah tanda bahaya.",
    "Akses kontak bukan syarat wajar untuk pinjaman.",
  ],
  tips: [
    "Jangan memasang aplikasi pinjaman dari tautan chat.",
    "Periksa izin aplikasi sebelum memberi akses.",
    "Jika terlanjur memberi akses, cabut izin dan beri tahu kontakmu.",
  ],
};

export const L4_FAKE_CALL: SimulationContent = {
  moduleNo: 2,
  scenario: {
    scenario: {
      id: "L4-fake-call",
      level: 4,
      title: "Telepon dari petugas bank",
      difficulty: "mudah",
    },
    hud: BASE_HUD,
    tools: [REPORT_TOOL],
    start: "intro",
    nodes: [
      {
        id: "intro",
        chapter: 1,
        type: "message",
        speaker: "Petugas Bank Nusa · Telepon",
        text: "Pak Dimas, ada transfer Rp7.500.000 dari rekening Bapak. Kami butuh kode OTP yang baru saja dikirim untuk membatalkannya. Jangan tutup telepon, ini mendesak.",
        delay_ms: 800,
        next: "decision",
      },
      {
        id: "decision",
        chapter: 1,
        type: "choice",
        prompt:
          "Petugas meminta OTP dan melarangmu menutup telepon. Apa yang kamu lakukan?",
        choices: [
          {
            label:
              "Tutup telepon, lalu hubungi nomor CS resmi dari aplikasi bank",
            verdict: "benar",
            rationale:
              "Kamu memutus tekanan dan memverifikasi lewat kanal yang kamu cari sendiri.",
            tactic: "authority",
            next: "verify",
          },
          {
            label: "Sebutkan OTP agar transfer dibatalkan",
            verdict: "salah",
            rationale:
              "OTP adalah kunci transaksi. Petugas bank tidak memintanya lewat telepon.",
            panic: 30,
            tactic: "secret",
            sharesOtp: true,
            next: "ending-compromised",
          },
          {
            label: "Tetap di telepon dan ikuti instruksinya",
            verdict: "salah",
            rationale:
              "Bertahan di telepon membuat kamu terus ditekan. Putuskan dan cari kanal resmi.",
            panic: 15,
            tactic: "urgency",
            next: "recover",
          },
        ],
      },
      {
        id: "verify",
        chapter: 2,
        type: "message",
        speaker: "Aplikasi Bank Nusa",
        text: "Kamu menutup telepon dan membuka aplikasi bank. Tidak ada transfer keluar. Nomor CS resmi ada di menu Bantuan, dan petugas di sana memastikan tidak ada panggilan resmi seperti itu.",
        delay_ms: 900,
        next: "report-success",
      },
      {
        id: "report-success",
        chapter: 3,
        type: "tool_task",
        tool: "report",
        prompt:
          "Simpan nomor penelepon dan ringkasan percakapan. Jangan menyimpan kode OTP.",
        on_success: "ending-success",
      },
      {
        id: "recover",
        chapter: 2,
        type: "choice",
        prompt:
          "Telepon kedua masuk dari nomor berbeda. Penelepon mengaku atasan petugas sebelumnya dan meminta kamu melanjutkan verifikasi. Apa yang kamu lakukan?",
        choices: [
          {
            label: "Tutup telepon dan hubungi bank lewat nomor resmi",
            verdict: "benar",
            rationale:
              "Ganti nomor bukan bukti identitas. Kanal resmi tetap satu-satunya verifikasi.",
            tactic: "authority",
            next: "report-recovery",
          },
          {
            label: "Ikuti instruksi karena sudah dihubungi dua kali",
            verdict: "salah",
            rationale:
              "Pengulangan panggilan adalah tekanan, bukan verifikasi.",
            panic: 30,
            tactic: "urgency",
            next: "ending-compromised",
          },
        ],
      },
      {
        id: "report-recovery",
        chapter: 3,
        type: "tool_task",
        tool: "report",
        prompt:
          "Kamu belum membagikan OTP. Simpan nomor penelepon dan waktu panggilan untuk laporan.",
        on_success: "ending-recovery",
      },
      {
        id: "ending-success",
        chapter: 3,
        type: "ending",
        variant: "success",
        title: "Telepon diputus, OTP tetap aman.",
        text: "Kamu tidak menyebutkan OTP. Verifikasi lewat aplikasi bank menunjukkan tidak ada transfer. Dalam latihan ini, rekening dan kode rahasia tetap aman.",
        debrief: [
          "Bank tidak meminta OTP lewat telepon.",
          "Tutup panggilan dan hubungi nomor resmi dari aplikasi atau situs bank.",
          "Jangan biarkan rasa panik membuatmu tetap di telepon.",
          "Simpan nomor penelepon dan laporkan percobaan penipuan.",
        ],
      },
      {
        id: "ending-recovery",
        chapter: 3,
        type: "ending",
        variant: "recovery",
        title: "Kamu sempat mengikuti panggilan kedua, lalu menutupnya.",
        text: "Kamu berhenti sebelum menyebutkan OTP. Hubungi bank lewat kanal resmi, pantau mutasi, dan blokir nomor penelepon.",
        debrief: [
          "Panggilan berulang bukan bukti bahwa penelepon resmi.",
          "Berhenti sebelum menyebutkan kode rahasia.",
          "Hubungi bank lewat nomor resmi dan pantau mutasi.",
          "Blokir nomor dan laporkan percobaan penipuan.",
        ],
      },
      {
        id: "ending-compromised",
        chapter: 3,
        type: "ending",
        variant: "compromised",
        title: "OTP disebutkan. Transfer bisa dieksekusi dalam hitungan detik.",
        text: "Dalam latihan ini kode OTP masuk ke penelepon palsu. Segera hubungi bank lewat nomor resmi, blokir akses, dan ganti kata sandi dari perangkat lain yang aman.",
        debrief: [
          "OTP adalah kunci transaksi. Jangan pernah menyebutkannya kepada penelepon.",
          "Hubungi bank lewat kanal resmi dari perangkat lain yang aman.",
          "Blokir kartu atau akun yang mungkin sudah diakses pelaku.",
          "Simpan bukti panggilan untuk laporan.",
        ],
      },
    ],
    scoring: { grades: GRADES },
  },
  mission: {
    title: "Telepon dari petugas bank",
    role: "Kamu adalah Dimas",
    context:
      "Kamu sedang di kantor ketika telepon masuk. Suara di seberang mengaku petugas bank dan mengatakan ada transfer mencurigakan. Ia meminta kamu tetap di telepon dan menyebutkan kode OTP.",
    objective: "Mengakhiri panggilan penipuan tanpa menyerahkan kode rahasia.",
    duration: "3–5 menit",
    contact: "Petugas Bank Nusa · Telepon",
    contactDetail: "Nomor tidak tersimpan · identitas belum diverifikasi",
    chapters: ["Telepon masuk", "Putus dan verifikasi", "Amankan akun"],
  },
  tactics: [
    {
      id: "urgency",
      name: "Jangan tutup telepon",
      quote: "Jangan tutup telepon, ini mendesak.",
      lesson:
        "Larangan menutup telepon adalah tekanan. Kamu selalu boleh mengakhiri panggilan.",
    },
    {
      id: "authority",
      name: "Meminjam kepercayaan",
      quote: "Saya petugas bagian keamanan bank.",
      lesson:
        "Suara dan jabatan bukan verifikasi. Hubungi nomor resmi yang kamu cari sendiri.",
    },
    {
      id: "attachment",
      name: "Panggilan berulang",
      quote: "Atasan saya akan menelepon dari nomor lain.",
      lesson:
        "Ganti nomor bukan bukti identitas. Pola panggilan berulang justru menambah tekanan.",
    },
    {
      id: "secret",
      name: "Memancing OTP",
      quote: "Sebutkan kode OTP untuk membatalkan transfer.",
      lesson:
        "OTP tidak pernah diminta lewat telepon. Membagikannya memberi pelaku kendali transaksi.",
    },
  ],
  permissions: [
    {
      id: "notifikasi",
      label: "Akses notifikasi",
      detail: "Dapat membaca kode verifikasi yang masuk.",
    },
  ],
  reportArtifacts: [
    { id: "pesan", label: "Tangkapan layar riwayat panggilan", safe: true },
    { id: "pengirim", label: "Nomor penelepon", safe: true },
    { id: "waktu", label: "Waktu dan durasi panggilan", safe: true },
    { id: "otp", label: "Kode OTP dan PIN", safe: false },
  ],
  chapterNotes: [
    "Penelepon mengaku petugas dan melarangmu menutup telepon.",
    "Putuskan panggilan, lalu verifikasi lewat kanal resmi.",
    "Simpan bukti panggilan dan amankan akun.",
  ],
  summary: [
    "Bank tidak meminta OTP lewat telepon.",
    "Kamu selalu boleh menutup panggilan yang menekan.",
    "Verifikasi lewat nomor resmi yang kamu cari sendiri.",
  ],
  tips: [
    "Jangan menyebutkan OTP kepada siapa pun.",
    "Tutup panggilan dan hubungi bank lewat nomor resmi.",
    "Simpan nomor penelepon untuk laporan.",
  ],
};

export const EXTRA_SIMULATIONS: SimulationContent[] = [
  L2_PHISHING_TAUTAN,
  L3_LOWONGAN_BERBAYAR,
  L3_PINJOL_FIKTIF,
  L4_FAKE_CALL,
];
