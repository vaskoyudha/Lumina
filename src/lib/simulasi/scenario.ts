export type ToolId = "isolation" | "permissions" | "report";
export type TacticId = "urgency" | "authority" | "attachment" | "secret";

export type ScenarioChoice = {
  label: string;
  verdict: "benar" | "salah";
  rationale?: string;
  panic?: number;
  tactic?: TacticId;
  compromisesDevice?: boolean;
  sharesOtp?: boolean;
  next: string;
};

type Scene = { id: string; chapter?: 1 | 2 | 3 };
export type ScenarioNode = Scene &
  (
    | {
        type: "message";
        speaker: string;
        text: string;
        next: string;
        delay_ms?: number;
        attachment?: { name: string; detail: string };
      }
    | { type: "choice"; prompt: string; choices: ScenarioChoice[] }
    | {
        type: "tool_task";
        tool: ToolId;
        prompt: string;
        on_success: string;
      }
    | {
        type: "ending";
        variant: "success" | "recovery" | "compromised";
        title: string;
        text: string;
        debrief: [string, string, string, string];
      }
  );

export type Scenario = {
  scenario: { id: string; level: number; title: string; difficulty: "mudah" };
  hud: {
    panic: {
      start: number;
      max: number;
      fail_at: number;
      fail_message: string;
    };
    intrusion: {
      start: number;
      max: number;
      rate_per_second: number;
      fail_message: string;
    };
  };
  tools: { id: ToolId; name: string; unlocked_at: string }[];
  start: string;
  nodes: ScenarioNode[];
  scoring: { grades: { min: number; label: string }[] };
};

export const MISSION = {
  title: "Paket sebelum pulang",
  role: "Kamu adalah Raka",
  context:
    "Besok ulang tahun Ibu. Hadiah yang kamu pesan belum datang, sementara kamu harus segera pulang kerja. Sebuah pesan kurir masuk. Kebetulan, atau jebakan?",
  objective: "Pastikan kabar paket tanpa menyerahkan kendali ponselmu.",
  duration: "3–5 menit",
  contact: "Dimas · Pengantaran",
  contactDetail: "Nomor tidak tersimpan · identitas belum terverifikasi",
  chapters: ["Pesan masuk", "Ambil kendali", "Tutup celah"],
};

export const TACTICS: {
  id: TacticId;
  name: string;
  quote: string;
  lesson: string;
}[] = [
  {
    id: "urgency",
    name: "Diburu waktu",
    quote: "Kalau tidak, paketnya saya bawa kembali, ya.",
    lesson:
      "Batas waktu buatan membuat kita berhenti memeriksa. Ambil jeda sebelum memutuskan.",
  },
  {
    id: "authority",
    name: "Meminjam kepercayaan",
    quote: "Sore, Kak Raka. Saya di depan alamat pengiriman.",
    lesson:
      "Nama dan foto profil bukan verifikasi. Buka aplikasi atau kanal resmi yang kamu cari sendiri.",
  },
  {
    id: "attachment",
    name: "File menyamar",
    quote: "Ini foto paketnya, pasang dulu supaya fotonya terbuka.",
    lesson:
      "Berkas .apk memasang aplikasi Android, bukan membuka foto. Periksa jenis berkas sebelum bertindak.",
  },
  {
    id: "secret",
    name: "Memancing kode rahasia",
    quote: "sebutkan kode SMS-nya supaya paket bisa dilepas.",
    lesson:
      "OTP adalah rahasia akun atau transaksi. Jangan kirimkan kepada pengirim pesan, termasuk yang mengaku petugas.",
  },
];

export const REPORT_ARTIFACTS = [
  { id: "pesan", label: "Tangkapan layar percakapan", safe: true },
  { id: "pengirim", label: "Identitas pengirim yang terlihat", safe: true },
  { id: "nama-file", label: "Nama berkas yang dikirim", safe: true },
  { id: "otp", label: "Kode OTP dan PIN akun", safe: false },
] as const;
export const PERMISSIONS = [
  {
    id: "sms",
    label: "Baca SMS",
    detail: "Dapat membaca pesan dan kode verifikasi.",
  },
  {
    id: "accessibility",
    label: "Layanan aksesibilitas",
    detail: "Dapat mengamati layar dan melakukan tindakan atas namamu.",
  },
] as const;

const DEBRIEF: [string, string, string, string] = [
  "Verifikasi kabar paket lewat aplikasi atau kanal resmi yang kamu buka sendiri, bukan dari petunjuk pengirim.",
  "Berkas .apk memasang aplikasi Android. Foto paket tidak memerlukan pemasangan aplikasi dari chat.",
  "Jika aplikasi mencurigakan terpasang, putuskan koneksi dan cari bantuan untuk mengamankan perangkat serta akun; mencabut izin saja belum memastikan perangkat bersih.",
  "Jangan bagikan OTP, PIN, atau kata sandi. Jika terlanjur, hubungi penyedia akun atau bank melalui kanal resmi dari perangkat lain yang aman.",
];

