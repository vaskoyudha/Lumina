# Score-first conversation — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the companion answer like a conversation — a greeting reaches the model, a question about scams is answered instead of scored, and a real model reply is never silently replaced by a template — while keeping the verdict deterministic and instant.

**Architecture:** Score first, route second, speak third. `planTurn()` picks one of four lanes from data the pipeline already has; the model speaks in every lane but never chooses whether to judge. The `periksa` lane keeps the existing digest route byte-for-byte; `tanya` / `lanjutan` / `obrolan` get a new non-streaming answer route whose `.strict()` schema has no field for a received message.

**Tech Stack:** Next 16 App Router, React 19, TypeScript strict, Tailwind v4, shadcn/ui (base **radix**, `asChild`), zod 4, Biome, Jest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-06-score-first-conversation-design.md`

**Spec refinement (deliberate, stated so it is reviewable):** the spec's §2b lane table puts `lanjutan` after the length test and uses a `< 40`-adjacent length heuristic. This plan (a) moves `lanjutan` above the money and length tests so "kenapa berbahaya?" is not re-checked, and (b) replaces "message-shaped by length" with `>= 160` chars. Measured: the shortest bench **scam** is 98 characters, and the shortest bench **legit** case is 57 — so a 57-char heuristic cannot tell a scam from an ordinary sentence, while 160 is safely above every scam and still classifies a pasted paragraph as a check. The spec's §2b table is amended in Task 1's commit so the two documents agree.

## Global Constraints

- **No new dependencies.** AGENTS.md §7.
- **`score`, `risk`, `signals` come only from `src/lib/scoring/score.ts`.** The model is voice, never judge (AGENTS.md §4).
- **`src/lib/contracts/score.ts` and `src/lib/scoring/**` are not modified.**
- **shadcn/ui components only**, `asChild` for links, never `render`.
- **Colour tokens only** — `--lumina-*` / semantic classes (`text-dim`, `text-danger`, `bg-panel`, `border-line`). No hex, no `bg-red-500`.
- **Cannot cite the reference repos** in plan.md / proposal — ideas only (ekko-studio is BSL 1.1).
- **`npm run verify` must pass before every commit** (typecheck + biome + jest + build). Stop the dev server before `next build`.
- **Shell must work at 380px.** No horizontal scroll, icon-only controls carry an accessible name.
- **Copy is Indonesian**, calm, never blames the victim, never celebrates.
- **Do not run `next build` with the dev server up.** Kill it by PID: `ps -eo pid,cmd | grep "node .*bin/next dev"`. `pkill -f "next dev"` kills the invoking shell.

## File structure

| Path | Responsibility | Task |
|---|---|---|
| `src/lib/companion/turn.ts` | **new** — pure lane router + question guard. No React, no network. | 1 |
| `src/lib/companion/turn.test.ts` | **new** — lane table + recall invariants. | 1 |
| `src/lib/companion/reply.ts` | anchored greeting detection; conversational fallbacks. | 1, 3 |
| `src/lib/companion/reply.test.ts` | the four skipped scams become analysable. | 1 |
| `src/lib/contracts/answer.ts` | **new** — `.strict()` answer request schema. | 2 |
| `src/app/api/companion/answer/route.ts` | **new** — non-streaming answer proxy. | 2 |
| `src/app/api/companion/answer/route.test.ts` | **new** — schema rejects a received message. | 2 |
| `src/lib/companion/answer-client.ts` | **new** — browser side of the answer route. | 2 |
| `src/components/companion/voice-client.ts` | extract a reusable `requestStreamingText`; keep `requestReply`. | 3 |
| `src/components/companion/companion-chat.tsx` | lane wiring, no trace on chat lanes, lane chip, abort, epoch guard. | 3, 4 |
| `src/components/companion/companion-chat.test.tsx` | lane behaviour rendered for real. | 3 |
| `src/app/api/companion/voice/route.ts` | one-line `max_tokens` budget; timeout ceiling. | 4 |
| `src/components/companion/voice-wiring.test.tsx` | truncated replies are kept, not swapped. | 4 |
| `src/components/companion/composer.tsx` | permanent conversation notice. | 5 |
| `src/lib/contracts/agent-run.ts` | voice stage label stops claiming it never reads a message. | 5 |
| 4 marketing/auth/entry strings | stop claiming nothing leaves the device. | 5 |
| `src/lib/companion/tools.ts` | **new, cuttable** — `cari_modul`, `klarifikasi`. | 6 |

---

## Task 1: A greeting is a greeting, and a question is not a message

The most damaging bug in the repo: `isGreeting()` accepts anything starting with "halo" under 40 characters, so four of six realistic short scams never reach the detectors. Fix that first — it is independent, ships on its own, and improves recall before any conversational work lands.

**Files:**
- Create: `src/lib/companion/turn.ts`
- Create: `src/lib/companion/turn.test.ts`
- Modify: `src/lib/companion/reply.ts:15-52`
- Modify: `src/lib/companion/reply.test.ts`
- Modify: `docs/superpowers/specs/2026-11-06-score-first-conversation-design.md` (§2b table)

**Interfaces:**
- Consumes: `ScoreResult` (`@/lib/contracts/score`), `Explanation` (`@/lib/companion/explain`), `extractLinks` (`@/lib/scoring/link`), `isGreeting` (`@/lib/companion/reply`).
- Produces:
  - `type Lane = "periksa" | "tanya" | "lanjutan" | "obrolan"`
  - `interface TurnPlan { lane: Lane; hasFindings: boolean; why: string }`
  - `planTurn(input: { text: string; result: ScoreResult | null; lastResult: ScoreResult | null; lastExplanation: Explanation | null; asked?: boolean; attachments?: number }): TurnPlan`
  - `isQuestionAbout(text: string, opts?: { hasPriorVerdict?: boolean }): boolean`
  - `isQuestionShape(text: string): boolean`
  - `isGreeting(text: string): boolean` (unchanged name, stricter behaviour)

- [ ] **Step 1: Write the failing greeting test**

Add to `src/lib/companion/reply.test.ts`, inside the existing `describe("isGreeting", …)` block:

```tsx
  it("does not skip a short scam that opens with a greeting", () => {
    // Measured defect: `GREETING` was anchored only at the start and the guard
    // was `length < 40`. These four never reached the detectors, so the user
    // got the canned "Siap…" line for a real scam.
    const shortScams = [
      "Halo, ini dari BCA. Akun Anda diblokir.",
      "Hai, ini undangan pernikahan.apk",
      "Halo, selamat pagi. Anda menang undian.",
      "Hi, ada lowongan kerja online.",
    ];
    for (const text of shortScams) {
      expect(isGreeting(text)).toBe(false);
    }
  });

  it("still recognises a greeting followed by small talk", () => {
    expect(isGreeting("hi apa kabar")).toBe(true);
    expect(isGreeting("halo min")).toBe(true);
    expect(isGreeting("terima kasih")).toBe(true);
    expect(isGreeting("selamat malam")).toBe(true);
  });

  it("does not treat a normal sentence as a greeting", () => {
    expect(isGreeting("besok kita makan siang bareng ya")).toBe(false);
    expect(isGreeting("siapa kamu")).toBe(false);
  });
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/lib/companion/reply.test.ts -t "does not skip a short scam" -v`

Expected: FAIL — `expect(received).toBe(false)` / `Received: true` for "Halo, ini dari BCA. Akun Anda diblokir."

- [ ] **Step 3: Replace the greeting predicate**

In `src/lib/companion/reply.ts`, replace lines 15-17 and lines 48-52 (keep `normalize` and everything else) with:

```ts
/**
 * A message is a greeting when every word in it belongs to the greeting
 * vocabulary.
 *
 * The previous rule was "starts with halo/hai and is under 40 characters",
 * which classified `"Halo, ini dari BCA. Akun Anda diblokir."` (39 chars) as
 * small talk and skipped the detectors entirely. Anchoring the start is not
 * enough either — the whole message has to be greeting-shaped. Measured: this
 * keeps all four short scams analysable and still recognises "hi apa kabar".
 */
const GREETING_TOKENS = new Set([
  "halo",
  "hallo",
  "helo",
  "hai",
  "hi",
  "hello",
  "hei",
  "selamat",
  "pagi",
  "siang",
  "sore",
  "malam",
  "apa",
  "kabar",
  "kabarmu",
  "kabarnya",
  "terima",
  "kasih",
  "makasih",
  "thanks",
  "thank",
  "you",
  "ok",
  "oke",
  "okay",
  "sip",
  "baik",
  "baiklah",
  "boleh",
  "siap",
  "semua",
  "semuanya",
  "kak",
  "min",
  "admin",
  "bang",
  "mas",
  "mbak",
  "pak",
  "bu",
  "gan",
  "sis",
  "kalian",
  "lumina",
]);

/** Eight words is already a sentence; past that it is not a greeting. */
const MAX_GREETING_TOKENS = 8;
```

and

```ts
/** Does this look like a greeting rather than something to analyse? */
export function isGreeting(text: string): boolean {
  const t = normalize(text);
  if (t.length === 0) return false;

  const tokens = t
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0);

  if (tokens.length === 0 || tokens.length > MAX_GREETING_TOKENS) return false;
  return tokens.every((token) => GREETING_TOKENS.has(token));
}
```

- [ ] **Step 4: Run the greeting tests**

Run: `npx jest src/lib/companion/reply.test.ts -v`

Expected: PASS, all 12+ tests. If `composeReply` tests fail, read the failure — the `isGreeting` branch now fires on fewer inputs, which is intended.

- [ ] **Step 5: Write the failing router test**

Create `src/lib/companion/turn.test.ts`:

```ts
import { explain } from "@/lib/companion/explain";
import {
  isQuestionAbout,
  PASTE_LENGTH,
  planTurn,
  SHORTEST_SCAM,
} from "@/lib/companion/turn";
import { LEGIT_CASES, SCAM_CASES } from "@/lib/scoring/bench-cases";
import { scoreText } from "@/lib/scoring/score";

const APK =
  "Selamat siang Bu, ini undangan pernikahan anak kami. Mohon dibuka ya file Undangan-Pernikahan.apk yang saya kirim.";

