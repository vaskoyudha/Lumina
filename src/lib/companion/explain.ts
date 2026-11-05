import {
  MODUS_TACTICS,
  REPORT_CHANNELS,
  type ReportChannel,
  TACTIC_BY_ID,
  type TacticId,
  VERIFY_STEPS,
} from "@/data/tactics";
import type { ScoreResult, Signal } from "@/lib/contracts/score";
import { MODUS_BY_ID } from "@/lib/modus";
import { detectMessage, type RuleHit } from "@/lib/scoring/message";

/**
 * Explanation — what the finding means, built deterministically.
 *
 * This is the teaching layer, and it is deliberately NOT the language model's
 * job. Everything here is derived from data the pipeline already produced:
 * which rules fired, which signals survived, and which scheme was matched. That
 * makes three things true at once:
 *
 *   a. It works with the model unplugged, which matters because the endpoint
 *      measurably times out.
 *   b. It cannot hallucinate a tactic the detectors never found.
 *   c. It teaches the same vocabulary every time, so the user's second
 *      conversation reinforces the first.
 *
 * The model still writes the opening sentence. It just no longer has to carry
 * the explanation, which it was never good at.
 */

export interface TacticExplained {
  id: TacticId;
  nama: string;
  cara: string;
  sasaran: string;
  tanda: string;
  pembeda: string;
  /** The quote from the user's message that triggered it, when there is one. */
  evidence: string | null;
}

export interface AnatomyStep {
  /** One characteristic of the matched scheme. */
  text: string;
  /** True when this message actually shows it. */
  present: boolean;
}

export interface VerifyStep {
  do: string;
  why: string;
}

export interface Explanation {
  tactics: TacticExplained[];
  anatomy: AnatomyStep[];
  verify: readonly VerifyStep[];
  report: readonly ReportChannel[];
  /** True when the message matched no scheme, so the lists are generic. */
  unrecognized: boolean;
}

/**
 * Which tactic each message rule belongs to.
 *
 * This is the same shape as `VECTOR_BY_RULE` in `conversation.ts`, and it is a
 * separate map on purpose: that one decides whether a combination is
 * suspicious, this one decides what to teach. They will drift apart over time,
 * and coupling them would make a scoring change silently rewrite the lesson.
 */
const TACTIC_BY_RULE: Readonly<Record<string, TacticId>> = {
  urgency: "urgensi",
  "block-threat": "urgensi",
  "fake-authority": "otoritas",
  pinjol: "otoritas",
  prize: "iming-iming",
  "guaranteed-return": "iming-iming",
  "otp-request": "rahasia",
  apk: "rahasia",
  "screen-share": "rahasia",
  secrecy: "rahasia",
  "admin-fee": "uang",
  "topup-loop": "uang",
  "off-marketplace": "uang",
  quishing: "uang",
};

/** Fallback when a scheme has no entry, so the card is never blank. */
const GENERIC_TACTICS: readonly TacticId[] = [
  "urgensi",
  "otoritas",
  "iming-iming",
  "rahasia",
  "uang",
  "tautan",
];

const GENERIC_VERIFY: readonly VerifyStep[] = [
  {
    do: "Ketik sendiri alamat resmi layanan di bilah alamat, jangan lewat tautan yang dikirim.",
    why: "Halaman palsu hanya bisa dicapai lewat tautan.",
  },
  {
    do: "Jangan sebut OTP, PIN, atau password kepada siapa pun.",
    why: "Tidak ada pihak resmi yang meminta itu.",
  },
  {
    do: "Konfirmasi lewat nomor atau kanal resmi yang kamu cari sendiri.",
    why: "Nomor penelepon bisa dipalsukan; kanal resmi tidak.",
  },
];

/**
 * The quote that best represents a tactic.
 *
 * Message rules are consulted first because they carry the exact substring that
 * fired. Falling back to signals alone missed every message tactic: a signal
 * knows its agent, not which rule produced it, so "Urgensi palsu" came out with
 * no quote even when `block-threat` had matched "diblokir dalam 2 jam".
 */
function evidenceFor(
  tactic: TacticId,
  hits: readonly RuleHit[],
  signals: readonly Signal[],
): string | null {
  let bestHit: RuleHit | null = null;
  for (const hit of hits) {
    if (TACTIC_BY_RULE[hit.rule.id] !== tactic) continue;
    if (!bestHit || hit.weight > bestHit.weight) bestHit = hit;
  }
  if (bestHit) return bestHit.evidence;

  // Link and identity agents do not go through `detectMessage`, so their
  // strongest surviving signal supplies the quote instead.
  let best: Signal | null = null;
  for (const signal of signals) {
    if (signal.weight <= 0) continue;
    const mapped =
      signal.agent === "link"
        ? "tautan"
        : signal.agent === "identity"
          ? "otoritas"
          : null;
    if (mapped !== tactic) continue;
    if (!best || signal.weight > best.weight) best = signal;
  }
  return best?.evidence ?? null;
}

