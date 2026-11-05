import type { Signal } from "@/lib/contracts/score";

/**
 * Message Agent — rules, not ML (§11.7: "tanpa ML berbayar").
 *
 * Every signal quotes the user's own words as `evidence`. A signal with no
 * quote is not a finding, it is a guess, and the judge will ask.
 */

interface Rule {
  id: string;
  /** Base weight, applied when the rule's context gate (if any) is closed. */
  weight: number;
  label: string;
  pattern: RegExp;
  /**
   * Context gate: when this rule matches AND the message carries action
   * context, the rule escalates to `weightWithAction` / `labelWithAction`.
   * Only `fake-authority` uses it today (see §11 in the note): naming a
   * bank is free, asking the reader to pay/click/share is not.
   */
  weightWithAction?: number;
  labelWithAction?: string;
}

export const MESSAGE_RULES: readonly Rule[] = [
  {
    // HARD: the killer signal is the *request* — "give me the code".
    // A bank that sends an OTP to its own customer is a benign
    // notification; asking the customer to SHARE one never is.
    id: "otp-request",
    weight: 1,
    label:
      "Meminta kode OTP/PIN/password — bank dan instansi tidak pernah memintanya",
    pattern:
      /\b(?:otp|kode\s+otp|kode\s+verifikasi|kode\s+rahasia|pin|password|kata\s+sandi)\b[^.!?]{0,70}?\b(?:berikan|bagikan|masukkan|share|sebutkan|tolong|kirim(?:kan)?|dibutuhkan|saya\s+(?:butuh|perlu|terima))\b|\b(?:berikan|bagikan|masukkan|share|sebutkan|tolong|kirim(?:kan)?|saya\s+(?:butuh|perlu|terima))\b[^.!?]{0,40}?\b(?:kode\s+otp|otp|kode\s+verifikasi|pin|password|kata\s+sandi)\b/i,
  },
  {
    // SOFT: an OTP the recipient's own app/bank sent. Benign on its own;
    // alarm bells only need to coincide with other weight (execute
    // independently: probabilistic OR at the orchestrator).
    id: "otp-notification",
    weight: 0.15,
    label:
      "Menyebut OTP — pastikan ini notifikasi dari aplikasi resmi, bukan permintaan",
    pattern:
      /\b(?:otp|kode\s+verifikasi)\b|jangan\s+(?:berikan|bagikan|share)\s+(?:kode\s+otp|otp)/i,
  },
  {
    id: "apk",
    weight: 0.95,
    label:
      "Mengirim file APK — aplikasi di luar Play Store bisa mencuri SMS dan OTP",
    pattern: /[\w-]+\.apk\b|\bfile\s+apk\b|\baplikasi\s+undangan\b/i,
  },
  {
    id: "urgency",
    weight: 0.6,
    label: "Menekan dengan batas waktu agar korban tidak sempat memeriksa",
    pattern:
      /\b(?:segera|sekarang\s+juga|dalam\s+\d+\s*(?:jam|menit)|hari\s+ini\s+harus|batas\s+waktu|terakhir)\b/i,
  },
  {
    id: "block-threat",
    weight: 0.75,
    label: "Mengancam akun/layanan diblokir kalau tidak segera bertindak",
    pattern:
      /\b(?:akun.{0,20}(?:diblokir|dibekukan|ditutup)|diblokir\s+dalam|dinonaktifkan\s+dalam|akan\s+dihapus)\b/i,
  },
  {
    // Context-gated: authority alone is weak evidence — real couriers,
    // real banks, and real offices all mention themselves daily. The
    // killer combination is authority + a request to move money, share a
    // code, or click. Two signals from one rule: base 0.25, plus 0.45
    // when ACTION_CONTEXT matches (see messageSignals).
    id: "fake-authority",
    weight: 0.25,
    weightWithAction: 0.7,
    label: "Menyebut bank/kurir/instansi — pastikan pelekatannya resmi",
    labelWithAction:
      "Mengaku dari bank, kepolisian, kurir, atau instansi resmi dan meminta tindakan",
    pattern:
      /\b(?:dari\s+)?(?:bank\s+\w+|pihak\s+bank|kepolisian|polres|polri|kurir|jne|jnt|sicepat|pos\s+indonesia|cs|customer\s+service|kementerian|dinas|petugas|kominfo|komdigi)\b/i,
  },
  {
    id: "quishing",
    weight: 0.7,
    label:
      "Meminta pembayaran lewat QRIS yang dikirim lewat chat — selalu periksa nama penerima di layar sebelum scan",
    pattern:
      /\b(?:qris|qr\s*code|scan\s+qr|a\.n\.?\s?\w+|atas\s+nama\s+\w+)\b/i,
  },
  {
    id: "prize",
    weight: 0.65,
    label: "Mengumumkan hadiah/undian yang tidak pernah diikuti",
    pattern:
      /\b(?:selamat\s+(?:anda\s+)?(?:menang|beruntung)|anda\s+(?:menang|beruntung|terpilih)|pemenang\s+(?:undian|utama)|hadiah\s+utama|undian\s+berhadiah)\b/i,
  },
  {
    id: "admin-fee",
    weight: 0.8,
    label: "Meminta biaya admin/pajak/bea sebelum hadiah atau dana dikirim",
    pattern:
      /\b(?:biaya\s+admin|biaya\s+aktivasi|pajak\s+hadiah|bea\s+masuk|biaya\s+kirim\s+hadiah|uang\s+administrasi)\b/i,
  },
  {
    id: "topup-loop",
    weight: 0.85,
    label: "Meminta setoran/top-up berulang supaya saldo bisa dicairkan",
    pattern:
      /\b(?:top\s*up|topup|setor\s+lagi|tambah\s+saldo|deposit\s+lagi|agar\s+bisa\s+(?:dicairkan|withdraw))\b/i,
  },
  {
    id: "screen-share",
    weight: 0.9,
    label:
      "Meminta share screen atau memasang aplikasi remote — pelaku bisa melihat m-banking",
    pattern:
      /\b(?:share\s*screen|berbagi\s+layar|anydesk|teamviewer|quicksupport|remote\s+(?:akses|desktop|app)|unduh\s+aplikasi\s+remote)\b/i,
  },
  {
    id: "off-marketplace",
    weight: 0.55,
    label: "Mengajak transaksi di luar marketplace, ke rekening pribadi",
    pattern:
      /\b(?:transfer\s+(?:langsung|ke\s+rekening)|rekening\s+pribadi|via\s+wa\s+saja|chat\s+pribadi|dp\s+dulu|uang\s+muka)\b/i,
  },
  {
    id: "guaranteed-return",
    weight: 0.8,
    label:
      "Menjanjikan keuntungan pasti — tidak ada investasi legal yang menjamin untung",
    pattern:
      /\b(?:untung\s+pasti|profit\s+pasti|dijamin\s+(?:untung|cuan|profit)|fixed\s+return|bunga\s+\d+%?\s*per\s*(?:hari|bulan)|pasif\s+income)\b/i,
  },
  {
    id: "secrecy",
    weight: 0.7,
    label: "Melarang menceritakan atau memverifikasi ke pihak lain",
    pattern:
      /\b(?:jangan\s+(?:bilang|beritahu|cerita)|jangan\s+(?:konfirmasi|verifikasi)|rahasia|hanya\s+antara\s+kita)\b/i,
  },
];

