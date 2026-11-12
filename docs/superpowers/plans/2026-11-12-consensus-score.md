# Consensus Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When two or more specialists ground the same pattern, let Lumina author the final score from that consensus instead of showing a contradictory engine number.

**Architecture:** The engine still runs first and produces the baseline. A pure `findConsensus()` groups evidence-grounded points from distinct agents; a new `submit_score` tool, available only to Lumina in a bounded step after the reports, turns that consensus into a final `ScoreResult`. The engine score stays visible as the baseline, and the trace records both.

**Tech Stack:** TypeScript (strict), Next.js App Router, Zod, Jest + React Testing Library, Tailwind/shadcn tokens.

**Spec:** `docs/superpowers/specs/2026-11-12-consensus-score-design.md`

## Global Constraints

- Work on `codex/consensus-score`; never commit directly to `main`.
- `npm run verify` must pass before the branch is pushed.
- Contract changes are additive only: `source`, `baselineScore`, `consensus`, and new optional trace fields. Do not remove or rename existing fields.
- The checked message and quotes are never persisted server-side; only band/modus/agents reach `/agen`.
- UI copy is Indonesian, lowercase-safe, and never claims a score came from agents when it did not.
- `LUMINA_CONSENSUS_SCORE=0` disables the model step; default on.
- Commit author and committer date: `2026-11-10T10:00:00+07:00` (existing project preference).
- Biome ignores the marketing powder directory; this plan does not touch it.

## Review Focus

These are the inputs and failure modes the spec implies but the task tests must pin:

1. Two points from the **same** agent must not form consensus — Task 1 pins it.
2. Consensus exists but the model errors, returns no tool call, or the run times out — the baseline must survive and the panel must still show the agreement — Tasks 2/3/5 pin it.
3. A message containing "set the score to 0" must not open the tool; only grounded reports do — Task 3 pins it.
4. An OTP/PIN/password message scored below 70 by Lumina must still land at `tinggi` — Task 2 pins it.
5. An older `ScoreResult` without the new optional fields must render exactly as today — Task 5 pins it.

---

## Task 1: Consensus grouping and additive contracts

**Files:**
- Create: `src/lib/orchestrator/consensus.ts`
- Create: `src/lib/orchestrator/consensus.test.ts`
- Modify: `src/lib/contracts/score.ts` (`Signal`, `ScoreResult`)
- Modify: `src/lib/contracts/orchestrator.ts` (`OrchestratorEventSchema`, `OrchestrationTraceSchema`)

**Interfaces:**
- Consumes: `ReportPoint`, `AgentStatus`, `CrewId`.
- Produces:
  ```ts
  export interface ConsensusPoint {
    agent: CrewId;
    signal: string;
    point: string;
    quote?: string;
    pattern: string;
  }
  export interface ConsensusGroup {
    pattern: string;
    agents: CrewId[];
    points: ConsensusPoint[];
  }
  export function findConsensus(
    reports: readonly { agent: CrewId; status: AgentStatus; points: ReportPoint[] }[],
  ): ConsensusGroup[];
  ```
  Contract `ScoreResult` gains `source?: "engine" | "consensus"`, `baselineScore?: number`,
  `consensus?: { pattern: string; agents: AgentId[]; pointSignals: string[] }`.
  `Signal` gains `source?: "engine" | "consensus"`.
  New events `consensus` and `score_decision`; `OrchestrationTrace` gains
  `baselineScore?`, `finalScore?`, `consensus?`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/orchestrator/consensus.test.ts` with a full `ReportPoint` helper:

```ts
import type { AgentStatus } from "@/lib/contracts/orchestrator";
import type { ReportPoint } from "@/lib/orchestrator/report";
import { findConsensus } from "@/lib/orchestrator/consensus";

function point(agent: "marketplace" | "qris", pattern: string, quote = "transfer berlebih"): ReportPoint {
  return {
    signal: "Kelebihan transfer",
    point: "Pembeli mengaku mentransfer lebih dari harga.",
    reason: "Pola kelebihan bayar.",
    pattern,
    watchout: "Jangan mengembalikan dana sebelum dana masuk.",
    quote,
  };
}