export const L1_KURIR_APK: Scenario = {
  scenario: {
    id: "L1-kurir-apk",
    level: 1,
    title: "Paket sebelum pulang",
    difficulty: "mudah",
  },
  hud: {
    panic: {
      start: 25,
      max: 100,
      fail_at: 100,
      fail_message:
        "Tekanan sudah terlalu tinggi. Berhenti sejenak, lalu coba lagi dengan langkah yang berbeda.",
    },
    intrusion: {
      start: 0,
      max: 100,
      rate_per_second: 2,
      fail_message:
        "Dalam skenario ini, akses aplikasi dibiarkan terbuka terlalu lama. Gunakan perangkat lain yang aman untuk mencari bantuan.",
    },
  },
  tools: [
    { id: "isolation", name: "Isolasi perangkat", unlocked_at: "isolate" },
    { id: "permissions", name: "Inspektur izin", unlocked_at: "inspect" },
    { id: "report", name: "Berkas bukti", unlocked_at: "intro" },
  ],
  start: "intro",
  nodes: [
    {
      id: "intro",
      chapter: 1,
      type: "message",
      speaker: "Dimas · Pengantaran",
      text: "Sore, Kak Raka. Saya di depan alamat pengiriman. Paket hadiah buat Ibu, ya?",
      delay_ms: 900,
      next: "file",
    },
    {
      id: "file",
      chapter: 1,
      type: "message",
      speaker: "Dimas · Pengantaran",
      text: "Alamatnya kurang jelas. Ini foto paketnya, pasang dulu supaya fotonya terbuka. Saya tunggu sebentar sebelum lanjut antar yang lain.",
      attachment: {
        name: "FOTO_PAKET.apk",
        detail: "Aplikasi Android · 4,2 MB · contoh fiktif",
      },
      delay_ms: 1100,
      next: "decision",
    },
    {
      id: "decision",
      chapter: 1,
      type: "choice",
      prompt: "Hadiah Ibu ada di ujung chat. Apa balasanmu?",
      choices: [
        {
          label: "Cek pesanan lewat aplikasi belanja sendiri",
          verdict: "benar",
          rationale:
            "Kamu memeriksa melalui kanal yang kamu pilih sendiri. Orang yang tahu nama atau detail pesanan belum tentu kurir sungguhan.",
          tactic: "authority",
          next: "verified",
        },
        {
          label: "Tanya dulu: ini benar dari kurir?",
          verdict: "salah",
          rationale:
            "Bertanya kepada orang yang sama belum memverifikasi identitasnya. Kamu masih bisa beralih ke kanal resmi.",
          panic: 10,
          tactic: "urgency",
          next: "reassure",
        },
        {
          label: "Pasang berkas agar paket tidak dibawa pergi",
          verdict: "salah",
          rationale:
            "Dalam latihan ini APK terpasang dan izin sensitif telanjur diberikan. Akses aplikasi mulai terbuka; kamu masih bisa mengambil langkah pemulihan.",
          panic: 20,
          tactic: "attachment",
          compromisesDevice: true,
          next: "installed",
        },
      ],
    },
    {
      id: "reassure",
      chapter: 1,
      type: "message",
      speaker: "Dimas · Pengantaran",
      text: "Betul, Kak. Nama Kakak sudah ada di sistem saya. Cuma sebentar kok. Kalau tidak, paketnya saya bawa kembali, ya.",
      delay_ms: 900,
      next: "second-decision",
    },
    {
      id: "second-decision",
      chapter: 1,
      type: "choice",
      prompt: "Dia tahu namamu dan terus mendesak. Apa langkahmu?",
      choices: [
        {
          label: "Tetap cek lewat aplikasi belanja sendiri",
          verdict: "benar",
          rationale:
            "Kamu memberi ruang untuk memeriksa. Mengetahui nama seseorang bukan bukti identitas pengirim.",
          tactic: "authority",
          next: "verified",
        },
        {
          label: "Pasang APK supaya urusannya cepat selesai",
          verdict: "salah",
          rationale:
            "Desakan waktu membuat pemasangan terasa seperti jalan tercepat. Dalam latihan ini APK dan izin sensitifnya sudah aktif; pulihkan kendali lewat dek perangkat.",
          panic: 20,
          tactic: "attachment",
          compromisesDevice: true,
          next: "installed",
        },
      ],
    },
    {
      id: "verified",
      chapter: 2,
      type: "message",
      speaker: "Aplikasi belanja · kamu buka sendiri",
      text: "Pesanan masih berada di pusat sortir. Tidak ada permintaan memasang aplikasi. Nomor pengantar pada detail pesanan berbeda dari pengirim chat. Di percakapan tadi, pengirim juga meminta kode SMS sebagai konfirmasi paket.",
      delay_ms: 1000,
      next: "safe-decision",
    },
    {
      id: "safe-decision",
      chapter: 2,
      type: "choice",
      prompt: "Ceritanya tidak cocok. Bagaimana kamu menutup percakapan?",
      choices: [
        {
          label: "Hentikan chat dan simpan bukti tanpa membuka berkas",
          verdict: "benar",
          rationale:
            "Kamu menghentikan interaksi dan menjaga bukti yang aman. Tidak ada alasan melakukan isolasi atau mencabut izin aplikasi yang tidak pernah dipasang.",
          tactic: "attachment",
          next: "report-safe",
        },
        {
          label: "Kirim kode SMS yang diminta supaya dia berhenti",
          verdict: "salah",
          rationale:
            "Kode rahasia tetap berbahaya walau APK tidak dipasang. Dalam latihan ini kode telanjur dibagikan; akun perlu diamankan lewat kanal resmi.",
          panic: 40,
          tactic: "secret",
          sharesOtp: true,
          next: "report-compromised",
        },
      ],
    },
    {
      id: "installed",
      chapter: 2,
      type: "message",
      speaker: "Perangkat latihan",
      text: "Berkas tadi memasang aplikasi, bukan membuka foto. Pada ponsel latihan, akses SMS dan aksesibilitas sudah aktif. Putuskan komunikasinya sebelum memeriksa izin.",
      delay_ms: 700,
      next: "isolate",
    },
    {
      id: "isolate",
      chapter: 2,
      type: "tool_task",
      tool: "isolation",
      prompt: "Ambil kendali: hentikan koneksi aplikasi di dek perangkat.",
      on_success: "inspect",
    },
    {
      id: "inspect",
      chapter: 2,
      type: "tool_task",
      tool: "permissions",
      prompt:
        "Dua izin memberi aplikasi akses sensitif. Cabut keduanya pada perangkat latihan.",
      on_success: "evidence",
    },
    {
      id: "evidence",
      chapter: 3,
      type: "message",
      speaker: "Catatan percakapan sebelum koneksi diputus",
      text: "Ada pesan lanjutan dari pengirim: kalau aplikasi sudah dipasang, sebutkan kode SMS-nya supaya paket bisa dilepas. Bagaimana kamu akan menanggapi permintaan itu?",
      delay_ms: 800,
      next: "otp-decision",
    },
    {
      id: "otp-decision",
      chapter: 3,
      type: "choice",
      prompt: "Kode rahasia bukan bukti terima paket. Apa keputusanmu?",
      choices: [
        {
          label: "Tolak permintaan OTP dan siapkan bukti",
          verdict: "benar",
          rationale:
            "Kamu menutup permintaan kode rahasia. Isolasi membantu membatasi komunikasi, tetapi pemulihan perangkat dan akun tetap perlu dituntaskan.",
          tactic: "secret",
          next: "report",
        },
        {
          label: "Bagikan OTP agar paket segera diproses",
          verdict: "salah",
          rationale:
            "Dalam latihan ini OTP telanjur dibagikan. Memutus koneksi perangkat tidak membatalkan kode yang sudah diberikan; segera cari bantuan melalui kanal resmi dari perangkat aman.",
          panic: 40,
          tactic: "secret",
          sharesOtp: true,
          next: "report-compromised",
        },
      ],
    },
    {
      id: "report-safe",
      chapter: 3,
      type: "tool_task",
      tool: "report",
      prompt:
        "Susun berkas bukti: pilih sedikitnya dua hal yang aman disimpan.",
      on_success: "ending-safe",
    },
    {
      id: "report",
      chapter: 3,
      type: "tool_task",
      tool: "report",
      prompt:
        "Susun berkas bukti tanpa menyertakan kode rahasia. Pilih sedikitnya dua bukti.",
      on_success: "ending",
    },
    {
      id: "report-compromised",
      chapter: 3,
      type: "tool_task",
      tool: "report",
      prompt:
        "Simpan sedikitnya dua bukti yang aman, lalu lanjutkan ke panduan mengamankan akun.",
      on_success: "ending-compromised",
    },
    {
      id: "ending-safe",
      chapter: 3,
      type: "ending",
      variant: "success",
      title: "Hadiah boleh terlambat. Kendali tetap di tanganmu.",
      text: "Kamu memverifikasi kabar paket tanpa memasang APK atau membagikan OTP. Dalam jalur latihan ini, akses perangkat dan kode rahasia tetap terjaga.",
      debrief: DEBRIEF,
    },
    {
      id: "ending",
      chapter: 3,
      type: "ending",
      variant: "recovery",
      title: "Kamu sempat terjebak, lalu mengambil kendali.",
      text: "Dalam latihan ini APK sempat terpasang. Kamu memutus koneksi, mencabut dua izin sensitif, dan menolak OTP. Ini langkah awal pemulihan, bukan jaminan perangkat sudah bersih.",
      debrief: DEBRIEF,
    },
    {
      id: "ending-compromised",
      chapter: 3,
      type: "ending",
      variant: "compromised",
      title: "Kode telanjur dibagikan. Masih ada langkah berikutnya.",
      text: "Dalam jalur latihan ini OTP dibagikan. Menghentikan chat saja belum cukup: hubungi penyedia akun atau bank lewat kanal resmi dari perangkat lain yang aman. Gunakan panduan darurat untuk langkah berikutnya.",
      debrief: DEBRIEF,
    },
  ],
  scoring: {
    grades: [
      { min: 70, label: "mantap" },
      { min: 0, label: "terus belajar" },
    ],
  },
};