describe("planTurn · lanes", () => {
  it("sends a message with findings to periksa", () => {
    const result = scoreText({ text: APK });
    const plan = planTurn({
      text: APK,
      result,
      lastResult: null,
      lastExplanation: null,
    });
    expect(plan.lane).toBe("periksa");
    expect(plan.hasFindings).toBe(true);
  });

  it("sends a message with a link to periksa even when nothing scored", () => {
    const text = "coba buka https://contoh.test ya";
    const plan = planTurn({
      text,
      // The link rule happens to fire on this URL today, so the result is
      // emptied to prove the *branch* routes it, not the signal. This is the
      // case that matters: a link deserves the Link Agent row even at 0/100.
      result: { ...scoreText({ text }), signals: [] },
      lastResult: null,
      lastExplanation: null,
    });
    expect(plan.lane).toBe("periksa");
    expect(plan.hasFindings).toBe(false);
  });

  it("checks a turn that is only an attachment", () => {
    const text = "tangkap layar.png";
    const plan = planTurn({
      text,
      result: scoreText({ text }),
      lastResult: null,
      lastExplanation: null,
      attachments: 1,
    });
    expect(plan.lane).toBe("periksa");
  });

  it("sends an ordinary sentence to obrolan, not to a 0/100 card", () => {
    const text = "besok kita makan siang bareng ya di kantin dekat gedung baru";
    const plan = planTurn({
      text,
      result: scoreText({ text }),
      lastResult: null,
      lastExplanation: null,
    });
    expect(plan.lane).toBe("obrolan");
    expect(plan.hasFindings).toBe(false);
  });

  it("sends a greeting to obrolan", () => {
    const plan = planTurn({
      text: "hi apa kabar",
      result: scoreText({ text: "hi apa kabar" }),
      lastResult: null,
      lastExplanation: null,
    });
    expect(plan.lane).toBe("obrolan");
  });

  it("sends a self-question to tanya", () => {
    const plan = planTurn({
      text: "siapa kamu",
      result: null,
      lastResult: null,
      lastExplanation: null,
    });
    expect(plan.lane).toBe("tanya");
  });

  it("keeps a guarded question in tanya even when it names a money word", () => {
    // Measured defect: "apa itu dana?" scores 0, but `MONEY` matches "dana",
    // so without the `asked` flag it routed to periksa — and because the
    // guard skipped scoring, `result` was null and the turn fell into the old
    // canned "belum menemukan apa pun" reply. A question the guard already
    // claimed must not be re-classified by a keyword inside it.
    expect(isQuestionAbout("apa itu dana?")).toBe(true);
    const plan = planTurn({
      text: "apa itu dana?",
      result: null,
      lastResult: null,
      lastExplanation: null,
      asked: true,
    });
    expect(plan.lane).toBe("tanya");
    expect(plan.hasFindings).toBe(false);
  });

  it("answers a follow-up from the previous verdict instead of re-checking", () => {
    const result = scoreText({ text: APK });
    const plan = planTurn({
      text: "kenapa berbahaya?",
      result: scoreText({ text: "kenapa berbahaya?" }),
      lastResult: result,
      lastExplanation: explain(result, APK),
    });
    expect(plan.lane).toBe("lanjutan");
  });
});

describe("planTurn · the recall invariant", () => {
  it("routes every bench scam to periksa", () => {
    const missed = SCAM_CASES.filter((benchCase) => {
      const plan = planTurn({
        text: benchCase.text,
        result: scoreText({ text: benchCase.text }),
        lastResult: null,
        lastExplanation: null,
      });
      return plan.lane !== "periksa";
    }).map((benchCase) => benchCase.id);

    expect(missed).toEqual([]);
  });

  it("never routes a plain sentence to a check", () => {
    // The engine's low-weight signals on LEGIT_CASES l01/l03/l21/l22/l23 are
    // real: a promo with a deadline genuinely shares a feature with a scam. So
    // the invariant is not "no findings on legitimate messages" — it is "no
    // card for a message the user is simply saying". A sentence with no
    // findings, link, phone, attachment, money word, or paste length stays in
    // a chat lane.
    const plain = [
      "besok kita makan siang bareng ya di kantin dekat gedung baru",
      "hi apa kabar",
      "terima kasih banyak ya",
      "aku baru pulang dari kampus",
    ];

    const routed = plain.filter((text) => {
      const plan = planTurn({
        text,
        result: scoreText({ text }),
        lastResult: null,
        lastExplanation: null,
      });
      return plan.lane === "periksa";
    });

    expect(routed).toEqual([]);
  });

  it("checks a legitimate message whenever the engine found a signal in it", () => {
    // Not a false-positive gate — the score gate owns that. It is the routing
    // contract: if the engine produced a weighted signal, the card must show,
    // even when the verdict is "rendah". l01 is a real OTP, and it is checked,
    // not hidden.
    const missed = LEGIT_CASES.filter((benchCase) => {
      const result = scoreText({ text: benchCase.text });
      if (!result.signals.some((signal) => signal.weight > 0)) return false;
      return (
        planTurn({
          text: benchCase.text,
          result,
          lastResult: null,
          lastExplanation: null,
        }).lane !== "periksa"
      );
    }).map((benchCase) => benchCase.id);

    expect(missed).toEqual([]);
  });
});

describe("isQuestionAbout · narrow on purpose", () => {
  it("guards a question about a scam family", () => {
    expect(isQuestionAbout("apa itu pinjol?")).toBe(true);
    expect(isQuestionAbout("jelaskan apa itu phising")).toBe(true);
    expect(isQuestionAbout("siapa kamu")).toBe(true);
    expect(isQuestionAbout("kamu siapa?")).toBe(true);
  });

  it("never guards a message someone received", () => {
    expect(
      isQuestionAbout("Halo, ini dari BCA. Akun Anda diblokir."),
    ).toBe(false);
    expect(isQuestionAbout("Halo, ini dari BCA. Akun Anda diblokir?")).toBe(
      false,
    );
  });

  it("never guards a message that carries an artifact", () => {
    expect(isQuestionAbout("apa itu link https://bca-verif.xyz ?")).toBe(false);
    expect(isQuestionAbout("apa itu file undangan.apk?")).toBe(false);
  });

  it("leaves a follow-up to the lanjutan lane", () => {
    expect(isQuestionAbout("kenapa berbahaya?", { hasPriorVerdict: true })).toBe(
      false,
    );
  });
});
```

- [ ] **Step 6: Run it and watch it fail**

Run: `npx jest src/lib/companion/turn.test.ts -v`

Expected: FAIL — `Cannot find module '@/lib/companion/turn'`.

- [ ] **Step 7: Write the router**

Create `src/lib/companion/turn.ts`:

```ts
import type { Explanation } from "@/lib/companion/explain";
import { isGreeting } from "@/lib/companion/reply";
import type { ScoreResult } from "@/lib/contracts/score";
import { extractLinks } from "@/lib/scoring/link";

/**
 * Lane routing — deterministic, pure, no network.
 *
 * The router decides whether the engine ran, so it cannot be a model call: a
 * model that routes "Halo, ini dari BCA" to small talk makes recall a property
 * of the network. It is also why the verdict stays instant — it was computed
 * in about a millisecond before this function was called.
 */

export type Lane = "periksa" | "tanya" | "lanjutan" | "obrolan";

export interface TurnPlan {
  lane: Lane;
  /** True when the engine produced at least one weighted signal. */
  hasFindings: boolean;
  /** Rendered as the lane note; also the reason a reviewer can check. */
  why: string;
}

/**
 * Above this, the text is a paste rather than a sentence.
 *
 * Measured: the shortest bench scam is 98 characters, the shortest bench legit
 * case is 57. A length test near 57 therefore cannot separate the two, so 160
 * is used instead — safely above every scam, and still a real "this is a
 * pasted paragraph" signal. Anything shorter that is genuinely a check is
 * caught by the findings, link, phone, attachment, or money test above this
 * line.
 */
export const PASTE_LENGTH = 160;

/** Shortest scam in the bench corpus (98). `turn.test.ts` pins it. */
export const SHORTEST_SCAM = 98;

const MONEY =
  /(transfer|rekening|bayar|pembayaran|top\s?up|dana|ovo|gopay|shopeepay|pulsa|qris|nominal|saldo)/i;

const PHONE = /(?:\+62|62|0)8\d{7,12}/;

const ATTACHMENT = /\b[\w-]+\.(apk|pdf)\b/i;

const FOLLOW_UP =
  /^(kenapa|mengapa|kok|maksudnya|jelaskan|terus|lalu|kalau begitu|bagaimana kalau|apa yang harus|apa yang bisa|gimana)\b/i;

/**
 * Shapes that ask about a concept rather than report a message.
 *
 * Every entry is an opener. "Halo, ini dari BCA. Akun Anda diblokir?" ends in
 * a question mark and must still be scored, which is why a trailing `?` alone
 * is not enough to make something a concept question.
 */
const CONCEPT_QUESTION: readonly RegExp[] = [
  /^(apa|apakah)\s+(itu|sih|yang\s+dimaksud|arti|artinya|beda|bedanya|perbedaan)\b/i,
  /^(jelaskan|maksudnya|artinya)\b/i,
  /^(bagaimana|gimana)\s+(cara\s+)?(mengenali|menghindari|menangani|melapor|memeriksa|kerja|bekerja|membedakan)\b/i,
  /^(kenapa|mengapa|kok)\s+(bisa|bisakah|sih)\b/i,
  /^(siapa|apa)\s+(kamu|ini|lumina)\b/i,
  /^(kamu|ini)\s+(siapa|apa|bisa)\b/i,
  /^(apa\s+saja|contoh|contohnya)\b/i,
];

/** Things only a received message carries. Their presence blocks the guard. */
const MESSAGE_ARTIFACT =
  /(https?:\/\/|www\.|\b[\w-]+\.(apk|pdf)\b|(?:\+62|62|0)8\d{7,12})/i;

function normalized(text: string): string {
  return text.trim().toLowerCase();
}

/** Question-shaped: ends in `?`, or opens like a concept question. */
export function isQuestionShape(text: string): boolean {
  const t = normalized(text);
  if (t.length === 0) return false;
  return t.endsWith("?") || CONCEPT_QUESTION.some((pattern) => pattern.test(t));
}

/**
 * True when the text is a question *about* scams, not a message that uses one.
 *
 * The guard runs before `scoreWithTrace`, so "apa itu pinjol?" is never scored
 * and cannot produce a 70/100 red card about the person asking. It is narrow on
 * purpose: a concept opener, at most two sentences, and no URL, phone number,
 * or `.apk`/`.pdf` name. A message someone received has none of those shapes.
 */
export function isQuestionAbout(
  text: string,
  options: { hasPriorVerdict?: boolean } = {},
): boolean {
  const t = normalized(text);
  if (t.length === 0) return false;
  if (MESSAGE_ARTIFACT.test(t)) return false;

  // "kenapa berbahaya?" belongs to the lane that already has the explanation.
  if (options.hasPriorVerdict && FOLLOW_UP.test(t)) return false;

  if (!CONCEPT_QUESTION.some((pattern) => pattern.test(t))) return false;

  const sentences = t.split(/[.!?]+/).filter((part) => part.trim().length > 0);
  return sentences.length <= 2;
}

/**
 * Pick the lane. First match wins.
 *
 * Order is load-bearing. Links, phones and attachments come before `lanjutan`
 * so a follow-up that carries new evidence is still checked. `lanjutan` comes
 * before money and length so "kenapa harus transfer?" is answered from the
 * explanation rather than re-scored to 0/100.
 */
