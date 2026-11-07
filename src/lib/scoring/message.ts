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
  /**
   * Context requirement: a match is only a finding when this returns true.
   * The quishing rule uses it to require an actual payment instruction near
   * the QR token — mentioning QRIS while explaining how it works is not an
   * attempt to make the reader scan anything.
   */
  gate?: (text: string, match: RegExpMatchArray) => boolean;
}

/**
 * What a real QRIS scam asks the reader to do. `transfer` is deliberately
 * absent: telling someone to scan a sticker is the vector, moving money
 * between accounts is a different one.
 */
const QR_ACTION = /\b(?:scan|pindai|bayar|bayarkan|stiker|kirim|setor)\b/i;

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
    // Gated the same way as fake-authority, for the same reason: "segera" is
    // everywhere in legitimate commerce — "promo berakhir malam ini, segera
    // pesan" is a real flash sale. Urgency is only a scam vector when the
    // message also asks for something (pay, transfer, click, share).
    id: "urgency",
    weight: 0.3,
    weightWithAction: 0.6,
    label: "Menekan dengan batas waktu agar korban tidak sempat memeriksa",
    pattern:
      /\b(?:segera|sekarang\s+juga|dalam\s+\d+\s*(?:jam|menit)|hari\s+ini\s+harus|batas\s+waktu|terakhir)\b/i,
  },
  {
    // The illegal-loan vector. `pinjol-fiktif` has been a modus in modus.json
    // since day one with no rule behind it, so this family was only ever
    // caught by accident through its urgency words.
    //
    // The pattern deliberately names the *illegal* markers, not the loan
    // product: "pinjaman tanpa jaminan" is a real KTA that real banks sell.
    // "Tanpa cek BI", "tidak terdaftar OJK", and "teror sebar data" are not.
    id: "pinjol",
    weight: 0.7,
    label:
      "Menawarkan pinjaman yang melewati cek BI/OJK — pinjol legal tidak bisa memintanya",
    pattern:
      /\bpinjol\b|\btanpa\s+(?:cek\s+)?BI(?:\s*checking)?\b|\btidak\s+(?:terdaftar|berizin)\s+(?:di\s+)?OJK\b|\bteror\s+(?:data|kontak)\b|\bsebar\s+(?:data|kontak)\b/i,
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
    pattern: /\b(?:qris|qr\s*code|scan\s+qr|stiker\s+qr)\b/i,
    gate: (text, match) => {
      if (match.index === undefined) return false;
      const start = Math.max(0, match.index - 80);
      const end = Math.min(text.length, match.index + match[0].length + 80);
      return QR_ACTION.test(text.slice(start, end));
    },
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
      /\b(?:biaya\s+admin(?:istrasi)?|biaya\s+aktivasi|pajak\s+hadiah|bea\s+masuk|biaya\s+kirim\s+hadiah|uang\s+administrasi)\b/i,
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
      /\b(?:rekening\s+pribadi|via\s+wa\s+saja|chat\s+pribadi|dp\s+dulu|uang\s+muka)\b/i,
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

/**
 * Which rule ids are hard indicators: they force `risk: "tinggi"`.
 *
 * The APK extension is deliberately not here. A file extension is a shape,
 * not a request, and the rule that catches it is already weighted high
 * enough to reach the top band on its own. Only an explicit request for a
 * secret can override whatever else the message scored.
 */
export const HARD_RULES: ReadonlySet<string> = new Set(["otp-request"]);

export interface RuleHit {
  rule: Rule;
  evidence: string;
  /** Resolved weight — the context gate has already been applied. */
  weight: number;
  /** Resolved label — always describes the resolved weight. */
  label: string;
}

/**
 * The sentence containing a match, used for warnings that live next to the
 * token rather than immediately before it ("Jangan buka file … .apk").
 */
function sentenceAround(text: string, match: RegExpMatchArray): string {
  const index = match.index ?? 0;
  const before = text.slice(0, index);
  const start =
    Math.max(
      before.lastIndexOf("."),
      before.lastIndexOf("!"),
      before.lastIndexOf("?"),
    ) + 1;
  const after = text.slice(index + match[0].length);
  const boundary = after.search(/[.!?]/);
  const end =
    boundary === -1 ? text.length : index + match[0].length + boundary;
  return text.slice(start, end);
}

/**
 * "Jangan buka file undangan.apk" is the opposite of asking someone to open
 * it. The verb list is what makes the sentence a warning rather than a
 * request, and "jangan lupa" is excluded because it is an instruction *to*
 * do the thing ("jangan lupa buka ya").
 */
const APK_WARNING =
  /\bjangan\b(?!\s+lupa\b)[^.!?]{0,40}\b(?:buka|dibuka|instal|install|unduh|pasang|klik|jalankan)\b/i;

/**
 * A warning ("jangan bagikan kode OTP") is the opposite of a request. The
 * otp-request pattern matches the warning shape too, so a hit whose request
 * verb is immediately preceded by "jangan" is vetoed — and the scan keeps
 * looking, because one warning sentence must not hide a request later in the
 * same message.
 */
function isWarning(rule: Rule, text: string, match: RegExpMatchArray): boolean {
  if (match.index === undefined) return false;
  if (rule.id === "otp-request") {
    const before = text.slice(Math.max(0, match.index - 24), match.index);
    return /\bjangan\s+(?:pernah\s+)?$/i.test(before);
  }
  if (rule.id === "apk") {
    return APK_WARNING.test(sentenceAround(text, match));
  }
  return false;
}

/** A global twin of a rule pattern, so every occurrence can be inspected. */
function globalCopy(pattern: RegExp): RegExp {
  return new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
  );
}

export function detectMessage(text: string): RuleHit[] {
  const matches: { rule: Rule; match: RegExpMatchArray }[] = [];

  for (const rule of MESSAGE_RULES) {
    const found = Array.from(text.matchAll(globalCopy(rule.pattern))).find(
      (match) =>
        !isWarning(rule, text, match) &&
        (rule.gate ? rule.gate(text, match) : true),
    );
    if (found) matches.push({ rule, match: found });
  }

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
