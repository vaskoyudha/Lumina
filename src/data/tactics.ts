import type { ReportChannelId } from "@/data/report-contacts";

/**
 * Six tactics, not twelve scripts.
 *
 * `modus.json` lists twelve named schemes. A person cannot memorise twelve
 * scripts, and memorising them would not help anyway: the schemes change every
 * season, the manipulation does not. All twelve decompose into six tactics, and
 * six is a number someone can actually carry away from a single conversation.
 *
 * That is the teaching claim this file makes possible: a user who learns to
 * recognise *urgensi palsu* will spot it in a scam they have never seen before.
 *
 * Every field is written for someone reading on a 380px phone while anxious:
 * short sentences, no jargon, no lecturing.
 *
 * Owned by Stream A. `modus.json` stays untouched — the mapping lives here so
 * Stream B's contract does not change.
 */

export type TacticId =
  | "urgensi"
  | "otoritas"
  | "iming-iming"
  | "rahasia"
  | "uang"
  | "tautan";

export interface Tactic {
  id: TacticId;
  /** Short name, shown as the row title. */
  nama: string;
  /** Why this works on a normal, careful person. */
  cara: string;
  /** What the attacker gets out of it. */
  sasaran: string;
  /** How to recognise it in your own inbox. */
  tanda: string;
  /** What a real institution does instead — the discriminator. */
  pembeda: string;
}

export const TACTICS: readonly Tactic[] = [
  {
    id: "urgensi",
    nama: "Urgensi palsu",
    cara: "Tenggat mematikan kebiasaan memeriksa. Di bawah tekanan waktu, orang memilih cepat daripada benar.",
    sasaran: "Kamu bertindak sebelum sempat bertanya atau menelepon bank.",
    tanda:
      "“dalam 2 jam”, “sebelum pukul 15.00”, “hari ini juga”, “segera atau diblokir”.",
    pembeda:
      "Bank asli tidak memberi tenggat hitungan jam lewat WhatsApp atau SMS.",
  },
  {
    id: "otoritas",
    nama: "Otoritas palsu",
    cara: "Kita diajari patuh pada institusi. Nama bank, polisi, atau kementerian mematikan kecurigaan.",
    sasaran:
      "Kamu berhenti bertanya karena merasa berhadapan dengan pihak resmi.",
    tanda:
      "“saya dari BCA”, “pihak kepolisian”, “CS resmi”, nomor ponsel biasa mengaku institusi.",
    pembeda:
      "Institusi resmi menghubungi lewat kanal resmi, dan tidak pernah menelepon dari nomor ponsel.",
  },
  {
    id: "iming-iming",
    nama: "Iming-iming",
    cara: "Hadiah atau untung besar menyempitkan perhatian. Otak fokus pada yang didapat, bukan pada syaratnya.",
    sasaran: "Kamu membayar “biaya” untuk sesuatu yang tidak pernah ada.",
    tanda:
      "“Anda menang”, “untung pasti”, “harga jauh di bawah pasar”, “komisi besar”.",
    pembeda:
      "Hadiah sah tidak pernah memungut biaya apa pun lebih dulu. Tidak ada undian yang meminta pajak di muka.",
  },
  {
    id: "rahasia",
    nama: "Permintaan rahasia",
    cara: "Rahasia memisahkanmu dari orang yang bisa mencegahnya. Tidak ada saksi, tidak ada yang mengingatkan.",
    sasaran: "OTP, akses layar, atau file APK masuk ke tangan pelaku.",
    tanda:
      "permintaan OTP/PIN/password, file .apk, “jangan bilang siapa-siapa”, share screen.",
    pembeda:
      "Tidak ada pihak resmi yang meminta OTP, PIN, atau akses layar ponselmu. Tidak satu pun.",
  },
  {
    id: "uang",
    nama: "Tekanan uang",
    cara: "Uang yang sudah keluar membuat orang bertahan, bukan berhenti — demi menyelamatkan setoran sebelumnya.",
    sasaran: "Kamu mengirim transfer kedua yang lebih besar.",
    tanda:
      "“biaya admin”, “biaya pencairan”, “top-up dulu”, “DP”, transfer ke rekening pribadi.",
    pembeda:
      "Biaya resmi masuk ke rekening perusahaan atau instansi, bukan ke rekening pribadi.",
  },
  {
    id: "tautan",
    nama: "Tautan menyamar",
    cara: "Kepercayaan pada merek berpindah ke alamat yang mirip. Yang dibaca mata adalah nama, bukan domainnya.",
    sasaran: "Username dan password kamu masuk ke server pelaku.",
    tanda:
      "domain mirip merek (bca-verif.xyz), tautan pendek, alamat yang meminta login.",
    pembeda:
      "Ketik sendiri alamat bank di bilah alamat. Kalau harus lewat tautan, itu sudah jawabannya.",
  },
];

