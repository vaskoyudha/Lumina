export type ToolId = "isolation" | "permissions" | "report";

export type ScenarioChoice = {
  label: string;
  verdict: "benar" | "salah";
  rationale?: string;
  panic?: number;
  next: string;
};

export type ScenarioNode =
  | { id: string; type: "message"; speaker: string; text: string; next: string }
  | {
      id: string;
      type: "choice";
      prompt: string;
      choices: ScenarioChoice[];
    }
  | {
      id: string;
      type: "tool_task";
      tool: ToolId;
      prompt: string;
      on_success: string;
    }
  | {
      id: string;
      type: "ending";
      variant: "success";
      title: string;
      text: string;
      debrief: [string, string, string, string];
    };

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

export const L1_KURIR_APK: Scenario = {
  scenario: {
    id: "L1-kurir-apk",
    level: 1,
    title: "Kurir meminta pasang APK",
    difficulty: "mudah",
  },
  hud: {
    panic: {
      start: 25,
      max: 100,
      fail_at: 100,
      fail_message:
        "Panik mengambil alih. Hentikan interaksi dan minta bantuan.",
    },
    intrusion: {
      start: 0,
      max: 100,
      rate_per_second: 2,
      fail_message: "Aktivitas perangkat meningkat. Putuskan koneksi sekarang.",
    },
  },
  tools: [
    { id: "isolation", name: "Isolasi perangkat", unlocked_at: "isolate" },
    { id: "permissions", name: "Inspektur izin", unlocked_at: "inspect" },
    { id: "report", name: "Penyusun laporan", unlocked_at: "report" },
  ],
  start: "intro",
  nodes: [
    {
      id: "intro",
      type: "message",
      speaker: "Kamu",
      text: "Pesan WhatsApp mengaku dari kurir. Ada biaya tertahan dan sebuah file APK untuk melihat bukti kirim.",
      next: "decision",
    },
    {
      id: "decision",
      type: "choice",
      prompt: "Apa tindakan pertamamu?",
      choices: [
        {
          label: "Pasang APK agar paket tidak dikembalikan",
          verdict: "salah",
          rationale:
            "APK dari pesan tak dikenal bisa meminta akses SMS dan mencuri OTP. Jangan pasang atau buka file itu.",
          panic: 20,
          next: "isolate",
        },
        {
          label: "Jangan buka file; putuskan koneksi perangkat",
          verdict: "benar",
          next: "isolate",
        },
      ],
    },
    {
      id: "isolate",
      type: "tool_task",
      tool: "isolation",
      prompt: "Aktifkan mode pesawat untuk menghentikan komunikasi aplikasi.",
      on_success: "inspect",
    },
    {
      id: "inspect",
      type: "tool_task",
      tool: "permissions",
      prompt:
        "Periksa izin APK. Cabut akses SMS dan aksesibilitas yang tidak semestinya.",
      on_success: "evidence",
    },
    {
      id: "evidence",
      type: "message",
      speaker: "Catatan perangkat",
      text: "APK meminta membaca SMS dan mengaktifkan layanan aksesibilitas. Kamu belum memasukkan OTP atau kata sandi.",
      next: "otp-decision",
    },
    {
      id: "otp-decision",
      type: "choice",
      prompt:
        "Pengirim meminta kode OTP untuk mengonfirmasi paket. Apa yang kamu lakukan?",
      choices: [
        {
          label: "Kirim kode OTP agar paket diproses",
          verdict: "salah",
          rationale:
            "OTP memberi akses ke akun atau transaksi. Kurir tidak memerlukannya; jangan bagikan kode itu kepada siapa pun.",
          panic: 55,
          next: "report",
        },
        {
          label: "Jangan bagikan OTP; hubungi kurir lewat kanal resmi",
          verdict: "benar",
          next: "report",
        },
      ],
    },
    {
      id: "report",
      type: "tool_task",
      tool: "report",
      prompt: "Pilih bukti yang aman disertakan dalam laporan.",
      on_success: "ending",
    },
    {
      id: "ending",
      type: "ending",
      variant: "success",
      title: "Interaksi dihentikan",
      text: "Kamu tidak memasang file dan sudah menyiapkan bukti untuk dilaporkan.",
      debrief: [
        "Kurir resmi tidak meminta pemasangan APK melalui WhatsApp.",
        "Jangan buka file atau tautan dari pengirim yang belum diverifikasi.",
        "Jika APK terpasang, putuskan koneksi dan cabut izin SMS serta aksesibilitas.",
        "Hubungi bank melalui nomor resmi bila data keuangan sempat dibagikan.",
      ],
    },
  ],
  scoring: {
    grades: [
      { min: 70, label: "mantap" },
      { min: 0, label: "terus belajar" },
    ],
  },
};