export function planTurn(input: {
  text: string;
  result: ScoreResult | null;
  lastResult: ScoreResult | null;
  lastExplanation: Explanation | null;
  /**
   * The question guard already claimed this turn (`isQuestionAbout`). It is a
   * separate input on purpose: the guard runs before scoring, and a keyword
   * inside the question (`"apa itu dana?"`) must not re-route it to a check.
   */
  asked?: boolean;
  /**
   * How many files were attached. An attachment-only turn has no question text
   * to send, and its filename is what the engine reads, so it is a check.
   */
  attachments?: number;
}): TurnPlan {
  const text = input.text.trim();

  if (input.asked) {
    return {
      lane: "tanya",
      hasFindings: false,
      why: "Pertanyaan, bukan pesan yang diterima.",
    };
  }

  const hasFindings =
    input.result?.signals.some((signal) => signal.weight > 0) ?? false;

  if (hasFindings) {
    return { lane: "periksa", hasFindings, why: "Mesin menemukan sinyal." };
  }

  if (extractLinks(text).length > 0) {
    return {
      lane: "periksa",
      hasFindings,
      why: "Ada tautan yang perlu diperiksa.",
    };
  }

  if (
    (input.attachments ?? 0) > 0 ||
    PHONE.test(text) ||
    ATTACHMENT.test(text)
  ) {
    return {
      lane: "periksa",
      hasFindings,
      why: "Ada lampiran, nomor, atau nama berkas.",
    };
  }

  if (input.lastResult && input.lastExplanation && FOLLOW_UP.test(text)) {
    return {
      lane: "lanjutan",
      hasFindings,
      why: "Lanjutan dari pemeriksaan sebelumnya.",
    };
  }

  if (MONEY.test(text)) {
    return {
      lane: "periksa",
      hasFindings,
      why: "Isinya soal transaksi.",
    };
  }

  if (text.length >= PASTE_LENGTH) {
    return {
      lane: "periksa",
      hasFindings,
      why: "Panjangnya seperti pesan yang ditempel.",
    };
  }

  if (isQuestionShape(text)) {
    return {
      lane: "tanya",
      hasFindings,
      why: "Pertanyaan, bukan pesan yang diterima.",
    };
  }

  if (isGreeting(text)) {
    return { lane: "obrolan", hasFindings, why: "Sapaan." };
  }

  return {
    lane: "obrolan",
    hasFindings,
    why: "Tidak ada yang bisa diperiksa.",
  };
}
```

- [ ] **Step 8: Run the router tests**

Run: `npx jest src/lib/companion/turn.test.ts -v`

Expected: PASS. If "routes every bench scam to periksa" fails, the failing ids are scam messages whose score is below 40 — that is a real recall finding, report it rather than weakening the test.

- [ ] **Step 9: Pin the length invariant**

Add to `src/lib/companion/turn.test.ts`:

```ts
describe("turn · pinned lengths", () => {
  it("keeps the pasted-message threshold above every bench scam", () => {
    // If a future bench case is shorter than SHORTEST_SCAM the constant is a
    // lie. Length is only a safety net, but the net must not have holes.
    const shortest = Math.min(...SCAM_CASES.map((c) => c.text.length));
    expect(shortest).toBe(SHORTEST_SCAM);
    expect(PASTE_LENGTH).toBeGreaterThan(SHORTEST_SCAM);
  });
});
```

Run: `npx jest src/lib/companion/turn.test.ts -v` → PASS.

- [ ] **Step 10: Amend the spec's §2b**

The spec is the design record, so it has to describe what shipped. In
`docs/superpowers/specs/2026-11-06-score-first-conversation-design.md`, make
three edits inside §2b:

a. The `planTurn` signature gains the two inputs the implementation needs:

```ts
export function planTurn(input: {
  text: string;              // attachment filenames already folded in
  result: ScoreResult | null; // null when the question-guard short-circuited
  lastResult: ScoreResult | null;
  lastExplanation: Explanation | null;
  asked?: boolean;            // the guard already claimed this turn
  attachments?: number;       // attachment-only turn is still a check
}): TurnPlan;
```

b. Replace the lane table with the order `planTurn` actually uses. The
`lanjutan` row moves above money and length, the length test becomes
`PASTE_LENGTH` (160), and the attachment row is new:

```markdown
| # | Test | Lane | Why |
|---|---|---|---|
| 1 | `result` has any signal with `weight > 0` | `periksa` | the engine found something; recall cannot depend on phrasing |
| 2 | `extractLinks(text).length > 0` | `periksa` | a link deserves the Link Agent row even when nothing else scored |
| 3 | an attachment, a phone pattern, or an `\.apk` / `\.pdf` name | `periksa` | an attached file or a number is something the user received |
| 4 | `lastResult && lastExplanation && FOLLOW_UP` | `lanjutan` | answerable from the `Explanation` already in state |
| 5 | money/transaction vocabulary (`transfer`, `rekening`, `bayar`, `top ?up`, `dana`, `ovo`, `gopay`, `pulsa`) | `periksa` | text about a transaction is checkable |
| 6 | `text.length >= PASTE_LENGTH` (160) | `periksa` | length is a weak signal, so the bar is a pasted paragraph |
| 7 | question-shaped (`?` at end, or `CONCEPT_QUESTION` pattern) | `tanya` | a question is not a message someone received |
| 8 | greeting (fully anchored token match) | `obrolan` | small talk |
| 9 | default | `obrolan` | nothing to check, nothing to answer |
```

c. Replace the paragraph after the table, whose "Tests 1-5" / "Test 7" numbering
no longer matches:

```markdown
Tests 1-3 and 5-6 run **after** scoring, because the score is the strongest
routing feature available and it costs 1 ms. Test 7 is what the question guard
decides **before** scoring, because a question must not be scored at all (§1b).
```

- [ ] **Step 11: Verify and commit**

```bash
npm run typecheck && npx jest src/lib/companion/reply.test.ts src/lib/companion/turn.test.ts
git add src/lib/companion/turn.ts src/lib/companion/turn.test.ts src/lib/companion/reply.ts src/lib/companion/reply.test.ts docs/superpowers/specs/2026-11-06-score-first-conversation-design.md
git commit -m "fix(companion): a greeting is a greeting, and a question is not a message

isGreeting() accepted anything starting with halo/hai under 40 characters,
so four of six realistic short scams never reached the detectors and the
user got the canned 'Siap...' line for a real scam. A fully anchored token
match keeps all four analysable and still recognises 'hi apa kabar'.

turn.ts adds the lane router: periksa, tanya, lanjutan, obrolan. The
question guard runs before scoring, so 'apa itu pinjol?' is answered
instead of being scored 70/tinggi about the person asking. It requires a
concept opener, at most two sentences, and no URL, phone, or .apk name,
so 'Halo, ini dari BCA. Akun Anda diblokir?' is still scored."
```

---

## Task 2: An answer route that has no field for the message

`tanya`, `lanjutan` and `obrolan` need the user's own question, which the digest route cannot carry. The new route's schema is the privacy guarantee: there is no key that can hold a received message, and `.strict()` on every object makes an extra key a rejected request.

**Files:**
- Create: `src/lib/contracts/answer.ts`
- Create: `src/app/api/companion/answer/route.ts`
- Create: `src/app/api/companion/answer/route.test.ts`
- Create: `src/lib/companion/answer-client.ts`
- Modify: `src/lib/contracts/agent-run.ts` (the nested `findings` object becomes `.strict()`)

**Interfaces:**
- Consumes: `VoiceDigestSchema`, `VoiceDigest` (`@/lib/contracts/agent-run`), `MODUS` (`@/lib/modus`).
- Produces:
  - `AnswerLane = "tanya" | "lanjutan" | "obrolan"`
  - `AnswerRequestSchema`, `AnswerRequest` — `.strict()` at every level
  - `AnswerChipSchema`, `AnswerChip = { label: string; send: string }`
  - `buildAnswerRequest(lane, question, state): AnswerRequest`
  - `requestAnswer(payload, signal?): Promise<AnswerResult>`
  - `type AnswerResult = { outcome: "model" | "timeout" | "unconfigured" | "failed"; text: string }`

- [ ] **Step 1: Write the failing schema test**

Create `src/app/api/companion/answer/route.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { POST } from "@/app/api/companion/answer/route";
import { AnswerRequestSchema } from "@/lib/contracts/answer";

const QUESTION =
  "apa itu pinjol? soalnya tetangga saya dapat tawaran pinjaman lewat WhatsApp";