export const TACTIC_BY_ID = new Map<TacticId, Tactic>(
  TACTICS.map((tactic) => [tactic.id, tactic]),
);

/**
 * The order each scheme walks through its tactics.
 *
 * Order matters for teaching: a scam moves forward through a script, so seeing
 * “iming-iming → uang” tells a reader where they are in it — and that the next
 * move is a demand for more.
 */
export const MODUS_TACTICS: Readonly<Record<string, readonly TacticId[]>> = {
  "jual-beli-palsu": ["iming-iming", "uang", "tautan"],
  "fake-call": ["otoritas", "rahasia", "urgensi"],
  "investasi-bodong": ["iming-iming", "uang", "urgensi"],
  "lowongan-tugas-berbayar": ["iming-iming", "uang", "urgensi"],
  "undian-hadiah-palsu": ["iming-iming", "uang", "urgensi"],
  "love-scam": ["iming-iming", "uang", "rahasia"],
  "phishing-tautan": ["otoritas", "tautan", "rahasia", "urgensi"],
  "social-engineering": ["otoritas", "rahasia"],
  "pinjol-fiktif": ["iming-iming", "uang", "rahasia"],
  "apk-whatsapp": ["rahasia", "otoritas", "uang"],
  "quishing-qris": ["tautan", "uang"],
  "musiman-catut-institusi": ["otoritas", "uang"],
};

/**
 * Checks the reader performs themselves.
 *
 * Deliberately before the report list: verifying is cheaper than reporting and
 * teaches more. Every step is something doable in the next ten minutes without
 * an account, an app, or a phone call to a stranger.
 */
export const VERIFY_STEPS: Readonly<
  Record<string, readonly { do: string; why: string }[]>
> = {
  "jual-beli-palsu": [
    {
      do: "Minta video call barangnya, dan minta penjual menunjukkan tanggal hari ini di layar.",
      why: "Barang yang tidak ada tidak bisa ditunjukkan langsung.",
    },
    {
      do: "Cek nomor rekening penjual di cekrekening.id sebelum transfer.",
      why: "Rekening yang pernah dilaporkan ditandai di sana.",
    },
    {
      do: "Bayar hanya lewat rekber marketplace, bukan transfer langsung.",
      why: "Uang ditahan sampai barang diterima.",
    },
  ],
  "fake-call": [
    {
      do: "Tutup telepon, lalu telepon nomor di belakang kartu ATM.",
      why: "Nomor penelepon bisa dipalsukan; nomor di kartu tidak.",
    },
    {
      do: "Jangan sebut OTP, PIN, atau password, walau diminta berulang kali.",
      why: "Tidak ada prosedur bank yang meminta itu.",
    },
  ],
  "investasi-bodong": [
    {
      do: "Cek izin entitasnya di OJK dan Bappebti.",
      why: "Penawaran ke publik tanpa izin sudah melanggar sejak awal.",
    },
    {
      do: "Coba tarik sebagian kecil dulu, sebelum menambah setoran.",
      why: "Penipuan biasanya mempersulit penarikan, bukan penyetoran.",
    },
  ],
  "lowongan-tugas-berbayar": [
    {
      do: "Berhenti di titik kamu diminta menyetor uang.",
      why: "Pekerjaan sah membayar kamu, bukan sebaliknya.",
    },
    {
      do: "Cek apakah perusahaan punya situs resmi dan alamat kantor.",
      why: "Pemberi kerja nyata bisa diverifikasi di luar chat.",
    },
  ],
  "undian-hadiah-palsu": [
    {
      do: "Cek undiannya di situs resmi penyelenggara, bukan di tautan yang dikirim.",
      why: "Hadiah sah selalu bisa dikonfirmasi lewat kanal resmi.",
    },
    {
      do: "Jangan kirim foto KTP atau kartu ATM untuk “verifikasi hadiah”.",
      why: "Data itu dipakai membuka rekening atau pinjaman atas namamu.",
    },
  ],
  "love-scam": [
    {
      do: "Coba video call biasa, bukan hanya chat atau foto.",
      why: "Identitas palsu sulit bertahan di panggilan langsung.",
    },
    {
      do: "Jangan kirim uang, dokumen, atau foto pribadi.",
      why: "Ketiganya dipakai untuk memeras setelah kepercayaan terbentuk.",
    },
  ],
  "phishing-tautan": [
    {
      do: "Ketik sendiri alamat bank di bilah alamat, jangan klik tautannya.",
      why: "Halaman palsu hanya bisa dicapai lewat tautan yang dikirim.",
    },
    {
      do: "Periksa domainnya sebelum mengetik password.",
      why: "Huruf yang mirip sudah cukup untuk menipu mata.",
    },
  ],
  "social-engineering": [
    {
      do: "Tutup aplikasi remote yang sudah terpasang, lalu cabut akses share screen.",
      why: "Selama akses terbuka, pelaku melihat layar dan kode OTP-mu.",
    },
    {
      do: "Hubungi bank lewat nomor resmi, bukan nomor penelepon.",
      why: "Penelepon yang mengaku CS tidak bisa memverifikasi dirinya.",
    },
  ],
  "pinjol-fiktif": [
    {
      do: "Cek izin pinjol di OJK sebelum membayar apa pun.",
      why: "Pinjol ilegal tidak terdaftar, dan biaya di muka adalah ciri utamanya.",
    },
    {
      do: "Simpan bukti ancaman sebar data untuk laporan.",
      why: "Teror data adalah tindak pidana, bukan tagihan.",
    },
  ],
  "apk-whatsapp": [
    {
      do: "Jangan instal file APK yang dikirim lewat chat, dari siapa pun.",
      why: "Aplikasi di luar Play Store tidak diperiksa, dan bisa membaca SMS.",
    },
    {
      do: "Matikan “instal aplikasi dari sumber tidak dikenal” di pengaturan.",
      why: "Ini menutup jalur yang sama untuk pesan berikutnya.",
    },
    {
      do: "Cek mutasi dan riwayat SMS OTP hari ini.",
      why: "APK jenis ini membaca kode OTP yang masuk.",
    },
  ],
  "quishing-qris": [
    {
      do: "Periksa nama penerima di layar sebelum menekan bayar.",
      why: "Nama yang tidak sesuai berarti QR sudah ditukar.",
    },
    {
      do: "Jangan memindai QRIS yang ditempel menutupi QRIS asli.",
      why: "Stiker tempelan adalah cara paling umum mengganti tujuan bayar.",
    },
  ],
  "musiman-catut-institusi": [
    {
      do: "Cek informasinya hanya di situs resmi instansi yang bersangkutan.",
      why: "Program musiman selalu diumumkan lewat kanal resmi.",
    },
    {
      do: "Pastikan rekening tujuan atas nama instansi, bukan pribadi.",
      why: "Pembayaran resmi tidak pernah masuk ke rekening perorangan.",
    },
  ],
};

