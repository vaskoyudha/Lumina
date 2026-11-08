# Scoring expansion — normalisation, evidence spans, authority pack

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the deterministic scorer resist the cheapest text evasions, show the reader exactly which words fired each signal, and name the 2026 Indonesian impersonation waves (tax, Bansos, BPJS, court, vote-code takeover) without adding a dependency or touching a frozen contract.

**Follow-on:** `docs/superpowers/plans/2026-11-08-agent-orchestration-ui.md` extends this
work with the crew UI (orchestrator + per-agent bubbles) and the job/marketplace/QRIS
detectors. Land this plan first; that plan assumes `normalize.ts` and `evidence-span.ts`
exist.

**Architecture:** Three independent layers. (1) `normalizeWithMap()` is a pure pre-pass that returns a normalised string plus a per-character map back to the original, so every rule still matches on hostile text while `Signal.evidence` still quotes the user's own words. (2) `findEvidenceSpans()` maps those quotes back onto the checked message and `HighlightedText` renders them with `<mark>`; it is a display helper, never a scorer. (3) Five high-precision rules live beside the existing message rules, and `classifyModus()` learns two new keyword paths. `src/lib/contracts/**` is not modified: no new `Signal` field, no new agent.

**Tech Stack:** Next 16.4.5 App Router, React 19.3, TypeScript strict, Tailwind v4 (`@theme inline`), shadcn/ui (base **radix**, `asChild`), zod 4, Biome 2.4.2, Jest 30 + React Testing Library.

**Spec:** `docs/research/final-expansion.md` (§ *Engine upgrades* 1–2, § *Authority pack*) and `docs/plan.md` §3/§11.

**Execution context:** `main` currently carries unrelated parallel work (auth, marketing, belajar). Execute this plan in an isolated worktree created with `superpowers:using-git-worktrees` from `main`; do **not** commit inside the dirty tree. `npm run verify` is the gate there.

## Global Constraints

- **No new dependencies.** AGENTS.md §7.
- **`src/lib/contracts/**` is frozen.** No new `Signal` field; `score`, `risk`, `signals` still come only from `src/lib/scoring/score.ts` (AGENTS.md §4).
- **Scores are never computed in `components/`.** The evidence-span helper only locates text the scorer already quoted.
- **No hex colours, no Tailwind palette literals.** Use `--lumina-*` semantic classes (`bg-brand-soft`, `text-brand-ink`, `border-edge-soft`, `bg-bg`, `text-txt`, `text-dim`).
- **shadcn/ui primitives first.** This plan adds no new primitive; it composes existing `Card`/`CardContent` markup already present in `signal-panel.tsx`.
- **Shell must work at 380 px.** No horizontal scroll; the highlight block wraps and scrolls vertically.
- **Copy is Indonesian**, calm, and never blames the victim.
- **`npm run verify` must pass before every commit** (typecheck + Biome + Jest + build). Stop `next dev` before `next build`.
- **Measured claims stay measured.** `eval.ts`/`bench-cases.ts` are the only source of accuracy numbers; update the comments in `STATUS.md`, `eval.test.ts`, and `score.bench.test.ts` in the same commit as the measurement that changed.
- **No scraping, no network, no ML.** All matching is local regex plus a static allowlist.

## 48-hour cut line

Critical path is Task 1 → Task 2 → Task 5: normalisation plus evidence spans. That is the committed deliverable, and it must leave the original corpus at 20/20 caught and 0/25 false positives.

- Task 6 is shippable only if, after it lands, the measured corpus still reports 25/25 caught and 0/29 false positives; otherwise keep the five rules on the branch and leave `main` at Tasks 1–5.
- Task 6's classification change (s15) is worth one honest line in STATUS, not a blocker.
- Coalesce Task 3 + Task 4 into one commit if the commit gate becomes the bottleneck; squash the sequence rather than skipping `npm run verify`.

## Ownership and landing

- `src/lib/scoring/**`, `src/components/companion/**`, `src/app/(chat)/companion/**` are Stream A's.
- `src/data/official-domains.json` and `STATUS.md` are shared. Tell the owner of `src/data/` and the STATUS author before committing those two files.
- `main` already carries an uncommitted edit to `src/components/companion/companion-chat.tsx` from parallel work. Branch the worktree; when landing, rebase onto that parallel commit and re-run `npm run verify` on the merged tree. A green worktree does not prove the merged tree is green.

## File structure

| Path | Responsibility | Task |
|---|---|---|
| `src/lib/scoring/normalize.ts` | **new** — deterministic normaliser + source map. Pure, no React. | 1 |
| `src/lib/scoring/normalize.test.ts` | **new** — evasion fixtures and map invariants. | 1 |
| `src/lib/scoring/message.ts` | match on normalised text; quote the original span; new authority rules. | 2, 6 |
| `src/lib/scoring/message.test.ts` | evasion tests, authority positive/negative tests. | 2, 6 |
| `src/lib/companion/explain.ts` | tactic mapping for the five new rule ids. | 6 |
| `src/data/official-domains.json` | eight `instansi` entries for the authority pack. | 6 |
| `src/lib/scoring/link.test.ts` | allowlist resolution for the new institutions. | 6 |
| `src/lib/scoring/evidence-span.ts` | **new** — locate `Signal.evidence` in the checked text; merge spans. | 3 |
| `src/lib/scoring/evidence-span.test.ts` | **new** — exactness, no fabrication, merge. | 3 |
| `src/components/companion/highlighted-text.tsx` | **new** — `<mark>` renderer with brand tokens. | 4 |
| `src/components/companion/highlighted-text.test.tsx` | **new** — renders real markup. | 4 |
| `src/components/companion/signal-panel.tsx` | new `sourceText` prop; "Kata yang memicu" block. | 5 |
| `src/components/companion/signal-panel.test.tsx` | highlight behaviour rendered for real. | 5 |
| `src/components/companion/companion-chat.tsx` | pass the scored source to both panel instances. | 5 |
| `src/components/companion/companion-entry.tsx` | pass `checkedText` to the panel. | 5 |
| `src/components/companion/companion-entry.test.tsx` | end-to-end highlight test. | 5 |
| `src/lib/scoring/score.ts` | two `MODUS_KEYWORDS` paths (vote→fake-call, seasonal→musiman). | 6 |
| `src/lib/scoring/score.test.ts` | classification tests for s15, DJP, and vote-code. | 6 |
| `src/lib/scoring/bench-cases.ts` | 5 coverage scams (s21–s25) + 4 legitimate traps (l26–l29). | 6 |
| `src/lib/scoring/eval.test.ts` | corpus totals 25 + 29; nailed 23; classification floor 21. | 6 |
| `src/lib/scoring/score.bench.test.ts` | measured comment and suite title. | 6 |
| `STATUS.md` | corpus total, split FP denominator, expansion measurement. | 6 |

---

## Task 1: A normaliser that remembers where every character came from

The engine currently matches the raw string, so `k i r i m  k o d e  O T P`, `k0de 0tp`, and `kode<ZWSP>otp` all walk past `otp-request`. The fix cannot simply lowercase and strip: the contract promises `evidence` is *the exact substring of the user's input*, so the normaliser must return a map back to original UTF-16 indices.

**Files:**
- Create: `src/lib/scoring/normalize.ts`
- Test: `src/lib/scoring/normalize.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface NormalizedText { text: string; map: number[] }` — `map[i]` is the original index of normalised character `i`.
  - `normalizeWithMap(input: string): NormalizedText`
  - `normalizeForMatch(input: string): string`
  - `originalRange(map: readonly number[], start: number, end: number): { start: number; end: number } | null`

- [ ] **Step 1: Write the failing test**

Create `src/lib/scoring/normalize.test.ts` with exactly:

```ts
import { describe, expect, it } from "@jest/globals";
import {
  normalizeForMatch,
  normalizeWithMap,
  originalRange,
} from "@/lib/scoring/normalize";

describe("normalizeForMatch — the cheapest evasions", () => {
  it("folds full-width characters to ASCII", () => {
    expect(normalizeForMatch("ＫＩＲＩＭ ｋｏｄｅ ＯＴＰ")).toBe("kirim kode otp");
  });

  it("turns zero-width format characters into a space", () => {
    expect(normalizeForMatch("kode\u200Botp")).toBe("kode otp");
    expect(normalizeForMatch("kode\u00ADotp")).toBe("kode otp");
  });

  it("rejoins letters written one by one", () => {
    expect(normalizeForMatch("K I R I M   K O D E   O T P")).toBe(
      "kirim   kode   otp",
    );
  });

  it("does not eat the word before a spaced run", () => {
    expect(normalizeForMatch("tolong k i r i m  k o d e  O T P")).toBe(
      "tolong kirim  kode  otp",
    );
  });

  it("leaves two single letters alone", () => {
    expect(normalizeForMatch("a b")).toBe("a b");
  });

  it("leaves a run longer than six letters alone", () => {
    expect(normalizeForMatch("a b c d e f g")).toBe("a b c d e f g");
  });

  it("folds leetspeak inside letter-bearing tokens", () => {
    expect(normalizeForMatch("t0p up")).toBe("top up");
    expect(normalizeForMatch("k0de 0tp")).toBe("kode otp");
  });

  it("leaves pure numbers alone", () => {
    expect(normalizeForMatch("500000")).toBe("500000");
  });

  it("is idempotent", () => {
    const once = normalizeForMatch("k0de 0tp");
    expect(normalizeForMatch(once)).toBe(once);
  });
});

describe("normalizeWithMap — every normalised character points home", () => {
  it("maps a rejoined run back to the original spacing", () => {
    const input = "K I R I M";
    const { text, map } = normalizeWithMap(input);

    expect(text).toBe("kirim");
    expect(map).toEqual([0, 2, 4, 6, 8]);
    expect(originalRange(map, 0, text.length)).toEqual({ start: 0, end: 9 });
    expect(input.slice(0, 9)).toBe("K I R I M");
  });

  it("keeps offsets stable across a zero-width character", () => {
    const input = "kode\u200Botp";
    const { text, map } = normalizeWithMap(input);

    expect(text).toBe("kode otp");
    expect(originalRange(map, 5, 8)).toEqual({ start: 5, end: 8 });
    expect(input.slice(5, 8)).toBe("otp");
  });

  it("returns null for an out-of-range span", () => {
    expect(originalRange([0, 1], 0, 3)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/scoring/normalize.test.ts`

