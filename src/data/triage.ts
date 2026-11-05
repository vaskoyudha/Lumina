/**
 * Emergency triage — three most common situations (§5-D).
 *
 * Rules that make this credible (§5-D): no gamification, no score, no
 * "selamat!". Numbered order, not a bullet list. Every step is something the
 * person can do in the next ten minutes.
 */

export interface TriageStep {
  do: string;
  /** Why this step matters. Shown small, never as a lecture. */
  why: string;
  /** Official channel, only when there is one. */
  href?: string;
  hrefLabel?: string;
}

export interface TriageCase {
  id: string;
  /** What the person says happened, in their words. */
  trigger: string;
  title: string;
  /** Shown first: what NOT to do anymore. One sentence. */
  stop: string;
  steps: TriageStep[];
}

export const TRIAGE_CASES: readonly TriageCase[] = [
  {
    id: "otp-diberikan",
    trigger: "Saya sudah memberikan kode OTP",
    title: "OTP sudah diberikan ke pelaku",
    stop: "Jangan beri kode berikutnya, walau penelepon mengaku dari bank.",
    steps: [
      {
        do: "Telepon bank lewat nomor di belakang kartu ATM, bukan nomor penelepon.",
        why: "Blokir akses m-banking dan minta pembekuan sementara.",
      },
      {
        do: "Minta bank membekukan transaksi dan mencatat nomor penelepon.",
        why: "Transfer masih bisa dicegat kalau dilaporkan dalam hitungan menit.",
      },
      {
        do: "Ganti PIN dan password m-banking dari perangkat sendiri.",
        why: "Akun yang sudah dibuka pelaku masih bisa dipakai lagi.",
      },
      {
        do: "Cek mutasi dan riwayat SMS hari ini, simpan tangkapan layarnya.",
        why: "Ini bukti yang diminta bank dan polisi.",
      },
      {
        do: "Laporkan ke IASC OJK dan cekrekening.id.",
        why: "Rekening pelaku bisa diblokir untuk korban berikutnya.",
        href: "https://iasc.ojk.go.id",
        hrefLabel: "iasc.ojk.go.id",
      },
    ],
  },
  {
    id: "uang-terkirim",
    trigger: "Saya sudah transfer uang ke pelaku",
    title: "Uang sudah ditransfer",
    stop: "Jangan kirim uang tambahan apa pun, termasuk biaya pencairan.",
    steps: [
      {
        do: "Hubungi bank/aplikasi e-wallet sekarang dan minta pembekuan tujuan.",
        why: "Dana yang belum ditarik pelaku masih bisa ditahan.",
      },
      {
        do: "Catat nomor rekening, nama penerima, nominal, dan jam transfer.",
        why: "Tanpa jam dan nomor rekening, laporan tidak bisa diproses.",
      },
      {
        do: "Laporkan rekening pelaku ke cekrekening.id.",
        why: "Rekening yang dilaporkan ditandai untuk calon korban lain.",
        href: "https://cekrekening.id",
        hrefLabel: "cekrekening.id",
      },
      {
        do: "Buat laporan polisi dengan bukti transfer dan percakapan.",
        why: "Bank sering meminta surat laporan polisi untuk memproses refund.",
      },
      {
        do: "Simpan semua chat; jangan blokir pelaku sebelum bukti diunduh.",
        why: "Chat terhapus tidak bisa dijadikan bukti.",
      },
    ],
  },
  {
    id: "tautan-diklik",
    trigger: "Saya sudah mengklik tautan mencurigakan",
    title: "Tautan phishing sudah diklik",
    stop: "Jangan masukkan password atau kode OTP lagi di halaman yang terbuka dari tautan itu.",
    steps: [
      {
        do: "Tutup halaman tautan; jangan isi formulir apa pun, termasuk verifikasi ulang.",
        why: "Halaman itu bisa meminta data bertahap sampai kamu menyerahkan OTP.",
      },
      {
        do: "Ganti password akun yang terkait dari perangkat lain, lalu aktifkan verifikasi dua langkah.",
        why: "Password yang sudah diketik di halaman palsu harus dianggap bocor.",
      },
      {
        do: "Keluarkan sesi yang tidak dikenal di pengaturan keamanan akun dan email.",
        why: "Pelaku sering menyisakan sesi aktif agar bisa masuk lagi besok.",
      },
      {
        do: "Cek mutasi rekening dan tagihan; hubungi bank kalau ada transaksi asing.",
        why: "Transaksi kecil di awal biasanya uji coba sebelum pencurian besar.",
      },
      {
        do: "Laporkan tautannya ke Komdigi dan cek nomor pengirimnya.",
        why: "Laporan mempercepat pemblokiran tautan untuk korban berikutnya.",
        href: "https://aduannomor.id",
        hrefLabel: "aduannomor.id",
      },
    ],
  },
  {
    id: "lowongan-palsu",
    trigger: "Saya ditawari kerja atau tugas online berbayar",
    title: "Lowongan kerja atau tugas berbayar palsu",
    stop: "Jangan transfer uang apa pun lagi, termasuk biaya pelatihan, deposit, atau top-up.",
    steps: [
      {
        do: "Hentikan semua transfer dan top-up ke aplikasi atau rekening yang diminta.",
        why: "Skema ini hidup dari biaya yang terus bertambah sebelum pencairan palsu.",
      },
      {
        do: "Simpan tangkapan layar iklan, chat, nomor rekening, dan bukti transfer.",
        why: "Nomor rekening dan jam transfer adalah bukti yang dipakai bank.",
      },
      {
        do: "Laporkan rekening penerima ke cekrekening.id.",
        why: "Rekening yang dilaporkan ditandai untuk calon korban lain.",
      },
      {
        do: "Laporkan lowongan dan akun perekrut ke platform tempat kamu menemukannya.",
        why: "Akun yang dilaporkan berhenti menjangkau pencari kerja baru.",
        href: "https://cekrekening.id",
        hrefLabel: "cekrekening.id",
      },
      {
        do: "Beri tahu teman yang ikut ditawari; jangan menunggu sampai mereka transfer.",
        why: "Skema ini menyebar lewat ajakan orang yang sudah lebih dulu masuk.",
      },
    ],
  },
  {
    id: "apk-terpasang",
    trigger: "Saya sudah menginstal file APK",
    title: "APK sudah terpasang di ponsel",
    stop: "Jangan login m-banking dari ponsel itu sampai aplikasinya dihapus.",
    steps: [
      {
        do: "Aktifkan mode pesawat, lalu hapus aplikasi yang baru terpasang.",
        why: "APK jenis ini membaca SMS OTP dan mencuri sesi m-banking.",
      },
      {
        do: "Cabut izin SMS, Aksesibilitas, dan Notifikasi untuk aplikasi tak dikenal.",
        why: "Izin aksesibilitas membuat pelaku bisa mengendalikan layar.",
      },
      {
        do: "Telepon bank dan minta penggantian kartu serta reset akses.",
        why: "Kredensial yang sudah terbaca tetap berlaku walau APK dihapus.",
      },
      {
        do: "Ganti password email, m-banking, dan akun lain dari perangkat lain.",
        why: "Email sering dipakai untuk reset password berikutnya.",
      },
      {
        do: "Periksa transaksi 7 hari terakhir, bukan hanya hari ini.",
        why: "Pencurian sering dilakukan beberapa hari setelah APK dipasang.",
      },
    ],
  },
] as const;

export const OFFICIAL_CHANNELS = [
  { label: "IASC OJK", href: "https://iasc.ojk.go.id" },
  { label: "CekRekening.id", href: "https://cekrekening.id" },
  { label: "Komdigi", href: "https://aduannomor.id" },
  { label: "Lapor Polisi", href: "https://patrolisiber.id" },
] as const;
