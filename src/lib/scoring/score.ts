import { riskFor, type ScoreResult, type Signal } from "@/lib/contracts/score";
import { MODUS_BY_ID, MODUS_BY_NO, UNRECOGNIZED_ID } from "@/lib/modus";
import { linkSignals } from "@/lib/scoring/link";
import {
  detectMessage,
  HARD_RULES,
  messageSignals,
  type RuleHit,
} from "@/lib/scoring/message";

/**
 * Scoring Orchestrator — the ONLY place a score is produced (§11.1).
 *
 * The LLM is the voice, not the judge (plan §3). Nothing in `companion/`
 * may compute or adjust `score`, `risk`, or `signals`.
 */

/** Probabilistic OR: independent findings accumulate, never exceed 100. */
function accumulate(weights: readonly number[]): number {
  const remaining = weights.reduce((acc, w) => acc * (1 - clamp01(w)), 1);
  return Math.round((1 - remaining) * 100);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function dedupe(signals: Signal[]): Signal[] {
  const byLabel = new Map<string, Signal>();
  for (const s of signals) {
    const existing = byLabel.get(s.label);
    if (!existing || s.weight > existing.weight) byLabel.set(s.label, s);
  }
  return [...byLabel.values()];
}

/**
 * Combination pass (note 01 §a, the highest-value idea in that survey).
 *
 * `accumulate` is a probabilistic OR, which treats every finding as
 * independent. Two *correlated* findings — "act within 2 hours" and "transfer
 * the fee" — therefore drift toward a band threshold without anything on the
 * panel explaining why they belong together. The references surveyed in note
 * 01 make "several vectors agree" its own explicit finding; this is that pass,
 * and it is the Conversation Agent's first real mechanism.
 *
 * Precision comes from the gate, not from the weight: a vector only counts
 * when the rule that reported it already fired at 0.5 or above, and the
 * money vector is only ever set by rules that name an actual demand (a fee, a
 * top-up loop, an off-marketplace transfer, a QRIS sticker). A legitimate
 * "tagihan jatuh tempo, bayar via VA" carries no rule hit at all, so it can
 * never reach a combo.
 */
type Vector = "clock" | "money" | "secret" | "prize";

const VECTOR_BY_RULE: Readonly<Record<string, Vector>> = {
  urgency: "clock",
  "block-threat": "clock",
  "admin-fee": "money",
  "topup-loop": "money",
  "off-marketplace": "money",
  quishing: "money",
  "otp-request": "secret",
  apk: "secret",
  secrecy: "secret",
  prize: "prize",
};

/** Below this resolved weight a rule is context, not a live vector. */
const VECTOR_FLOOR = 0.5;

interface Combo {
  /** First vector supplies the quote; the second is what the demand is. */
  vectors: readonly [Vector, Vector];
  weight: number;
  label: string;
}

/** Most specific first: the first combo whose vectors are both live wins. */
const COMBOS: readonly Combo[] = [
  {
    vectors: ["prize", "money"],
    weight: 0.35,
    label:
      "Menjanjikan hadiah tetapi meminta pembayaran lebih dulu — hadiah asli tidak pernah memungut biaya",
  },
  {
    vectors: ["clock", "money"],
    weight: 0.3,
    label:
      "Mendesak sekaligus meminta uang — batas waktu dipakai supaya korban transfer sebelum sempat memeriksa",
  },
  {
    vectors: ["clock", "secret"],
    weight: 0.3,
    label:
      "Mendesak sekaligus meminta kode atau berkas rahasia — dua-duanya sekaligus bukan prosedur siapa pun",
  },
  {
    vectors: ["secret", "money"],
    weight: 0.3,
    label:
      "Menyuruh merahasiakan transaksi uang — bank dan marketplace tidak pernah meminta itu",
  },
];

function combinationSignal(hits: readonly RuleHit[]): Signal | null {
  const live = new Map<Vector, string>();
  for (const hit of hits) {
    if (hit.weight < VECTOR_FLOOR) continue;
    const vector = VECTOR_BY_RULE[hit.rule.id];
    if (vector && !live.has(vector)) live.set(vector, hit.evidence);
  }

  for (const combo of COMBOS) {
    const [setup, demand] = combo.vectors;
    const evidence = live.get(setup);
    const other = live.get(demand);
    if (evidence !== undefined && other !== undefined) {
      return {
        label: combo.label,
        weight: combo.weight,
        // The setup quote is the one the reader can see; the label explains
        // what it is paired with.
        evidence,
        agent: "conversation",
      };
    }
  }
  return null;
}

const MODUS_KEYWORDS: ReadonlyArray<{ modus: string; pattern: RegExp }> = [
  {
    modus: "apk-whatsapp",
    pattern: /\.apk\b|\bfile\s+apk\b|undangan.{0,20}\.apk/i,
  },
  {
    modus: "pinjol-fiktif",
    pattern:
      /\b(?:pinjol|pinjaman\s+online|dana\s+cepat|teror\s+data|sebar\s+data)\b/i,
  },
  {
    modus: "social-engineering",
    pattern:
      /\b(?:share\s*screen|berbagi\s+layar|anydesk|teamviewer|remote)\b/i,
  },
  {
    modus: "quishing-qris",
    pattern: /\b(?:qris|qr\s*code|scan\s+qr|stiker\s+qr)\b/i,
  },
  {
    modus: "investasi-bodong",
    pattern:
      /\b(?:investasi|trading|crypto|kripto|profit|bunga|robot\s+trading)\b/i,
  },
  {
    modus: "undian-hadiah-palsu",
    pattern: /\b(?:menang|hadiah|undian|pemenang|beruntung)\b/i,
  },
  {
    modus: "lowongan-tugas-berbayar",
    pattern: /\b(?:lowongan|tugas|like|subscribe|top\s*up|topup|komisi)\b/i,
  },
  {
    modus: "love-scam",
    pattern:
      /\b(?:sayang|pacarku|cinta|kenalan|video\s*call|paket\s+tertahan)\b/i,
  },
  {
    modus: "phishing-tautan",
    // "Akun Anda akan diblokir dalam 2 jam" is the ordinary Indonesian
    // phrasing; the exact string "akun diblokir" never appears in it.
    pattern:
      /\b(?:login|verifikasi\s+akun|tautan|link|password|akun\s+(?:anda\s+)?(?:akan\s+)?(?:diblokir|ditutup|dibekukan))\b/i,
  },
  {
    modus: "jual-beli-palsu",
    pattern: /\b(?:jual|beli|barang|ongkir|transfer|rekening|dp)\b/i,
  },
];

function classifyModus(text: string, signals: readonly Signal[]): string {
  const hasApk = signals.some((s) => s.label.includes("APK"));
  if (hasApk) return "apk-whatsapp";

  const hasOtp = signals.some((s) => s.label.includes("OTP"));
  const hasAuthority = signals.some((s) => s.label.includes("Mengaku dari"));
  if (hasOtp && hasAuthority) return "fake-call";

  for (const { modus, pattern } of MODUS_KEYWORDS) {
    if (pattern.test(text)) return modus;
  }
  return UNRECOGNIZED_ID;
}

const ADVICE: Record<string, string[]> = {
  "apk-whatsapp": [
    "Jangan instal file APK itu, dan jangan buka lagi pesannya.",
    "Hapus file dari penyimpanan, bukan hanya dari chat.",
    "Cek mutasi rekening dan riwayat SMS OTP hari ini.",
    "Konfirmasi ke pengirim lewat nomor yang kamu sudah kenal.",
  ],
  "fake-call": [
    "Tutup teleponnya. Bank tidak pernah menelepon untuk minta OTP.",
    "Jangan hubungi nomor yang menelepon; hubungi nomor di belakang kartu.",
    "Ganti PIN dan password m-banking dari perangkat sendiri.",
    "Kalau OTP sudah diberikan, hubungi bank sekarang untuk membekukan akses.",
  ],
  "phishing-tautan": [
    "Jangan buka tautannya, dan jangan isi formulir apa pun.",
    "Buka aplikasi atau situs resmi dengan mengetik alamatnya sendiri.",
    "Ganti password akun yang sudah terlanjur diisi.",
    "Laporkan tautannya ke Komdigi dan bank terkait.",
  ],
  "investasi-bodong": [
    "Jangan menambah setoran apa pun, termasuk biaya pencairan.",
    "Cek legalitas di OJK dan Bappebti sebelum meneruskan.",
    "Simpan bukti transfer dan tangkapan layar percakapan.",
    "Laporkan ke IASC dan OJK.",
  ],
  "undian-hadiah-palsu": [
    "Hadiah sah tidak pernah meminta pembayaran lebih dulu.",
    "Jangan transfer biaya admin atau pajak.",
    "Blokir pengirimnya.",
  ],
  "lowongan-tugas-berbayar": [
    "Berhenti di titik diminta top-up — di situlah kerugian dimulai.",
    "Jangan setor uang agar saldo bisa dicairkan.",
    "Simpan bukti transfer untuk laporan.",
  ],
  "jual-beli-palsu": [
    "Jangan transfer di luar marketplace.",
    "Minta video call barang dan cek rekening penjual di cekrekening.id.",
    "Batalkan transaksi kalau penjual menolak rekber.",
  ],
  "pinjol-fiktif": [
    "Jangan bayar biaya di muka untuk pencairan.",
    "Cek izin pinjol di OJK.",
    "Simpan bukti ancaman untuk laporan polisi.",
  ],
  "love-scam": [
    "Jangan kirim uang atau dokumen pribadi.",
    "Jangan lanjutkan video call tanpa pakaian.",
    "Simpan bukti, lalu blokir dan laporkan akunnya.",
  ],
  "social-engineering": [
    "Tutup aplikasi remote yang sudah terpasang.",
    "Cabut akses share screen, lalu ganti password m-banking.",
    "Hubungi bank lewat nomor resmi, bukan nomor penelepon.",
  ],
  "quishing-qris": [
    "Periksa nama penerima di aplikasi sebelum menekan bayar.",
    "Jangan bayar kalau nama merchant tidak sesuai.",
    "Laporkan stiker QRIS yang dicurigai ke bank/merchant.",
  ],
  "musiman-catut-institusi": [
    "Cek informasi hanya di situs resmi instansi.",
    "Jangan membayar ke rekening pribadi.",
  ],
  [UNRECOGNIZED_ID]: [
    "Jangan kirim uang, OTP, atau data pribadi dulu.",
    "Verifikasi lewat kanal resmi yang kamu ketik sendiri.",
  ],
};

export interface ScoreInput {
  text: string;
  /** Optional pre-parsed signals (e.g. from an Identity Agent); merged in. */
  extraSignals?: Signal[];
}

export function scoreText({
  text,
  extraSignals = [],
}: ScoreInput): ScoreResult {
  const trimmed = text.trim();

  const hits = detectMessage(trimmed);
  const hardHit = hits.some((h) => HARD_RULES.has(h.rule.id));
  const combo = combinationSignal(hits);

  const merged = dedupe([
    ...messageSignals(trimmed),
    ...linkSignals(trimmed),
    ...extraSignals,
    ...(combo ? [combo] : []),
  ]);

  const sorted = [...merged].sort((a, b) => b.weight - a.weight);

  // Honest empty state: one signal that says nothing was found.
  const signals: Signal[] =
    sorted.length > 0
      ? sorted
      : [
          {
            label: "Tidak ada pola penipuan yang dikenali pada teks ini",
            weight: 0,
            evidence: trimmed.slice(0, 80),
            agent: "scoring",
          },
        ];

  let score = accumulate(sorted.map((s) => s.weight));
  // Hard indicator: a request for OTP/PIN/password forces the top band.
  if (hardHit) score = Math.max(score, 70);

  const modus = classifyModus(trimmed, sorted);
  const modusEntry = MODUS_BY_ID.get(modus);
  const relatedModule = modusEntry ? modusEntry.no : null;

  return {
    score,
    risk: riskFor(score),
    signals,
    modus,
    advice: ADVICE[modus] ?? ADVICE[UNRECOGNIZED_ID] ?? [],
    relatedModule,
    hardOverride: hardHit,
  };
}

/** Convenience for Stream B: does this module exist for a given score? */
export function moduleForResult(result: ScoreResult) {
  return result.relatedModule === null
    ? null
    : (MODUS_BY_NO.get(result.relatedModule) ?? null);
}