function request(body: unknown): Request {
  return new Request("http://localhost/api/companion/answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("AnswerRequestSchema · the privacy boundary is structural", () => {
  it("accepts a question with no checks attached", () => {
    const parsed = AnswerRequestSchema.safeParse({
      lane: "tanya",
      question: "apa itu pinjol?",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a top-level field that could carry the received message", () => {
    const parsed = AnswerRequestSchema.safeParse({
      lane: "tanya",
      question: "apa itu pinjol?",
      message: "Halo, ini dari BCA. Akun Anda diblokir.",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects evidence inside a nested object", () => {
    const parsed = AnswerRequestSchema.safeParse({
      lane: "lanjutan",
      question: "kenapa berbahaya?",
      digest: {
        risk: "tinggi",
        score: 80,
        modusName: "Pinjol fiktif",
        findings: [
          { label: "Menawarkan pinjaman", weight: 0.8, evidence: "kutipan" },
        ],
        advice: ["Jangan transfer"],
        moduleNo: 9,
        locale: "id",
      },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("POST /api/companion/answer", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env, LUMINA_LLM_URL: "http://llm.test/v1", LUMINA_LLM_MODEL: "test-model" };
  });

  afterEach(() => {
    process.env = env;
    jest.restoreAllMocks();
  });

  it("returns the model's text and sends only the question", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Pinjol adalah pinjaman ilegal." } }],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(request({ lane: "tanya", question: QUESTION }));
    const body = (await response.json()) as { ok: boolean; text: string };

    expect(response.status).toBe(200);
    expect(body.text).toBe("Pinjol adalah pinjaman ilegal.");

    const sent = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(sent).toContain("apa itu pinjol?");
    // The digest route's rule, restated for this route: nothing but what the
    // user typed.
    expect(sent).not.toContain("diblokir");
  });

  it("rejects an unknown field instead of ignoring it", async () => {
    const response = await POST(
      request({ lane: "tanya", question: "apa itu pinjol?", message: "x" }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid-request" });
  });

  it("reports not-configured instead of pretending the model answered", async () => {
    process.env.LUMINA_LLM_URL = "";
    const response = await POST(request({ lane: "tanya", question: "halo" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "not-configured" });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/app/api/companion/answer/route.test.ts -v`

Expected: FAIL — `Cannot find module '@/lib/contracts/answer'`.

- [ ] **Step 3: Write the contract**

First, make the digest's nested `findings` object strict. The outer
`VoiceDigestSchema` is already `.strict()`, but zod strips unknown keys from
inner objects unless they are strict too — so today an `evidence` quote appended
to a finding would be silently dropped, and the route test below would pass for
the wrong reason. In `src/lib/contracts/agent-run.ts:90-95`, change:

```ts
    findings: z.array(
      z.object({
        label: z.string(),
        weight: z.number().min(0).max(1),
      }),
    ),
```

to:

```ts
    findings: z.array(
      z
        .object({
          label: z.string(),
          weight: z.number().min(0).max(1),
        })
        .strict(),
    ),
```

Then run `npx jest src/lib/contracts/agent-run.test.ts -v` → PASS (the existing
tests only reject a top-level extra key and accept the builder's own output).

Create `src/lib/contracts/answer.ts`:

```ts
import { z } from "zod";
import { VoiceDigestSchema } from "@/lib/contracts/agent-run";

/**
 * The payload for the conversational lanes.
 *
 * This schema is the privacy guarantee, not a promise in prose. There is no key
 * that can hold a message someone sent you: `question` is what the user typed,
 * `digest` is the same lossy findings payload the verdict route already sends,
 * and `modules`/`tactics` are from `modus.json` and `tactics.ts`.
 *
 * `.strict()` is applied at every level. An extra key is a rejected request
 * rather than a silently dropped one, which is what makes "the checked message
 * never leaves the device" testable.
 */

export const AnswerLaneSchema = z.enum(["tanya", "lanjutan", "obrolan"]);
export type AnswerLane = z.infer<typeof AnswerLaneSchema>;

export const AnswerHistoryEntrySchema = z
  .object({
    role: z.enum(["user", "companion"]),
    text: z.string().min(1).max(2000),
  })
  .strict();

export const AnswerModuleSchema = z
  .object({
    no: z.number().int().min(1).max(12),
    nama: z.string().min(1).max(120),
    ciri: z.array(z.string().min(1).max(240)).max(8),
  })
  .strict();

export const AnswerTacticSchema = z
  .object({
    nama: z.string().min(1).max(120),
    cara: z.string().min(1).max(400),
    tanda: z.string().min(1).max(400),
    pembeda: z.string().min(1).max(400),
  })
  .strict();

export const AnswerRequestSchema = z
  .object({
    lane: AnswerLaneSchema,
    /** What the user typed. Never a message they received. */
    question: z.string().min(1).max(2000),
    /** Chat-lane turns only. The client filters checked turns out. */
    history: z.array(AnswerHistoryEntrySchema).max(10).default([]),
    /** The last verdict's lossy digest, when one exists. */
    digest: VoiceDigestSchema.nullable().default(null),
    /** Public scheme facts from `modus.json`, for grounded answers. */
    modules: z.array(AnswerModuleSchema).max(12).default([]),
    /** Public tactic facts, with no `evidence` field to leak a quote. */
    tactics: z.array(AnswerTacticSchema).max(6).default([]),
  })
  .strict();

export type AnswerRequest = z.infer<typeof AnswerRequestSchema>;

export const AnswerChipSchema = z
  .object({
    label: z.string().min(1).max(40),
    /** Text sent as a normal turn when the chip is tapped. */
    send: z.string().min(1).max(200),
  })
  .strict();

export type AnswerChip = z.infer<typeof AnswerChipSchema>;
```

- [ ] **Step 4: Run the schema tests**

Run: `npx jest src/app/api/companion/answer/route.test.ts -v -t "privacy boundary"`

Expected: PASS for the three schema tests; the `POST` tests still fail because the route does not exist.

- [ ] **Step 5: Write the route**

Create `src/app/api/companion/answer/route.ts`:

```ts
import {
  type AnswerLane,
  AnswerRequestSchema,
  type AnswerRequest,
} from "@/lib/contracts/answer";

/**
 * The conversational lanes.
 *
 * Separate from `/api/companion/voice` on purpose. That route carries findings
 * and is covered by streaming tests that must not be disturbed. This one
 * carries the user's own question, so its schema is a different shape and its
 * system prompt is different per lane.
 *
 * Plan §3b: the model chooses sentences, never findings. It is told what the
 * scheme data says and forbidden from inventing a finding.
 *
 * No segment config: this Next version has `cacheComponents` enabled and
 * rejects `export const runtime` / `export const dynamic`.
 */

/** Shared ceiling. Must stay below the client's 15 s abort. */
const DEADLINE_MS = 13000;

const MAX_TOKENS = 800;

const SHARED = [
  "Kamu adalah Lumina, pendamping yang membantu orang Indonesia memeriksa pesan yang mencurigakan.",
  "Aturan:",
  "a. Bahasa Indonesia, tenang, tidak menghakimi. Jangan pernah menyalahkan korban.",
  "b. Maksimal tiga kalimat. Tanpa salam pembuka, tanpa markdown, tanpa daftar bernomor.",
  "c. Jangan mengarang temuan. Kamu bukan penilai risiko; angka sudah dihitung di perangkat pengguna.",
];

const SYSTEM: Record<AnswerLane, string> = {
  tanya: [
    ...SHARED,
    "d. Jawab pertanyaannya, bukan pesannya. Pakai hanya fakta di `modules` dan `tactics`.",
    "e. Kalau modul yang ditanyakan tidak ada di daftar, katakan terus terang bahwa modulnya belum ada.",
  ].join("\n"),
  lanjutan: [
    ...SHARED,
    "d. Ini lanjutan dari pemeriksaan sebelumnya. Jawab dari `digest` dan `tactics` saja.",
    "e. Jangan mengulang seluruh hasil; jelaskan bagian yang ditanyakan.",
  ].join("\n"),
  obrolan: [
    ...SHARED,
    "d. Ini obrolan biasa. Jawab dengan hangat dan singkat.",
    "e. Kalau pengguna menyebut pesan yang mencurigakan, ajak menempelkannya untuk diperiksa.",
  ].join("\n"),
};

/**
 * Only the fields this lane needs are forwarded.
 *
 * A single `payloadFor` is what keeps a future field from quietly reaching a
 * lane that must not see it.
 */
function payloadFor(data: AnswerRequest): Record<string, unknown> {
  if (data.lane === "tanya") {
    return {
      question: data.question,
      modules: data.modules,
      tactics: data.tactics,
    };
  }
  if (data.lane === "lanjutan") {
    return {
      question: data.question,
      digest: data.digest,
      tactics: data.tactics,
    };
  }
  return { question: data.question, history: data.history };
}

function fail(status: number, error: string) {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = AnswerRequestSchema.safeParse(body);
  if (!parsed.success) return fail(400, "invalid-request");

  const base = process.env.LUMINA_LLM_URL?.trim();
  const model = process.env.LUMINA_LLM_MODEL?.trim();
  if (!base || !model) return fail(503, "not-configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEADLINE_MS);

  try {
    const upstream = await fetch(
      `${base.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          ...(process.env.LUMINA_LLM_KEY
            ? { authorization: `Bearer ${process.env.LUMINA_LLM_KEY}` }
            : {}),
        },
        body: JSON.stringify({
          model,
          stream: false,
          temperature: 0.4,
          max_tokens: MAX_TOKENS,
          messages: [
            { role: "system", content: SYSTEM[parsed.data.lane] },
            {
              role: "user",
              content: JSON.stringify(payloadFor(parsed.data)),
            },
          ],
        }),
      },
    );

    if (!upstream.ok) return fail(503, "upstream-failed");

    const json = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (text.length === 0) return fail(503, "upstream-empty");

    return Response.json({ ok: true, text });
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    return fail(503, aborted ? "upstream-timeout" : "upstream-unreachable");
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 6: Run the route tests**

Run: `npx jest src/app/api/companion/answer/route.test.ts -v`

Expected: PASS, 6 tests.

- [ ] **Step 7: Write the browser client**

Create `src/lib/companion/answer-client.ts`:

```ts
import type { Explanation } from "@/lib/companion/explain";
import type { VoiceDigest } from "@/lib/contracts/agent-run";
import type { AnswerLane, AnswerRequest } from "@/lib/contracts/answer";
import { MODUS } from "@/lib/modus";

/**
 * Browser side of the conversational lanes.
 *
 * Never throws, for the same reason `requestReply` never throws: an offline
 * venue is the expected case, and the caller always has a fallback sentence.
 */

export type AnswerOutcome = "model" | "timeout" | "unconfigured" | "failed";

export interface AnswerResult {
  outcome: AnswerOutcome;
  text: string;
}

/** Public scheme facts. No user content can enter this array. */
const MODULE_FACTS = MODUS.map((modus) => ({
  no: modus.no,
  nama: modus.nama,
  ciri: modus.ciri,
}));

/**
 * Project the explanation down to its public half.
 *
 * `TacticExplained.evidence` is a verbatim quote from the user's message, so it
 * is dropped here rather than trusted to stay unread downstream.
 */
function tacticFacts(explanation: Explanation | null) {
  if (!explanation) return [];
  return explanation.tactics.map((tactic) => ({
    nama: tactic.nama,
    cara: tactic.cara,
    tanda: tactic.tanda,
    pembeda: tactic.pembeda,
  }));
}

export function buildAnswerRequest(
  lane: AnswerLane,
  question: string,
  state: {
    history: { role: "user" | "companion"; text: string }[];
    digest: VoiceDigest | null;
    explanation: Explanation | null;
  },
): AnswerRequest {
  return {
    lane,
    question,
    history: lane === "obrolan" ? state.history.slice(-10) : [],
    digest: lane === "lanjutan" ? state.digest : null,
    modules: lane === "tanya" ? MODULE_FACTS : [],
    tactics: lane === "tanya" || lane === "lanjutan" ? tacticFacts(state.explanation) : [],
  };
}

function outcomeFor(code: string): AnswerOutcome {
  if (code === "not-configured") return "unconfigured";
  if (code === "upstream-timeout") return "timeout";
  return "failed";
}

export async function requestAnswer(
  payload: AnswerRequest,
  signal?: AbortSignal,
): Promise<AnswerResult> {
  try {
    const response = await fetch("/api/companion/answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      let code = "";
      try {
        code = ((await response.json()) as { error?: string }).error ?? "";
      } catch {
        code = "";
      }
      return { outcome: outcomeFor(code), text: "" };
    }

    const body = (await response.json()) as { text?: string };
    const text = body.text?.trim() ?? "";
    if (text.length === 0) return { outcome: "failed", text: "" };
    return { outcome: "model", text };
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    return { outcome: aborted ? "timeout" : "failed", text: "" };
  }
}
```

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`

Expected: PASS. If `MODUS` import fails, confirm `src/lib/modus.ts` exports it (it does, line 40).

- [ ] **Step 9: Commit**

```bash
git add src/lib/contracts/answer.ts src/app/api/companion/answer src/lib/companion/answer-client.ts
git commit -m "feat(companion): an answer route that has no field for the message

The digest route cannot carry a question, and widening it would put the
user's question in the same schema that promises only findings travel.
A separate route keeps that promise structural: AnswerRequestSchema is
.strict() at every level, and its only free-text field is what the user
typed.

tanya receives public scheme facts from modus.json. lanjutan receives the
digest plus tactic facts with the evidence quote projected out. obrolan
receives chat history, which the client filters to chat lanes only."
```

---

## Task 3: Route the turn

This is the task that changes what a judge sees. A `tanya` or `obrolan` turn reaches the model and renders no trace and no card; a `periksa` turn is unchanged.

**Files:**
- Modify: `src/components/companion/voice-client.ts` (extract `requestStreamingText`)
- Modify: `src/components/companion/companion-chat.tsx` (`send`, render, `Turn`)
- Modify: `src/components/companion/companion-chat.test.tsx`

**Interfaces:**
- Consumes: `planTurn`, `isQuestionAbout`, `type Lane` (Task 1); `buildAnswerRequest`, `requestAnswer` (Task 2); `VoiceDigest`.
- Produces:
  - `requestStreamingText(endpoint: string, payload: unknown, onChunk: (t: string) => void, signal?: AbortSignal): Promise<VoiceResult>`
  - `Turn` gains `lane?: Lane`, `laneSource?: string`
  - `send(raw: string, attachments?: Attachment[], options?: { force?: "periksa" })`

- [ ] **Step 1: Write the failing lane test**

Add to `src/components/companion/companion-chat.test.tsx`:

```tsx
describe("CompanionChat · a question is not a bad message", () => {
  it("answers a question about a scam without a score card or a trace", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await user.type(screen.getByLabelText(/pesan/i), "apa itu pinjol?");
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    // The measured defect: this message used to score 70/tinggi, showing a red
    // card about the person asking the question.
    expect(await screen.findByText(/Dijawab sebagai pertanyaan/i)).toBeInTheDocument();
    expect(screen.queryByText(/70\/100/)).not.toBeInTheDocument();
    expect(screen.queryByText("Message Agent")).not.toBeInTheDocument();
    expect(screen.queryByText("Scoring Orchestrator")).not.toBeInTheDocument();
  });

  it("lets the reader turn the question into a check with one tap", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await user.type(screen.getByLabelText(/pesan/i), "apa itu pinjol?");
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    const retry = await screen.findByRole("button", {
      name: /periksa sebagai pesan/i,
    });
    await user.click(retry);

    // Forced lane: the engine runs and the trace appears, because the reader
    // asked for a verdict rather than an explanation.
    expect(await screen.findByText("Message Agent")).toBeInTheDocument();
  });

  it("keeps the trace and the card on a message that is actually checked", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await user.click(screen.getByRole("button", { name: /apk undangan/i }));

    expect(await screen.findByText("Message Agent")).toBeInTheDocument();
    expect(
      await screen.findByText(/Dijawab sebagai pertanyaan/i),
    ).not.toBeInTheDocument();
  });
});
```

Also update the existing `CompanionChat · an honest zero` test in the same file.
It sends `"tesings"`, which now routes to `obrolan` and renders no card at all.
Replace the typed message with a benign pasted paragraph so the turn still
routes to `periksa` by length, and the test keeps asserting what it was written
for — that a weight-0 placeholder is not counted as a finding:

```tsx
    // 215 characters: above PASTE_LENGTH, so the engine runs, but it contains
    // no finding, link, phone, number, or money word. The card must read
    // 0/100 "Bersih" and the panel must say "0 temuan".
    const BENIGN_PASTE =
      "besok pagi aku mau ke kampus lebih awal untuk mengurus surat keterangan " +
      "aktif kuliah, lalu siangnya mampir ke perpustakaan mengembalikan buku " +
      "yang sudah lewat tenggat dua hari. setelah itu kita makan siang bareng ya";

    await user.type(screen.getByLabelText(/pesan/i), BENIGN_PASTE);
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/components/companion/companion-chat.test.tsx -t "a question is not a bad message" -v`

Expected: FAIL — "Dijawab sebagai pertanyaan" never appears, and `70/100` is present for "apa itu pinjol?".

- [ ] **Step 3: Extract the reusable stream request**

In `src/components/companion/voice-client.ts`, replace `requestReply` (lines 60-116) with:

```ts
/**
 * Stream a POST and collect the text.
 *
 * Shared with the answer lane so both paths agree on what "the model answered"
 * means: non-empty and finished. Extracted rather than duplicated because the
 * truncation rules below are the ones that were wrong twice.
 */
export async function requestStreamingText(
  endpoint: string,
  payload: unknown,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<VoiceResult> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      return { outcome: outcomeFor(await readErrorCode(response)), text: "" };
    }
    if (!response.body) return { outcome: "failed", text: "" };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk.length === 0) continue;
      text += chunk;
      onChunk(chunk);
    }

    const tail = decoder.decode();
    if (tail.length > 0) {
      text += tail;
      onChunk(tail);
    }

    if (text.trim().length === 0) return { outcome: "failed", text: "" };
    if (!isComplete(text)) return { outcome: "truncated", text };
    return { outcome: "model", text };
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    return { outcome: aborted ? "timeout" : "failed", text: "" };
  }
}

/**
 * Browser side of the verdict lane.
 *
 * Never throws. The caller always has `composeReply()` available, and a
 * rejected promise here would take a whole turn down for a cosmetic reason —
 * an offline venue is the expected case, not an exceptional one.
 */
export function requestReply(
  digest: VoiceDigest,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<VoiceResult> {
  return requestStreamingText(
    "/api/companion/voice",
    digest,
    onChunk,
    signal,
  );
}
```

Note the one behaviour change: `truncated` now returns the partial `text`
instead of `""`. Task 4 uses it. Update the comment on `VoiceResult.text` in
`voice-client.ts:20` to match, so the interface does not keep claiming the text
is "Empty on every failure":

```ts
  /** Text received, already streamed to `onChunk`. Carries the partial text on `truncated`. */
  text: string;
```

- [ ] **Step 4: Run the voice-client tests**

Run: `npx jest src/components/companion/voice-client.test.ts -v`

Expected: PASS. If a test asserts `text: ""` on `truncated`, update that assertion to expect the partial text — that is the intended change and Task 4 depends on it.

- [ ] **Step 5: Add the lane fields to `Turn`**

In `src/components/companion/companion-chat.tsx`, inside `interface Turn` (after `voiceStartedAt`), add:

```tsx
  /** Which lane the router picked. Rendered as the honest reason, not a badge. */
  lane?: Lane;
  /** The reader's own words, kept only so the lane chip can re-send them. */
  laneSource?: string;
```

and extend the imports at the top (Biome sorts named imports, so keep the
names alphabetical inside each statement):

```tsx
import { buildAnswerRequest, requestAnswer } from "@/lib/companion/answer-client";
import { isQuestionAbout, type Lane, planTurn } from "@/lib/companion/turn";

import {
  composeAnswerFallback,
  composeReply,
  suggestedActions,
} from "@/lib/companion/reply";
```

`isGreeting` is dropped from that reply import on purpose: its only caller in
this file is `hasContent`, which this task removes. Leaving it imported is a
Biome unused-import failure, not a harmless leftover.

The existing `@/lib/contracts/agent-run` import must also gain
`type VoiceDigest`, because `send` now types the digest:

```tsx
import {
  type AgentStage,
  type AgentTrace,
  STAGE_LABEL,
  type VoiceDigest,
  voiceDigest,
} from "@/lib/contracts/agent-run";
```

- [ ] **Step 6: Add the conversational fallbacks**

In `src/lib/companion/reply.ts`, append:

```ts
/**
 * The sentence shown when the model could not answer a conversational lane.
 *
 * Separate from `composeReply` because there is no verdict to talk about: a
 * fallback that said "Saya belum menemukan apa pun di situ" answered a check
 * the user never asked for.
 */
export function composeAnswerFallback(
  lane: "tanya" | "lanjutan" | "obrolan",
): string {
  if (lane === "tanya") {
    return "Saya belum bisa menjawab itu sekarang. Coba tanya lagi sebentar lagi, atau tempel pesan yang mencurigakan supaya saya periksa.";
  }
  if (lane === "lanjutan") {
    return "Penjelasan tadi ada di kartu di atas. Kalau ada bagian yang ingin dibahas lagi, sebutkan bagiannya.";
  }
  return "Halo. Tempel pesan, tautan, atau ceritakan telepon yang kamu terima — saya periksa dan jelaskan polanya.";
}
```

- [ ] **Step 7: Add a `latestExplanation` memo**

In `companion-chat.tsx`, next to `latestResult` (after line 145), add:

```tsx
  const latestExplanation = React.useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const hit = turns[i]?.explanation;
      if (hit) return hit;
    }
    return null;
  }, [turns]);
```

- [ ] **Step 8: Rewrite the top of `send()`**

In `companion-chat.tsx`, replace lines 170-209 with:

```tsx
  const send = React.useCallback(
    async (
      raw: string,
      attachments: Attachment[] = [],
      options: { force?: "periksa" } = {},
    ) => {
      const text = raw.trim();
      if ((!text && attachments.length === 0) || busy) return;

      // Attachment filenames are part of what the user received, so they are
      // part of what the engine reads: `undangan-nikah.apk` is the strongest
      // signal in the APK family and it is not prose anyone types.
      const scored = scoringTextWithAttachments(text, attachments);

      // Stamped here, never during render: Next 16 fails the prerender of a
      // client component that reads the clock while rendering.
      const stamp = new Date().toISOString();

      const target = activeId;
      if (target === undefined) return;

      /*
       * The question guard runs BEFORE scoring. Asking what a scam is must not
       * produce a red card about the person asking: measured, "apa itu pinjol?"
       * scored 70/tinggi and named the pinjol scheme. A question is not a
       * message someone received, so the detectors never see it.
       */
      const asked = options.force
        ? false
        : isQuestionAbout(scored, { hasPriorVerdict: latestResult !== null });

      /*
       * Prior *checked* user turns go to the Conversation Agent so escalation
       * across messages is visible. Chat lanes are excluded on purpose: the
       * Conversation Agent models messages the user received, and feeding it
       * "apa itu dana?" because the word "dana" appears there would let a
       * question manufacture an escalation.
       */
      const priorTurns = (active?.turns ?? [])
        .filter(
          (turn) =>
            turn.role === "user" &&
            turn.lane === "periksa" &&
            turn.text.trim().length > 0,
        )
        .map((turn) => ({ text: turn.text }));

      const { result, trace } = asked
        ? { result: null, trace: null }
        : scoreWithTrace({ text: scored, turns: priorTurns });

      const plan = planTurn({
        text: scored,
        result,
        lastResult: latestResult,
        lastExplanation: latestExplanation,
        asked,
        attachments: attachments.length,
      });

      const lane: Lane = options.force ? "periksa" : plan.lane;

      /*
       * The card and the trace render on `result`, never on `risk`. The bench
       * records 20/20 caught but 18/20 `tinggi`; gating on `tinggi` would drop
       * two scam samples and turn a 20/20 claim into 18/20 on stage.
       */
      const checked = lane === "periksa" && result !== null;

      /*
       * The user turn carries the lane too. The chat-lane history is built by
       * filtering on `turn.lane`, and user turns have no lane of their own
       * unless it is set here — otherwise history would contain companion
       * answers with no questions in between.
       */
      const userTurn: Turn = {
        id: id(),
        role: "user",
        text,
        attachments,
        at: stamp,
        lane,
      };
```

- [ ] **Step 9: Gate the trace and evidence on `checked`**

In the same function, replace only the block from `const evidenceStarted`
through `const detectorMs = (trace?.totalMs ?? 0) + evidenceMs;`. Leave the two
lines that follow it — `const companionId = id();` and
`const voiceStartedAt = Date.now();` — exactly as they are; `patchCompanion`
and `finish` both depend on them.

```tsx
      const evidenceStarted = performance.now();
      const evidenceBundle = checked
        ? buildEvidenceBundle([{ text: scored, at: stamp, result: result }])
        : null;
      const evidenceMs = performance.now() - evidenceStarted;
      const artifacts = evidenceBundle?.artifacts.length ?? 0;

      const evidenceStage: AgentStage | null =
        trace && checked
          ? {
              id: "evidence",
              ...STAGE_LABEL.evidence,
              status: "selesai",
              findings: 0,
              ms: evidenceMs,
              note:
                artifacts > 0
                  ? `${artifacts} kutipan tercatat untuk laporan`
                  : "Tidak ada kutipan yang bisa dicatat.",
            }
          : null;

      const stages: AgentStage[] =
        trace && checked
          ? [...trace.stages, ...(evidenceStage ? [evidenceStage] : [])]
          : [];
      const detectorMs = (trace?.totalMs ?? 0) + evidenceMs;
```

Then `openTrace` becomes:

```tsx
      const openTrace: AgentTrace | null = checked
        ? {
            stages: [
              ...stages,
              {
                id: "voice",
                ...STAGE_LABEL.voice,
                status: "berjalan",
                findings: 0,
                ms: 0,
              },
            ],
            totalMs: detectorMs,
          }
        : null;
```

Note: rename the local `evidence` to `evidenceBundle` and update the one later use inside `send` (there is none after this point — `evidence` from the outer scope is a different binding).

- [ ] **Step 10: Gate the session patch on `checked`**

Replace `risk: result?.risk ?? session.risk` with:

```tsx
                risk: checked ? (result?.risk ?? session.risk) : session.risk,
```

- [ ] **Step 11: Make `finish` lane-aware and add the epoch guard**

Replace `appendText` and `finish` (lines 314-380) with:

```tsx
      /**
       * A chunk is only appended while the turn is still streaming.
       *
       * This is the epoch guard: once `finish()` seals a turn, a chunk that
       * arrives late from a slow socket has nowhere to land. Without it, a
       * timed-out turn could regain text after the template was shown.
       */
      const appendText = (chunk: string) =>
        patchCompanion((turn) =>
          turn.streaming ? { ...turn, text: turn.text + chunk } : turn,
        );

      const finish = (
        finalText: string,
        voice: "model" | "template",
        reason?: VoiceOutcome,
      ) => {
        const voiceMs = Date.now() - voiceStartedAt;
        patchCompanion((turn) => ({
          ...turn,
          text: finalText,
          streaming: false,
          voiceStartedAt: undefined,
          lane,
          laneSource: lane === "tanya" ? text : undefined,
          result: checked ? (result ?? undefined) : undefined,
          source: checked ? scored : undefined,
          /*
           * Only teach when something was actually found. A clean message has
           * no tactics and no scheme, and showing generic checks for
           * "apa kabar?" would be noise dressed as diligence.
           */
          explanation:
            checked &&
            result !== null &&
            result.signals.some((signal) => signal.weight > 0)
              ? explain(result, scored)
              : undefined,
          trace: turn.trace
            ? {
                // Replace the open `berjalan` stage rather than appending a
                // second one: one stage, one outcome.
                stages: turn.trace.stages.map((stage) =>
                  stage.id === "voice"
                    ? {
                        ...stage,
                        status: voice === "model" ? "selesai" : "dilewati",
                        ms: voiceMs,
                        note:
                          voice === "model"
                            ? reason === "truncated"
                              ? "Jawaban terpotong; bagian yang sudah tampil dipertahankan."
                              : undefined
                            : templateNote(reason ?? "unconfigured"),
                      }
                    : stage,
                ),
                totalMs: detectorMs + voiceMs,
              }
            : undefined,
        }));
        setBusy(false);
      };
```

- [ ] **Step 12: Branch the request by lane**

Replace the block from `const fallback = composeReply(` through the end of the function (lines 382-412) with:

```tsx
      const digest: VoiceDigest | null =
        checked && result
          ? voiceDigest(
              result,
              modusFor(result.relatedModule)?.nama ?? result.modus,
            )
          : null;

      /*
       * History for the chat lane. A turn that was checked carries the message
       * someone received, so it is filtered out here rather than trusted to be
       * dropped inside the route: the schema is strict, but the client decides
       * what it is allowed to see.
       */
      const chatHistory = (active?.turns ?? [])
        .filter((turn) => turn.lane === "tanya" || turn.lane === "obrolan")
        .map((turn) => ({
          role: turn.role,
          text: turn.text.slice(0, 2000),
        }));

      // Defensive: nothing below may leave `busy` stuck.
      try {
        if (lane === "periksa") {
          if (!digest) {
            finish(
              composeReply(text || attachments[0]?.name || "", null, {
                first: false,
                containsContent: false,
              }),
              "template",
              "unconfigured",
            );
            return;
          }

          const voice = await requestReply(digest, appendText);
          if (voice.outcome === "model") {
            finish(voice.text.trim(), "model");
          } else {
            finish(
              composeReply(text || attachments[0]?.name || "", result, {
                first: false,
                containsContent: true,
              }),
              "template",
              voice.outcome,
            );
          }
          return;
        }

        const answer = await requestAnswer(
          buildAnswerRequest(lane, text, {
            history: chatHistory,
            digest,
            explanation: latestExplanation,
          }),
        );

        if (answer.outcome === "model") {
          finish(answer.text, "model");
        } else {
          finish(
            composeAnswerFallback(lane),
            "template",
            answer.outcome as VoiceOutcome,
          );
        }
      } catch {
        finish(
          lane === "periksa"
            ? composeReply(text || attachments[0]?.name || "", result, {
                first: false,
                containsContent: checked,
              })
            : composeAnswerFallback(lane),
          "template",
          "failed",
        );
      }
    },
    [active?.turns, activeId, busy, latestExplanation, latestResult],
  );
```

- [ ] **Step 13: Render the lane chip**

In the companion turn JSX, after the `{turn.text.length > 0 ? … : null}` bubble and before the `{turn.result && !turn.streaming ? … : null}` block, add:

```tsx
                    {turn.lane === "tanya" && turn.laneSource ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-dim text-[0.7rem]">
                          Dijawab sebagai pertanyaan
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-dim text-xs hover:text-txt"
                          onClick={() =>
                            send(turn.laneSource ?? "", [], { force: "periksa" })
                          }
                        >
                          Periksa sebagai pesan
                        </Button>
                      </div>
                    ) : null}
```

- [ ] **Step 14: Run the lane tests**

Run: `npx jest src/components/companion/companion-chat.test.tsx -v`

Expected: PASS. `70/100` must be absent for "apa itu pinjol?" and "Message Agent" must be absent too.

- [ ] **Step 15: Run the whole companion suite**

Run: `npx jest src/components/companion src/lib/companion -v`

Expected: PASS. `voice-wiring.test.tsx` must still pass — it sends a scam message, which is the `periksa` lane and still posts to `/api/companion/voice`.

- [ ] **Step 16: Commit**

```bash
npm run typecheck
git add src/components/companion/companion-chat.tsx src/components/companion/companion-chat.test.tsx src/components/companion/voice-client.ts src/lib/companion/reply.ts
git commit -m "feat(companion): route the turn before speaking

A greeting now reaches the model instead of a hardcoded string, and a
question about scams is answered instead of scored. The trace and the card
render only where the engine actually ran, so 'siapa kamu' no longer shows
seven agent rows while 'hi' shows none.

The lane chip keeps a misroute visible and correctable in one tap: a
question routed as obrolan can be re-sent as a periksa turn without
retyping it. A model router's misroute would be silent; this one is not."
```

---

## Task 4: Stop throwing away a real answer

`max_tokens: 220` was starving the visible reply: the model is a reasoning model and `reasoning_tokens` bill inside `completion_tokens`. Measured, 800 already returns `finish_reason: stop`. When a reply is still cut, keep what the reader already saw instead of replacing it.

**Files:**
- Modify: `src/app/api/companion/voice/route.ts:42` and `:87`
- Modify: `src/components/companion/companion-chat.tsx` (`send`)
- Modify: `src/components/companion/voice-wiring.test.tsx`

**Interfaces:**
- Consumes: `VoiceOutcome` (`truncated` now carries text).
- Produces: no new exports.

- [ ] **Step 1: Write the failing truncation test**

In `src/components/companion/voice-wiring.test.tsx`, replace the test at lines 116-131 with:

```tsx
  it("keeps a substantive reply that was cut off instead of swapping it", async () => {
    // Measured: `max_tokens: 220` minus 54-157 reasoning tokens left replies
    // ending mid-word. The reader watched that answer appear and then watched
    // it get replaced by canned copy, which is what "hardcoded" looked like.
    // With a 800-token budget this is rare; when it still happens, the part
    // that was already read stays on screen.
    const PARTIAL =
      "Pesan ini meminta kode OTP lewat tautan yang bukan domain resmi bank, jadi jangan dibalas dulu";
    fetchMock.mockResolvedValue(okResponse(PARTIAL));

    await sendScam();

    await waitFor(() => {
      expect(screen.getByText(PARTIAL)).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/Ini berbahaya\. Jangan bertindak dulu/i),
    ).not.toBeInTheDocument();
  });

  it("still falls back when the cut leaves almost nothing", async () => {
    fetchMock.mockResolvedValue(okResponse("Pemeriksaan kali"));

    await sendScam();

    await waitFor(() => {
      expect(
        screen.getByText(/Ini berbahaya\. Jangan bertindak dulu/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Pemeriksaan kali")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/components/companion/voice-wiring.test.tsx -v`

Expected: FAIL — the partial text is replaced by the template, so `getByText(PARTIAL)` finds nothing.

- [ ] **Step 3: Raise the budget**

In `src/app/api/companion/voice/route.ts:87`, change `max_tokens: 220,` to `max_tokens: 800,` and add above it:

```ts
          /*
           * 800, measured. This model is a reasoning model and
           * `reasoning_tokens` are billed inside `completion_tokens`, so a 220
           * cap is 220 minus 54-206 tokens of thinking. Measured: 40 -> 0
           * visible characters, 80 -> 85 cut mid-word, 220 -> sometimes cut,
           * 800 -> 359 characters with `finish_reason: "stop"`. 1600 was
           * proposed and rejected: it buys more thinking on the critical path,
           * not a longer answer.
           */
```

- [ ] **Step 4: Lower the route ceiling below the client abort**

In the same file, change `const TIMEOUT_MS = 20000;` to:

```ts
/**
 * 13s. Measured: 2.3-2.6 s typical, one successful call at 11.8 s.
 *
 * The old 20 s ceiling existed because the client passed no abort signal, so a
 * wedged socket left the composer disabled forever. The client now aborts at
 * 15 s, and the server must give up first — otherwise it streams into a turn
 * that has already been sealed and shown as a template.
 */
const TIMEOUT_MS = 13000;
```

- [ ] **Step 5: Use the partial reply in the client**

In `companion-chat.tsx`, inside the `lane === "periksa"` branch, replace:

```tsx
          const voice = await requestReply(digest, appendText);
          if (voice.outcome === "model") {
            finish(voice.text.trim(), "model");
          } else {
```

with:

```tsx
          const voice = await requestReply(digest, appendText);

          /*
           * A reply that was cut but had already said something is kept.
           * `isComplete` treats a missing full stop as a failed answer, but the
           * reader has been watching those words arrive for two seconds —
           * replacing them is the "it is hardcoded" symptom. Below 40
           * characters there is effectively nothing to keep, so the template
           * takes over.
           */
          const partial = voice.text.trim();
          const keepPartial =
            voice.outcome === "truncated" && partial.length >= 40;

          if (voice.outcome === "model" || keepPartial) {
            // `finish` turns the `truncated` reason into a trace note on the
            // periksa card, so a kept partial answer is never labelled as a
            // clean finish.
            finish(partial, "model", keepPartial ? "truncated" : undefined);
          } else {
```

- [ ] **Step 6: Add the client abort signal**

In `companion-chat.tsx`, immediately before the `try {` added in Task 3 Step 12, add:

```tsx
      /*
       * 15 s, above the route's 13 s so the server is always the one that gives
       * up first. Before this the call passed no signal at all: a wedged socket
       * left `busy` true and the composer disabled with no way back.
       */
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 15000);
```

and pass it through:

```tsx
          const voice = await requestReply(digest, appendText, controller.signal);
```

```tsx
        const answer = await requestAnswer(
          buildAnswerRequest(lane, text, {
            history: chatHistory,
            digest,
            explanation: latestExplanation,
          }),
          controller.signal,
        );
```

and clear it in a `finally` on the `try` block. Keep the `catch` body from
Task 3 Step 12 exactly as written; add only the `finally` clause after it:

```tsx
      } finally {
        clearTimeout(abortTimer);
      }
```

- [ ] **Step 7: Run the truncation tests**

Run: `npx jest src/components/companion/voice-wiring.test.tsx -v`

Expected: PASS, 5 tests.

- [ ] **Step 8: Run the full suite**

Run: `npm run test`

Expected: PASS. Any `voice-client.test.ts` assertion expecting `text: ""` on `truncated` now expects the partial text — update it, it is the intended change.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/companion/voice/route.ts src/components/companion/companion-chat.tsx src/components/companion/voice-wiring.test.tsx
git commit -m "fix(companion): a cut reply is kept, and a wedge always ends

max_tokens 220 was 220 minus 54-206 reasoning tokens, so the visible answer
was sometimes 0 characters. Measured: 800 returns finish_reason stop with a
complete 359-character reply. 1600 was rejected because it buys thinking
time on the critical path, not a longer answer.

When a reply is still cut, the part already on screen stays. Replacing it
with a template after two seconds of streaming is what made a working
model look hardcoded. The client now aborts at 15 s and the route at 13 s,
so the server is always the one that gives up, and the epoch guard means a
late chunk cannot land in a sealed turn."
```

---

## Task 5: Say what actually happens to the data

Five shipped strings claim nothing leaves the device while a digest posts on every check — and, after Task 3, the user's own question posts too. This is the project's central honesty claim; it cannot be wrong on stage.

**Files:**
- Modify: `src/components/companion/composer.tsx:309-312`
- Modify: `src/components/marketing/privacy-note.tsx:13-18`
- Modify: `src/components/marketing/hero.tsx:47-49`
- Modify: `src/components/companion/companion-entry.tsx:74-76`
- Modify: `src/components/auth/register-form.tsx:82-85`
- Modify: `src/components/auth/demo-account-picker.tsx:64-66`
- Modify: `src/components/auth/auth-panel.test.tsx:48-55` (it asserts the old picker sentence)
- Modify: `src/lib/contracts/agent-run.ts:71-74`

- [ ] **Step 1: Correct the composer notice**

In `src/components/companion/composer.tsx`, replace the final paragraph (lines 309-312) with:

```tsx
      <p className="mt-2 text-[0.7rem] text-dim leading-snug">
        Pesan yang kamu periksa tidak pernah dikirim: yang keluar hanya temuan
        dan pertanyaanmu sendiri. Lampiran tidak diunggah; nama berkas ikut
        diperiksa, isi gambar belum bisa dibaca.
      </p>
```

- [ ] **Step 2: Correct the marketing privacy note**

In `src/components/marketing/privacy-note.tsx`, replace lines 13-18 with:

```tsx
          <h2 className="appnext-h2">Pesan yang kamu periksa tidak dikirim.</h2>
          <p className="appnext-lead mt-3">
            Pemeriksaan berjalan di perangkat ini. Untuk menyusun jawaban,
            pertanyaanmu dan ringkasan temuan dikirim ke model — pesan yang kamu
            periksa tidak pernah ikut. Tidak ada riwayat di server, dan tidak
            ada yang tersimpan setelah tab ditutup.
          </p>
```

- [ ] **Step 3: Correct the hero caption**

In `src/components/marketing/hero.tsx`, replace lines 47-49 with:

```tsx
        <p className="appnext-caption mt-4">
          Tanpa akun. Pemeriksaan berjalan di perangkatmu.
        </p>
```

- [ ] **Step 4: Correct the entry screen**

In `src/components/companion/companion-entry.tsx`, replace lines 74-76 with:

```tsx
        <p className="mt-2 max-w-prose text-dim text-sm">
          Tempel isi pesan, tautan, atau deskripsi telepon yang kamu terima.
          Pesan itu diperiksa di perangkat ini dan tidak dikirim ke mana pun.
        </p>
```

- [ ] **Step 5: Correct the registration consent**

In `src/components/auth/register-form.tsx`, replace lines 82-85 with:

```tsx
            Saya paham profil dan progres hanya tersimpan di perangkat ini.
            Yang dikirim ke server hanya sesi masuk demo — bukan pesan yang
            saya periksa.
```

- [ ] **Step 6: Correct the demo-account picker**

The picker is a fifth copy of the same claim, and the auth test pins it. In
`src/components/auth/demo-account-picker.tsx`, replace lines 64-66 with:

```tsx
        Ini akun demo untuk penilaian. Hanya kredensial demo yang dikirim; tidak
        ada profil atau progres yang disimpan di server. Progres belajar
        tersimpan di perangkat ini.
```

Then update the assertion in `src/components/auth/auth-panel.test.tsx:48-55`
so it checks the narrower claim instead of the old sentence:

```tsx
  it("admits in visible copy that only demo credentials are sent", () => {
    render(<AuthPanel />);

    expect(
      screen.getByText(/hanya kredensial demo yang dikirim/i),
    ).toBeInTheDocument();
  });
```

- [ ] **Step 7: Stop the trace claiming the voice never reads a message**

In `src/lib/contracts/agent-run.ts`, replace the `voice` entry (lines 71-74) with:

```ts
  voice: {
    label: "Penyusun bahasa",
    task: "Menulis jawaban dari temuan, bukan menilai ulang",
  },
```

- [ ] **Step 8: Prove no false claim remains**

Run:

```bash
grep -rn "tidak ada data yang dikirim\|Tidak ada yang dikirim ke server\|tanpa membaca pesanmu" \
  src/components src/app src/lib
grep -rn "tidak dikirim ke mana pun" src/components src/app src/lib
```

Expected: the first grep returns **no matches**. The second returns exactly one
match, in `src/components/companion/companion-entry.tsx` — read it and confirm
the sentence is about the checked message ("Pesan itu … dan tidak dikirim ke
mana pun"), not a blanket claim about everything.

- [ ] **Step 9: Run the affected suites**

Run: `npx jest src/components/companion src/components/auth src/lib/contracts -v`

Expected: PASS. If `agent-trace.test.tsx` asserts the old `task` string, update it to the new one.

- [ ] **Step 10: Commit**

```bash
git add src/components/companion/composer.tsx src/components/marketing/privacy-note.tsx src/components/marketing/hero.tsx src/components/companion/companion-entry.tsx src/components/auth/register-form.tsx src/components/auth/demo-account-picker.tsx src/components/auth/auth-panel.test.tsx src/lib/contracts/agent-run.ts
git commit -m "fix(copy): say what actually leaves the device

Five shipped strings claimed nothing was sent while a findings digest
posted on every check, and the answer lane now also sends the question the
user typed. The promise that survives — and is true — is narrower and
stronger: the message someone sent you never leaves the device.

The composer carries it permanently rather than in a dismissible dialog,
because a notice you can close is a notice you did not give."
```

---

## Task 6: Give the model a real choice (cuttable)

**Cut this task first if a day disappears.** Tasks 1-5 fix everything observed on screen. This task is what makes the companion agentic: the model can look up a module or ask a clarifying question with tappable answers.

**Precondition — verify the gateway forwards tools.** Do not build the loop until this returns a `tool_calls` array:

```bash
curl -s http://127.0.0.1:20138/v1/chat/completions \
  -H "content-type: application/json" \
  -H "authorization: Bearer $SATU_9ROUTER_API_KEY" \
  -d '{"model":"yoga/deepseek-v4.1-flash","stream":false,"max_tokens":200,
       "messages":[{"role":"user","content":"cari modul tentang pinjol"}],
       "tools":[{"type":"function","function":{"name":"cari_modul",
         "description":"Cari modul belajar berdasarkan kata kunci",
         "parameters":{"type":"object","properties":{"query":{"type":"string"}},
         "required":["query"]}}}],
       "tool_choice":"auto"}' | jq '.choices[0].message'
```

If `tool_calls` is empty on two attempts, **stop and report** — do not substitute a JSON-in-prose convention, which fails silently on the demo.

**Files:**
- Create: `src/lib/companion/tools.ts`
- Create: `src/lib/companion/tools.test.ts`
- Modify: `src/app/api/companion/answer/route.ts`
- Modify: `src/lib/contracts/answer.ts`
- Modify: `src/lib/companion/answer-client.ts`
- Modify: `src/components/companion/companion-chat.tsx` (chips)

**Interfaces:**
- Consumes: `MODUS` (`@/lib/modus`), the answer route from Task 2.
- Produces:
  - `TOOL_DEFINITIONS` — OpenAI tool array, `cari_modul` + `klarifikasi`
  - `runTool(name: string, rawArgs: string): { result: unknown; chips: AnswerChip[] }`
  - `AnswerResponse = { ok: true; text: string; chips: AnswerChip[] }`

- [ ] **Step 1: Write the failing tool test**

Create `src/lib/companion/tools.test.ts`:

```ts
import { runTool, TOOL_DEFINITIONS } from "@/lib/companion/tools";

describe("cari_modul", () => {
  it("returns only real modules from modus.json", () => {
    const { result } = runTool("cari_modul", JSON.stringify({ query: "pinjol" }));
    const matches = (result as { matches: { no: number; nama: string }[] }).matches;
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      expect(match.no).toBeGreaterThanOrEqual(1);
      expect(match.no).toBeLessThanOrEqual(12);
      expect(match.nama.length).toBeGreaterThan(0);
    }
  });

  it("returns an empty list rather than inventing a module", () => {
    const { result } = runTool(
      "cari_modul",
      JSON.stringify({ query: "investasi kripto luar angkasa" }),
    );
    expect((result as { matches: unknown[] }).matches).toEqual([]);
  });
});

describe("klarifikasi", () => {
  it("turns options into chips that can be sent as a normal turn", () => {
    const { chips, result } = runTool(
      "klarifikasi",
      JSON.stringify({
        pertanyaan: "Sudah ada uang yang terkirim?",
        opsi: ["Belum", "Sudah"],
      }),
    );
    expect(chips).toHaveLength(2);
    for (const chip of chips) {
      expect(chip.label.length).toBeGreaterThan(0);
      expect(chip.send.length).toBeGreaterThan(0);
    }
    expect((result as { pertanyaan: string }).pertanyaan).toMatch(/uang/i);
  });

  it("refuses an empty option list instead of rendering dead buttons", () => {
    expect(() =>
      runTool("klarifikasi", JSON.stringify({ pertanyaan: "Hm?", opsi: [] })),
    ).toThrow();
  });
});

describe("TOOL_DEFINITIONS", () => {
  it("declares exactly the two tools this module can execute", () => {
    const names = TOOL_DEFINITIONS.map((tool) => tool.function.name).sort();
    expect(names).toEqual(["cari_modul", "klarifikasi"]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/lib/companion/tools.test.ts -v`

Expected: FAIL — `Cannot find module '@/lib/companion/tools'`.

- [ ] **Step 3: Write the tools**

Create `src/lib/companion/tools.ts`:

```ts
import type { AnswerChip } from "@/lib/contracts/answer";
import { MODUS } from "@/lib/modus";

/**
 * The two choices the model is allowed to make after the verdict exists.
 *
 * Neither can produce or move a `Signal`: `CariModulResult` and
 * `KlarifikasiResult` have no field a signal could ride in, so AGENTS.md §4 is
 * enforced by the return types rather than by the prompt.
 *
 * Both are pure functions over typed arguments, so they are testable without
 * the route compiler or a network call.
 */

export interface CariModulResult {
  matches: { no: number; nama: string; status: "lengkap" | "segera" }[];
}

export interface KlarifikasiResult {
  pertanyaan: string;
  opsi: string[];
}

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "cari_modul",
      description:
        "Cari modul belajar Lumina yang paling relevan dengan topik yang dibahas. Kembalikan paling banyak tiga modul.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Kata kunci topik, misalnya 'pinjol' atau 'file apk'.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "klarifikasi",
      description:
        "Ajukan satu pertanyaan klarifikasi dengan dua sampai empat pilihan yang bisa diketuk pengguna. Pakai hanya kalau jawabannya benar-benar mengubah saran.",
      parameters: {
        type: "object",
        properties: {
          pertanyaan: { type: "string" },
          opsi: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 4,
          },
        },
        required: ["pertanyaan", "opsi"],
        additionalProperties: false,
      },
    },
  },
];

const MAX_MATCHES = 3;

function searchModules(query: string): CariModulResult {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return { matches: [] };

  const terms = needle.split(/\s+/).filter((term) => term.length >= 3);

  const scored = MODUS.map((modus) => {
    const haystack = [modus.nama, ...modus.ciri, modus.id]
      .join(" ")
      .toLowerCase();
    const hits = terms.filter((term) => haystack.includes(term)).length;
    return { modus, hits };
  })
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, MAX_MATCHES);

  return {
    matches: scored.map(({ modus }) => ({
      no: modus.no,
      nama: modus.nama,
      status: modus.modulStatus,
    })),
  };
}

function clarify(args: { pertanyaan: string; opsi: string[] }): {
  result: KlarifikasiResult;
  chips: AnswerChip[];
} {
  const pertanyaan = args.pertanyaan.trim();
  const opsi = args.opsi.map((option) => option.trim()).filter(Boolean);

  if (pertanyaan.length === 0) throw new Error("klarifikasi: pertanyaan kosong");
  if (opsi.length < 2) throw new Error("klarifikasi: opsi kurang dari dua");

  return {
    result: { pertanyaan, opsi },
    chips: opsi.map((option) => ({ label: option, send: option })),
  };
}

/**
 * Execute a tool call. Throws on malformed arguments so the route can report a
 * failed round instead of feeding the model an empty result it will narrate as
 * a finding.
 */
export function runTool(
  name: string,
  rawArguments: string,
): { result: unknown; chips: AnswerChip[] } {
  const args = JSON.parse(rawArguments) as Record<string, unknown>;

  if (name === "cari_modul") {
    const query = typeof args.query === "string" ? args.query : "";
    return { result: searchModules(query), chips: [] };
  }

  if (name === "klarifikasi") {
    const pertanyaan =
      typeof args.pertanyaan === "string" ? args.pertanyaan : "";
    const opsi = Array.isArray(args.opsi)
      ? args.opsi.filter((option): option is string => typeof option === "string")
      : [];
    return clarify({ pertanyaan, opsi });
  }

  throw new Error(`tool tidak dikenal: ${name}`);
}
```

- [ ] **Step 4: Run the tool tests**

Run: `npx jest src/lib/companion/tools.test.ts -v`

Expected: PASS, 6 tests.

- [ ] **Step 5: Add the tool round to the route**

In `src/app/api/companion/answer/route.ts`, add the imports:

```ts
import type { AnswerChip } from "@/lib/contracts/answer";
import { runTool, TOOL_DEFINITIONS } from "@/lib/companion/tools";
```

and replace the `try` block body with a two-call loop bounded at one round:

```ts
  try {
    const data = parsed.data;
    const messages: Record<string, unknown>[] = [
      { role: "system", content: SYSTEM[data.lane] },
      { role: "user", content: JSON.stringify(payloadFor(data)) },
    ];

    const first = await callUpstream(base, model, messages, controller.signal, true);
    if (!first) return fail(503, "upstream-failed");

    if (first.toolCalls.length > 0) {
      /*
       * Exactly one tool round. A second round would double the tail exposure
       * on the demo path for a decision the model already made, and the two
       * tools return everything the follow-up needs.
       */
      const executed = first.toolCalls.map((call) => ({
        call,
        output: runTool(call.function.name, call.function.arguments),
      }));

      messages.push({
        role: "assistant",
        content: first.text,
        tool_calls: first.toolCalls,
      });
      for (const entry of executed) {
        messages.push({
          role: "tool",
          tool_call_id: entry.call.id,
          content: JSON.stringify(entry.output.result),
        });
      }

      const second = await callUpstream(
        base,
        model,
        messages,
        controller.signal,
        false,
      );
      if (!second) return fail(503, "upstream-failed");

      const chips: AnswerChip[] = executed.flatMap((entry) => entry.output.chips);
      return Response.json({ ok: true, text: second.text, chips });
    }

    return Response.json({ ok: true, text: first.text, chips: [] });
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    return fail(503, aborted ? "upstream-timeout" : "upstream-unreachable");
  } finally {
    clearTimeout(timer);
  }
```

and add the helper above `POST`:

```ts
interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

/**
 * One upstream call. `withTools` is false on the follow-up, so the model writes
 * prose instead of asking for another tool.
 */
async function callUpstream(
  base: string,
  model: string,
  messages: Record<string, unknown>[],
  signal: AbortSignal,
  withTools: boolean,
): Promise<{ text: string; toolCalls: ToolCall[] } | null> {
  const upstream = await fetch(`${base.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      ...(process.env.LUMINA_LLM_KEY
        ? { authorization: `Bearer ${process.env.LUMINA_LLM_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      model,
      stream: false,
      temperature: 0.4,
      max_tokens: MAX_TOKENS,
      messages,
      // `tool_choice` without `tools` is rejected by some OpenAI-compatible
      // gateways, so the follow-up omits both rather than sending "none".
      ...(withTools ? { tools: TOOL_DEFINITIONS, tool_choice: "auto" } : {}),
    }),
  });

  if (!upstream.ok) return null;

  const json = (await upstream.json()) as {
    choices?: {
      message?: { content?: string; tool_calls?: ToolCall[] };
    }[];
  };

  const message = json.choices?.[0]?.message;
  const text = message?.content?.trim() ?? "";
  const toolCalls = message?.tool_calls ?? [];

  if (text.length === 0 && toolCalls.length === 0) return null;
  return { text, toolCalls };
}
```

- [ ] **Step 6: Carry chips to the client**

In `src/lib/contracts/answer.ts`, append:

```ts
export const AnswerResponseSchema = z
  .object({
    ok: z.literal(true),
    text: z.string().min(1),
    chips: z.array(AnswerChipSchema).max(4).default([]),
  })
  .strict();

export type AnswerResponse = z.infer<typeof AnswerResponseSchema>;
```

In `src/lib/companion/answer-client.ts`, change `AnswerResult` to carry chips and parse with the schema:

```ts
export interface AnswerResult {
  outcome: AnswerOutcome;
  text: string;
  chips: AnswerChip[];
}
```

Return `chips: []` on every failure path, and on success:

```ts
    const parsed = AnswerResponseSchema.safeParse(await response.json());
    if (!parsed.success) return { outcome: "failed", text: "", chips: [] };
    return { outcome: "model", text: parsed.data.text, chips: parsed.data.chips };
```

- [ ] **Step 7: Render the chips**

In `companion-chat.tsx`, add `chips` to `Turn`:

```tsx
  /** Tappable clarification options the model asked for. */
  chips?: { label: string; send: string }[];
```

Pass them to `finish` by adding a fourth parameter:

```tsx
      const finish = (
        finalText: string,
        voice: "model" | "template",
        reason?: VoiceOutcome,
        chips?: { label: string; send: string }[],
      ) => {
```

and inside the patch: `chips,` after `laneSource`.

In the answer branch: `finish(answer.text, "model", undefined, answer.chips);`

In the JSX, after the lane chip block:

```tsx
                    {turn.chips?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {turn.chips.map((chip) => (
                          <Button
                            key={chip.label}
                            variant="outline"
                            size="sm"
                            className="border-line text-dim hover:text-txt"
                            onClick={() => send(chip.send, [])}
                          >
                            {chip.label}
                          </Button>
                        ))}
                      </div>
                    ) : null}
```

- [ ] **Step 8: Test the tool round end to end**

Add to the existing `describe("POST /api/companion/answer", …)` block in
`src/app/api/companion/answer/route.test.ts`, so it inherits the `beforeEach`
that sets `LUMINA_LLM_URL` and `LUMINA_LLM_MODEL`:

```ts
  it("executes one tool round and returns tappable chips", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "",
                tool_calls: [
                  {
                    id: "call_1",
                    type: "function",
                    function: {
                      name: "klarifikasi",
                      arguments: JSON.stringify({
                        pertanyaan: "Sudah ada uang yang terkirim?",
                        opsi: ["Belum", "Sudah"],
                      }),
                    },
                  },
                ],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Kalau sudah, segera hubungi bank." } }],
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(request({ lane: "tanya", question: "saya kena tipu" }));
    const body = (await response.json()) as {
      text: string;
      chips: { label: string }[];
    };

    expect(body.text).toBe("Kalau sudah, segera hubungi bank.");
    expect(body.chips.map((chip) => chip.label)).toEqual(["Belum", "Sudah"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
```

Run: `npx jest src/app/api/companion/answer/route.test.ts -v`

Expected: PASS.

- [ ] **Step 9: Verify and commit**

```bash
npm run verify
git add src/lib/companion/tools.ts src/lib/companion/tools.test.ts src/app/api/companion/answer src/lib/contracts/answer.ts src/lib/companion/answer-client.ts src/components/companion/companion-chat.tsx
git commit -m "feat(companion): give the model two real choices

cari_modul lets it pick which of the twelve schemes applies; klarifikasi
lets it ask one disambiguating question with tappable answers. Both run
client-side after the verdict and neither return type has a field a Signal
could ride in, so the model still cannot touch a finding.

Capped at one tool round: a second round doubles tail exposure on the demo
path for a decision already made. A chip tap is a normal send(), so there
is no resume protocol and no new state machine."
```

---

## Task 7: Full verification

- [ ] **Step 1: Stop the dev server**

```bash
ps -eo pid,cmd | grep "node .*bin/next dev" | grep -v grep
# kill the PID it prints, then:
```

- [ ] **Step 2: Run the gate**

```bash
npm run verify
```

Expected: typecheck clean, biome clean, all tests pass, production build succeeds.

- [ ] **Step 3: Walk the demo path in a browser**

Start the dev server (`npm run dev`, open `http://localhost:3000` — never `127.0.0.1`, the HMR socket breaks and the page stays unhydrated). Verify by hand, in this order:

a. Type `hi apa kabar` → a real conversational reply, **no** agent trace, **no** score card, ~2.5 s.
b. Type `siapa kamu` → a real answer about Lumina, **no** trace, **no** card. The lane chip reads "Dijawab sebagai pertanyaan".
c. Type `apa itu pinjol?` → an explanation, **no** red card, **no** `70/100`.
d. Click "Periksa sebagai pesan" on that turn → the engine runs, the trace appears, the card renders.
e. Click "APK undangan" → verdict card at ~0 ms, trace with measured ms, streamed prose, "Pelajari pola ini" → `/belajar/10`.
f. Type `Halo, ini dari BCA. Akun Anda diblokir.` → **a card appears**. This is the bug from §1a; if it shows the canned "Siap…" line, Task 1 regressed.
g. Answer a follow-up: `kenapa berbahaya?` → answered from the previous explanation, **no second card**.

- [ ] **Step 4: Check 380px**

In the browser's device toolbar at 380px wide, on the companion route: no horizontal scroll, the lane chip and chips wrap instead of clipping, the composer notice is readable, and every icon-only button has an accessible name (`aria-label`).

- [ ] **Step 5: Update `STATUS.md`**

Add one line under the companion section recording the measured lane behaviour and that the checked message never leaves the device, with the date 6 November 2026.

---

## Self-review

**Spec coverage**

| Spec section | Task |
|---|---|
| §1a greeting skips scams | 1 (steps 1-4) |
| §1b question scored as a scam | 1 (guard), 3 (lane), 7f |
| §1c streamed reply replaced | 4 (steps 1-5) |
| §1d truncation is budget starvation | 4 (step 3) |
| §1e four false privacy strings | 5 |
| §2a routing is deterministic | 1 |
| §2b lanes | 1 (`planTurn`), amended table |
| §2c question guard | 1 (`isQuestionAbout`) |
| §2d payload per lane | 2 (`payloadFor`) |
| §2e tools | 6 |
| §2f safety floor / card gates on `result` | 3 (step 9) |
| §3 latency + §3a timeouts | 4 (steps 4, 6) |
| §4 what the reader sees | 3 (steps 9, 13), 7f |
| §5 privacy | 2 (schema), 5 (copy) |
| §7 tests a-e | 1, 2, 3, 6, 4 |
| §8 scope boundaries | Global constraints |

**Type consistency:** `Lane` is exported once from `turn.ts` and imported by `companion-chat.tsx`; `AnswerLane` excludes `periksa` in `answer.ts`; `AnswerChip` is defined in `answer.ts` and used by `tools.ts` and the chat `Turn`; `AnswerRequest` is built only by `buildAnswerRequest`. `requestStreamingText` returns `VoiceResult`, which already existed.

**Deviations from the spec, stated for review:** the lane order (Task 1) and the 160-char paste threshold replace the spec's length heuristic; the timeouts are 13 s route / 15 s client rather than 10/12, because a measured successful call took 11.8 s and the spec's ceiling would have discarded it. The spec's §2b table is amended in the Task 1 commit so the two documents agree.