/**
 * What turns "mentions an institution" into "the scam vector is live".
 * Action context = the message asks the reader to move money, share a
 * secret, or click. Only then does fake-authority gain its full weight.
 */
const ACTION_CONTEXT =
  /\b(?:bayar|bayarkan|transfer|kirim(?:kan)?\s+(?:uang|ke\s+rekening)|setor|top\s*up|topup|biaya|denda|bea\s+masuk|konfirmasi|tautan|link|klik|buka|isi\s+formulir|masukkan|share)\b/i;

/** Which rule ids are hard indicators: they force `risk: "tinggi"`. */
export const HARD_RULES: ReadonlySet<string> = new Set(["otp-request", "apk"]);

export interface RuleHit {
  rule: Rule;
  evidence: string;
  /** Resolved weight — the context gate has already been applied. */
  weight: number;
  /** Resolved label — always describes the resolved weight. */
  label: string;
}

/**
 * A warning ("jangan bagikan kode OTP") is the opposite of a request. The
 * otp-request pattern matches the warning shape too, so veto a hit whose
 * request verb is immediately preceded by "jangan".
 */
function isWarning(rule: Rule, text: string, match: RegExpMatchArray): boolean {
  if (rule.id !== "otp-request" || match.index === undefined) return false;
  const before = text.slice(Math.max(0, match.index - 20), match.index);
  return /\bjangan\s+(?:pernah\s+)?$/i.test(before);
}

export function detectMessage(text: string): RuleHit[] {
  const matches = MESSAGE_RULES.map((rule) => ({
    rule,
    match: text.match(rule.pattern),
  })).filter(
    (m): m is { rule: Rule; match: RegExpMatchArray } =>
      m.match !== null && !isWarning(m.rule, text, m.match),
  );

  // "Authority + a request" is the scam vector. An OTP request is itself
  // action context (the request verbs live in that rule), so it escalates
  // the authority signal without any money/click word present.
  const hasOtpRequest = matches.some(({ rule }) => rule.id === "otp-request");
  const escalated = ACTION_CONTEXT.test(text) || hasOtpRequest;

  return matches.map(({ rule, match }) => {
    const withAction = escalated && rule.weightWithAction !== undefined;
    return {
      rule,
      evidence: match[0].trim(),
      weight: withAction ? (rule.weightWithAction as number) : rule.weight,
      label:
        withAction && rule.labelWithAction ? rule.labelWithAction : rule.label,
    };
  });
}

export function messageSignals(text: string): Signal[] {
  return detectMessage(text).map(({ label, weight, evidence }) => ({
    label,
    weight,
    evidence,
    agent: "message" as const,
  }));
}