Expected: FAIL — `Cannot find module '@/lib/scoring/normalize'`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/scoring/normalize.ts` with exactly:

```ts
/**
 * Deterministic input normalisation — the cheapest evasion pass.
 *
 * Rules match on `text`; `Signal.evidence` must still quote the user's own
 * words (contract §Signal). That is why this module returns a map instead of
 * just a string: `map[i]` is the UTF-16 index in the original input of
 * normalised character `i`. `originalRange()` turns a normalised match into a
 * slice of the original.
 *
 * What it folds, all locally and without a dependency:
 *
 *   a. Unicode NFKC — full-width letters become ASCII, ligatures expand.
 *   b. Default-ignorable / format characters become a single space. A zero
 *      width joiner between "kode" and "otp" is an evasion, not a character.
 *   c. Lowercase, so the rest of the pass is case-free.
 *   d. Runs of 3–6 single letters separated by exactly one space are rejoined
 *      ("O T P" → "otp"). Two-letter runs are left alone: "a b" is ordinary
 *      text, and joining it creates noise without catching anything.
 *   e. Leetspeak digits inside a token that also has a letter are folded
 *      ("k0de" → "kode"). Pure numbers are untouched ("500000").
 *
 * Known limitation, stated because rules must not pretend otherwise: folding
 * inside money tokens turns "Rp500" into "rpsoo". No rule compares an amount,
 * and `evidence` is sliced from the original, so the mangling is invisible.
 */

const IGNORABLE = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/;

const LEET: Readonly<Record<string, string>> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
};

const LETTER = /\p{L}/u;
const SPACE = /\s/u;
const ALNUM = /[a-z0-9]/;

export interface NormalizedText {
  text: string;
  /** Original UTF-16 index for each normalised character. */
  map: number[];
}

function isLetter(ch: string): boolean {
  return LETTER.test(ch);
}

function isSpace(ch: string): boolean {
  return SPACE.test(ch);
}

function isAlnum(ch: string): boolean {
  return ALNUM.test(ch);
}

/**
 * A one-character word: the unit a spaced-letter evasion is made of. It must
 * also start a word, or the tail of an ordinary word is eaten: in
 * "tolong k i r i m" the "g" would join the run and produce "tolongkirim".
 */
function isSingleLetter(chars: readonly string[], at: number): boolean {
  return (
    (at === 0 || !isLetter(chars[at - 1] ?? "")) &&
    isLetter(chars[at] ?? "") &&
    !isLetter(chars[at + 1] ?? "")
  );
}

function rejoinSpacedLetters(
  chars: readonly string[],
  map: readonly number[],
): { chars: string[]; map: number[] } {
  const outChars: string[] = [];
  const outMap: number[] = [];
  let i = 0;

  while (i < chars.length) {
    if (isSingleLetter(chars, i)) {
      const positions = [i];
      let cursor = i + 1;

      while (cursor < chars.length) {
        let next = cursor;
        while (next < chars.length && isSpace(chars[next] ?? "")) next += 1;
        const gaps = next - cursor;
        // Exactly one space keeps a word together; two spaces are a boundary.
        if (gaps === 1 && isSingleLetter(chars, next)) {
          positions.push(next);
          cursor = next + 1;
        } else {
          break;
        }
      }

      if (positions.length >= 3 && positions.length <= 6) {
        for (const position of positions) {
          outChars.push(chars[position] ?? "");
          outMap.push(map[position] ?? 0);
        }
        i = cursor;
        continue;
      }

      if (positions.length > 6) {
        // Too long to be a spaced-out word. Copy the whole run untouched and
        // skip past it, so the tail is not re-scanned as a shorter run.
        for (let k = i; k < cursor; k += 1) {
          outChars.push(chars[k] ?? "");
          outMap.push(map[k] ?? 0);
        }
        i = cursor;
        continue;
      }
    }

    outChars.push(chars[i] ?? "");
    outMap.push(map[i] ?? 0);
    i += 1;
  }

  return { chars: outChars, map: outMap };
}

function foldLeet(
  chars: readonly string[],
  map: readonly number[],
): { chars: string[]; map: number[] } {
  const outChars = [...chars];
  let i = 0;

  while (i < chars.length) {
    if (!isAlnum(chars[i] ?? "")) {
      i += 1;
      continue;
    }

    let end = i;
    while (end < chars.length && isAlnum(chars[end] ?? "")) end += 1;

    const run = chars.slice(i, end).join("");
    if (/[a-z]/.test(run) && /\d/.test(run)) {
      for (let k = i; k < end; k += 1) {
        outChars[k] = LEET[chars[k] ?? ""] ?? chars[k] ?? "";
      }
    }

    i = end;
  }

  return { chars: outChars, map: [...map] };
}

export function normalizeWithMap(input: string): NormalizedText {
  const chars: string[] = [];
  const map: number[] = [];
  let offset = 0;

  for (const original of Array.from(input)) {
    if (IGNORABLE.test(original)) {
      chars.push(" ");
      map.push(offset);
      offset += original.length;
      continue;
    }

    const folded = original.normalize("NFKC").toLowerCase();
    for (const ch of folded) {
      chars.push(ch);
      map.push(offset);
    }
    offset += original.length;
  }

  const rejoined = rejoinSpacedLetters(chars, map);
  const folded = foldLeet(rejoined.chars, rejoined.map);
  return { text: folded.chars.join(""), map: folded.map };
}

export function normalizeForMatch(input: string): string {
  return normalizeWithMap(input).text;
}

