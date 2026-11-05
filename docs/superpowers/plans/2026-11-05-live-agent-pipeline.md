# Live Agent Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 420 ms `setTimeout` with a real, measured agent pipeline whose stages stream into the chat, and add an optional LLM voice layer that receives findings but never the user's message.

**Architecture:** `score.ts` grows an ordered detector list driven by one `scoreWithTrace()`; `scoreText()` delegates to it, so the verdict and the trace can never drift. Detectors stay pure and offline. A Next route handler turns the signal digest into prose through any OpenAI-compatible endpoint, falling back to `composeReply()` when it is unset or slow. The UI renders the trace with the reference's collapsible-card metrics and a seven-motion system.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript strict · Tailwind v4 (`@theme inline`) · shadcn/ui (radix base) · zod 4 · Biome · Jest + React Testing Library · `motion` (already a dependency)

**Spec:** `docs/superpowers/specs/2026-11-05-live-agent-pipeline-design.md`

## Global Constraints

- Package versions are frozen: Next 16.4.5, React 19.3, Tailwind 4, zod 4, `motion` 14.9.1, Biome 2.4.2, Jest 30. **No new dependency may be added** (`AGENTS.md` §7). Only `motion` and `zod` are used here, both already installed.
- `score`, `risk`, and `signals` are produced **only** in `src/lib/scoring/score.ts`. Nothing in `components/companion/` may compute or shift them (`AGENTS.md` §4).
- `src/lib/contracts/score.ts` is frozen. This plan adds `src/lib/contracts/agent-run.ts` and never edits the frozen file.
- Colour comes only from `--lumina-*` tokens via Tailwind utilities `bg-bg`, `bg-panel`, `bg-panel-2`, `border-line`, `text-txt`, `text-dim`, `text-safe`, `text-warn`, `text-danger`. Hex literals and raw Tailwind colours (`bg-red-500`) are forbidden.
- shadcn/ui first: compose `Card`, `Button`, `Badge`, `Separator` from `src/components/ui/`. Radix base means `asChild`, never `render`.
- Every user-visible control gets an accessible name; the shell must work at **380 px**.
- `@media (prefers-reduced-motion: reduce)` must neutralise every new animation.
- `npm run verify` (typecheck + lint + test + build) must pass before every commit. The dev server must be stopped before `next build`.
- Stop `next dev` by PID, never `pkill -f "next dev"` (it kills the invoking shell):
  `ps -eo pid,cmd | grep "node .*bin/next dev" | grep -v grep | awk '{print $1}' | while read p; do kill "$p"; done`
- Bench gate, unchanged: **20/20 scam recall, 0/23 false positives**. If a new rule flips a legitimate message, tune its weight or add a negative-context guard — never weaken the rule set.
- Indonesian copy, `baku`. The victim is never blamed.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/contracts/agent-run.ts` | **new** — `AgentStage`, `AgentTrace`, `STAGE_LABEL`, `VoiceDigestSchema`, `voiceDigest()` |
| `src/lib/scoring/score.ts` | modified — detector list, `scoreWithTrace()`, `scoreText()` delegate |
| `src/lib/scoring/identity.ts` | **new** — phone/sender rules |
| `src/lib/scoring/link.ts` | modified — `punycode`, `credential-path`, `brand-subdomain` |
| `src/lib/scoring/conversation.ts` | **new** — combination pass (moved) + ordered escalation |
| `src/lib/companion/voice-stream.ts` | **new** — SSE → plain text transform, testable without Next |
| `src/app/api/companion/voice/route.ts` | **new** — digest → prose, streaming, 503 when unconfigured |
| `src/components/companion/agent-trace.tsx` | **new** — the trace card |
| `src/components/companion/thinking-row.tsx` | **new** — streaming indicator |
| `src/components/companion/voice-client.ts` | **new** — browser-side fetch + stream reader + fallback |
| `src/components/companion/companion-chat.tsx` | modified — replaces `setTimeout` with the pipeline |
| `src/components/companion/signal-panel.tsx` | modified — consumes `AgentTrace` |
| `src/app/globals.css` | modified — motion tokens |

---

## Task 1: Trace contract and voice digest

**Files:**
- Create: `src/lib/contracts/agent-run.ts`
- Test: `src/lib/contracts/agent-run.test.ts`

**Interfaces:**
- Consumes: `AgentId`, `Risk`, `ScoreResult`, `Signal` from `@/lib/contracts/score`
- Produces: `StageStatus`, `StageId`, `AgentStage`, `AgentTrace`, `STAGE_LABEL`, `VoiceDigestSchema`, `VoiceDigest`, `voiceDigest(result, modusName)`

- [ ] **Step 1: Write the failing test**

Create `src/lib/contracts/agent-run.test.ts`:

```ts
import { describe, expect, it } from "@jest/globals";
import {
  AgentTrace,
  STAGE_LABEL,
  VoiceDigestSchema,
  voiceDigest,
} from "@/lib/contracts/agent-run";
import { scoreText } from "@/lib/scoring/score";

const SCAM =
  "Selamat siang Bu, ini undangan pernikahan. Silakan instal undangan-nikah.apk. " +
  "Transfer biaya administrasi Rp150.000 ke rekening 1234567890 a.n. Budi, " +
  "lalu konfirmasi ke 0812-3456-7890. Buka juga https://bca-verif.xyz/login";

describe("voiceDigest", () => {
  it("keeps the findings and drops every quote from the message", () => {
    const result = scoreText({ text: SCAM });
    const digest = voiceDigest(result, "Undangan APK");

    expect(digest.findings.length).toBeGreaterThan(0);
    expect(digest.risk).toBe(result.risk);
    expect(digest.score).toBe(result.score);

    const serialized = JSON.stringify(digest);
    // None of these appear in the message as findings; all of them are
    // strings the user typed and must not leave the device.
    expect(serialized).not.toContain("0812");
    expect(serialized).not.toContain("1234567890");
    expect(serialized).not.toContain("bca-verif");
    expect(serialized).not.toContain("undangan-nikah");
  });

  it("rejects a payload with an extra key", () => {
    const result = scoreText({ text: SCAM });
    const digest = voiceDigest(result, "Undangan APK");
    const parsed = VoiceDigestSchema.safeParse({ ...digest, text: SCAM });
    expect(parsed.success).toBe(false);
  });

  it("accepts its own output", () => {
    const result = scoreText({ text: SCAM });
    expect(
      VoiceDigestSchema.safeParse(voiceDigest(result, "Undangan APK")).success,
    ).toBe(true);
  });
});

describe("STAGE_LABEL", () => {
  it("names every stage the pipeline can report", () => {
    for (const id of [
      "message",
      "link",
      "identity",
      "conversation",
      "evidence",
      "scoring",
      "voice",
    ] as const) {
      expect(STAGE_LABEL[id].label.length).toBeGreaterThan(0);
      expect(STAGE_LABEL[id].task.length).toBeGreaterThan(0);
    }
  });
});
```

Remove the unused `AgentTrace` import if Biome flags it; the test does not need it.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/lib/contracts/agent-run.test.ts --silent=false`
Expected: FAIL — `Cannot find module '@/lib/contracts/agent-run'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/contracts/agent-run.ts`:

```ts
import { z } from "zod";
import type { AgentId, ScoreResult, Signal } from "@/lib/contracts/score";

/**
 * AgentTrace — what the pipeline actually did, measured (new contract).
 *
 * This file is additive. `ScoreResult` is frozen (§5); nothing here changes an
 * existing field, so no other stream is broken by importing it.
 *
 * The trace exists to make one claim checkable in the interface: the verdict is
 * deterministic and instant, and only the words wait for a model. Every `ms`
 * below is a real `performance.now()` difference, never a designed delay.
 */

export type StageStatus =
  | "menunggu"
  | "berjalan"
  | "selesai"
  | "temuan"
  | "dilewati"
  | "gagal";

/** `voice` is not a detector, so it does not belong in `AgentId`. */
export type StageId = AgentId | "voice";

export interface AgentStage {
  id: StageId;
  /** "Identity Agent" — printed in the trace row. */
  label: string;
  /** One line: what this stage looks for. Printed as the row's subtitle. */
  task: string;
  status: StageStatus;
  /** Signals this stage owns in the final, de-duplicated result. */
  findings: number;
  /** Measured duration. May legitimately be a fraction of a millisecond. */
  ms: number;
  /** The honest reason when `status` is "dilewati" or "gagal". */
  note?: string;
}

export interface AgentTrace {
  stages: AgentStage[];
  totalMs: number;
}

export const STAGE_LABEL: Record<StageId, { label: string; task: string }> = {
  message: {
    label: "Message Agent",
    task: "Urgensi palsu, otoritas, iming-iming, permintaan OTP",
  },
  link: {
    label: "Link Agent",
    task: "Domain mirip merek resmi, tautan pendek, jalur login palsu",
  },
  identity: {
    label: "Identity Agent",
    task: "Nomor pengirim, klaim institusi, nomor asing",
  },
  conversation: {
    label: "Conversation Agent",
    task: "Vektor yang menumpuk dan tahapan eskalasi",
  },
  evidence: {
    label: "Evidence Agent",
    task: "Menyusun kutipan, nominal, dan kontak untuk laporan",
  },
  scoring: {
    label: "Scoring Orchestrator",
    task: "Menggabungkan temuan jadi 0–100",
  },
  voice: {
    label: "Penyusun bahasa",
    task: "Menulis jawaban dari temuan, tanpa membaca pesanmu",
  },
};

/**
 * The exact payload that leaves the device for the language layer.
 *
 * `Signal.evidence` is a verbatim quote from the user's message, so it has no
 * field here — plan §11.6a ("kirim hanya hasil sinyal") becomes a property of
 * the schema rather than a promise in prose. `.strict()` makes an extra key a
 * rejected request, which is what the route validates against.
 */
export const VoiceDigestSchema = z
  .object({
    risk: z.enum(["bersih", "rendah", "mencurigakan", "tinggi"]),
    score: z.number().int().min(0).max(100),
    modusName: z.string(),
    findings: z.array(
      z.object({
        label: z.string(),
        weight: z.number().min(0).max(1),
      }),
    ),
    advice: z.array(z.string()),
    moduleNo: z.number().int().min(1).max(12).nullable(),
    locale: z.literal("id"),
  })
  .strict();

export type VoiceDigest = z.infer<typeof VoiceDigestSchema>;

/** Build the outbound payload. Deliberately lossy: `evidence` is dropped. */
export function voiceDigest(
  result: ScoreResult,
  modusName: string,
): VoiceDigest {
  return {
    risk: result.risk,
    score: result.score,
    modusName,
    findings: result.signals
      .filter((signal: Signal) => signal.weight > 0)
      .map((signal) => ({ label: signal.label, weight: signal.weight })),
    advice: result.advice,
    moduleNo: result.relatedModule,
    locale: "id",
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/lib/contracts/agent-run.test.ts --silent=false`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/contracts/agent-run.ts src/lib/contracts/agent-run.test.ts
git commit -m "feat(contracts): add AgentTrace and the evidence-free voice digest