function report(
  agent: "marketplace" | "qris",
  points: ReportPoint[],
  status: AgentStatus = "selesai",
) {
  return { agent, status, points };
}

it("groups the same normalised pattern across distinct agents", () => {
  const groups = findConsensus([
    report("marketplace", [point("marketplace", "overpayment-refund")]),
    report("qris", [point("qris", "Overpayment  Refund")]),
  ]);
  expect(groups).toHaveLength(1);
  expect(groups[0].pattern).toBe("overpayment-refund");
  expect(groups[0].agents).toEqual(["marketplace", "qris"]);
  expect(groups[0].points).toHaveLength(2);
});

it("ignores two points from the same agent", () => {
  expect(
    findConsensus([
      report("marketplace", [
        point("marketplace", "overpayment-refund"),
        point("marketplace", "overpayment-refund", "transfer 1,5 juta"),
      ]),
    ]),
  ).toEqual([]);
});

it("ignores skipped agents, different patterns, and points without a quote", () => {
  expect(
    findConsensus([
      report("marketplace", [point("marketplace", "overpayment-refund")]),
      report("qris", [point("qris", "overpayment-refund")], "dilewati"),
    ]),
  ).toEqual([]);
  expect(
    findConsensus([
      report("marketplace", [point("marketplace", "overpayment-refund")]),
      report("qris", [point("qris", "credential-request")]),
    ]),
  ).toEqual([]);
  expect(
    findConsensus([
      report("marketplace", [point("marketplace", "overpayment-refund")]),
      report("qris", [{ ...point("qris", "overpayment-refund"), quote: undefined }]),
    ]),
  ).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/orchestrator/consensus.test.ts`
Expected: FAIL — cannot resolve `@/lib/orchestrator/consensus`.

- [ ] **Step 3: Implement contracts and `findConsensus`**

Add the additive fields above. In `contracts/orchestrator.ts`, define
`ConsensusPointSchema` and `ConsensusGroupSchema` next to `OrchestrationAgentSchema`
and reuse them in the event union and trace. In `consensus.ts`:

```ts
export function normalizePattern(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

Group `status === "selesai"` points that have a non-empty `quote`, keyed by
`normalizePattern(point.pattern)`. Keep a group only when it has at least two
distinct agents. Sort groups by agent count desc, point count desc, then pattern
asc. Sort each group's `agents` alphabetically and keep `points` in input order.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/orchestrator/consensus.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/contracts/score.ts src/lib/contracts/orchestrator.ts src/lib/orchestrator/consensus.ts src/lib/orchestrator/consensus.test.ts
GIT_AUTHOR_DATE="2026-11-10T10:00:00+07:00" GIT_COMMITTER_DATE="2026-11-10T10:00:00+07:00" \
  git commit -m "feat(orchestrator): add consensus grouping and score decision events"
```

---

## Task 2: `submit_score` validation and `authorScore`

**Files:**
- Create: `src/lib/orchestrator/score-decision.ts`
- Create: `src/lib/orchestrator/score-decision.test.ts`
- Modify: `src/lib/scoring/score.ts` (`authorScore`, `PATTERN_MODUS`)
- Create: `src/lib/scoring/score-author.test.ts`

**Interfaces:**
- Consumes: `ConsensusGroup`, `ScoreResult`, `Signal`, `riskFor`, `ADVICE`, `MODUS_BY_ID`, `dedupe`.
- Produces:
  ```ts
  export const ScoreDecisionSchema: z.ZodType<{
    score: number;
    rationale: string;
    pointSignals: string[];
  }>;
  export function validateScoreDecision(
    input: unknown,
    group: ConsensusGroup,
  ): { ok: true; decision: ScoreDecision } | { ok: false; issues: string[] };
  export const SUBMIT_SCORE_TOOL: {
    type: "function";
    function: { name: "submit_score"; description: string; parameters: unknown };
  };
  export function authorScore(
    baseline: ScoreResult,
    decision: ScoreDecision,
    group: ConsensusGroup,
  ): ScoreResult;
  ```

- [ ] **Step 1: Write the failing validator test**

Create `src/lib/orchestrator/score-decision.test.ts`:

```ts
import type { ConsensusGroup } from "@/lib/contracts/orchestrator";
import { validateScoreDecision } from "@/lib/orchestrator/score-decision";

const group: ConsensusGroup = {
  pattern: "overpayment-refund",
  agents: ["marketplace", "qris"],
  points: [
    { agent: "marketplace", signal: "Kelebihan transfer", point: "Transfer berlebih.", pattern: "overpayment-refund", quote: "transfer berlebih" },
    { agent: "qris", signal: "Refund QRIS", point: "Minta refund.", pattern: "overpayment-refund", quote: "refund" },
  ],
};

it("accepts a grounded free score", () => {
  expect(
    validateScoreDecision(
      { score: 78, rationale: "Dua agen menemukan klaim transfer berlebih.", pointSignals: ["Kelebihan transfer"] },
      group,
    ),
  ).toEqual({
    ok: true,
    decision: { score: 78, rationale: "Dua agen menemukan klaim transfer berlebih.", pointSignals: ["Kelebihan transfer"] },
  });
});

it("rejects an out-of-range score, a missing signal, and a missing consensus", () => {
  expect(
    validateScoreDecision({ score: 101, rationale: "Terlalu tinggi.", pointSignals: ["Kelebihan transfer"] }, group).ok,
  ).toBe(false);
  expect(
    validateScoreDecision({ score: 78, rationale: "Tanpa sinyal.", pointSignals: ["Sinyal karangan"] }, group).ok,
  ).toBe(false);
  expect(
    validateScoreDecision({ score: 78, rationale: "Tanpa konsensus.", pointSignals: ["Kelebihan transfer"] }, null as never).ok,
  ).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/orchestrator/score-decision.test.ts`
Expected: FAIL — cannot resolve `score-decision`.

- [ ] **Step 3: Implement the schema, validator, and tool**

`ScoreDecisionSchema`: `score` integer 0..100, `rationale` 3..600, `pointSignals`
2..160 each, 1..5 items, all strictly trimmed. `validateScoreDecision` parses first,
then requires at least one `pointSignals` value to match a `group.points[].signal`
(case-insensitive, whitespace-collapsed). A null group returns
`{ ok: false, issues: ["score: belum ada konsensus"] }`.

`SUBMIT_SCORE_TOOL` mirrors `SUBMIT_REPORT_TOOL`:

```ts
export const SUBMIT_SCORE_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_score",
    description:
      "Tetapkan skor akhir 0-100 dari konsensus agen. Panggil hanya setelah agen melapor; sertakan rationale dan pointSignals yang mendukung.",
    parameters: z.toJSONSchema(ScoreDecisionSchema),
  },
};
```

- [ ] **Step 4: Write the failing `authorScore` test**

Create `src/lib/scoring/score-author.test.ts`:

```ts
import type { ScoreResult } from "@/lib/contracts/score";
import { authorScore } from "@/lib/scoring/score";

const baseline: ScoreResult = {
  score: 0,
  risk: "bersih",
  signals: [{ label: "Tidak ada pola penipuan yang dikenali pada teks ini", weight: 0, evidence: "pesan", agent: "scoring" }],
  modus: "tidak-dikenali",
  advice: ["Tetap waspada."],
  relatedModule: null,
  hardOverride: false,
};

const group: ConsensusGroup = {
  pattern: "overpayment-refund",
  agents: ["marketplace", "qris"],
  points: [
    { agent: "marketplace", signal: "Kelebihan transfer", point: "Transfer berlebih.", pattern: "overpayment-refund", quote: "transfer berlebih" },
    { agent: "qris", signal: "Refund QRIS", point: "Minta refund.", pattern: "overpayment-refund", quote: "refund" },
  ],
};

it("uses Lumina's score, derives the band, and replaces the empty placeholder", () => {
  const result = authorScore(baseline, { score: 78, rationale: "Dua agen sepakat.", pointSignals: ["Kelebihan transfer"] }, group);
  expect(result.score).toBe(78);
  expect(result.risk).toBe("tinggi");
  expect(result.signals.some((signal) => signal.weight === 0)).toBe(false);
  expect(result.signals.filter((signal) => signal.source === "consensus")).toHaveLength(2);
  expect(result.modus).toBe("jual-beli-palsu");
  expect(result.relatedModule).toBe(1);
  expect(result.source).toBe("consensus");
  expect(result.baselineScore).toBe(0);
});

it("keeps the OTP hard floor even when Lumina scores lower", () => {
  const result = authorScore(
    { ...baseline, hardOverride: true },
    { score: 20, rationale: "Satu agen yakin, satu ragu.", pointSignals: ["Kelebihan transfer"] },
    group,
  );
  expect(result.score).toBe(70);
  expect(result.risk).toBe("tinggi");
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx jest src/lib/scoring/score-author.test.ts`
Expected: FAIL — `authorScore` is not exported.

- [ ] **Step 6: Implement `authorScore`**

In `score.ts`:

- `PATTERN_MODUS`: `{ "overpayment-refund": "jual-beli-palsu" }` (add known ids only).
- Build one `Signal` per unique `group.points[].signal` with `weight: 0.5`,
  `agent`, `mechanism: point.pattern`, `source: "consensus"`, and
  `evidence: point.quote ?? point.point`.
- If consensus signals exist, use `dedupe([...baseline.signals.filter(s => s.weight > 0), ...consensusSignals])`,
  sorted by descending weight. Otherwise return `baseline.signals`.
- `score = baseline.hardOverride ? Math.max(decision.score, 70) : decision.score`.
- `risk = riskFor(score)`.
- `modus = PATTERN_MODUS[group.pattern] ?? baseline.modus`; `advice` and
  `relatedModule` follow that modus, falling back to baseline.
- Set `source: "consensus"`, `baselineScore: baseline.score`, and
  `consensus: { pattern, agents, pointSignals: decision.pointSignals }`.
- Keep `hardOverride: baseline.hardOverride`.

- [ ] **Step 7: Run both tests to verify they pass**

Run: `npx jest src/lib/orchestrator/score-decision.test.ts src/lib/scoring/score-author.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add src/lib/orchestrator/score-decision.ts src/lib/orchestrator/score-decision.test.ts src/lib/scoring/score.ts src/lib/scoring/score-author.test.ts
GIT_AUTHOR_DATE="2026-11-10T10:00:00+07:00" GIT_COMMITTER_DATE="2026-11-10T10:00:00+07:00" \
  git commit -m "feat(scoring): author the final score from agent consensus"
```

---

## Task 3: Orchestrator scoring step, flag, and prompts

**Files:**
- Modify: `src/lib/orchestrator/prompts.ts` (`SCORING_PROMPT`, `scoringUserPrompt`)
- Modify: `src/lib/orchestrator/flag.ts` (`isConsensusScoreEnabled`)
- Modify: `src/lib/orchestrator/loop.ts` (`makeScoreDecision`, insert the step, use the final score, extend trace/result)
- Modify: `src/lib/orchestrator/loop.test.ts`

**Interfaces:**
- Consumes: `findConsensus`, `validateScoreDecision`, `SUBMIT_SCORE_TOOL`, `authorScore`.
- Produces:
  ```ts
  export async function makeScoreDecision(
    request: OrchestratorRequest,
    baseline: ScoreResult,
    group: ConsensusGroup,
    chat: NonNullable<OrchestratorDeps["chat"]>,
    signal: AbortSignal,
  ): Promise<{ decision: ScoreDecision; ms: number } | null>;
  export function isConsensusScoreEnabled(): boolean;
  export function scoringUserPrompt(input: {
    question: string;
    message: string;
    baseline: ScoreResult;
    group: ConsensusGroup;
  }): string;
  ```

- [ ] **Step 1: Write the failing overpayment test**

Append to `src/lib/orchestrator/loop.test.ts` (reuse `systemOf`, `commanderCall`, `toolCall`):

```ts
it("lets Lumina score a consensus the engine missed", async () => {
  const zero: ScoreResult = { ...baseline, score: 0, risk: "bersih", signals: [], modus: "tidak-dikenali", advice: [], relatedModule: null, hardOverride: false };
  const message = "Kak, saya sudah transfer Rp1.500.000 untuk barang Rp1.000.000. Kelebihannya tolong kembalikan ke rekening saya, nanti saya transfer lagi.";
  const report = (agent: "marketplace" | "qris") => ({
    id: `call-${agent}`,
    type: "function",
    function: {
      name: "submit_report",
      arguments: JSON.stringify({
        summary: "Ada klaim transfer berlebih.",
        points: [{
          signal: "Kelebihan transfer",
          point: "Pembeli mengaku mentransfer lebih dari harga.",
          reason: "Pola overpayment.",
          pattern: "overpayment-refund",
          watchout: "Jangan mengembalikan dana sebelum dana masuk.",
          quote: "transfer Rp1.500.000",
        }],
        watchouts: ["Jangan mengembalikan dana sebelum dana masuk."],
        confidence: 0.8,
      }),
    },
  });
  const chat = jest.fn(async (options: { messages: { role: string; content: string | null }[] }) => {
    const system = systemOf(options.messages);
    if (system.includes("komandan agen")) return commanderCall("Aku melihat pola kelebihan bayar.");
    if (system.includes("koordinator tim agen")) return plannerCallWith([
      { agent: "marketplace", task: "Periksa alur jual-beli." },
      { agent: "qris", task: "Periksa refund QRIS." },
    ]);
    if (system.includes("penentu skor akhir"))
      return { role: "assistant", content: null, tool_calls: [toolCall("score-1", "submit_score", { score: 78, rationale: "Dua agen menemukan klaim transfer berlebih.", pointSignals: ["Kelebihan transfer"] })] };
    if (system.includes("penyusun jawaban")) return { role: "assistant", content: "Pesan ini 78/100." };
    return { role: "assistant", content: null, tool_calls: [report(system.includes("Mochi") ? "marketplace" : "qris")] };
  });

  const result = await runOrchestrator({ ...request, message }, {
    chat: chat as never,
    score: (() => ({ result: zero, trace: path })) as never,
  });

  expect(result.score.score).toBe(78);
  expect(result.trace.baselineScore?.score).toBe(0);
  expect(result.trace.finalScore?.score).toBe(78);
  expect(result.trace.consensus?.[0].pattern).toBe("overpayment-refund");
  expect(result.events.find((event) => event.type === "score_decision")).toMatchObject({ source: "model", result: { score: 78 } });
  expect(result.text).toContain("78/100");
});
```

Add two more small tests: no consensus keeps `result.score.score === 72` and emits no `score_decision`; a scoring stub that returns plain text emits `source: "fallback"` and keeps 72.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/orchestrator/loop.test.ts -t "lets Lumina score"`
Expected: FAIL — no `score_decision` event / score stays 0.

- [ ] **Step 3: Add the prompt, flag, and step**

`SCORING_PROMPT` must contain the exact marker `penentu skor akhir` (the tests and
future readers use it) and instruct:

- Lumina sets any score 0–100 from the consensus, raising or lowering the engine.
- Call `submit_score`; free text is not a score.
- Cite only `pointSignals` that appear in the prompt; never invent evidence.
- Friendly first-person tone, 1–2 sentences of rationale.

`scoringUserPrompt` prints the baseline score/band, the group's pattern, each
agent's display name, signal, point, and quote. `isConsensusScoreEnabled` mirrors
`isOrchestratorEnabled`, reading `LUMINA_CONSENSUS_SCORE` (default enabled).

`makeScoreDecision` runs at most two model calls, with `tools: [SUBMIT_SCORE_TOOL]`,
`temperature: 0`, and `MAX_SCORE_TOKENS = 700`. Wrap each `chat` call in `try/catch`
and return `null` on an abort or error. If the first tool call is not `submit_score`,
return `null` immediately. If validation fails, append the issues as a `tool` message
and retry once.

- [ ] **Step 4: Wire it into `runOrchestrator`**

After the `reports` loop and before `synthesis_start`:

```ts
const consensus = findConsensus(
  reports.map((report) => ({ agent: report.agent, status: report.status, points: report.points })),
);
emit({ type: "consensus", groups: consensus });

let finalScore = baseline;
let decision: { decision: ScoreDecision; ms: number } | null = null;
if (consensus.length > 0 && isConsensusScoreEnabled() && chat && !signal.aborted) {
  decision = await makeScoreDecision(request, baseline, consensus[0], chat, signal);
  if (decision) finalScore = authorScore(baseline, decision.decision, consensus[0]);
  emit({
    type: "score_decision",
    result: finalScore,
    baseline,
    rationale: decision?.decision.rationale ?? "Lumina tidak mengirim keputusan skor; skor engine dipertahankan.",
    source: decision ? "model" : "fallback",
  });
}
```

Use `finalScore` everywhere the synthesis and fallback currently use `baseline`
(the prompt input, the number rewrite, `fallbackSynthesis`). Add
`baselineScore: baseline`, `finalScore`, and `consensus` to the trace; return
`score: finalScore`. Do **not** run the model when `consensus.length === 0`.

- [ ] **Step 5: Run the orchestrator tests**

Run: `npx jest src/lib/orchestrator/loop.test.ts`
Expected: PASS. Existing tests that form consensus now make one extra scoring
call, get a `submit_report` tool call back, and fall back to the baseline.

- [ ] **Step 6: Commit**

```bash
git add src/lib/orchestrator/prompts.ts src/lib/orchestrator/flag.ts src/lib/orchestrator/loop.ts src/lib/orchestrator/loop.test.ts
GIT_AUTHOR_DATE="2026-11-10T10:00:00+07:00" GIT_COMMITTER_DATE="2026-11-10T10:00:00+07:00" \
  git commit -m "feat(orchestrator): let Lumina score grounded agent consensus"
```

---

## Task 4: Client and chat use the final score

**Files:**
- Modify: `src/lib/orchestrator/client.ts` (`streamOrchestrator`)
- Modify: `src/components/companion/companion-chat.tsx` (`finish`, orchestrated branch)
- Modify: `src/components/companion/companion-chat.test.tsx`

**Interfaces:**
- Consumes: `score_decision` event.
- Produces: `OrchestratorStreamResult.score` is the final score; `finish` accepts an optional final `ScoreResult`.

- [ ] **Step 1: Write the failing client test**

In `companion-chat.test.tsx`, mock `streamOrchestrator` to resolve a model run whose
`score` is `{ ...baseline, score: 78, risk: "tinggi", source: "consensus", baselineScore: 0 }`
and whose `events` include a `score_decision`. Send a message, then assert the score
card shows `78` and the provenance text. (Follow the existing mock setup near the
`streamOrchestrator` test at line ~641.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/companion/companion-chat.test.tsx -t "consensus"`
Expected: FAIL — the card still shows the local engine score.

- [ ] **Step 3: Implement the wiring**

In `client.ts`, after the `score` branch:

```ts
if (event.type === "score_decision" && event.result) {
  score = event.result as ScoreResult;
}
```

In `companion-chat.tsx`, add `finalResult?: ScoreResult` to `finish` and use
`result: checked ? (finalResult ?? result ?? undefined) : finalResult ?? undefined`.
Call `finish(orchestrated.text, "model", undefined, orchestrated.score ?? undefined)`.
Optionally patch `turn.result` from the live `score_decision` event so the card
updates before synthesis ends.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/companion/companion-chat.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/orchestrator/client.ts src/components/companion/companion-chat.tsx src/components/companion/companion-chat.test.tsx
GIT_AUTHOR_DATE="2026-11-10T10:00:00+07:00" GIT_COMMITTER_DATE="2026-11-10T10:00:00+07:00" \
  git commit -m "feat(companion): apply the consensus score to the chat result"
```

---

## Task 5: Score card provenance and process trace

**Files:**
- Modify: `src/components/companion/score-card.tsx`
- Modify: `src/components/companion/score-card.test.tsx`
- Modify: `src/components/companion/process-trace.tsx`
- Modify: `src/components/companion/process-trace.test.tsx`

**Interfaces:**
- Consumes: `ScoreResult.source`, `baselineScore`, `consensus`; events `consensus`, `score_decision`.
- Produces: no new exports; rendered text `Dinilai Lumina dari konsensus N agen`,
  `Engine X · akhir Y`, `N agen sepakat`, `Skor akhir Y/100`.

- [ ] **Step 1: Write the failing score-card test**

Add to `score-card.test.tsx`:

```tsx
it("shows consensus provenance and both scores", () => {
  const { result } = scoreWithTrace({ text: CLEAN });
  render(
    <ScoreCard
      result={{
        ...result,
        score: 78,
        risk: "tinggi",
        source: "consensus",
        baselineScore: 0,
        consensus: { pattern: "overpayment-refund", agents: ["marketplace", "qris"], pointSignals: ["Kelebihan transfer"] },
        signals: [{ label: "Kelebihan transfer", weight: 0.5, evidence: "transfer berlebih", agent: "marketplace", source: "consensus" }],
      }}
    />,
  );
  expect(screen.getByText(/Dinilai Lumina dari konsensus 2 agen/)).toBeInTheDocument();
  expect(screen.getByText(/Engine 0/)).toBeInTheDocument();
  expect(screen.queryByText("Tidak ada pola penipuan yang cocok pada pesan ini.")).not.toBeInTheDocument();
});
```

Add a second case with no `source`/`baselineScore` and assert no provenance text
renders (backwards compatibility).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/companion/score-card.test.tsx`
Expected: FAIL — no provenance text.

- [ ] **Step 3: Implement the score card**

Under the meter, render when `result.source === "consensus"`:

```tsx
<p className="text-dim text-xs">
  Dinilai Lumina dari konsensus {result.consensus?.agents.length ?? 0} agen
  {result.baselineScore !== undefined && result.baselineScore !== result.score
    ? ` · Engine ${result.baselineScore} · akhir ${result.score}`
    : ""}
</p>
```

`clean` already reads weighted signals, so a consensus signal (weight 0.5) removes
the "nothing matched" state. In the findings list, render a small `konsensus agen`
badge when `signal.source === "consensus"`. `SignalPanel` already renders
`result.signals`, so the finding appears there without a separate data path. Do not
add any new hard-coded hex.

- [ ] **Step 4: Write the failing process-trace test**

Add to `process-trace.test.tsx`: render `ProcessTrace` with `run_start`,
`commander_say`, `consensus` (two agents, `overpayment-refund`), and `score_decision`
(result 78, source model). Assert `screen.getByText(/2 agen sepakat/)` and
`screen.getByText(/Skor akhir 78\/100/)`.

- [ ] **Step 5: Run test to verify it fails**

Run: `npx jest src/components/companion/process-trace.test.tsx`
Expected: FAIL — text missing.

- [ ] **Step 6: Render the two events**

After `CommanderCard`, add a small card inside the sub-agent rail:

```tsx
{consensus?.groups[0] ? (
  <p className="text-dim text-[11px]">
    {consensus.groups[0].agents.length} agen sepakat · {consensus.groups[0].pattern}
  </p>
) : null}
{decision ? (
  <p className="text-txt text-[11px]">
    Skor akhir {decision.result.score}/100 · {decision.source === "model" ? "dinilai Lumina" : "skor engine dipertahankan"}
  </p>
) : null}
```

Find the events with `Extract<OrchestratorEvent, { type: "consensus" }>` and
`Extract<OrchestratorEvent, { type: "score_decision" }>`. Keep the existing serif
narrative styling; these are metadata rows, so use the small sans line.

- [ ] **Step 7: Run both tests**

Run: `npx jest src/components/companion/score-card.test.tsx src/components/companion/process-trace.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/companion/score-card.tsx src/components/companion/score-card.test.tsx src/components/companion/process-trace.tsx src/components/companion/process-trace.test.tsx
GIT_AUTHOR_DATE="2026-11-10T10:00:00+07:00" GIT_COMMITTER_DATE="2026-11-10T10:00:00+07:00" \
  git commit -m "feat(companion): show consensus provenance in the score card and trace"
```

---

## Task 6: Document the new invariant and flag

**Files:**
- Modify: `AGENTS.md` (the "Kejujuran yang diuji" section and the LLM env list)
- Modify: `docs/agent-orchestration.md`
- Modify: `.env.example`

- [ ] **Step 1: Rewrite the honesty rule**

Replace the sentence that says the model is never asked for a score with:

> Skor engine tetap baseline. Setelah minimal dua agen sepakat pada pola yang sama
> dan masing-masing mengutip bukti, Lumina boleh menetapkan skor akhir lewat
> `submit_score`; skor engine tetap ditampilkan, dan `source` menandai asal skor.
> Permintaan OTP/PIN/password tetap memaksa band tinggi. Model tidak boleh
> mengarang sinyal; poin konsensus harus lolos validasi laporan.

Keep the rest of the honesty section intact.

- [ ] **Step 2: Add the design link and flag**

In `docs/agent-orchestration.md`, add a short "Consensus scoring" section linking
the spec and describing the event flow. In `.env.example`, add:

```bash
# Lumina may author the final score from grounded agent consensus.
# 0 disables the model step and keeps the engine score.
LUMINA_CONSENSUS_SCORE=1
```

- [ ] **Step 3: Verify the docs**

Run: `npx biome check AGENTS.md docs/agent-orchestration.md .env.example`
Expected: no errors (`.env.example` may be ignored; that is fine).

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md docs/agent-orchestration.md .env.example
GIT_AUTHOR_DATE="2026-11-10T10:00:00+07:00" GIT_COMMITTER_DATE="2026-11-10T10:00:00+07:00" \
  git commit -m "docs: record consensus scoring and its flag"
```

---

## Task 7: Full gate, PR, and merge

**Files:** none.

- [ ] **Step 1: Run the repository gate**

```bash
npm run verify
```

Expected: typecheck, Biome, Jest, and `next build` all pass. If Jest warns about
open handles, that is pre-existing; a failure is not.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin codex/consensus-score
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create --base main --head codex/consensus-score \
  --title "feat: consensus-driven scoring" \
  --body "Agents that ground the same pattern now hand it to Lumina, who authors the final score with a submit_score tool. The engine score stays visible as the baseline; the trace records both. Flag: LUMINA_CONSENSUS_SCORE. Spec: docs/superpowers/specs/2026-11-12-consensus-score-design.md."
```

- [ ] **Step 4: Merge when conflict-free**

```bash
gh pr merge --merge --delete-branch
```

If the merge conflicts, stop and report the conflicting paths instead of forcing a
resolution.

---

## Declined / deferred

- **Engine-signal-only rescoring.** V1 calls the model only when a consensus group
  exists. An engine signal without agreement keeps the baseline; rescoring it would
  add a model call to every risky message and no contradiction was reported there.
- **Numeric final score in `/agen`.** `saveAgentRun` already stores the final band
  through `summarizeRun(result.trace, result.score)`. Adding the number means a
  migration and is not needed for the contradiction.
- **Pattern alias table.** V1 uses normalized exact matches. Add aliases after
  watching real runs, not before.
- **Engine bench expansion.** `bench-cases.ts` measures the deterministic detector
  only. The consensus fix is pinned at the orchestrator seam in Task 3; adding a
  detector-miss case to the engine bench would lower its recall without testing the
  new layer.