/** Turn a normalised `[start, end)` into a UTF-16 slice of the original. */
export function originalRange(
  map: readonly number[],
  start: number,
  end: number,
): { start: number; end: number } | null {
  const first = map[start];
  const last = map[end - 1];
  if (first === undefined || last === undefined) return null;
  return { start: first, end: last + 1 };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/scoring/normalize.test.ts`

Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring/normalize.ts src/lib/scoring/normalize.test.ts
git commit -m "feat(scoring): add deterministic normaliser with source map"
```

---

## Task 2: Match on normalised text, quote the original

`detectMessage()` is the only matcher. It must run every rule against the normalised string, convert each candidate match back to an original span, run the existing warning/gate logic against the **original** sentence, and emit `evidence` sliced from the original. The public signature does not change.

**Files:**
- Modify: `src/lib/scoring/message.ts:10-31` (Rule interface), `:125-130` (quishing gate), `:216-230` (`sentenceAround`), `:248-258` (`isWarning`), `:268-296` (`detectMessage`)
- Test: `src/lib/scoring/message.test.ts`

**Interfaces:**
- Consumes: `normalizeWithMap`, `originalRange` from Task 1.
- Produces: `detectMessage(text: string): RuleHit[]` (unchanged public shape); `Rule.gate` and `isWarning` become span-based internally.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/scoring/message.test.ts`:

```ts
describe("Message Agent — cheap text evasions (8 Nov 2026)", () => {
  it("catches an OTP request written one letter at a time", () => {
    const text = "tolong k i r i m  k o d e  O T P ke nomor ini";
    const result = scoreText({ text });

    expect(result.hardOverride).toBe(true);
    expect(result.risk).toBe("tinggi");
    const otp = result.signals.find((signal) => signal.label.includes("OTP"));
    expect(otp?.evidence).toContain("O T P");
  });

  it("catches an OTP request split by a zero-width joiner", () => {
    const text = "kirim kode\u200Botp kamu sekarang";
    expect(scoreText({ text }).hardOverride).toBe(true);
  });

  it("catches a leetspeak OTP request and quotes the leetspeak", () => {
    const text = "kirim k0de 0tp kamu sekarang";
    const result = scoreText({ text });

    expect(result.hardOverride).toBe(true);
    const otp = result.signals.find((signal) => signal.label.includes("OTP"));
    expect(otp?.evidence.toLowerCase()).toContain("k0de");
  });

  it("still treats a spaced OTP notification as a notification", () => {
    const text = "O T P kamu: 483221. Jangan bagikan ke siapa pun.";
    const result = scoreText({ text });

    expect(result.hardOverride).toBe(false);
    expect(result.risk).not.toBe("tinggi");
    expect(result.risk).not.toBe("mencurigakan");
  });

  it("does not change the score of an ordinary sentence", () => {
    const result = scoreText({ text: "besok kita makan siang bareng ya" });
    expect(result.score).toBe(0);
    expect(result.risk).toBe("bersih");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/scoring/message.test.ts`

Expected: the first three evasion tests FAIL (no signal); the notification and clean-sentence tests PASS. Red before green is the measurement.

- [ ] **Step 3: Add the import**

At the top of `src/lib/scoring/message.ts`, below the `Signal` import:

```ts
import { normalizeWithMap, originalRange } from "@/lib/scoring/normalize";
```

- [ ] **Step 4: Make `Rule.gate` span-based**

Replace the `gate` property in `interface Rule` (currently `gate?: (text: string, match: RegExpMatchArray) => boolean;`) with:

```ts
  /**
   * Context requirement: a match is only a finding when this returns true.
   * The span is measured on the ORIGINAL text, even though the match ran on
   * the normalised copy, so a gate can still read the user's sentence.
   */
  gate?: (
    text: string,
    span: { start: number; end: number },
  ) => boolean;
```

- [ ] **Step 5: Update the quishing gate**

Replace the `gate` body inside the `quishing` rule with:

```ts
    gate: (text, span) => {
      const start = Math.max(0, span.start - 80);
      const end = Math.min(text.length, span.end + 80);
      return QR_ACTION.test(text.slice(start, end));
    },
```

- [ ] **Step 6: Make `sentenceAround` take a span**

Replace `sentenceAround` with:

```ts
/**
 * The sentence containing a match, used for warnings that live next to the
 * token rather than immediately before it ("Jangan buka file … .apk").
 */
function sentenceAround(text: string, index: number, length: number): string {
  const before = text.slice(0, index);
  const start =
    Math.max(
      before.lastIndexOf("."),
      before.lastIndexOf("!"),
      before.lastIndexOf("?"),
    ) + 1;
  const after = text.slice(index + length);
  const boundary = after.search(/[.!?]/);
  const end = boundary === -1 ? text.length : index + length + boundary;
  return text.slice(start, end);
}
```

- [ ] **Step 7: Make `isWarning` take a span**

Replace `isWarning` with:

```ts
/**
 * A warning ("jangan bagikan kode OTP") is the opposite of a request. The
 * otp-request pattern matches the warning shape too, so a hit whose request
 * verb is immediately preceded by "jangan" is vetoed — and the scan keeps
 * looking, because one warning sentence must not hide a request later in the
 * same message.
 *
 * The span is on the original text, so the veto reads the words the user
 * actually wrote, not their normalised form.
 */
function isWarning(
  rule: Rule,
  text: string,
  span: { start: number; end: number },
): boolean {
  if (rule.id === "otp-request") {
    const before = text.slice(Math.max(0, span.start - 24), span.start);
    return /\bjangan\s+(?:pernah\s+)?$/i.test(before);
  }
  if (rule.id === "apk") {
    return APK_WARNING.test(
      sentenceAround(text, span.start, span.end - span.start),
    );
  }
  return false;
}
```

- [ ] **Step 8: Rewrite `detectMessage`**

Replace the whole `detectMessage` function with:

```ts
/**
 * Run every rule against the normalised copy, then translate each hit back
 * to the original span. The warning veto and the context gates always read
 * the original sentence, so normalisation can never make a warning look like
 * a request or a legitimate phrasing look like a demand.
 */
export function detectMessage(text: string): RuleHit[] {
  const { text: normalized, map } = normalizeWithMap(text);
  const matches: {
    rule: Rule;
    span: { start: number; end: number };
  }[] = [];

  for (const rule of MESSAGE_RULES) {
    const found = Array.from(normalized.matchAll(globalCopy(rule.pattern)))
      .map((match) => ({ match, span: spanOf(map, match) }))
      .find(({ span }) => {
        if (!span) return false;
        return (
          !isWarning(rule, text, span) &&
          (rule.gate ? rule.gate(text, span) : true)
        );
      });

    if (!found?.span) continue;
    matches.push({ rule, span: found.span });
  }

  // "Authority + a request" is the scam vector. An OTP request is itself
  // action context (the request verbs live in that rule), so it escalates
  // the authority signal without any money/click word present.
  const hasOtpRequest = matches.some(({ rule }) => rule.id === "otp-request");
  const escalated = ACTION_CONTEXT.test(normalized) || hasOtpRequest;

  return matches.map(({ rule, span }) => {
    const withAction = escalated && rule.weightWithAction !== undefined;
    return {
      rule,
      evidence: text.slice(span.start, span.end).trim(),
      weight: withAction ? (rule.weightWithAction as number) : rule.weight,
      label:
        withAction && rule.labelWithAction ? rule.labelWithAction : rule.label,
    };
  });
}

/** Normalised match → original span, or null when the map cannot resolve it. */
function spanOf(
  map: readonly number[],
  match: RegExpMatchArray,
): { start: number; end: number } | null {
  if (match.index === undefined) return null;
  return originalRange(map, match.index, match.index + match[0].length);
}
```

- [ ] **Step 9: Narrow `fake-authority` so a function word is not a brand**

The existing pattern `bank\s+\w+` reads "bayar di bank atau aplikasi resmi" as a claim to be *Bank Atau*, and `ACTION_CONTEXT` ("bayar") then escalates it to 0.7. That is a measured false positive on the BPJS trap the authority pack adds. A function word is never a brand name, so exclude the closed list:

In `src/lib/scoring/message.ts`, change the `fake-authority` pattern to:

```ts
    pattern:
      /\b(?:dari\s+)?(?:bank\s+(?!atau\b|dan\b|di\b|resmi\b|lain\b|kita\b|saya\b|anda\b)\w+|pihak\s+bank|kepolisian|polres|polri|kurir|jne|jnt|sicepat|pos\s+indonesia|cs|customer\s+service|kementerian|dinas|petugas|kominfo|komdigi)\b/i,
```

Then append to `src/lib/scoring/message.test.ts`:

```ts
describe("fake-authority — a function word is not a brand (8 Nov 2026)", () => {
  it("does not escalate 'bayar di bank atau aplikasi resmi'", () => {
    const text =
      "[BPJS Kesehatan] Iuran Agustus Rp35.000 jatuh tempo 10 Sep. Bayar di bank atau aplikasi resmi.";
    const result = scoreText({ text });

    expect(result.risk).toBe("bersih");
    expect(result.signals.every((signal) => signal.weight === 0)).toBe(true);
  });
});
```

- [ ] **Step 10: Run the full scoring suite**

Run: `npm test -- src/lib/scoring`

Expected: PASS. In particular:
- the three evasion tests are green;
- `eval.test.ts` and `score.bench.test.ts` still report 20/20 caught, 18/20 hard, 0 false positives on the original 25 legitimate messages;
- the 4000-character budget test stays under 2 s.

If an evidence assertion fails because the span now includes a seam, fix the span (never the expectation) and re-run.

- [ ] **Step 11: Commit**

```bash
git add src/lib/scoring/message.ts src/lib/scoring/message.test.ts
git commit -m "feat(scoring): match normalised text while quoting the original span"
```

---

## Task 3: Locate a quote in the checked message

The panel already prints `signal.evidence`. To show *where* it fired, the UI needs the span of that quote inside the full message. This is a display helper: it never invents a quote, never changes a weight, and returns nothing when the quote is absent (a signal whose evidence came from a filename or a normalised seam must not be guessed).

**Files:**
- Create: `src/lib/scoring/evidence-span.ts`
- Test: `src/lib/scoring/evidence-span.test.ts`

**Interfaces:**
- Consumes: `Signal` from `@/lib/contracts/score`.
- Produces:
  - `interface EvidenceSpan { start: number; end: number }`
  - `findEvidenceSpans(text: string, signals: readonly Signal[]): EvidenceSpan[]` — sorted, merged, non-overlapping, case-insensitive; every occurrence of a quote is marked.

- [ ] **Step 1: Write the failing test**

Create `src/lib/scoring/evidence-span.test.ts` with exactly:

```ts
import { describe, expect, it } from "@jest/globals";
import type { Signal } from "@/lib/contracts/score";
import { findEvidenceSpans } from "@/lib/scoring/evidence-span";

const signal = (
  evidence: string,
  weight = 0.5,
  label = "temuan",
): Signal => ({
  label,
  weight,
  evidence,
  agent: "message",
});

describe("findEvidenceSpans", () => {
  it("finds the quote case-insensitively at the right offsets", () => {
    const text = "Akun Anda akan diblokir dalam 2 jam.";
    const spans = findEvidenceSpans(text, [signal("DIBLOKIR")]);

    expect(spans).toEqual([{ start: 15, end: 23 }]);
    expect(text.slice(15, 23)).toBe("diblokir");
  });

  it("skips the weight-0 placeholder", () => {
    const text = "Halo kak, gimana kabarnya?";
    expect(findEvidenceSpans(text, [signal("Halo kak", 0)])).toEqual([]);
  });

  it("never fabricates a span for a quote that is not in the text", () => {
    expect(findEvidenceSpans("Halo kak", [signal("kirim OTP")])).toEqual([]);
  });

  it("merges duplicate and overlapping quotes", () => {
    const text = "kirim kode OTP sekarang";
    const spans = findEvidenceSpans(text, [
      signal("kirim kode OTP"),
      signal("kode OTP"),
      signal("OTP"),
    ]);

    expect(spans).toEqual([{ start: 0, end: 14 }]);
  });

  it("keeps offsets correct after a character whose lowercase expands", () => {
    // "İ".toLowerCase() has length 2; indexing a lowercased copy would shift
    // every span after it. The regex runs on the original instead.
    const text = "İzin kirim OTP";
    const spans = findEvidenceSpans(text, [signal("OTP")]);

    expect(spans).toEqual([{ start: 11, end: 14 }]);
    expect(text.slice(11, 14)).toBe("OTP");
  });

  it("marks every occurrence instead of guessing which one fired", () => {
    const text = "Jangan bagikan OTP. Kalau diminta, kirim OTP ke nomor ini.";
    const spans = findEvidenceSpans(text, [signal("OTP")]);

    expect(spans).toEqual([
      { start: 15, end: 18 },
      { start: 41, end: 44 },
    ]);
  });

  it("ignores empty quotes and an empty message", () => {
    expect(findEvidenceSpans("", [signal("OTP")])).toEqual([]);
    expect(findEvidenceSpans("kirim OTP", [signal("   ")])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/scoring/evidence-span.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/scoring/evidence-span.ts` with exactly:

```ts
import type { Signal } from "@/lib/contracts/score";

/**
 * Display-only: where a finding's quote sits inside the checked message.
 *
 * This module does not score and never edits `Signal`. It takes the exact
 * string the detector already reported and locates every occurrence in the
 * text the user pasted. A quote that cannot be found produces no span: the UI
 * must never underline a word the engine did not quote.
 *
 * Matching is a case-insensitive regex over the ORIGINAL string, not
 * `toLowerCase().indexOf()`: lowercasing is not length-preserving ("İ"
 * becomes two code units), so an index computed on a folded copy can point at
 * the wrong word.
 */
export interface EvidenceSpan {
  start: number;
  end: number;
}

export function findEvidenceSpans(
  text: string,
  signals: readonly Signal[],
): EvidenceSpan[] {
  if (!text) return [];

  const spans: EvidenceSpan[] = [];

  for (const signal of signals) {
    // Weight 0 is the honest empty state, not a finding.
    if (signal.weight <= 0) continue;

    const needle = signal.evidence.trim();
    if (!needle) continue;

    for (const match of text.matchAll(new RegExp(escapeRegExp(needle), "giu"))) {
      if (match.index === undefined) continue;
      spans.push({ start: match.index, end: match.index + match[0].length });
    }
  }

  return merge(spans);
}

/** Treat the quoted evidence as literal text, not as a pattern. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Sort, then coalesce touching or overlapping spans. */
function merge(spans: EvidenceSpan[]): EvidenceSpan[] {
  const sorted = [...spans].sort(
    (a, b) => a.start - b.start || a.end - b.end,
  );
  const merged: EvidenceSpan[] = [];

  for (const span of sorted) {
    const last = merged.at(-1);
    if (last && span.start <= last.end) {
      last.end = Math.max(last.end, span.end);
    } else {
      merged.push({ ...span });
    }
  }

  return merged;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/scoring/evidence-span.test.ts`

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring/evidence-span.ts src/lib/scoring/evidence-span.test.ts
git commit -m "feat(scoring): locate evidence quotes inside the checked message"
```

---

## Task 4: A highlight renderer that uses only brand tokens

`<mark>` is the correct semantic element for "relevant in context". It must not introduce a second accent colour: the shell's only accent is jingga `--lumina-brand`, and the readable ink is `--lumina-brand-ink`.

**Files:**
- Create: `src/components/companion/highlighted-text.tsx`
- Test: `src/components/companion/highlighted-text.test.tsx`

**Interfaces:**
- Consumes: `EvidenceSpan` from Task 3.
- Produces: `HighlightedText({ text, spans }: { text: string; spans: readonly EvidenceSpan[] })`.

- [ ] **Step 1: Write the failing test**

Create `src/components/companion/highlighted-text.test.tsx` with exactly:

```tsx
import { render, screen } from "@testing-library/react";
import { HighlightedText } from "@/components/companion/highlighted-text";

describe("HighlightedText", () => {
  it("wraps only the reported spans in mark elements", () => {
    const { container } = render(
      <HighlightedText
        text="kirim kode OTP sekarang"
        spans={[{ start: 11, end: 14 }]}
      />,
    );

    const marks = [...container.querySelectorAll("mark")];
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent("OTP");
    expect(container).toHaveTextContent("kirim kode OTP sekarang");
  });

  it("renders plain text when there are no spans", () => {
    const { container } = render(
      <HighlightedText text="Halo kak" spans={[]} />,
    );

    expect(container.querySelector("mark")).toBeNull();
    expect(container).toHaveTextContent("Halo kak");
  });

  it("ignores out-of-range and inverted spans", () => {
    const { container } = render(
      <HighlightedText
        text="abc"
        spans={[
          { start: 2, end: 99 },
          { start: 2, end: 1 },
        ]}
      />,
    );

    expect(container).toHaveTextContent("abc");
    expect(container.querySelector("mark")).toBeNull();
  });

  it("uses the brand token, not a palette class or a hex value", () => {
    const { container } = render(
      <HighlightedText text="OTP" spans={[{ start: 0, end: 3 }]} />,
    );

    const mark = container.querySelector("mark");
    expect(mark?.className).toContain("bg-brand-soft-2");
    expect(mark?.className).toContain("text-brand-ink");
    expect(mark?.className).not.toMatch(/bg-yellow|bg-red|#[0-9a-f]{3,6}/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/companion/highlighted-text.test.tsx`

Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `src/components/companion/highlighted-text.tsx` with exactly:

```tsx
import type { ReactNode } from "react";
import type { EvidenceSpan } from "@/lib/scoring/evidence-span";

/**
 * Render a checked message with the detector's own quotes marked.
 *
 * `<mark>` is semantic ("relevant in the current context") and is announced
 * as such. The palette is brand-only: the shell has one accent, and adding a
 * second highlight colour would make the evidence panel read like a code
 * editor rather than an explanation.
 *
 * `brand-soft` alone is 1.10:1 on white in the AppNext theme — a tint you
 * cannot see. `brand-soft-2` plus a 1 px inset rule in `brand-edge` carries
 * the highlight without introducing a new hue.
 *
 * A span that is inverted or outside the string is skipped, not clamped:
 * a wrong underline is worse than no underline.
 */
export function HighlightedText({
  text,
  spans,
}: {
  text: string;
  spans: readonly EvidenceSpan[];
}) {
  if (spans.length === 0) return <>{text}</>;

  const nodes: ReactNode[] = [];
  let cursor = 0;

  spans.forEach((span, index) => {
    if (span.start < cursor || span.end > text.length || span.start >= span.end) {
      return;
    }

    if (span.start > cursor) nodes.push(text.slice(cursor, span.start));
    // The array is passed as children, so each element needs a stable key.
    nodes.push(
      <mark
        className="rounded-[3px] bg-brand-soft-2 px-0.5 text-brand-ink shadow-[inset_0_-1px_0_var(--lumina-brand-edge)]"
        data-evidence-mark
        key={`${span.start}-${index}`}
      >
        {text.slice(span.start, span.end)}
      </mark>,
    );
    cursor = span.end;
  });

  if (cursor < text.length) nodes.push(text.slice(cursor));

  return <>{nodes}</>;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/companion/highlighted-text.test.tsx`

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/companion/highlighted-text.tsx src/components/companion/highlighted-text.test.tsx
git commit -m "feat(companion): render marked evidence spans with brand tokens"
```

---

## Task 5: Wire the highlight into the evidence panel

The panel is the right surface: it is the "why" column, it already shows every quote, and it is the only place that receives the full checked message. The user bubble already prints the message, so this block is a second copy — it is collapsed by default because its job is forensic (showing exactly which words fired), not re-reading the message.

**Files:**
- Modify: `src/components/companion/signal-panel.tsx` (imports; props at `:689-713`; after `findings` at `:929`; section after the findings `<ul>` ending at `:1188`)
- Modify: `src/components/companion/companion-chat.tsx:246-260` and `:1251-1274`, `:1311-1330`
- Modify: `src/components/companion/companion-entry.tsx:168-173`
- Test: `src/components/companion/signal-panel.test.tsx`, `src/components/companion/companion-entry.test.tsx`

**Interfaces:**
- Consumes: `findEvidenceSpans` (Task 3), `HighlightedText` (Task 4).
- Produces: `SignalPanel` accepts `sourceText?: string`; the chat computes `panelSource` from the same turn as `panelResult`.

- [ ] **Step 1: Write the failing panel test**

Append to `src/components/companion/signal-panel.test.tsx`:

```tsx
describe("SignalPanel · the marked message", () => {
  const MESSAGE =
    "Akun Anda akan diblokir dalam 2 jam. Verifikasi OTP sekarang di bit.ly/verifikasi-wa agar akun tidak ditutup permanen.";

  it("shows the checked message with the firing words marked", () => {
    const { result } = scoreWithTrace({ text: MESSAGE });
    const { container } = render(
      <SignalPanel
        result={result}
        sequence={AGENT_SEQUENCE}
        sourceText={MESSAGE}
      />,
    );

    expect(screen.getByText(/kata yang memicu/i)).toBeInTheDocument();
    const marks = [...container.querySelectorAll("mark")];
    expect(marks.length).toBeGreaterThan(0);
    expect(marks.map((mark) => mark.textContent).join(" ")).toMatch(
      /otp|diblokir|verifikasi|bit\.ly/i,
    );
  });

  it("does not guess a highlight when the quote is not in the text", () => {
    const { result } = scoreWithTrace({ text: MESSAGE });
    render(
      <SignalPanel
        result={result}
        sequence={AGENT_SEQUENCE}
        sourceText="Pesan lain yang tidak memuat kutipan ini."
      />,
    );

    expect(screen.queryByText(/kata yang memicu/i)).not.toBeInTheDocument();
  });

  it("renders exactly as before when no source text is supplied", () => {
    const { result } = scoreWithTrace({ text: MESSAGE });
    render(<SignalPanel result={result} sequence={AGENT_SEQUENCE} />);

    expect(screen.queryByText(/kata yang memicu/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/companion/signal-panel.test.tsx`

Expected: FAIL — `sourceText` is not a prop and the block does not render.

- [ ] **Step 3: Add imports and the prop**

In `src/components/companion/signal-panel.tsx`, add to the imports:

```ts
import { HighlightedText } from "@/components/companion/highlighted-text";
```

and, beside the existing scoring import:

```ts
import { findEvidenceSpans } from "@/lib/scoring/evidence-span";
```

In the destructured props, add `sourceText` after `titleId`:

```ts
export function SignalPanel({
  result,
  sequence,
  evidence,
  trace,
  running = false,
  titleId = "panel-bukti-title",
  sourceText,
  className,
  action,
}: {
  result: ScoreResult | null;
  sequence: AgentId[];
  /** What the Evidence Agent assembled, when this surface has produced one. */
  evidence?: EvidenceBundle | null;
  /** What the pipeline actually did. Omit on surfaces that do not measure. */
  trace?: AgentTrace | null;
  /** True while the language stage is still streaming its answer. */
  running?: boolean;
  /** Unique per surface: the chat renders the panel in a column and a sheet. */
  titleId?: string;
  /**
   * The exact text that produced `result`. Only used to mark the words the
   * engine quoted; it never leaves the component.
   */
  sourceText?: string;
  /** Lets the caller drop the card frame when the shell already draws one. */
  className?: string;
  /** Header control supplied by the host, e.g. the sheet's close button. */
  action?: ReactNode;
}) {
```

- [ ] **Step 4: Compute the spans**

Immediately after the existing `const findings = result.signals.filter(...)` line, add:

```ts
  const evidenceSpans =
    sourceText && result ? findEvidenceSpans(sourceText, findings) : [];
```

- [ ] **Step 5: Render the marked message**

Insert this block after the closing `</ul>` of the findings list and before the coverage block (`{/* 3 · Coverage … */}`):

```tsx
              {sourceText && evidenceSpans.length > 0 ? (
                <details className="group mt-2.5 rounded-[10px] border border-edge-soft bg-bg px-2.5 py-2">
                  <summary className="cursor-pointer font-mono text-[10px] text-ink-mute uppercase tracking-[0.08em]">
                    Kata yang memicu
                  </summary>
                  <p className="mt-1 whitespace-pre-wrap text-[11.5px] text-txt leading-relaxed [overflow-wrap:anywhere]">
                    <HighlightedText text={sourceText} spans={evidenceSpans} />
                  </p>
                </details>
              ) : null}
```

`<details>` is deliberate. The panel's `CardContent` is already `overflow-y-auto`, and at 380 px the sheet is narrower still, so a nested `max-h-40 overflow-y-auto` would create a second scroller that traps touch. A disclosure also gives the label keyboard focus and an announced expanded state, and it keeps a third copy of the message out of the reading flow.

- [ ] **Step 6: Run the panel test**

Run: `npm test -- src/components/companion/signal-panel.test.tsx`

Expected: PASS (the three new tests plus the existing eight).

- [ ] **Step 7: Pass the scored source from the chat**

In `src/components/companion/companion-chat.tsx`, inside `liveCheck`, return the source with the result:

```ts
        return {
          result: turn.result ?? null,
          trace: turn.trace,
          source: turn.source ?? "",
        };
```

Then, beside `panelResult`/`panelTrace`:

```ts
  const panelSource = liveCheck?.source || latestCheck?.source || "";
```

Pass `sourceText={panelSource}` to **both** `SignalPanel` instances (the desktop aside at `:1251` and the sheet at `:1311`).

- [ ] **Step 8: Pass the checked text from the standalone entry**

In `src/components/companion/companion-entry.tsx`, change the `SignalPanel` call to:

```tsx
      <SignalPanel
        evidence={evidence}
        result={result}
        sequence={AGENT_SEQUENCE}
        sourceText={checkedText || undefined}
        trace={trace}
      />
```

- [ ] **Step 9: Add the end-to-end entry test**

Append to `src/components/companion/companion-entry.test.tsx`:

```tsx
  it("marks the words that fired inside the checked message", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompanionEntry />);

    await user.click(
      screen.getByRole("button", { name: /akun diblokir|whatsapp/i }),
    );

    expect(screen.getByText(/kata yang memicu/i)).toBeInTheDocument();
    const marks = [...container.querySelectorAll("mark")];
    expect(marks.length).toBeGreaterThan(0);
    expect(
      marks.some((mark) => /otp/i.test(mark.textContent ?? "")),
    ).toBe(true);
  });
```

- [ ] **Step 10: Run the companion suite**

Run: `npm test -- src/components/companion`

Expected: PASS. If a pre-existing `getByText` now matches twice because the panel also renders the message, scope that query with `within(...)`; do not delete the new behaviour.

- [ ] **Step 11: Check 380 px**

Run `npm run dev`, open `/companion`, and with the device toolbar at **380 px** use the "APK undangan pernikahan" example. Expected: the "Kata yang memicu" disclosure is keyboard-focusable, opening it wraps the message with no horizontal scrollbar and no nested scroll trap, and the `<mark>` tint (`brand-soft-2` plus the inset `brand-edge` rule) is visible against white.

- [ ] **Step 12: Commit**

```bash
git add src/components/companion/signal-panel.tsx \
  src/components/companion/signal-panel.test.tsx \
  src/components/companion/companion-chat.tsx \
  src/components/companion/companion-entry.tsx \
  src/components/companion/companion-entry.test.tsx
git commit -m "feat(companion): mark the words that fired in the checked message"
```

---

## Task 6: Authority pack, classification, and coverage cases

One commit, because AGENTS.md now says every new rule ships with a bench case in the same commit, and the classification keywords must land with the cases that assert them. Five new rules; two new `MODUS_KEYWORDS` paths; five coverage scams and four legitimate traps.

**Files:**
- Modify: `src/lib/scoring/message.ts` (constants before `MESSAGE_RULES`; five rule objects appended to it)
- Modify: `src/lib/scoring/score.ts:49-97` (`MODUS_KEYWORDS`)
- Modify: `src/data/official-domains.json` (eight `instansi` entries)
- Modify: `src/lib/companion/explain.ts` (tactic mapping for the five new ids)
- Modify: `src/lib/scoring/bench-cases.ts` (five coverage scams s21–s25, four traps l26–l29, header)
- Test: `src/lib/scoring/message.test.ts`
- Test: `src/lib/scoring/score.test.ts`
- Test: `src/lib/scoring/link.test.ts`
- Test: `src/lib/scoring/eval.test.ts`
- Modify: `src/lib/scoring/score.bench.test.ts` (measured comment and suite title)
- Modify: `STATUS.md`

**Interfaces:**
- Consumes: the span-based `detectMessage` from Task 2.
- Produces: rule ids `authority-tax`, `authority-aid`, `authority-health`, `authority-court`, `vote-code`; `classifyModus` returns `musiman-catut-institusi` for s15/s21–s24 and `fake-call` for s25; `runEval()` reports 25 scams, 23 hard catches, 29 legitimate cases, classification 21.

- [ ] **Step 1: Write the failing classification tests**

Append to `src/lib/scoring/score.test.ts`:

```ts
describe("classification for the 2026 impersonation waves (8 Nov 2026)", () => {
  it("names the seasonal/institution category for a fake Bansos offer", () => {
    // Bench s15 used to be called `jual-beli-palsu` only because it mentions
    // a rekening. The scheme is a seasonal institution impersonation.
    const result = scoreText({
      text: "Dinas Sosial: bantuan BLT tahap 11 dicairkan hari ini. Segera konfirmasi NIK Anda dan bayar biaya data Rp50.000 ke rekening kurir.",
    });

    expect(result.modus).toBe("musiman-catut-institusi");
  });

  it("names a vote-code takeover as impersonation, not 'unrecognised'", () => {
    const result = scoreText({
      text: "Halo ini mama, tolong vote anakku ya. Masukkan kode 6 digit yang dikirim ke HP kamu buat verifikasi.",
    });

    expect(result.modus).toBe("fake-call");
  });

  it("names the DJP impersonation as a seasonal institution scheme", () => {
    // The tax rule's label must not contain "APK"/"OTP": classifyModus reads
    // those substrings and would route the scheme to `apk-whatsapp`.
    const result = scoreText({
      text: "Halo, ini petugas DJP. Ada tunggakan pajak Rp2.400.000. Bayar lewat rekening ini sebelum diblokir.",
    });

    expect(result.modus).toBe("musiman-catut-institusi");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/scoring/score.test.ts`

Expected: the first FAILs with `jual-beli-palsu`; the second FAILs with `tidak-dikenali`; the third FAILs with `apk-whatsapp`.

- [ ] **Step 3: Add the vote-code path**

In `MODUS_KEYWORDS`, insert this entry immediately after the `apk-whatsapp` entry:

```ts
  {
    // A vote/"suara" message that asks for a code is an account takeover.
    // Naming the impersonation is more useful than the generic phishing lane.
    modus: "fake-call",
    pattern:
      /\b(?:vote|voting|suara)\b[\s\S]{0,100}\b(?:kode|otp|verifikasi)\b|\b(?:kode|otp|verifikasi)\b[\s\S]{0,100}\b(?:vote|voting|suara)\b/i,
  },
```

- [ ] **Step 4: Add the seasonal path**

Insert this entry immediately before the final `jual-beli-palsu` entry:

```ts
  {
    // The seasonal wave: fake Bansos/BPJS/tax/court notices. It must run
    // before `jual-beli-palsu`, which otherwise claims every message that
    // mentions a rekening. `pajak hadiah` stays with `undian`, which runs
    // earlier.
    modus: "musiman-catut-institusi",
    pattern:
      /\b(?:bansos|pkh|bpnt|blt|pajak|coretax|djp|bpjs|jkn|pengadilan|kejaksaan|imigrasi|prakerja|cpns)\b/i,
  },
```

- [ ] **Step 5: Run the classification tests**

Run: `npm test -- src/lib/scoring/score.test.ts`

Expected: PASS.

- [ ] **Step 6: Write the failing authority tests**

Append to `src/lib/scoring/message.test.ts`:

```ts
describe("authority and impersonation pack (8 Nov 2026)", () => {
  const has = (text: string, id: string) =>
    detectMessage(text).some((hit) => hit.rule.id === id);

  it("flags a DJP/Coretax impersonation that asks for a payment rail", () => {
    const text =
      "Halo, ini petugas DJP. Ada tunggakan pajak Rp2.400.000. Bayar lewat rekening ini sebelum diblokir.";
    const result = scoreText({ text });

    expect(has(text, "authority-tax")).toBe(true);
    expect(result.risk).toBe("tinggi");
  });

  it("does not flag a Samsat tax reminder", () => {
    const text =
      "[Samsat Kota] Pajak kendaraan B 4372 UB jatuh tempo 20 Nov 2026, nominal 1.920.000. Info cekplat resmi.";
    const result = scoreText({ text });

    expect(has(text, "authority-tax")).toBe(false);
    expect(result.risk).toBe("bersih");
  });

  it("does not flag an official DJP notice that links pajak.go.id", () => {
    const text =
      "DJP: cek tagihan pajak Anda di https://pajak.go.id, bukan lewat pesan ini.";
    const result = scoreText({ text });

    expect(has(text, "authority-tax")).toBe(false);
    expect(result.risk).toBe("bersih");
  });

  it("flags a Bansos offer that asks for NIK and a fee", () => {
    const text =
      "Dinas Sosial: bantuan BLT tahap 11 dicairkan hari ini. Segera konfirmasi NIK Anda dan bayar biaya data Rp50.000 ke rekening kurir.";
    const result = scoreText({ text });

    expect(has(text, "authority-aid")).toBe(true);
    expect(result.risk).toBe("tinggi");
  });

  it("does not flag a Bansos announcement that only points to .go.id", () => {
    const text =
      "[Kemensos] Bansos tahap 11 disalurkan lewat kantor pos. Cek nama penerima di cekbansos.kemensos.go.id.";
    const result = scoreText({ text });

    expect(has(text, "authority-aid")).toBe(false);
    expect(result.risk).toBe("bersih");
  });

  it("does not flag a Bansos announcement paid by transfer to recipients", () => {
    const text =
      "[Kemensos] Bansos disalurkan lewat transfer ke rekening penerima. Penerima wajib bawa KTP ke kantor pos.";
    const result = scoreText({ text });

    expect(has(text, "authority-aid")).toBe(false);
    expect(result.risk).toBe("bersih");
  });

  it("flags a BPJS 'card will be deactivated' message", () => {
    const text =
      "BPJS Kesehatan: kartu Anda akan dinonaktifkan. Update data lewat aplikasi ini sekarang.";
    expect(has(text, "authority-health")).toBe(true);
    expect(scoreText({ text }).risk).toBe("tinggi");
  });

  it("does not flag a BPJS bill reminder", () => {
    const text =
      "[BPJS Kesehatan] Iuran Agustus Rp35.000 jatuh tempo 10 Sep. Bayar di bank atau aplikasi resmi.";
    const result = scoreText({ text });

    expect(has(text, "authority-health")).toBe(false);
    expect(result.risk).toBe("bersih");
  });

  it("does not flag a BPJS request to update data at a branch office", () => {
    const text =
      "BPJS Kesehatan: update data kepesertaan di kantor cabang, bawa KTP asli. Tidak ada biaya.";
    const result = scoreText({ text });

    expect(has(text, "authority-health")).toBe(false);
    expect(result.risk).toBe("bersih");
  });

  it("flags a court impersonation that asks for a payment rail", () => {
    const text =
      "Pengadilan Negeri Jakarta: Anda wajib membayar denda Rp5.000.000 ke rekening panitera sebelum 3 hari.";
    const result = scoreText({ text });

    expect(has(text, "authority-court")).toBe(true);
    expect(result.risk).toBe("tinggi");
  });

  it("does not flag a real court summons with no payment", () => {
    const text =
      "[Pengadilan Negeri Semarang] Panggilan sidang perkara perdata No. 12/Pdt.G/2026 pada 18 Nov 2026 pukul 09.00 di ruang II.";
    const result = scoreText({ text });

    expect(has(text, "authority-court")).toBe(false);
    expect(result.risk).toBe("bersih");
  });

  it("does not flag a real court fee paid at the counter", () => {
    const text =
      "Pengadilan Negeri Semarang: biaya panjar perkara Rp150.000 dibayar di loket pengadilan.";
    const result = scoreText({ text });

    expect(has(text, "authority-court")).toBe(false);
    expect(result.risk).toBe("bersih");
  });

  it("flags the vote-code account takeover", () => {
    const text =
      "Halo ini mama, tolong vote anakku ya. Masukkan kode 6 digit yang dikirim ke HP kamu buat verifikasi.";
    const result = scoreText({ text });

    expect(has(text, "vote-code")).toBe(true);
    expect(result.risk).toBe("tinggi");
    expect(result.hardOverride).toBe(false);
  });

  it("does not flag a vote announcement that asks for no code", () => {
    const text =
      "Voting lomba desain poster dibuka! Pilih karya favoritmu di galeri kampus, tidak perlu kode apa pun.";
    expect(has(text, "vote-code")).toBe(false);
    expect(scoreText({ text }).risk).toBe("bersih");
  });

  it("does not flag a school vote that checks a receipt code", () => {
    const text =
      "Voting ketua OSIS: verifikasi suara dengan kode 1234 di bilik suara.";
    const result = scoreText({ text });

    expect(has(text, "vote-code")).toBe(false);
    expect(result.risk).toBe("bersih");
  });
});
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `npm test -- src/lib/scoring/message.test.ts`

Expected: the five positive tests FAIL (no rule id); the ten negative tests PASS.

- [ ] **Step 8: Add the gate constants**

In `src/lib/scoring/message.ts`, after the `QR_ACTION` constant and before `MESSAGE_RULES`, add:

```ts
/*
 * Authority rules read a rail, not a word. "Tunggakan pajak bisa dibayar di
 * Samsat" is genuine advice; "bayar lewat rekening ini" is the scam. Every
 * gate below is evaluated on a ±160-character window around the match (one
 * SMS length), so an unrelated word elsewhere in a long message cannot trip
 * it — but a demand in the next sentence still can.
 */

/** ±160 chars around a match: the neighbourhood a gate is allowed to read. */
function near(text: string, span: { start: number; end: number }): string {
  return text.slice(
    Math.max(0, span.start - 160),
    Math.min(text.length, span.end + 160),
  );
}

/** A payment/credential/install rail makes a named tax office a live demand. */
const AUTHORITY_RAIL =
  /\b(?:transfer|setor|rekening|biaya|otp|pin|password|kode\s+verifikasi|pasang|instal)\b|\.apk\b/i;

/** Bansos is a scam only when it *asks* for identity data or money. */
const AUTHORITY_DATA =
  /\b(?:kirim(?:kan)?|foto|unggah|upload|konfirmasi|masukkan|serahkan|berikan)\b[^.!?]{0,40}\b(?:nik|ktp|selfie|kode|otp|pin|password)\b|\b(?:bayar|setor|transfer)\b[^.!?]{0,30}\b(?:biaya|administrasi|data)\b/i;

/** A BPJS reminder may say "bayar"; a threat plus a chat rail is the scam. */
const HEALTH_THREAT =
  /\b(?:kartu\s+(?:hangus|diblokir|nonaktif|mati)|dinonaktifkan|diblokir|dihapus)\b/i;

const HEALTH_RAIL =
  /\b(?:tautan|link|rekening|transfer|setor|otp|pin|password|pasang|instal|update\s+data)\b|https?:\/\/|\.apk\b/i;

/** Court money is paid at a counter, never into a personal account. */
const AUTHORITY_COURT_RAIL =
  /\b(?:rekening|transfer|setor|otp|pin|password|nik|ktp)\b/i;

/** A vote message is a takeover only when it asks you to relay a code. */
const VOTE_CODE =
  /\b(?:masukkan|kirim(?:kan)?|berikan|balas|sebutkan|teruskan)\b[^.!?]{0,40}\b(?:kode|otp|pin)\b[^.!?]{0,30}\b(?:\d\s?digit|sms|hp|whatsapp|wa|telepon)\b/i;
```

- [ ] **Step 9: Append the five rules**

Append these objects to the end of `MESSAGE_RULES` (after `secrecy`):

```ts
  {
    // A fake tax officer names the directorate, then asks for a rail. The
    // gate is the rail, not the word "bayar", so an ordinary Samsat reminder
    // stays clean. The label avoids "APK"/"OTP" on purpose: classifyModus
    // reads those substrings and would otherwise route this to apk-whatsapp.
    id: "authority-tax",
    weight: 0.6,
    label:
      "Mengaku dari DJP/pajak lewat pesan — DJP tidak meminta transfer, kode rahasia, atau pemasangan aplikasi lewat chat",
    pattern:
      /\b(?:coretax|djp|dirjen\s+pajak|petugas\s+pajak|kantor\s+pajak)\b|\b(?:tunggakan|denda)\b[^.!?]{0,30}\bpajak\b|\bpajak\b[^.!?]{0,30}\b(?:tunggakan|denda|blokir|diblokir|apk)\b/i,
    gate: (text, span) => AUTHORITY_RAIL.test(near(text, span)),
  },
  {
    id: "authority-aid",
    weight: 0.6,
    label:
      "Menawarkan bansos/BLT lewat pesan pribadi — penyaluran resmi tidak meminta NIK, biaya, atau setoran lewat chat",
    pattern:
      /\b(?:bansos|pkh|bpnt|blt|bantuan\s+sosial|bantuan\s+langsung\s+tunai|kartu\s+sembako)\b/i,
    gate: (text, span) => AUTHORITY_DATA.test(near(text, span)),
  },
  {
    id: "authority-health",
    weight: 0.7,
    label:
      "Mengaku dari BPJS dan mengancam kartu nonaktif — BPJS tidak meminta data atau pembayaran lewat tautan chat",
    pattern: /\b(?:bpjs|jkn)\b/i,
    gate: (text, span) => {
      const window = near(text, span);
      return HEALTH_THREAT.test(window) && HEALTH_RAIL.test(window);
    },
  },
  {
    id: "authority-court",
    weight: 0.7,
    label:
      "Mengaku dari pengadilan/kejaksaan dan meminta pembayaran — denda resmi tidak dibayar ke rekening pribadi",
    pattern:
      /\b(?:pengadilan(?:\s+negeri)?|kejaksaan(?:\s+negeri)?|juru\s+sita|surat\s+panggilan)\b/i,
    gate: (text, span) => AUTHORITY_COURT_RAIL.test(near(text, span)),
  },
  {
    id: "vote-code",
    weight: 0.8,
    label:
      "Mengaku kontes anak/suara lalu meminta kode — kode itu untuk masuk ke akunmu, bukan untuk vote",
    pattern:
      /\b(?:vote|voting|suara)\b|\b(?:pilih|dukung)\s+(?:anak|adik|keponakan|siswa|cucu)\b/i,
    gate: (text, span) => VOTE_CODE.test(near(text, span)),
  },
```

- [ ] **Step 10: Teach the link agent the same institutions**

A real `kemensos.go.id` link must not read as "not on the official list"; the authority rules are only half a pack if the allowlist does not know the authority's own domain.

In `src/data/official-domains.json`, after the `iasc.ojk.go.id` line, add:

```json
  { "domain": "kemensos.go.id", "brand": "Kemensos", "kind": "instansi" },
  { "domain": "bpjs-kesehatan.go.id", "brand": "BPJS Kesehatan", "kind": "instansi" },
  { "domain": "mahkamahagung.go.id", "brand": "Mahkamah Agung", "kind": "instansi" },
  { "domain": "kejaksaan.go.id", "brand": "Kejaksaan", "kind": "instansi" },
  { "domain": "kemenag.go.id", "brand": "Kemenag", "kind": "instansi" },
  { "domain": "imigrasi.go.id", "brand": "Imigrasi", "kind": "instansi" },
  { "domain": "prakerja.go.id", "brand": "Prakerja", "kind": "instansi" },
  { "domain": "kemnaker.go.id", "brand": "Kemnaker", "kind": "instansi" },
```

Append to `src/lib/scoring/link.test.ts`:

```ts
describe("Link Agent — authority pack allowlist (8 Nov 2026)", () => {
  it("resolves the institutions the new rules name, before imitation", () => {
    const domains = [
      "kemensos.go.id",
      "bpjs-kesehatan.go.id",
      "mahkamahagung.go.id",
      "kejaksaan.go.id",
      "kemenag.go.id",
      "imigrasi.go.id",
      "prakerja.go.id",
      "kemnaker.go.id",
    ];

    for (const domain of domains) {
      expect(classifyLink(`https://${domain}/info`)?.kind).toBe("official");
    }
  });
});
```

Run: `npm test -- src/lib/scoring/link.test.ts`

Expected: PASS.

- [ ] **Step 11: Teach the explanation layer the new rule ids**

`TACTIC_BY_RULE` in `src/lib/companion/explain.ts` maps a rule id to the tactic it teaches. A new rule id with no entry silently disappears from the teaching card, so the pack would fire without explaining itself.

Add these entries to `TACTIC_BY_RULE`:

```ts
  "authority-tax": "otoritas",
  "authority-aid": "otoritas",
  "authority-health": "otoritas",
  "authority-court": "otoritas",
  "vote-code": "rahasia",
```

`VECTOR_BY_RULE` in `conversation.ts` is deliberately **not** extended: the combination pass is a measured mechanism, and adding rules to it would move scores with no corpus case behind the move.

- [ ] **Step 12: Add the coverage cases and traps**

In `src/lib/scoring/bench-cases.ts`, replace the header comment (lines 1–18) with exactly:

```ts
/**
 * Bench corpus — 54 messages: 25 scams and 29 legitimate messages.
 *
 * The first 45 (s01–s20, l01–l25) are the independent corpus. The last nine
 * arrived with the authority pack: s21–s25 are rule-coverage cases written
 * alongside the gates they test, and l26–l29 are their legitimate mirrors.
 * STATUS reports those nine separately; they are never counted as independent
 * evidence of real-world recall.
 *
 * The original corpus spans the 12 modus families (20 scams) plus 25
 * messages an Indonesian phone user legitimately receives, chosen so the
 * FALSE-POSITIVE traps sit where they really hide: an OTP the user's own
 * bank sent, a verification reminder from a legitimate product, a flash
 * sale with real urgency.
 *
 * This corpus first existed only inside a past analysis; it is committed
 * so the false-positive claim in STATUS.md is reproducible by anyone:
 *   - scam recall  = share of scams caught as mencurigakan+ (detectable)
 *   - FP rate      = share of legit messages scored mencurigakan/tinggi
 *
 * Rules of the corpus:
 *   a. In the original 45, every scam names at most its modus family and no
 *      case was reverse-designed from the regexes. The nine authority-pack
 *      fixtures are the labelled exception.
 *   b. Every legit message is abbreviated from a real-world shape.
 */
```

The original 20 scams and 25 legitimate messages remain the independent corpus; STATUS reports both denominators.

Append to `SCAM_CASES`:

```ts
  {
    id: "s21",
    tag: "DJP/Coretax palsu",
    wantModus: "musiman-catut-institusi",
    text: "Halo, ini petugas DJP. Ada tunggakan pajak Rp2.400.000. Bayar lewat rekening ini sebelum diblokir.",
  },
  {
    id: "s22",
    tag: "bansos/BLT palsu",
    wantModus: "musiman-catut-institusi",
    text: "Dinas Sosial: bantuan BLT tahap 11 dicairkan hari ini. Segera konfirmasi NIK Anda dan bayar biaya data Rp50.000 ke rekening kurir.",
  },
  {
    id: "s23",
    tag: "BPJS dinonaktifkan",
    wantModus: "musiman-catut-institusi",
    text: "BPJS Kesehatan: kartu Anda akan dinonaktifkan. Update data lewat aplikasi ini sekarang.",
  },
  {
    id: "s24",
    tag: "pengadilan palsu",
    wantModus: "musiman-catut-institusi",
    text: "Pengadilan Negeri Jakarta: Anda wajib membayar denda Rp5.000.000 ke rekening panitera sebelum 3 hari.",
  },
  {
    id: "s25",
    tag: "vote-code takeover",
    wantModus: "fake-call",
    text: "Halo ini mama, tolong vote anakku ya. Masukkan kode 6 digit yang dikirim ke HP kamu buat verifikasi.",
  },
```

Append to `LEGIT_CASES`:

```ts
  {
    id: "l26",
    tag: "bansos resmi tanpa biaya",
    text: "[Kemensos] Bansos tahap 11 disalurkan lewat kantor pos. Cek nama penerima di cekbansos.kemensos.go.id.",
  },
  {
    id: "l27",
    tag: "tagihan BPJS resmi",
    text: "[BPJS Kesehatan] Iuran Agustus Rp35.000 jatuh tempo 10 Sep. Bayar di bank atau aplikasi resmi.",
  },
  {
    id: "l28",
    tag: "voting tanpa kode",
    text: "Voting lomba desain poster dibuka! Pilih karya favoritmu di galeri kampus, tidak perlu kode apa pun.",
  },
  {
    id: "l29",
    tag: "panggilan sidang resmi",
    text: "[Pengadilan Negeri Semarang] Panggilan sidang perkara perdata No. 12/Pdt.G/2026 pada 18 Nov 2026 pukul 09.00 di ruang II.",
  },
```

- [ ] **Step 13: Update the measured assertions**

In `src/lib/scoring/eval.test.ts`:

```ts
  it("catches every scam in the corpus", () => {
    expect(report.scamTotal).toBe(25);
    expect(report.caught).toBe(report.scamTotal);
  });

  it("never calls a legitimate message risky", () => {
    expect(report.legitTotal).toBe(29);
    expect(report.legitNotRisky).toBe(report.legitTotal);
    expect(report.falsePositives).toBe(0);
  });

  it("pins the hard-catch count the pitch quotes", () => {
    expect(report.nailed).toBe(23);
  });
```

Change the classification floor to 21:

```ts
    expect(report.classification).toBeGreaterThanOrEqual(21);
```

Add one named group assertion:

```ts
  it("names the seasonal institution scheme in the bench", () => {
    const group = report.byModus.find(
      (entry) => entry.modus === "musiman-catut-institusi",
    );
    expect(group?.caught).toBe(5);
  });
```

In `src/lib/scoring/score.bench.test.ts`, change the measured comment to:

```ts
 * Measured 8 Nov 2026, after the message.ts + link.ts honesty pass, the
 * normalisation + authority pass, and the five coverage cases:
 *   scam recall 1.00 (25/25)   hard catches 0.92 (23/25)
 *   FP 0.00 (0/25 original + 0/4 authority fixtures)
 * Pre-fix measurement for comparison: recall 0.95, hard 0.85, FP 0.10.
```

The file has two suites, and each keeps its own denominator. Change the header at `:9` to `Corpus bench (54 messages)`, the first suite title at `:37` to `describe("corpus bench — 25 scam messages", …)`, and the second at `:82` to `describe("corpus bench — 29 legit messages (false positives)", …)`. Do not merge the two suites into one: the split is what keeps the false-positive denominator visible.

- [ ] **Step 14: Update `STATUS.md`**

Change the stale “Korpus bench 43 pesan” at `:48` to “Korpus bench 54 pesan”.

In the bench paragraph (currently lines 89–98), change the corpus sentence and split the FP row. The coverage cases were written alongside the gates they test, so they are reported separately rather than folded into the independent denominator:

```md
Korpus 54 pesan (20 scam lama + 5 kasus coverage paket otoritas + 25 pesan
sah lama + 4 fixture regresi). Dijalankan oleh `score.bench.test.ts`, dan
angkanya kini juga lahir dari satu fungsi, `runEval()` di `eval.ts`, sehingga
klaim di pitch adalah keluaran mesin, bukan salinan terminal.

| Ukuran | Sebelum perbaikan | Sesudah | Target |
|---|---|---|---|
| Scam tertangkap (`mencurigakan`/`tinggi`) | 19/20 | **25/25** (20/20 independen + 5/5 coverage) | ≥ 0.95 |
| Scam langsung `tinggi` | 17/20 | **23/25** | ≥ 0.80 |
| False positive korpus awal (25 pesan) | 2/20 (10%) | **0/25** | < 5% |
| False positive fixture paket otoritas (4 pesan) | — | **0/4** | 0 |
```

Change the sentence at `:114` from “false positive tetap 0/25” to “false positive tetap 0/25 pada korpus awal dan 0/4 pada fixture baru”.

Append after the combination-pass section:

```md
### Ekspansi 8 November 2026 — normalisasi, span bukti, paket otoritas

a. **Normalisasi deterministik.** NFKC, karakter format (zero-width),
   penyambungan huruf satu-satu, dan lipatan leetspeak dijalankan sebelum
   aturan mencocokkan. `Signal.evidence` tetap dikutip dari teks asli melalui
   peta indeks, jadi kontrak `Signal` tidak berubah.
b. **Span bukti.** Panel bukti menyorot kata yang benar-benar memicu aturan di
   dalam pesan yang diperiksa; kutipan yang tidak ditemukan tidak disorot,
   bukan ditebak.
c. **Paket otoritas.** Lima aturan baru menangani DJP/Coretax, Bansos/BLT,
   BPJS, pengadilan/kejaksaan, dan takeover "vote" yang meminta kode. Setiap
   aturan bergerbang pada rel pembayaran/kredensial di jendela ±160 karakter,
   bukan pada nama instansi. Lima kasus coverage (s21–s25) mengukur recall
   paket ini.
d. **Ukuran.** Klasifikasi modus pada korpus independen (20 scam) naik
   15/20 → 16/20 karena s15 kini dikenali sebagai
   `musiman-catut-institusi`; s12, s17, s18, dan s19 tetap salah. Kelima
   kasus coverage s21–s25 juga dikenali, sehingga angka gabungan 25 scam
   menjadi 21/25. False positive 0/25 pada korpus awal dan 0/4 pada fixture
   baru.
```

- [ ] **Step 15: Run the scoring suite and read the measured table**

Run: `npm test -- src/lib/scoring`

Expected: PASS. Confirm the console table reports:
- `scamTotal` 25 and `caught` 25;
- `nailed` 23;
- `legitTotal` 29 and `falsePositives` 0;
- `classification` 21;
- `musiman-catut-institusi` caught 5/5;
- `slowestCpuMs` < 50.

If any new legitimate case is flagged, tighten the corresponding gate above — do not remove the corpus case.

- [ ] **Step 16: Commit**

```bash
git add src/lib/scoring/message.ts src/lib/scoring/message.test.ts \
  src/lib/scoring/score.ts src/lib/scoring/score.test.ts \
  src/lib/scoring/bench-cases.ts src/lib/scoring/eval.test.ts \
  src/lib/scoring/score.bench.test.ts src/lib/scoring/link.test.ts \
  src/data/official-domains.json src/lib/companion/explain.ts STATUS.md
git commit -m "feat(scoring): add authority pack, classify seasonal/vote waves, measure coverage"
```

---

## Final verification

- [ ] **Run the full gate in the clean worktree**

```bash
npm run verify
```

Expected: typecheck, Biome, all Jest suites, and `next build` pass. If `next build` fails because `next dev` is running, stop the dev server by PID (`ps -eo pid,cmd | grep "node .*bin/next dev"`) and re-run.

- [ ] **Confirm the contract did not move**

```bash
git diff --stat main -- src/lib/contracts
```

Expected: no output.

- [ ] **Confirm no dependency was added**

```bash
git diff main -- package.json package-lock.json
```

Expected: no output.

- [ ] **Read the final measurement**

```bash
npm test -- src/lib/scoring/eval.test.ts --verbose
```

Expected: `25/25` scams caught, `23/25` hard, `0/25` false positives on the original corpus plus `0/4` on the new fixtures, classification `21`.

- [ ] **Check the two widths**

At **380 px**: `/companion`, run the "APK undangan pernikahan" example, open the evidence drawer, confirm the "Kata yang memicu" disclosure wraps without horizontal scroll or a nested scroll trap and every icon-only control still has an accessible name. At **1440 px**: confirm the panel column shows the same disclosure without pushing "Yang diperiksa" off-screen.

- [ ] **Done when**

The three evasion tests fail on `main` and pass here; the panel marks real quotes; the five authority positives and five coverage scams are caught while all ten negative fixtures stay clean; the four new legitimate fixtures stay `bersih`; `npm run verify` is green; and `src/lib/contracts/**` is untouched.

---

## Self-review

**Spec coverage.**
- *Normalisation pre-pass* — Task 1 (pure) + Task 2 (wired, evidence preserved).
- *Evidence spans + reason* — Task 3 (locate), Task 4 (render), Task 5 (panel + chat + entry). The reason is the existing `Signal.label`; no contract field is added.
- *Authority pack* — Task 6 (five rules with gates, two keyword paths, five coverage scams, four negative fixtures, measurement).
- *Honesty rules* — the panel skips quotes it cannot find; the five coverage scams and four legitimate fixtures are labelled rule-coverage cases and reported separately from the independent 25+25 corpus; STATUS gains the exact denominators and names the four remaining misclassifications.
- *No new deps / frozen contracts / 380 px / tokens* — Global Constraints + Task 5 Step 11 + Final verification.

**Deliberate spec deviations.**
- `final-expansion.md` asked for `ruleId` + `span` on every `Signal`. The contract is frozen, so the UI derives spans from the existing `evidence` string; `ruleId` is not needed for this slice.
- The pack prints no hotline/channel line. Adding one per rule is copy work that does not change detection, and it is cut for the 48-hour budget.
- `VECTOR_BY_RULE` is not extended, so the measured combination pass is unchanged.
- Recall of the authority pack is measured by rule-coverage cases s21–s25, which are reported separately from the independent 20-scam corpus; STATUS says so.

**Placeholder scan.** No `TBD`, no "handle edge cases", every code step contains the code to paste, every test step contains the assertion.

**Type consistency.**
- `normalizeWithMap` returns `NormalizedText`; `message.ts` destructures `{ text: normalized, map }` and passes `map` to `originalRange`.
- `Rule.gate(text, span)` matches the two call sites (`quishing`, authority rules) and `isWarning(rule, text, span)`.
- `findEvidenceSpans(text, signals)` is called once in `SignalPanel` with `findings` (already `Signal[]`).
- `HighlightedText` receives `text: string` and `spans: readonly EvidenceSpan[]`.
- `SignalPanel` receives `sourceText?: string` from both chat instances and the standalone entry.