The digest has no field for Signal.evidence, which is a verbatim quote from
the user's message. Plan 11.6a ('send only the signals') stops being a promise
and becomes a property of the schema: .strict() rejects an extra key, and a
test asserts that a phone number, an account number, and a URL typed by the
user do not survive serialisation."
```

---

## Task 2: One pipeline, two entry points

**Files:**
- Modify: `src/lib/scoring/score.ts`
- Create: `src/lib/scoring/conversation.ts` (combination pass only, moved)
- Test: `src/lib/scoring/trace.test.ts`

**Interfaces:**
- Consumes: `AgentStage`, `AgentTrace`, `STAGE_LABEL` from Task 1
- Produces: `ScoredTurn`, `ScoreInput.turns`, `TracedScore`, `scoreWithTrace(input)`; `comboSignals(text)` from `conversation.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/scoring/trace.test.ts`:

```ts
import { describe, expect, it } from "@jest/globals";
import { LEGIT_CASES, SCAM_CASES } from "@/lib/scoring/bench-cases";
import { scoreText, scoreWithTrace } from "@/lib/scoring/score";

const SCAM =
  "Akun Anda akan diblokir dalam 2 jam. Verifikasi di " +
  "https://bca-verif.xyz/login sebelum ditutup.";

describe("scoreWithTrace", () => {
  it("reports every detector stage plus scoring", () => {
    const { trace } = scoreWithTrace({ text: SCAM });
    const ids = trace.stages.map((stage) => stage.id);

    expect(ids).toEqual(["message", "link", "conversation", "scoring"]);
    for (const stage of trace.stages) {
      expect(stage.ms).toBeGreaterThanOrEqual(0);
      expect(stage.label.length).toBeGreaterThan(0);
    }
    expect(trace.totalMs).toBeGreaterThanOrEqual(0);
  });

  it("attributes each surviving signal to exactly one stage", () => {
    const { result, trace } = scoreWithTrace({ text: SCAM });
    const counted = trace.stages.reduce((sum, stage) => sum + stage.findings, 0);
    expect(counted).toBe(result.signals.length);
  });

  it("is a measurement, never a score", () => {
    for (const benchCase of SCAM_CASES) {
      expect(scoreWithTrace({ text: benchCase.text }).result).toEqual(
        scoreText({ text: benchCase.text }),
      );
    }
    for (const benchCase of LEGIT_CASES) {
      expect(scoreWithTrace({ text: benchCase.text }).result).toEqual(
        scoreText({ text: benchCase.text }),
      );
    }
  });

  it("notes why a stage had nothing to do rather than claiming a clean pass", () => {
    const { trace } = scoreWithTrace({ text: "Halo, apa kabar?" });
    const link = trace.stages.find((stage) => stage.id === "link");
    expect(link?.status).toBe("dilewati");
    expect(link?.note).toMatch(/tautan/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/lib/scoring/trace.test.ts --silent=false`
Expected: FAIL — `scoreWithTrace is not a function`

- [ ] **Step 3: Move the combination pass into its own module**

Create `src/lib/scoring/conversation.ts`. Move `Vector`, `VECTOR_BY_RULE`, `VECTOR_FLOOR`, `Combo`, `COMBOS`, and `combinationSignal` out of `score.ts` verbatim, and add the wrapper:

```ts
import { detectMessage } from "@/lib/scoring/message";
import type { Signal } from "@/lib/contracts/score";

// … (the moved constants and combinationSignal, unchanged) …

/**
 * Conversation Agent — the in-message combination pass.
 *
 * Two correlated findings ("act within 2 hours" and "transfer the fee") are
 * not independent, so a probabilistic OR leaves nothing on the panel
 * explaining why they belong together. This makes "several vectors agree" its
 * own finding.
 *
 * Escalation across turns is added in a later task; the detector shape stays
 * the same so nothing downstream changes.
 */
export function conversationSignals(text: string): Signal[] {
  const combo = combinationSignal(detectMessage(text));
  return combo ? [combo] : [];
}
```

Then delete `Vector`, `VECTOR_BY_RULE`, `VECTOR_FLOOR`, `Combo`, `COMBOS`, and `combinationSignal` from `score.ts`, and import `conversationSignals`.

- [ ] **Step 4: Rewrite the public surface of `score.ts`**

Replace the `ScoreInput` declaration and the `scoreText` function with the following. Leave `accumulate`, `clamp01`, `dedupe`, `MODUS_KEYWORDS`, `classifyModus`, `ADVICE`, and `moduleForResult` untouched.

```ts
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

type DetectorId = Exclude<AgentId, "scoring" | "evidence" | "voice">;

/**
 * The pipeline, in evaluation order. Both public functions below drive this
 * single list, so the trace cannot drift from the verdict.
 */
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
    id: "conversation",
    run: ({ text, turns }) => {
      const signals = conversationSignals(text);
      return {
        signals,
        note:
          turns.length === 0
            ? "Butuh pesan kedua untuk menilai tahapan."
            : undefined,
      };
    },
  },
];

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
    findings: result.signals.length,
    ms: performance.now() - scoringStarted,
  });

  // Re-count against the surviving, de-duplicated result so the numbers a user
  // reads add up to the signals they can see.
  for (const stage of stages) {
    stage.findings = result.signals.filter(
      (signal) => (signal.agent ?? "scoring") === stage.id,
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
```

Add to the imports at the top of `score.ts`:

```ts
import { conversationSignals } from "@/lib/scoring/conversation";
import { type AgentStage, type AgentTrace, STAGE_LABEL } from "@/lib/contracts/agent-run";
import { extractLinks, linkSignals } from "@/lib/scoring/link";
```

(`linkSignals` is already imported; add `extractLinks`. Remove the now-unused `combinationSignal` import path if one exists.)

- [ ] **Step 5: Run the tests to verify they pass, and the bench is unmoved**

Run: `npx jest src/lib/scoring --silent=false`
Expected: PASS, including `score.bench.test.ts` still reporting 20/20 recall and 0/23 false positives.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scoring/score.ts src/lib/scoring/conversation.ts src/lib/scoring/trace.test.ts
git commit -m "refactor(scoring): drive one detector list from both entry points

scoreText() delegates to scoreWithTrace(), so the verdict and the trace cannot
disagree. The trace measures with performance.now() and never scores; finalize()
remains the only place score, risk, and signals are produced.

Detectors return a note when they had nothing to inspect, so the panel can say
'dilewati: tidak ada tautan' instead of a clean tick for work that never
happened. Bench unchanged: 20/20 recall, 0/23 false positives."
```

---

## Task 3: Identity Agent

**Files:**
- Create: `src/lib/scoring/identity.ts`
- Test: `src/lib/scoring/identity.test.ts`
- Modify: `src/lib/scoring/score.ts` (insert the detector)
- Modify: `src/lib/scoring/trace.test.ts` (stage order)

**Interfaces:**
- Consumes: `OFFICIAL` from `@/lib/scoring/link`, `Signal` from `@/lib/contracts/score`
- Produces: `identitySignals(text)` → `{ signals: Signal[]; note?: string }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/scoring/identity.test.ts`:

```ts
import { describe, expect, it } from "@jest/globals";
import { identitySignals } from "@/lib/scoring/identity";

const labels = (text: string) =>
  identitySignals(text).signals.map((signal) => signal.label);

describe("Identity Agent", () => {
  it("flags a bank claim carried by an ordinary mobile number", () => {
    const found = labels(
      "Halo Bu, saya dari BCA. Nomor saya 0812-3456-7890, mohon dihubungi.",
    );
    expect(found.join(" ")).toMatch(/BCA/);
    expect(found.join(" ")).toMatch(/ponsel/i);
  });

  it("flags a foreign number claiming an Indonesian institution", () => {
    const found = labels(
      "Ini dari pihak BRI. Hubungi +60 12-345 6789 untuk verifikasi.",
    );
    expect(found.join(" ")).toMatch(/asing|luar/i);
  });

  it("flags a shortcode claiming a bank", () => {
    const found = labels("Pengirim: 8888. Kami dari Mandiri, akun Anda ditutup.");
    expect(found.join(" ")).toMatch(/singkat|8888/i);
  });

  it("treats a forward marker as context, not proof", () => {
    const { signals } = identitySignals(
      "Diteruskan banyak kali. Selamat, Anda menang.",
    );
    const forward = signals.find((signal) => /diteruskan/i.test(signal.label));
    expect(forward?.weight).toBeLessThan(0.4);
  });

  it("stays silent on a legitimate mobile number with no institution claim", () => {
    expect(labels("Kak, pesananmu sudah dikirim ya. Kurir: 0813-2222-3333.")).toEqual(
      [],
    );
  });

  it("stays silent on an official bank notification with no number", () => {
    expect(labels("BCA: Transaksi Rp250.000 di Indomaret berhasil.")).toEqual([]);
  });

  it("says why it had nothing to inspect", () => {
    const result = identitySignals("Halo, apa kabar?");
    expect(result.signals).toEqual([]);
    expect(result.note).toMatch(/nomor/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/lib/scoring/identity.test.ts --silent=false`
Expected: FAIL — `Cannot find module '@/lib/scoring/identity'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/scoring/identity.ts`:

```ts
import { OFFICIAL } from "@/lib/scoring/link";
import type { Signal } from "@/lib/contracts/score";

/**
 * Identity Agent — the sender, not the message.
 *
 * Everything here is offline. SPF/DKIM/DMARC needs mail headers a pasted
 * WhatsApp screenshot never carries, so this agent does not pretend to check
 * them; it checks what a pasted message genuinely contains — a number, and a
 * claim about who sent it.
 *
 * The gate for every rule is the same: a *claim* adjacent to a number. A
 * message that merely mentions BCA ("transaksi di Indomaret") must stay silent,
 * or every legitimate bank notification becomes a false positive.
 */

/** Indonesian mobile, with optional separators: 0812-3456-7890, +62 812 … */
const MOBILE_ID = /(?:\+?62|0)8[\d\s-]{6,13}\d/g;

/** Any explicitly international number. */
const FOREIGN = /\+\d{1,3}[\d\s-]{6,13}\d/g;

/** A sender introduced as digits: "Pengirim: 8888", "dari nomor 12345". */
const SHORTCODE = /(?:pengirim|sender|dari\s+nomor|nomor)\s*[:=]?\s*(\d{4,6})\b/i;

const FORWARD = /\b(?:diteruskan(?:\s+banyak\s+kali)?|forwarded(?:\s+many\s+times)?)\b/i;

/**
 * "saya dari BCA", "ini dari pihak BRI", "kami dari Mandiri", "CS BCA".
 * A bare brand mention is not a claim, and `OFFICIAL` includes merchants and
 * couriers whose names appear in ordinary receipts.
 */
function claimsInstitution(text: string, brand: string): boolean {
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const claim = new RegExp(
    `(?:saya|kami|ini|aku)\\s+(?:adalah\\s+)?(?:dari\\s+)?(?:pihak\\s+)?${escaped}\\b` +
      `|\\b(?:cs|call\\s*center|customer\\s*service)\\s+${escaped}\\b` +
      `|\\b${escaped}\\s+(?:resmi|official)\\b`,
    "i",
  );
  return claim.test(text);
}

function claimedBrands(text: string): string[] {
  return OFFICIAL.filter((official) => claimsInstitution(text, official.brand))
    .map((official) => official.brand)
    .filter((brand, index, all) => all.indexOf(brand) === index);
}

export interface IdentityResult {
  signals: Signal[];
  note?: string;
}

export function identitySignals(text: string): IdentityResult {
  const signals: Signal[] = [];

  const mobile = text.match(MOBILE_ID) ?? [];
  const foreign = (text.match(FOREIGN) ?? []).filter(
    (candidate) => !/^\+?62/.test(candidate.replace(/[\s-]/g, "")),
  );
  const shortcode = text.match(SHORTCODE);
  const brands = claimedBrands(text);

  if (brands.length > 0 && mobile.length > 0) {
    const brand = brands[0];
    signals.push({
      label: `Mengaku dari ${brand} tapi nomornya ponsel biasa, bukan kanal resmi`,
      weight: 0.55,
      evidence: mobile[0],
      agent: "identity",
    });
  }

  if (brands.length > 0 && foreign.length > 0) {
    const brand = brands[0];
    signals.push({
      label: `Nomor asing mengaku dari ${brand} — institusi Indonesia tidak menelepon dari nomor luar`,
      weight: 0.6,
      evidence: foreign[0],
      agent: "identity",
    });
  }

  if (brands.length > 0 && shortcode) {
    signals.push({
      label: `Nomor singkat ${shortcode[1]} mengaku dari ${brands[0]} — cocokkan dengan nomor resmi di belakang kartu`,
      weight: 0.5,
      evidence: shortcode[0],
      agent: "identity",
    });
  }

  if (FORWARD.test(text)) {
    signals.push({
      label: "Pesan diteruskan berantai — pengirim aslinya tidak bisa dipastikan",
      weight: 0.25,
      evidence: text.match(FORWARD)?.[0] ?? "Diteruskan",
      agent: "identity",
    });
  }

  const inspected = mobile.length + foreign.length + (shortcode ? 1 : 0);
  return {
    signals,
    note: inspected === 0 ? "Tidak ada nomor untuk diperiksa." : undefined,
  };
}
```

- [ ] **Step 4: Insert the detector into the pipeline**

In `src/lib/scoring/score.ts`, add the import and insert an entry between `link` and `conversation`:

```ts
import { identitySignals } from "@/lib/scoring/identity";
```

```ts
  {
    id: "identity",
    run: ({ text }) => identitySignals(text),
  },
```

Update `src/lib/scoring/trace.test.ts` stage-order expectation to:

```ts
expect(ids).toEqual(["message", "link", "identity", "conversation", "scoring"]);
```

- [ ] **Step 5: Run the tests and the bench**

Run: `npx jest src/lib/scoring --silent=false`
Expected: PASS. The bench summary must still read `20/20` recall and `0/23` false positives. If a legitimate message now scores `mencurigakan`, tighten `claimsInstitution` (the claim phrase is the gate) rather than lowering the weight.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scoring/identity.ts src/lib/scoring/identity.test.ts src/lib/scoring/score.ts src/lib/scoring/trace.test.ts
git commit -m "feat(scoring): Identity Agent reads the sender, not the message

Three real offline rules: an institution claim carried by an ordinary mobile,
a foreign number claiming an Indonesian institution, and a shortcode claiming a
bank. Plus a forward marker at 0.25, which is context rather than proof.

Every rule is gated on a claim phrase adjacent to the number, so 'BCA:
transaksi Rp250.000' stays silent. SPF/DKIM/DMARC is deliberately not claimed:
a pasted message never carries mail headers."
```

---

## Task 4: Link Agent — punycode, credential paths, brand subdomains

**Files:**
- Modify: `src/lib/scoring/link.ts`
- Test: `src/lib/scoring/link.test.ts`

**Interfaces:**
- Produces: three new `LinkFinding["kind"]` members; `linkSignals` grows three labels. Signature unchanged.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/scoring/link.test.ts`:

```ts
describe("Link Agent — structural additions", () => {
  it("flags a punycode host", () => {
    const [signal] = linkSignals("Buka https://xn--bca-verif-9db.xyz/masuk");
    expect(signal?.label).toMatch(/punycode|aksara/i);
  });

  it("flags a credential path on a non-official host", () => {
    const [signal] = linkSignals("Login di https://aman-sekali.xyz/verifikasi?token=1");
    expect(signal?.label).toMatch(/login|verifikasi|kredensial/i);
  });

  it("flags a brand smuggled into a subdomain", () => {
    const [signal] = linkSignals("Cek https://bca.klik-verifikasi.xyz");
    expect(signal?.label).toMatch(/BCA/);
  });

  it("still resolves official domains before any of the above", () => {
    expect(linkSignals("Buka https://ib.bri.co.id/login")).toEqual([]);
  });

  it("does not fire a credential path on an ordinary official page", () => {
    expect(linkSignals("https://www.tokopedia.com/login")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/lib/scoring/link.test.ts --silent=false`
Expected: FAIL on the three new cases

- [ ] **Step 3: Extend the kind union and weights**

In `src/lib/scoring/link.ts`:

```ts
export interface LinkFinding {
  link: ParsedLink;
  kind:
    | "official"
    | "shortener"
    | "typosquat"
    | "risky-tld"
    | "apk-host"
    | "punycode"
    | "credential-path"
    | "brand-subdomain"
    | "unknown";
  /** Brand being imitated, when `kind === "typosquat"` or "brand-subdomain". */
  imitates?: string;
  weight: number;
}

const WEIGHTS: Record<LinkFinding["kind"], number> = {
  official: 0,
  unknown: 0.1,
  "credential-path": 0.5,
  "risky-tld": 0.45,
  shortener: 0.55,
  "brand-subdomain": 0.6,
  punycode: 0.6,
  "apk-host": 0.7,
  typosquat: 0.85,
};
```

- [ ] **Step 4: Add the three checks, in this order**

Inside `classifyLink`, immediately after the `OFFICIAL_SET` early return and **before** the typosquat loop:

```ts
  // Structural hints that do not depend on the SLD. Each is checked before
  // typosquat so its more specific label wins: `bca.klik-verifikasi.xyz` is
  // a brand smuggled into a subdomain, not a misspelling of `klikverifikasi`.
  if (link.host.includes("xn--") || /[\u0400-\u04FF]/.test(link.host)) {
    return { link, kind: "punycode", weight: WEIGHTS.punycode };
  }

  const subdomainHit = brandInSubdomain(link);
  if (subdomainHit) {
    return {
      link,
      kind: "brand-subdomain",
      imitates: subdomainHit,
      weight: WEIGHTS["brand-subdomain"],
    };
  }

  if (CREDENTIAL_PATH.test(pathOf(link.raw))) {
    return { link, kind: "credential-path", weight: WEIGHTS["credential-path"] };
  }
```

Add the helpers near the other private helpers:

```ts
/** Path plus query, without scheme or host. */
function pathOf(raw: string): string {
  const withoutScheme = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const slash = withoutScheme.indexOf("/");
  return slash === -1 ? "" : withoutScheme.slice(slash);
}

/**
 * "login" on a host that is not official is where a credential gets stolen.
 * A plain marketing URL (`/produk`) never matches.
 */
const CREDENTIAL_PATH =
  /(?:^|[/?&#=])(?:login|masuk|verifikasi|verify|validasi|otp|pin|password|sandi|token|aktivasi|aktifkan|pulihkan|reset|konfirmasi)\b/i;

/**
 * A brand used as a *label* of a host that is not the brand's own domain.
 *
 * Matching is on label boundaries, not substrings: `undangan-nikah.apk` must
 * never look like an imitation, so `nikah` is compared as a whole label rather
 * than searched inside the hostname.
 */
function brandInSubdomain(link: ParsedLink): string | null {
  const labels = link.host.split(".").map((label) => label.toLowerCase());
  const registrableLabels = link.registrable.split(".").length;
  const subdomain = labels.slice(0, Math.max(0, labels.length - registrableLabels));

  for (const official of OFFICIAL) {
    const brand = normalizeSld(official.brand);
    if (brand.length < 3) continue;
    for (const label of subdomain) {
      for (const token of label.split("-")) {
        if (token === brand) return official.brand;
      }
    }
  }
  return null;
}
```

The credential-path check must not fire on official hosts — that is already guaranteed because `OFFICIAL_SET.has(link.registrable)` returns earlier.

- [ ] **Step 5: Add labels for the new kinds in `linkSignals`**

Extend the ternary chain in `linkSignals`:

```ts
  const label =
    kind === "typosquat"
      ? `Domain meniru ${imitates} — "${link.host}" bukan situs resmi`
      : kind === "brand-subdomain"
        ? `Merek ${imitates} dipakai di subdomain — "${link.host}" bukan situs resmi`
        : kind === "punycode"
          ? `Alamat memakai aksara atau punycode untuk menyamarkan nama — "${link.host}"`
          : kind === "credential-path"
            ? "Tautan membuka halaman login/verifikasi di domain yang bukan milik layanan resmi"
            : kind === "shortener"
              ? "Tautan pendek menyembunyikan tujuan sebenarnya"
              : kind === "apk-host"
                ? "Alamat tautan menjual/mengirim APK, bukan aplikasi resmi"
                : kind === "risky-tld"
                  ? `Domain berekstensi ".${link.tld}" yang sering dipakai penipuan`
                  : `Tautan tidak ada di daftar domain resmi: "${link.host}"`;
```

- [ ] **Step 6: Run the tests and the bench**

Run: `npx jest src/lib/scoring --silent=false`
Expected: PASS, bench still `20/20` and `0/23`. The `credential-path` rule is the one most likely to leak a false positive; if it does, require a `token=`, `otp`, or `verifikasi` token in the query rather than a bare `/login`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/scoring/link.ts src/lib/scoring/link.test.ts
git commit -m "feat(scoring): Link Agent reads structure, not just spelling

Three additions, all offline: punycode/script-mixing hosts, credential paths on
non-official domains, and a brand used as a subdomain label. Matching is on
label boundaries so 'undangan-nikah.apk' still cannot look like an imitation.

Official domains still resolve first, so ib.bri.co.id/login stays clean."
```

---

## Task 5: Conversation Agent — ordered escalation

**Files:**
- Modify: `src/lib/scoring/conversation.ts`
- Modify: `src/lib/scoring/score.ts` (pass `turns` to the detector)
- Test: `src/lib/scoring/conversation.test.ts`

**Interfaces:**
- Consumes: `ScoredTurn` from `@/lib/scoring/score`
- Produces: `conversationSignals({ text, turns })` — replaces the single-argument signature from Task 2. `score.ts` must be updated in the same commit.

- [ ] **Step 1: Write the failing test**

Create `src/lib/scoring/conversation.test.ts`:

```ts
import { describe, expect, it } from "@jest/globals";
import { conversationSignals } from "@/lib/scoring/conversation";

const turn = (text: string) => ({ text });

describe("Conversation Agent — escalation", () => {
  it("fires when an approach is followed by a demand", () => {
    const { signals } = conversationSignals({
      turns: [turn("Halo kak, ada lowongan tugas online, bayarannya besar lho.")],
      text: "Untuk mencairkan komisi, transfer dulu biaya admin Rp250.000.",
    });
    expect(signals.map((s) => s.label).join(" ")).toMatch(/bertahap/i);
  });

  it("fires when a demand is followed by urgency", () => {
    const { signals } = conversationSignals({
      turns: [turn("Silakan transfer DP Rp500.000 ke rekening 1234567890.")],
      text: "Harus sekarang ya, sebelum pukul 15.00, kalau tidak pesanan dibatalkan.",
    });
    expect(signals.map((s) => s.label).join(" ")).toMatch(/bertahap/i);
  });

  it("stays silent for two benign turns", () => {
    const { signals } = conversationSignals({
      turns: [turn("Halo, pesanan saya kapan dikirim?")],
      text: "Terima kasih sudah menunggu, paketnya sampai besok ya.",
    });
    expect(signals).toEqual([]);
  });

  it("stays silent on a single turn and says why", () => {
    const result = conversationSignals({
      turns: [],
      text: "Transfer biaya admin sekarang juga.",
    });
    expect(result.signals).toEqual([]);
    expect(result.note).toMatch(/pesan kedua/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/lib/scoring/conversation.test.ts --silent=false`
Expected: FAIL — the function takes one argument, so `turns` is ignored and no escalation signal exists.

- [ ] **Step 3: Write the implementation**

Replace the exported function in `src/lib/scoring/conversation.ts`:

```ts
export interface ConversationInput {
  text: string;
  turns: readonly { text: string }[];
}

export interface ConversationResult {
  signals: Signal[];
  note?: string;
}

/**
 * A single message has a shape; a *conversation* has a direction.
 *
 * The proposal promises "tahap eskalasi", which is a property of a sequence,
 * not of a message. Four stages, in the order a real scam walks through them:
 *
 *   approach  → an offer, an introduction, a prize
 *   trust     → a claim of authority or legitimacy
 *   demand    → money, a transfer, a code
 *   urgency   → a deadline, a threat to close
 *
 * The rule only fires when the *earlier* stage is in a previous turn and the
 * current turn has moved on to a later one. That is what makes it evidence of
 * staging rather than of vocabulary.
 */
const STAGE_PATTERNS = [
  {
    stage: "approach",
    pattern:
      /\b(?:kenalan|perkenalkan|lowongan|tugas|investasi|selamat|menang|hadiah|undian|kak|gan)\b/i,
  },
  {
    stage: "trust",
    pattern:
      /\b(?:saya dari|kami dari|pihak resmi|cs resmi|admin resmi|terdaftar|legal|berizin|ojk|bappebti)\b/i,
  },
  {
    stage: "demand",
    pattern:
      /\b(?:transfer|top\s*up|topup|setor|biaya|bayar|kirim uang|rekening|kode otp|otp)\b/i,
  },
  {
    stage: "urgency",
    pattern:
      /\b(?:sekarang|hari ini|sebelum|batas waktu|jam \d|blokir|diblokir|ditutup|dibatalkan|segera)\b/i,
  },
] as const;

type StageName = (typeof STAGE_PATTERNS)[number]["stage"];

function stagesIn(text: string): StageName[] {
  return STAGE_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(
    ({ stage }) => stage,
  );
}

export function conversationSignals({
  text,
  turns,
}: ConversationInput): ConversationResult {
  const combo = combinationSignal(detectMessage(text));
  const signals: Signal[] = combo ? [combo] : [];

  if (turns.length === 0) {
    return {
      signals,
      note: "Butuh pesan kedua untuk menilai tahapan.",
    };
  }

  const current = stagesIn(text);
  const earlier = turns.flatMap((previous) => stagesIn(previous.text));

  const demandNow = current.includes("demand");
  const urgencyNow = current.includes("urgency");

  const staged =
    (demandNow && (earlier.includes("approach") || earlier.includes("trust"))) ||
    (urgencyNow && earlier.includes("demand"));

  if (staged) {
    signals.push({
      label:
        "Pola bicara bertahap: percakapan dibangun dulu, permintaan uang menyusul — ini ciri penipuan terencana",
      weight: 0.5,
      evidence: text.slice(0, 80),
      agent: "conversation",
    });
  }

  return { signals };
}
```

- [ ] **Step 4: Update the caller**

In `src/lib/scoring/score.ts`, change the conversation detector to:

```ts
  {
    id: "conversation",
    run: ({ text, turns }) => conversationSignals({ text, turns }),
  },
```

- [ ] **Step 5: Run the tests and the bench**

Run: `npx jest src/lib/scoring --silent=false`
Expected: PASS. The bench calls `scoreText({ text })` with no turns, so escalation can never fire there — recall must stay `20/20` and false positives `0/23`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scoring/conversation.ts src/lib/scoring/conversation.test.ts src/lib/scoring/score.ts
git commit -m "feat(scoring): Conversation Agent reads escalation across turns

The proposal promises 'tahap eskalasi', which is a property of a sequence. A
signal now fires only when a previous turn was at an earlier stage (approach or
trust) and the current turn moves to a demand, or a demand is followed by
urgency. Two benign turns stay silent, and a single turn reports why."
```

---

## Task 6: Voice route

**Files:**
- Create: `src/lib/companion/voice-stream.ts`
- Create: `src/lib/companion/voice-stream.test.ts`
- Create: `src/app/api/companion/voice/route.ts`
- Create: `src/app/api/companion/voice/route.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `VoiceDigestSchema`, `VoiceDigest` from Task 1
- Produces: `streamChatText(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array>`; `POST(request: Request): Promise<Response>`

- [ ] **Step 1: Write the failing test for the SSE transform**

Create `src/lib/companion/voice-stream.test.ts`:

```ts
import { describe, expect, it } from "@jest/globals";
import { streamChatText } from "@/lib/companion/voice-stream";

const encoder = new TextEncoder();

function chunked(...parts: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part));
      controller.close();
    },
  });
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

describe("streamChatText", () => {
  it("flattens chat-completion SSE into plain text", async () => {
    const upstream = chunked(
      'data: {"choices":[{"delta":{"content":"Jangan "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"transfer."}}]}\n\n',
      "data: [DONE]\n\n",
    );
    expect(await drain(streamChatText(upstream))).toBe("Jangan transfer.");
  });

  it("survives a chunk split mid-JSON", async () => {
    const upstream = chunked(
      'data: {"choices":[{"delta":{"cont',
      'ent":"Aman."}}]}\n\n',
      "data: [DONE]\n\n",
    );
    expect(await drain(streamChatText(upstream))).toBe("Aman.");
  });

  it("ignores keep-alive comments and empty deltas", async () => {
    const upstream = chunked(
      ": ping\n\n",
      'data: {"choices":[{"delta":{}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"Halo"}}]}\n\n',
    );
    expect(await drain(streamChatText(upstream))).toBe("Halo");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/lib/companion/voice-stream.test.ts --silent=false`
Expected: FAIL — module not found

- [ ] **Step 3: Write the transform**

Create `src/lib/companion/voice-stream.ts`:

```ts
/**
 * Turn an OpenAI-compatible SSE stream into a plain-text stream.
 *
 * Kept out of the route so it can be tested without Next, and so the route stays
 * a thin validation layer. Two things this must survive, because both happened
 * while testing against a real endpoint: a JSON object split across two network
 * chunks, and keep-alive comment lines (`: ping`) that carry no data.
 */
export function streamChatText(
  upstream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = upstream.getReader();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });

        // Events are separated by a blank line. Keep the trailing partial.
        const boundary = buffer.lastIndexOf("\n\n");
        if (boundary === -1) continue;
        const events = buffer.slice(0, boundary).split("\n\n");
        buffer = buffer.slice(boundary + 2);

        let out = "";
        for (const event of events) {
          for (const line of event.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload) as {
                choices?: { delta?: { content?: string } }[];
              };
              out += parsed.choices?.[0]?.delta?.content ?? "";
            } catch {
              // A malformed event is skipped, not fatal: the reply still reads.
            }
          }
        }

        if (out.length > 0) {
          controller.enqueue(encoder.encode(out));
          return;
        }
      }
    },
    cancel(reason) {
      void reader.cancel(reason);
    },
  });
}
```

- [ ] **Step 4: Run the transform test**

Run: `npx jest src/lib/companion/voice-stream.test.ts --silent=false`
Expected: PASS, 3 tests

- [ ] **Step 5: Write the failing route test**

Create `src/app/api/companion/voice/route.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { POST } from "@/app/api/companion/voice/route";

const digest = {
  risk: "tinggi" as const,
  score: 82,
  modusName: "File APK via WhatsApp",
  findings: [{ label: "Pesan meminta kamu membuka file APK", weight: 0.85 }],
  advice: ["Jangan instal file APK itu."],
  moduleNo: 10,
  locale: "id" as const,
};

const original = { ...process.env };

beforeEach(() => {
  process.env.LUMINA_LLM_URL = "http://127.0.0.1:9/v1";
  process.env.LUMINA_LLM_MODEL = "test-model";
});

afterEach(() => {
  process.env = { ...original };
  jest.restoreAllMocks();
});

function request(body: unknown): Request {
  return new Request("http://localhost/api/companion/voice", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/companion/voice", () => {
  it("returns 400 for a payload carrying the raw message", async () => {
    const response = await POST(request({ ...digest, text: "isi pesan" }));
    expect(response.status).toBe(400);
  });

  it("returns 503 when no endpoint is configured", async () => {
    delete process.env.LUMINA_LLM_URL;
    delete process.env.LUMINA_LLM_MODEL;
    const response = await POST(request(digest));
    expect(response.status).toBe(503);
  });

  it("streams prose when the endpoint answers", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        'data: {"choices":[{"delta":{"content":"Jangan instal APK itu."}}]}\n\n' +
          "data: [DONE]\n\n",
        { status: 200, headers: { "content-type": "text/event-stream" } },
      ),
    );

    const response = await POST(request(digest));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Jangan instal APK itu.");
  });

  it("returns 503 when the endpoint fails", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("nope", { status: 500 }));
    const response = await POST(request(digest));
    expect(response.status).toBe(503);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx jest src/app/api/companion/voice --silent=false`
Expected: FAIL — module not found

- [ ] **Step 7: Write the route**

Create `src/app/api/companion/voice/route.ts`:

```ts
import { streamChatText } from "@/lib/companion/voice-stream";
import { VoiceDigestSchema } from "@/lib/contracts/agent-run";