export function explain(result: ScoreResult, text: string): Explanation {
  const hits = detectMessage(text);

  // Which tactics this message actually used, in the order the rules report.
  const present = new Set<TacticId>();
  for (const hit of hits) {
    const tactic = TACTIC_BY_RULE[hit.rule.id];
    if (tactic) present.add(tactic);
  }
  // A surviving link signal is itself a tactic; the same for an identity claim.
  if (result.signals.some((s) => s.agent === "link" && s.weight > 0)) {
    present.add("tautan");
  }
  if (result.signals.some((s) => s.agent === "identity" && s.weight > 0)) {
    present.add("otoritas");
  }

  const sequence = MODUS_TACTICS[result.modus] ?? GENERIC_TACTICS;
  const unrecognized = result.modus === "tidak-dikenali";

  /*
   * Order by the scheme's script, then append anything found that the script
   * did not predict. A message can use a tactic the typical scheme does not,
   * and dropping it would hide a real finding from the explanation.
   */
  const ordered: TacticId[] = [];
  for (const id of sequence) if (present.has(id)) ordered.push(id);
  for (const id of present) if (!ordered.includes(id)) ordered.push(id);

  const tactics: TacticExplained[] = ordered.flatMap((id) => {
    const tactic = TACTIC_BY_ID.get(id);
    if (!tactic) return [];
    return [
      {
        ...tactic,
        evidence: evidenceFor(id, hits, result.signals),
      },
    ];
  });

  /*
   * Anatomy: the scheme's own characteristics, ticked against this message.
   * Naming what is ABSENT matters as much as what is present — it stops someone
   * panicking over a message that is suspicious but incomplete, and it teaches
   * which step comes next.
   */
  const anatomy: AnatomyStep[] = (
    result.signals.length > 0 ? modusCiri(result) : []
  ).map((ciri) => ({
    text: ciri,
    present: isCiriPresent(ciri, present, result, text),
  }));

  const verify: readonly VerifyStep[] = unrecognized
    ? GENERIC_VERIFY
    : (VERIFY_STEPS[result.modus] ?? GENERIC_VERIFY);

  const report: readonly ReportChannel[] = unrecognized
    ? []
    : (REPORT_CHANNELS[result.modus] ?? []);

  return { tactics, anatomy, verify, report, unrecognized };
}

/** The matched scheme's `ciri` list. */
function modusCiri(result: ScoreResult): string[] {
  return MODUS_BY_ID.get(result.modus)?.ciri ?? [];
}

/**
 * Is this characteristic visible in what was found?
 *
 * Deliberately conservative: a characteristic is only ticked when a tactic it
 * belongs to is present. Guessing from keyword overlap would tick steps the
 * message never performed, which is exactly the over-claiming the project
 * forbids.
 */
function isCiriPresent(
  ciri: string,
  present: ReadonlySet<TacticId>,
  result: ScoreResult,
  text: string,
): boolean {
  const lower = ciri.toLowerCase();

  if (/otp/.test(lower)) return present.has("rahasia");
  if (/apk/.test(lower)) return /\.apk\b/i.test(text);
  if (/share screen|remote/.test(lower)) return present.has("rahasia");
  if (/tautan|domain|login/.test(lower)) return present.has("tautan");
  if (/menang|hadiah|untung|harga jauh|komisi/.test(lower)) {
    return present.has("iming-iming");
  }
  if (/admin|pajak|dp|top-up|setor|bayar|transfer|biaya|rekening/.test(lower)) {
    return present.has("uang");
  }
  if (/blokir|batas waktu|urgensi/.test(lower)) return present.has("urgensi");
  if (/mengaku|cs|resmi|polisi|bank/.test(lower))
    return present.has("otoritas");
  if (/ancaman|teror|sebar/.test(lower)) return present.has("rahasia");

  // Unmapped characteristics are never ticked: an unticked row is honest, a
  // wrongly ticked one is a false claim about the user's own message.
  return result.signals.some((signal) =>
    signal.label.toLowerCase().includes(lower.slice(0, 18)),
  );
}
