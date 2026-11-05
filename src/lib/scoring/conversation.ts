import type { Signal } from "@/lib/contracts/score";
import { detectMessage, type RuleHit } from "@/lib/scoring/message";

/**
 * Conversation Agent — what several findings *together* mean.
 *
 * `accumulate` in `score.ts` is a probabilistic OR, which treats every finding
 * as independent. Two *correlated* findings — "act within 2 hours" and
 * "transfer the fee" — therefore drift toward a band threshold without
 * anything on the panel explaining why they belong together. The references
 * surveyed in note 01 make "several vectors agree" its own explicit finding;
 * this is that pass.
 *
 * Precision comes from the gate, not from the weight: a vector only counts
 * when the rule that reported it already fired at 0.5 or above, and the money
 * vector is only ever set by rules that name an actual demand (a fee, a
 * top-up loop, an off-marketplace transfer, a QRIS sticker). A legitimate
 * "tagihan jatuh tempo, bayar via VA" carries no rule hit at all, so it can
 * never reach a combo.
 *
 * Escalation *across turns* is a different mechanism and is added separately:
 * this one reads a single message's shape.
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

export interface ConversationResult {
  signals: Signal[];
  note?: string;
}

export function conversationSignals(text: string): ConversationResult {
  const combo = combinationSignal(detectMessage(text));
  return { signals: combo ? [combo] : [] };
}