/**
 * The language layer.
 *
 * It receives findings, never the message. `VoiceDigestSchema` has no field for
 * a quote, and `.strict()` rejects a request that carries one, so the privacy
 * promise in plan §11.6a is enforced here rather than trusted.
 *
 * Any OpenAI-compatible endpoint works, configured entirely by environment.
 * Unset, failing, or slow means 503 and the client falls back to
 * `composeReply()` — plan §3c: the demo must not depend on a live third party.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 6000;

/** Plan §3b: the model chooses sentences, never findings. */
const SYSTEM = [
  "Kamu adalah Lumina, pendamping yang membantu orang Indonesia memeriksa pesan yang mencurigakan.",
  "Kamu menerima HASIL PEMERIKSAAN, bukan isi pesan pengguna. Jangan pernah mengaku membaca pesannya.",
  "Aturan:",
  "a. Bahasa Indonesia, tenang, tidak menghakimi. Jangan pernah menyalahkan korban.",
  "b. Sebutkan temuan terkuat dengan kalimatnya sendiri.",
  "c. Jangan menambah temuan yang tidak ada di daftar. Jangan menyebut sesuatu aman melebihi temuan.",
  "d. Maksimal tiga kalimat. Tanpa salam pembuka, tanpa markdown, tanpa daftar bernomor.",
  "e. Kalau risikonya tinggi, sarankan berhenti bertindak dan membuka mode darurat.",
].join("\n");

