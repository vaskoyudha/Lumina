import type { Signal } from "@/lib/contracts/score";

/**
 * Message Agent — rules, not ML (§11.7: "tanpa ML berbayar").
 *
 * Every signal quotes the user's own words as `evidence`. A signal with no
 * quote is not a finding, it is a guess, and the judge will ask.
 */

interface Rule {
  id: string;
  weight: number;
  label: string;
  pattern: RegExp;
}

export const MESSAGE_RULES: readonly Rule[] = [
  {
    id: "otp",
    weight: 1,
    label:
      "Meminta kode OTP/PIN/password — bank dan instansi tidak pernah memintanya",
    pattern:
      /\b(?:otp|kode\s+otp|pin|password|kata\s+sandi|kode\s+verifikasi|kode\s+rahasia)\b/i,
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
    id: "fake-authority",
    weight: 0.7,
    label: "Mengaku dari bank, kepolisian, kurir, atau instansi resmi",
    pattern:
      /\b(?:dari\s+)?(?:bank\s+\w+|pihak\s+bank|kepolisian|polres|polri|kurir|jne|jnt|sicepat|pos\s+indonesia|cs|customer\s+service|kementerian|dinas|petugas)\b/i,
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

/** Which rule ids are hard indicators: they force `risk: "tinggi"`. */
export const HARD_RULES: ReadonlySet<string> = new Set(["otp", "apk"]);

export interface RuleHit {
  rule: Rule;
  evidence: string;
}

export function detectMessage(text: string): RuleHit[] {
  const hits: RuleHit[] = [];
  for (const rule of MESSAGE_RULES) {
    const match = text.match(rule.pattern);
    if (match) {
      hits.push({ rule, evidence: match[0].trim() });
    }
  }
  return hits;
}

export function messageSignals(text: string): Signal[] {
  return detectMessage(text).map(({ rule, evidence }) => ({
    label: rule.label,
    weight: rule.weight,
    evidence,
    agent: "message" as const,
  }));
}
