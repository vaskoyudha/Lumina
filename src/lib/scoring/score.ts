import {
  type AgentStage,
  type AgentTrace,
  STAGE_LABEL,
  type StageId,
} from "@/lib/contracts/agent-run";
import { riskFor, type ScoreResult, type Signal } from "@/lib/contracts/score";
import { MODUS_BY_ID, MODUS_BY_NO, UNRECOGNIZED_ID } from "@/lib/modus";
import { conversationSignals } from "@/lib/scoring/conversation";
import { identitySignals } from "@/lib/scoring/identity";
import { extractLinks, linkSignals } from "@/lib/scoring/link";
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
 *
 * Structure: one ordered detector list drives both public functions, so the
 * verdict and the trace cannot drift. `scoreWithTrace` measures; `finalize`
 * scores. A detector never returns a number that reaches the user directly.
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

/** A previous user turn, used only by the Conversation Agent. */
export interface ScoredTurn {
  text: string;
}

export interface ScoreInput {
  text: string;
  /** Optional pre-parsed signals (e.g. from an Identity Agent); merged in. */
  extraSignals?: Signal[];
  /** Prior user texts in this conversation, oldest first. */
  turns?: readonly ScoredTurn[];
}

interface DetectorContext {
  text: string;
  turns: readonly ScoredTurn[];
}

interface DetectorResult {
  signals: Signal[];
  /** Set only when the detector had nothing to inspect. Never a soft excuse. */
  note?: string;
}

type DetectorId = Exclude<StageId, "evidence" | "scoring" | "voice">;

/** The pipeline, in evaluation order. Both public functions drive this list. */
const DETECTORS: readonly {
  id: DetectorId;
  run: (ctx: DetectorContext) => DetectorResult;
}[] = [
  {
    id: "message",
    run: ({ text }) => ({ signals: messageSignals(text) }),
  },
  {
    id: "link",
    run: ({ text }) => {
      const links = extractLinks(text);
      return {
        signals: linkSignals(text),
        note: links.length === 0 ? "Tidak ada tautan pada pesan ini." : undefined,
      };
    },
  },
  {
    id: "identity",
    run: ({ text }) => identitySignals(text),
  },
  {
    id: "conversation",
    run: ({ text }) => conversationSignals(text),
  },
];

/**
 * The only scorer.
 *
 * `detectorSignals` is what the pipeline collected; `extraSignals` is what a
 * caller supplied. Everything below this line is the verdict.
 */
function finalize(
  text: string,
  detectorSignals: readonly Signal[],
  extraSignals: readonly Signal[],
): ScoreResult {
  const trimmed = text.trim();

  const hits = detectMessage(trimmed);
  const hardHit = hits.some((h) => HARD_RULES.has(h.rule.id));

  const merged = dedupe([...detectorSignals, ...extraSignals]);
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

export interface TracedScore {
  result: ScoreResult;
  trace: AgentTrace;
}

/**
 * Run the pipeline and record what it did.
 *
 * This function measures; it never scores. `finalize` remains the only place
 * `score`, `risk`, and `signals` are produced.
 */
export function scoreWithTrace(input: ScoreInput): TracedScore {
  const text = input.text.trim();
  const ctx: DetectorContext = { text, turns: input.turns ?? [] };

  const stages: AgentStage[] = [];
  const collected: Signal[] = [];
  const startedAt = performance.now();

  for (const detector of DETECTORS) {
    const started = performance.now();
    const { signals, note } = detector.run(ctx);
    collected.push(...signals);
    stages.push({
      id: detector.id,
      ...STAGE_LABEL[detector.id],
      status: "selesai",
      findings: signals.length,
      ms: performance.now() - started,
      note,
    });
  }

  const scoringStarted = performance.now();
  const result = finalize(text, collected, input.extraSignals ?? []);
  stages.push({
    id: "scoring",
    ...STAGE_LABEL.scoring,
    status: "selesai",
    findings: 0,
    ms: performance.now() - scoringStarted,
  });

  /*
   * Re-count against the surviving, de-duplicated result, so the numbers a
   * user reads add up to the signals they can see. Two details matter:
   *
   * a. The orchestrator owns no findings — it combines the detectors'. Counting
   *    by `agent` alone would hand it the weight-0 "nothing recognised"
   *    placeholder and report a finding where there is none.
   * b. A stage that produced nothing *and* explained why is `dilewati`, not
   *    `selesai`: a clean tick over work that never happened is the exact
   *    dishonesty `AGENTS.md` §a forbids.
   */
  for (const stage of stages) {
    stage.findings = result.signals.filter(
      (signal) =>
        signal.weight > 0 && (signal.agent ?? "scoring") === stage.id,
    ).length;
    stage.status =
      stage.findings > 0 ? "temuan" : stage.note ? "dilewati" : "selesai";
  }

  return {
    result,
    trace: { stages, totalMs: performance.now() - startedAt },
  };
}

/** The verdict alone. Delegates, so the two can never disagree. */
export function scoreText(input: ScoreInput): ScoreResult {
  return scoreWithTrace(input).result;
}

/** Convenience for Stream B: does this module exist for a given score? */
export function moduleForResult(result: ScoreResult) {
  return result.relatedModule === null
    ? null
    : (MODUS_BY_NO.get(result.relatedModule) ?? null);
}
