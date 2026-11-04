import { riskFor, type ScoreResult, type Signal } from "@/lib/contracts/score";
import { MODUS_BY_ID, MODUS_BY_NO, UNRECOGNIZED_ID } from "@/lib/modus";
import { linkSignals } from "@/lib/scoring/link";
import {
  detectMessage,
  HARD_RULES,
  messageSignals,
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
    pattern:
      /\b(?:login|verifikasi\s+akun|tautan|link|password|akun\s+diblokir)\b/i,
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

  const merged = dedupe([
    ...messageSignals(trimmed),
    ...linkSignals(trimmed),
    ...extraSignals,
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