/**
 * Where to report, per scheme.
 *
 * Channels are shared by the Companion explanations. Nothing here is invented: no hotline numbers we
 * cannot verify offline, no addresses.
 */
export interface ReportChannel {
  /** Stable id into `REPORT_CONTACTS`; how to reach this institution. */
  id: ReportChannelId;
  label: string;
  href: string;
  /** What reporting this actually achieves. Never "report it" alone. */
  note: string;
}

export const IASC: ReportChannel = {
  id: "iasc",
  label: "IASC OJK",
  href: "https://iasc.ojk.go.id",
  note: "Rekening dan nomor pelaku bisa diblokir untuk calon korban berikutnya.",
};

const CEKREKENING: ReportChannel = {
  id: "cekrekening",
  label: "CekRekening.id",
  href: "https://cekrekening.id",
  note: "Rekening yang dilaporkan ditandai saat orang lain memeriksanya.",
};

export const KOMDIGI: ReportChannel = {
  id: "komdigi",
  label: "Komdigi",
  href: "https://aduannomor.id",
  note: "Nomor dan akun pelaku bisa ditindak agar berhenti menghubungi orang lain.",
};

const POLISI: ReportChannel = {
  id: "patrolisiber",
  label: "Patroli Siber",
  href: "https://patrolisiber.id",
  note: "Laporan resmi untuk kasus dengan kerugian uang.",
};

export const REPORT_CHANNELS: Readonly<
  Record<string, readonly ReportChannel[]>
> = {
  "jual-beli-palsu": [CEKREKENING, IASC],
  "fake-call": [IASC, KOMDIGI, POLISI],
  "investasi-bodong": [IASC, POLISI],
  "lowongan-tugas-berbayar": [IASC, CEKREKENING],
  "undian-hadiah-palsu": [KOMDIGI, IASC],
  "love-scam": [POLISI, KOMDIGI],
  "phishing-tautan": [KOMDIGI, IASC],
  "social-engineering": [IASC, POLISI],
  "pinjol-fiktif": [IASC, POLISI],
  "apk-whatsapp": [KOMDIGI, IASC],
  "quishing-qris": [IASC, CEKREKENING],
  "musiman-catut-institusi": [KOMDIGI, POLISI],
};