function fail(status: number, error: string) {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = VoiceDigestSchema.safeParse(body);
  if (!parsed.success) return fail(400, "invalid-digest");

  const base = process.env.LUMINA_LLM_URL?.trim();
  const model = process.env.LUMINA_LLM_MODEL?.trim();
  if (!base || !model) return fail(503, "not-configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
          stream: true,
          temperature: 0.3,
          max_tokens: 220,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: JSON.stringify(parsed.data) },
          ],
        }),
      },
    );

    if (!upstream.ok || !upstream.body) return fail(503, "upstream-failed");

    return new Response(streamChatText(upstream.body), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return fail(503, "upstream-unreachable");
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 8: Document the variables**

Append to `.env.example`:

```
# Optional language layer. Any OpenAI-compatible endpoint. When unset the chat
# falls back to src/lib/companion/reply.ts and never makes a network call.
# Only the signal digest is sent — never the user's message (plan 11.6a).
LUMINA_LLM_URL=
LUMINA_LLM_MODEL=
LUMINA_LLM_KEY=
```

- [ ] **Step 9: Run the tests**

Run: `npx jest src/app/api/companion/voice src/lib/companion --silent=false`
Expected: PASS, 7 tests

- [ ] **Step 10: Commit**

```bash
git add src/lib/companion/voice-stream.ts src/lib/companion/voice-stream.test.ts \
        src/app/api/companion/voice/route.ts src/app/api/companion/voice/route.test.ts .env.example
git commit -m "feat(companion): optional language layer behind an env-gated route

The route takes a VoiceDigest and returns prose. It cannot receive the user's
message: the schema has no field for a quote and .strict() rejects an extra key,
so plan 11.6a is enforced rather than trusted.

Unset, failing, or slower than 6s returns 503 and the client falls back to the
template voice, because the demo must not depend on a live third party.

The SSE flattener is its own module and is tested against a JSON object split
across two chunks and keep-alive comment lines, both of which a real endpoint
produced."
```

---

## Task 7: Trace card

**Files:**
- Create: `src/components/companion/agent-trace.tsx`
- Create: `src/components/companion/agent-trace.test.tsx`

**Interfaces:**
- Consumes: `AgentTrace`, `AgentStage` from Task 1
- Produces: `<AgentTraceCard trace={…} streaming={…} defaultOpen={…} />`

- [ ] **Step 1: Write the failing test**

Create `src/components/companion/agent-trace.test.tsx`:

```tsx
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentTraceCard } from "@/components/companion/agent-trace";
import type { AgentTrace } from "@/lib/contracts/agent-run";

const trace: AgentTrace = {
  totalMs: 0.42,
  stages: [
    {
      id: "message",
      label: "Message Agent",
      task: "Urgensi palsu, otoritas, iming-iming",
      status: "temuan",
      findings: 2,
      ms: 0.11,
    },
    {
      id: "link",
      label: "Link Agent",
      task: "Domain mirip merek resmi",
      status: "dilewati",
      findings: 0,
      ms: 0.02,
      note: "Tidak ada tautan pada pesan ini.",
    },
    {
      id: "voice",
      label: "Penyusun bahasa",
      task: "Menulis jawaban dari temuan",
      status: "berjalan",
      findings: 0,
      ms: 0,
    },
  ],
};

describe("AgentTraceCard", () => {
  it("summarises the run in the header", () => {
    render(<AgentTraceCard trace={trace} />);
    expect(screen.getByText(/3 pemeriksaan/i)).toBeInTheDocument();
    expect(screen.getByText(/0,4 ms/)).toBeInTheDocument();
  });

  it("lists every stage once opened", async () => {
    const user = userEvent.setup();
    render(<AgentTraceCard trace={trace} />);
    await user.click(screen.getByRole("button", { name: /lihat tahapan/i }));
    expect(screen.getByText("Message Agent")).toBeInTheDocument();
    expect(screen.getByText("Link Agent")).toBeInTheDocument();
    expect(screen.getByText(/Tidak ada tautan pada pesan ini/)).toBeInTheDocument();
  });

  it("marks the stage that is still running", async () => {
    const user = userEvent.setup();
    render(<AgentTraceCard trace={trace} />);
    await user.click(screen.getByRole("button", { name: /lihat tahapan/i }));
    expect(screen.getByText("Penyusun bahasa").closest("li")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/components/companion/agent-trace --silent=false`
Expected: FAIL — module not found

- [ ] **Step 3: Write the component**

Create `src/components/companion/agent-trace.tsx`:

```tsx
"use client";

import { Check, ChevronRight, MinusCircle, Search } from "lucide-react";
import * as React from "react";
import type { AgentStage, AgentTrace } from "@/lib/contracts/agent-run";
import { cn } from "@/lib/utils";

/**
 * The trace card — what the agents actually did, in the order they did it.
 *
 * Shell extracted from the reference's `ToolRunSummary.vue`: 30px minimum
 * height, 4px/8px padding, 1px border at 9% ink, 8px radius, 11px text, a 7px
 * gap, an 11px chevron that rotates 90° when open, and a 13px leading icon.
 * The body reveals with the reference's `grid-template-rows: 0fr → 1fr` at
 * 220ms `cubic-bezier(0.22, 1, 0.36, 1)`.
 *
 * The step glyphs are extracted from `TaskPlanCard.vue`: ✓ done, ◉ running,
 * ○ pending. Deliberate divergence: this product prints the measured
 * milliseconds beside each stage, because the detectors genuinely finish in
 * fractions of a millisecond and pretending otherwise is the defect this
 * component exists to remove.
 */

const MS = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function Glyph({ status }: { status: AgentStage["status"] }) {
  if (status === "temuan" || status === "selesai") {
    return <Check aria-hidden strokeWidth={2.2} className="size-3.5 text-safe" />;
  }
  if (status === "dilewati") {
    return <MinusCircle aria-hidden strokeWidth={1.8} className="size-3.5 text-dim" />;
  }
  if (status === "gagal") {
    return <MinusCircle aria-hidden strokeWidth={1.8} className="size-3.5 text-danger" />;
  }
  return <Circle aria-hidden className="size-3.5" />;
}

export function AgentTraceCard({
  trace,
  defaultOpen = false,
  className,
}: {
  trace: AgentTrace;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const running = trace.stages.some((stage) => stage.status === "berjalan");
  const findings = trace.stages.reduce((sum, stage) => sum + stage.findings, 0);

  return (
    <section
      className={cn(
        "w-full max-w-[520px] min-w-0 rounded-[8px] border border-txt/9 bg-panel-2/40",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Sembunyikan tahapan" : "Lihat tahapan"}
        className="flex min-h-[30px] w-full items-center gap-[7px] rounded-[8px] px-2 py-1 text-left text-[11px] text-dim transition-colors duration-150 hover:bg-txt/6"
      >
        <ChevronRight
          aria-hidden
          strokeWidth={2}
          className={cn(
            "size-[11px] shrink-0 transition-transform duration-150",
            open && "rotate-90",
          )}
        />
        <Search aria-hidden strokeWidth={1.5} className="size-[13px] shrink-0 text-txt/70" />
        <span className="shrink-0 font-medium text-txt/75">
          {trace.stages.length} pemeriksaan
        </span>
        <span className="min-w-0 truncate">
          {findings > 0 ? `${findings} temuan` : "tidak ada temuan"}
        </span>
        {running ? (
          <span aria-hidden className="ms-auto shrink-0 tracking-[0.15em]">
            •••
          </span>
        ) : (
          <Check aria-hidden strokeWidth={2.2} className="ms-auto size-3.5 shrink-0 text-safe" />
        )}
        <span className="tabular shrink-0 text-txt/55">
          {MS.format(trace.totalMs)} ms
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="flex flex-col gap-1 px-2 pt-1 pb-2">
            {trace.stages.map((stage, index) => (
              <li
                key={stage.id}
                aria-busy={stage.status === "berjalan" ? true : undefined}
                className="flex items-start gap-2 rounded-[5px] py-1"
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <span className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center">
                  <Glyph status={stage.status} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] text-txt leading-tight">
                    {stage.label}
                  </span>
                  <span className="block text-[11px] text-dim leading-snug">
                    {stage.note ?? stage.task}
                  </span>
                </span>
                <span className="tabular shrink-0 pt-0.5 text-[10px] text-txt/45">
                  {stage.status === "berjalan" ? "…" : `${MS.format(stage.ms)} ms`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
```

`Circle` is imported from `lucide-react`; add it to the import list.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/components/companion/agent-trace --silent=false`
Expected: PASS, 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/companion/agent-trace.tsx src/components/companion/agent-trace.test.tsx
git commit -m "feat(companion): trace card, extracted from the reference's tool summary

Shell from ToolRunSummary.vue (30px header, 4/8 padding, 9% ink border, 8px
radius, 11px text, 11px chevron rotating 90°) and glyphs from TaskPlanCard.vue
(✓ ◉ ○). The body reveals with the reference's 0fr→1fr 220ms curve.

One deliberate divergence: the measured milliseconds are printed per stage. The
detectors finish in fractions of a millisecond and the card says so."
```

---

## Task 8: Thinking row

**Files:**
- Create: `src/components/companion/thinking-row.tsx`
- Create: `src/components/companion/thinking-row.test.tsx`

**Interfaces:**
- Produces: `<ThinkingRow label=… startedAt=… />` — renders nothing when `startedAt` is null.

- [ ] **Step 1: Write the failing test**

Create `src/components/companion/thinking-row.test.tsx`:

```tsx
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { ThinkingRow } from "@/components/companion/thinking-row";

describe("ThinkingRow", () => {
  it("names what is happening and how long it has taken", () => {
    render(<ThinkingRow label="Menyusun jawaban" startedAt={Date.now()} />);
    expect(screen.getByText("Menyusun jawaban")).toBeInTheDocument();
    expect(screen.getByText(/detik/)).toBeInTheDocument();
  });

  it("renders nothing when the model is not running", () => {
    const { container } = render(<ThinkingRow label="Menyusun jawaban" startedAt={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/components/companion/thinking-row --silent=false`
Expected: FAIL — module not found

- [ ] **Step 3: Write the component**

Create `src/components/companion/thinking-row.tsx`:

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Streaming indicator, extracted from the reference's `LiveReasoningStatus.vue`:
 * a 40px avatar on an `md` radius, a 10px gap, a 15px/600 label carrying the
 * reference's own 300% / 2.2s shimmer, and the elapsed time beside it.
 *
 * The shimmer runs in ink rather than an accent colour. On a surface where
 * colour means risk, a coloured shimmer reads as a warning rather than as work.
 *
 * This is the only genuinely in-flight state in the product, and it is honest
 * about being a wait: the counter starts when the request leaves.
 */
export function ThinkingRow({
  label,
  startedAt,
}: {
  label: string;
  /** Milliseconds since epoch, or null when nothing is running. */
  startedAt: number | null;
}) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (startedAt === null) {
      setElapsed(0);
      return;
    }
    setElapsed(Date.now() - startedAt);
    const timer = window.setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  if (startedAt === null) return null;

  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-[6px] bg-panel-2 font-semibold text-[13px] text-txt"
      >
        L
      </span>
      <p className="flex items-baseline gap-2">
        <span
          className={cn(
            "bg-clip-text font-semibold text-[15px] text-transparent",
            "bg-[linear-gradient(105deg,var(--lumina-dim)_0%,var(--lumina-dim)_39%,var(--lumina-txt)_48%,var(--lumina-txt)_52%,var(--lumina-dim)_61%,var(--lumina-dim)_100%)]",
            "bg-[length:300%_100%] motion-safe:animate-[thinking-shimmer_2.2s_linear_infinite]",
            "motion-reduce:bg-none motion-reduce:text-dim",
          )}
        >
          {label}
        </span>
        <span className="tabular text-[11px] text-dim">
          {(elapsed / 1000).toFixed(1)} detik
        </span>
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Add the keyframes**

In `src/app/globals.css`, after the `@theme inline` block, add:

```css
@keyframes thinking-shimmer {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: 0% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  @keyframes thinking-shimmer {
    from,
    to {
      background-position: 50% 0;
    }
  }
}
```

- [ ] **Step 5: Run the test**

Run: `npx jest src/components/companion/thinking-row --silent=false`
Expected: PASS, 2 tests

- [ ] **Step 6: Commit**

```bash
git add src/components/companion/thinking-row.tsx src/components/companion/thinking-row.test.tsx src/app/globals.css
git commit -m "feat(companion): streaming indicator with the reference's shimmer

Extracted from LiveReasoningStatus.vue: 40px avatar, 10px gap, 15px/600 label,
300%/2.2s shimmer, elapsed time beside it. The shimmer is ink rather than an
accent, because on a surface where colour means risk a coloured shimmer reads as
a warning. Frozen at 60% under prefers-reduced-motion."
```

---

## Task 9: Wire the pipeline into the chat

**Files:**
- Create: `src/components/companion/voice-client.ts`
- Create: `src/components/companion/voice-client.test.ts`
- Modify: `src/components/companion/companion-chat.tsx`

**Interfaces:**
- Consumes: `scoreWithTrace` (Task 2), `voiceDigest` (Task 1), `AgentTrace` (Task 1)
- Produces: `requestReply(digest, onChunk, signal?)` → `Promise<boolean>`

- [ ] **Step 1: Write the failing test for the client**

Create `src/components/companion/voice-client.test.ts`:

```ts
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { requestReply } from "@/components/companion/voice-client";
import type { VoiceDigest } from "@/lib/contracts/agent-run";

const digest: VoiceDigest = {
  risk: "tinggi",
  score: 82,
  modusName: "File APK via WhatsApp",
  findings: [{ label: "Meminta membuka file APK", weight: 0.85 }],
  advice: ["Jangan instal file APK itu."],
  moduleNo: 10,
  locale: "id",
};

afterEach(() => jest.restoreAllMocks());

describe("requestReply", () => {
  it("reports failure without throwing when the route is absent", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("offline"));
    const chunks: string[] = [];
    await expect(
      requestReply(digest, (chunk) => chunks.push(chunk)),
    ).resolves.toBe(false);
  });

  it("reports failure on a 503", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("", { status: 503 }));
    await expect(requestReply(digest, () => {})).resolves.toBe(false);
  });

  it("delivers chunks in order", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("Jangan "));
        controller.enqueue(new TextEncoder().encode("transfer."));
        controller.close();
      },
    });
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(stream, { status: 200 }));

    const chunks: string[] = [];
    await expect(
      requestReply(digest, (chunk) => chunks.push(chunk)),
    ).resolves.toBe(true);
    expect(chunks.join("")).toBe("Jangan transfer.");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/components/companion/voice-client --silent=false`
Expected: FAIL — module not found

- [ ] **Step 3: Write the client**

Create `src/components/companion/voice-client.ts`:

```ts
import type { VoiceDigest } from "@/lib/contracts/agent-run";

/**
 * Browser side of the language layer.
 *
 * Returns `false` rather than throwing on every failure path, because the caller
 * has a real fallback (`composeReply`) and a rejected promise here would take
 * the whole turn down for a cosmetic reason.
 */
export async function requestReply(
  digest: VoiceDigest,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const response = await fetch("/api/companion/voice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(digest),
      signal,
    });

    if (!response.ok || !response.body) return false;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let received = false;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (text.length === 0) continue;
      received = true;
      onChunk(text);
    }

    return received;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Replace the chat's send handler**

In `src/components/companion/companion-chat.tsx`:

a. Add imports:

```ts
import { AgentTraceCard } from "@/components/companion/agent-trace";
import { ThinkingRow } from "@/components/companion/thinking-row";
import { requestReply } from "@/components/companion/voice-client";
import type { AgentTrace } from "@/lib/contracts/agent-run";
import { voiceDigest } from "@/lib/contracts/agent-run";
import { scoreWithTrace } from "@/lib/scoring/score";
```

Remove `import { scoreText } from "@/lib/scoring/score";`.

b. Extend `Turn`:

```ts
interface Turn {
  id: number;
  role: "user" | "companion";
  text: string;
  at?: string;
  result?: ScoreResult;
  source?: string;
  attachments?: Attachment[];
  /** What the pipeline did for this turn. */
  trace?: AgentTrace;
  /** True while the language layer is still writing. */
  streaming?: boolean;
}
```

c. Replace the body of `send` from `const scored = …` through the `window.setTimeout(…)` block with:

```ts
      const scored = scoringTextWithAttachments(text, attachments);
      const hasContent = !isGreeting(scored);

      // Stamped here, never during render: Next 16 fails the prerender of a
      // client component that reads the clock while rendering.
      const stamp = new Date().toISOString();
      const userTurn: Turn = {
        id: id(),
        role: "user",
        text,
        attachments,
        at: stamp,
      };

      const target = activeId;
      if (target === undefined) return;

      const priorTurns = (active?.turns ?? [])
        .filter((turn) => turn.role === "user" && turn.text.trim().length > 0)
        .map((turn) => ({ text: turn.text }));

      const { result, trace } = hasContent
        ? scoreWithTrace({ text: scored, turns: priorTurns })
        : { result: null, trace: null };

      const evidenceStarted = performance.now();
      const evidence = result
        ? buildEvidenceBundle([
            { text: scored, at: stamp, result },
          ])
        : null;
      const evidenceMs = performance.now() - evidenceStarted;

      const stages = trace
        ? [
            ...trace.stages,
            {
              id: "evidence" as const,
              label: "Evidence Agent",
              task: "Menyusun kutipan, nominal, dan kontak untuk laporan",
              status: (evidence?.artifacts.length ?? 0) > 0
                ? ("temuan" as const)
                : ("selesai" as const),
              findings: evidence?.artifacts.length ?? 0,
              ms: evidenceMs,
            },
          ]
        : [];

      const companionId = id();
      setBusy(true);
      setThinking(true);
      setSessions((prev) =>
        prev.map((session) =>
          session.id === target
            ? {
                ...session,
                title:
                  session.turns.length <= 1
                    ? titleFor(text, attachments)
                    : session.title,
                time: stamp.slice(11, 16),
                risk: result?.risk ?? session.risk,
                turns: [
                  ...session.turns,
                  userTurn,
                  {
                    id: companionId,
                    role: "companion",
                    text: "",
                    at: stamp,
                    streaming: true,
                    trace: {
                      stages,
                      totalMs: (trace?.totalMs ?? 0) + evidenceMs,
                    },
                  },
                ],
              }
            : session,
        ),
      );

      const appendText = (chunk: string) =>
        setSessions((prev) =>
          prev.map((session) =>
            session.id === target
              ? {
                  ...session,
                  turns: session.turns.map((turn) =>
                    turn.id === companionId
                      ? { ...turn, text: turn.text + chunk }
                      : turn,
                  ),
                }
              : session,
          ),
        );

      const finish = (finalText: string, voice: "model" | "template") =>
        setSessions((prev) =>
          prev.map((session) =>
            session.id === target
              ? {
                  ...session,
                  turns: session.turns.map((turn) =>
                    turn.id === companionId
                      ? {
                          ...turn,
                          text: finalText,
                          streaming: false,
                          result: result ?? undefined,
                          source: hasContent ? scored : undefined,
                          trace: turn.trace
                            ? {
                                ...turn.trace,
                                stages: [
                                  ...turn.trace.stages,
                                  {
                                    id: "voice" as const,
                                    label: "Penyusun bahasa",
                                    task: "Menulis jawaban dari temuan",
                                    status:
                                      voice === "model"
                                        ? ("selesai" as const)
                                        : ("dilewati" as const),
                                    findings: 0,
                                    ms: 0,
                                    note:
                                      voice === "model"
                                        ? undefined
                                        : "Model tidak dikonfigurasi; jawaban disusun dari templat.",
                                  },
                                ],
                              }
                            : undefined,
                        }
                      : turn,
                  ),
                }
              : session,
          ),
        );

      const fallback = composeReply(text || attachments[0]?.name || "", result, {
        first: false,
        containsContent: hasContent,
      });

      const useModel = hasContent && result !== null;
      const digest = useModel
        ? voiceDigest(result, modusFor(result.relatedModule)?.nama ?? result.modus)
        : null;

      if (!digest) {
        finish(fallback, "template");
        setThinking(false);
        setBusy(false);
        return;
      }

      let buffer = "";
      const ok = await requestReply(digest, (chunk) => {
        buffer += chunk;
        appendText(chunk);
      });

      if (ok && buffer.trim().length > 0) {
        finish(buffer.trim(), "model");
      } else {
        finish(fallback, "template");
      }
      setThinking(false);
      setBusy(false);
```

d. `send` must become `async`; change `const send = React.useCallback(` to `const send = React.useCallback(async (` and close with `}, [active?.turns, activeId, busy]);`.

e. Import `modusFor` from `@/lib/modus`.

f. Render the trace and the thinking row in the transcript. Inside the turn map, before the message bubble content, add:

```tsx
{turn.trace ? (
  <AgentTraceCard trace={turn.trace} className="mb-2" />
) : null}
{turn.streaming ? (
  <ThinkingRow label="Menyusun jawaban" startedAt={Date.now()} />
) : null}
```

g. Delete the `thinking` state if it is now unused, or keep it wired to `ThinkingRow`; Biome will flag the unused variable — remove it and its `setThinking` calls in that case.

- [ ] **Step 5: Run the tests**

Run: `npx jest src/components/companion --silent=false`
Expected: PASS. Existing shell tests still find `Percakapan baru` twice; the new turn renders a trace card and then the reply.

If a test asserts the reply appears synchronously, it now needs `await screen.findByText(…, {}, { timeout: 3000 })`, because the fallback path resolves in a microtask rather than a 420 ms timer.

- [ ] **Step 6: Commit**

```bash
git add src/components/companion/voice-client.ts src/components/companion/voice-client.test.ts \
        src/components/companion/companion-chat.tsx
git commit -m "feat(companion): run the real pipeline and stream the reply

Replaces the 420ms setTimeout with scoreWithTrace(): the detectors run, the
trace carries their measured milliseconds, the Evidence Agent stage is measured
around buildEvidenceBundle, and the reply streams in from the language layer
with composeReply() as the fallback.

The turn now arrives with its trace attached, so the transcript shows what was
checked rather than only what was concluded."
```

---

## Task 10: Live evidence panel and the motion tokens

**Files:**
- Modify: `src/components/companion/signal-panel.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/companion/companion-chat.tsx` (pass the trace)
- Test: `src/components/companion/signal-panel.test.tsx`

**Interfaces:**
- Consumes: `AgentTrace` from Task 1
- Produces: `SignalPanel` gains an optional `trace?: AgentTrace | null`

- [ ] **Step 1: Write the failing test**

Create `src/components/companion/signal-panel.test.tsx`:

```tsx
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { SignalPanel } from "@/components/companion/signal-panel";
import type { AgentTrace } from "@/lib/contracts/agent-run";
import { scoreText } from "@/lib/scoring/score";

const trace: AgentTrace = {
  totalMs: 0.4,
  stages: [
    {
      id: "identity",
      label: "Identity Agent",
      task: "Nomor pengirim",
      status: "dilewati",
      findings: 0,
      ms: 0.01,
      note: "Tidak ada nomor untuk diperiksa.",
    },
  ],
};

describe("SignalPanel with a trace", () => {
  it("prints the reason a stage was skipped", () => {
    const result = scoreText({ text: "Akun Anda diblokir, verifikasi sekarang." });
    render(<SignalPanel result={result} sequence={["message"]} trace={trace} />);
    expect(screen.getByText(/Tidak ada nomor untuk diperiksa/)).toBeInTheDocument();
  });

  it("still renders without a trace", () => {
    const result = scoreText({ text: "Akun Anda diblokir, verifikasi sekarang." });
    render(<SignalPanel result={result} sequence={["message"]} />);
    expect(screen.getByText(/panel bukti/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/components/companion/signal-panel --silent=false`
Expected: FAIL — `trace` is not a prop

- [ ] **Step 3: Add the note to the agent rows**

In `signal-panel.tsx`, extend the props:

```ts
export function SignalPanel({
  result,
  sequence,
  evidence,
  trace,
}: {
  result: ScoreResult | null;
  sequence: AgentId[];
  /** What the Evidence Agent assembled, when this surface has produced one. */
  evidence?: EvidenceBundle | null;
  /** What the pipeline reported, so a skipped agent can explain itself. */
  trace?: AgentTrace | null;
}) {
```

Pass the note down to `AgentRow`:

```tsx
{trace?.stages
  .filter((stage) => stage.id === agent && stage.note)
  .map((stage) => (
    <span key={stage.id} className="block text-[11px] text-dim/80">
      {stage.note}
    </span>
  ))}
```

Render it beneath the existing `task` line inside `AgentRow`.

- [ ] **Step 4: Pass the trace from the chat**

In `companion-chat.tsx`, find `<SignalPanel` and add `trace={latestTrace}` where:

```ts
const latestTrace = React.useMemo(() => {
  for (let i = turns.length - 1; i >= 0; i--) {
    const hit = turns[i]?.trace;
    if (hit) return hit;
  }
  return null;
}, [turns]);
```

- [ ] **Step 5: Add the motion tokens**

In `src/app/globals.css`, inside the `@theme inline` block:

```css
  --ease-lumina-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-lumina-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

and add the reveal that the trace rows use:

```css
@keyframes stage-reveal {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes stage-flash {
  from {
    background-color: color-mix(in oklab, var(--lumina-txt) 8%, transparent);
  }
  to {
    background-color: transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  @keyframes stage-reveal {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes stage-flash {
    from,
    to {
      background-color: transparent;
    }
  }
}
```

Apply to a trace row in `agent-trace.tsx`:

```tsx
className={cn(
  "flex items-start gap-2 rounded-[5px] py-1",
  "motion-safe:animate-[stage-reveal_180ms_var(--ease-lumina-out)_both]",
  "motion-safe:animate-[stage-flash_320ms_ease-out]",
)}
```

Keep the existing `style={{ animationDelay: … }}` for the stagger.

- [ ] **Step 6: Run the tests**

Run: `npx jest src/components/companion --silent=false`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/companion/signal-panel.tsx src/components/companion/signal-panel.test.tsx \
        src/components/companion/companion-chat.tsx src/app/globals.css \
        src/components/companion/agent-trace.tsx
git commit -m "feat(companion): live evidence panel and the motion tokens

SignalPanel now receives the trace, so an agent that had nothing to inspect
prints the reason instead of a clean tick for work that never happened. This is
the plan 3 promise ('signal muncul satu per satu, dengan indikator agent mana
yang sedang jalan') that was not kept.

Motion: two easing tokens copied from the reference, a 6px/180ms row reveal with
a 45ms stagger, and a single 320ms ink flash when a stage becomes true. All of
it collapses to opacity-only under prefers-reduced-motion."
```

---

## Task 11: Disclosure and feedback

**Files:**
- Create: `src/components/companion/digest-disclosure.tsx`
- Create: `src/components/companion/digest-disclosure.test.tsx`
- Create: `src/components/companion/feedback-row.tsx`
- Create: `src/components/companion/feedback-row.test.tsx`
- Modify: `src/components/companion/companion-chat.tsx`

**Interfaces:**
- Consumes: `VoiceDigest` from Task 1
- Produces: `<DigestDisclosure digest={…} />`, `<FeedbackRow />`

- [ ] **Step 1: Write the failing tests**

Create `src/components/companion/digest-disclosure.test.tsx`:

```tsx
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DigestDisclosure } from "@/components/companion/digest-disclosure";

const digest = {
  risk: "tinggi" as const,
  score: 82,
  modusName: "File APK via WhatsApp",
  findings: [{ label: "Meminta membuka file APK", weight: 0.85 }],
  advice: ["Jangan instal file APK itu."],
  moduleNo: 10,
  locale: "id" as const,
};

describe("DigestDisclosure", () => {
  it("prints the exact payload that left the device", async () => {
    const user = userEvent.setup();
    render(<DigestDisclosure digest={digest} />);
    await user.click(screen.getByRole("button", { name: /apa yang dikirim/i }));
    expect(screen.getByText(/"Meminta membuka file APK"/)).toBeInTheDocument();
    expect(screen.queryByText(/evidence/)).not.toBeInTheDocument();
  });
});
```

Create `src/components/companion/feedback-row.test.tsx`:

```tsx
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackRow } from "@/components/companion/feedback-row";

describe("FeedbackRow", () => {
  it("confirms without pretending to store anything", async () => {
    const user = userEvent.setup();
    render(<FeedbackRow />);
    await user.click(screen.getByRole("button", { name: /^benar$/i }));
    expect(
      screen.getByText(/hanya ada di tab ini dan hilang saat ditutup/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest src/components/companion/digest-disclosure src/components/companion/feedback-row --silent=false`
Expected: FAIL — modules not found

- [ ] **Step 3: Write both components**

Create `src/components/companion/digest-disclosure.tsx`:

```tsx
"use client";

import { ChevronRight } from "lucide-react";
import * as React from "react";
import type { VoiceDigest } from "@/lib/contracts/agent-run";
import { cn } from "@/lib/utils";

/**
 * Shows the exact JSON the language layer received.
 *
 * This is the answer to the only question a judge can use to sink the product's
 * privacy claim, and it takes one click. It is also why `VoiceDigest` has no
 * `evidence` field: what is shown here is the whole payload, so there is nothing
 * hidden behind the disclosure.
 */
export function DigestDisclosure({ digest }: { digest: VoiceDigest }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="max-w-[520px]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-[11px] text-dim transition-colors duration-150 hover:text-txt"
      >
        <ChevronRight
          aria-hidden
          strokeWidth={2}
          className={cn("size-3 transition-transform duration-150", open && "rotate-90")}
        />
        Apa yang dikirim ke model
      </button>
      {open ? (
        <pre className="mt-1.5 overflow-x-auto rounded-[6px] border border-line bg-panel-2 p-2.5 text-[11px] text-dim leading-relaxed">
          {JSON.stringify(digest, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
```

Create `src/components/companion/feedback-row.tsx`:

```tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

/**
 * "Umpan balik hasil" from the proposal.
 *
 * Deliberately stateless: there is no server, no storage, and no account, so the
 * only honest thing this control can do is confirm the choice and say what will
 * happen to it. Promising that the answer improves detection would be a lie
 * until a labelled dataset and a training path exist.
 */
export function FeedbackRow() {
  const [answered, setAnswered] = React.useState<null | "benar" | "keliru">(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {answered === null ? (
        <>
          <span className="text-[11px] text-dim">Hasil ini tepat?</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAnswered("benar")}
            className="h-7 text-xs"
          >
            Benar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAnswered("keliru")}
            className="h-7 text-xs"
          >
            Keliru
          </Button>
        </>
      ) : (
        <p className="text-[11px] text-dim">
          Terima kasih. Catatan ini hanya ada di tab ini dan hilang saat ditutup.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Mount both in the chat**

In `companion-chat.tsx`, under each companion turn that has a `result`, render:

```tsx
{turn.result ? (
  <div className="mt-2 flex flex-col gap-2">
    <FeedbackRow />
    {digestForTurn(turn) ? (
      <DigestDisclosure digest={digestForTurn(turn)!} />
    ) : null}
  </div>
) : null}
```

where `digestForTurn` is a small helper in `companion-chat.tsx`:

```tsx
function digestForTurn(turn: Turn) {
  if (!turn.result) return null;
  const modus = modusFor(turn.result.relatedModule);
  return voiceDigest(turn.result, modus?.nama ?? turn.result.modus);
}
```

- [ ] **Step 5: Run the tests**

Run: `npx jest src/components/companion --silent=false`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/companion/digest-disclosure.tsx src/components/companion/digest-disclosure.test.tsx \
        src/components/companion/feedback-row.tsx src/components/companion/feedback-row.test.tsx \
        src/components/companion/companion-chat.tsx
git commit -m "feat(companion): show the outbound payload, and add honest feedback

The disclosure prints the exact JSON the language layer received, which is the
whole payload by construction - VoiceDigest has no evidence field.

Feedback confirms the choice and states what happens to it. Claiming it improves
detection would be false until a labelled dataset exists; the proposal promises
the button, not the training loop."
```

---

## Task 12: Gate and a real browser pass

**Files:** none created; verification only.

- [ ] **Step 1: Stop the dev server and run the gate**

```bash
cd /home/vyns/Documents/github/Lumina
ps -eo pid,cmd | grep "node .*bin/next dev" | grep -v grep | awk '{print $1}' | while read p; do kill "$p"; done
sleep 2
npm run verify 2>&1 | grep -E "Test Suites|Tests:|Compiled|error|Error" | head -20
```

Expected: `Test Suites: … passed`, all tests green, `Compiled successfully`.

- [ ] **Step 2: Start the dev server and exercise the real path**

```bash
nohup npm run dev > /home/vyns/.cache/tmp/opencode/lumina-dev.log 2>&1 &
sleep 10
curl -s -o /dev/null -w "companion: %{http_code}\n" http://localhost:3000/companion
```

- [ ] **Step 3: Check the offline fallback is honest**

With `LUMINA_LLM_URL` unset, send a message in `/companion`. Expected: the trace card shows every stage, the voice stage reads `Penyusun bahasa` with the note `Model tidak dikonfigurasi; jawaban disusun dari templat`, and the reply text is the template sentence. **This is the state a judge sees if the venue has no network, so it must look finished, not broken.**

- [ ] **Step 4: Check the model path**

Set the variables to a reachable OpenAI-compatible endpoint, restart, send the same message. Expected: the voice stage reports `selesai`, the reply is prose rather than a template, and the disclosure shows a payload with no quote from the message.

- [ ] **Step 5: Check 380 px**

Resize to 380×800. Expected: no horizontal scroll, the trace header truncates its middle segment, the metadata disclosure does not overflow, and every icon-only control has an accessible name.

- [ ] **Step 6: Commit any fixes, then push**

```bash
git add -A
git commit -m "fix(companion): what the 380px and offline passes found"
git push origin feat/stream-a-companion-chat
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| §3 contract, `VoiceDigestSchema` | 1 |
| §3 privacy enforced by schema | 1, 6, 11 |
| §4 one pipeline, two entry points | 2 |
| §4 detector rows are a reveal, not a simulation | 7, 10 (documented in both) |
| §5a Identity Agent | 3 |
| §5b Link Agent additions | 4 |
| §5c Conversation Agent escalation | 5 |
| §6 voice route, env-gated, 503 fallback | 6, 9 |
| §7a trace card | 7 |
| §7b thinking row | 8 |
| §7c live panel | 10 |
| §7d disclosure | 11 |
| §7e feedback | 11 |
| §8 motion 1–7 | 7 (1, 3, 4), 8 (6), 10 (1, 2, 3, 7), 5 is the trace collapse in 7 |
| §8 reduced motion | 8, 10 |
| §9 honesty constraints | 2, 3, 5, 7, 11 |
| §10 tests | every task |

**Placeholder scan:** no `TBD`, no "add error handling", no "similar to Task N". Every code step contains the code.

**Type consistency:** `AgentStage`/`AgentTrace`/`STAGE_LABEL` are defined once in Task 1 and imported everywhere after. `conversationSignals` takes an object from Task 5 onward; Task 2's single-argument form is replaced in the same task that changes its test. `voiceDigest(result, modusName)` has one signature throughout. `scoreWithTrace` returns `{ result, trace }` and every consumer destructures it that way.
