# Consensus scoring — design

**Date:** 2026-11-12
**Status:** Proposed, awaiting approval
**Branch:** `codex/consensus-score`
**Trigger:** the process trace shows agents concluding an overpayment scam while the
score card reads `0/100 · Bersih`.

---

## 0. Goal and non-goals

### Goal

When at least two specialists independently reach the same conclusion, hand that
consensus back to Lumina and let Lumina author the final score, band, and rationale
from it.

The score card must stop contradicting the agents: if two agents ground the same
mechanism, the verdict is no longer a fixed `0/100` from a regex miss.

### Non-goals

a. Do not replace the deterministic detectors. They still run first and still
   produce the baseline and the signals panel.
b. Do not remove the engine score. It stays visible as the baseline whenever Lumina
   overrides it.
c. Do not let specialists call the scoring tool. Only the orchestrator (Lumina) can.
d. Do not persist the checked message, quotes, or transcript. The score decision is
   metadata; the message stays on the device.
e. Do not rebuild the whole scoring engine or train a classifier in this slice.

---

## 1. Decisions taken

| Decision | Choice |
|---|---|
| Who may score? | Lumina (the orchestrator), not the specialists |
| When? | After reports exist and at least two agents agree on the same mechanism |
| How much authority? | **Free**: Lumina may set any score, raise or lower, not clamped |
| Evidence standard? | Each agreeing point needs a verbatim quote; the existing report validator already enforces this |
| Audit? | The engine baseline, the agreeing agents/points, the rationale, and the final score are all kept in the run trace |

The "free score" choice deliberately reverses the old invariant in `AGENTS.md`
("model tidak pernah diminta memberi skor dan tidak boleh menambah/menurunkan
signals"). That invariant must be rewritten as part of this change; it is a product
decision, not an accident.

---

## 2. Ground truth (read from the repo)

| Fact | Anchor |
|---|---|
| Baseline is computed once, before any agent runs | `src/lib/orchestrator/loop.ts:995` |
| `baseline` is fed to the commander, planner, specialists, and synthesis | `src/lib/orchestrator/loop.ts:999`, `:1165` |
| Specialists may submit up to 2 observation points even with zero tool signals | `src/lib/orchestrator/report.ts:124` |
| Observations must carry a verbatim quote and are validated | `src/lib/orchestrator/report.ts:160-190` |
| Score, risk, and signals are produced only in `finalize()` | `src/lib/scoring/score.ts:307-334` |
| `mkt-overpayment` needs "kelebihan bayar/transfer" + refund + a different account | `src/lib/scoring/marketplace.ts:37` |
| The client reads one `score` event (baseline) and the panel result comes from the local engine | `src/lib/orchestrator/client.ts:86`, `companion-chat.tsx:1297` |
| Synthesis rewrites every `NN/100` to the baseline score | `src/lib/orchestrator/loop.ts:1180-1183` |
| Agent runs store band/modus/agents only | `src/lib/agent/runs.ts:26-42` |

---

## 3. Proposed flow

```
message
  → engine baseline (unchanged)
  → commander_say
  → plan
  → agent_start / agent_result (unchanged)
  → consensus check (new, deterministic)
  → score_decision (new, Lumina + submit_score tool)
  → synthesis (uses the final score)
  → done
```

Events become:

```
run_start → commander_say → score(baseline) → plan
  → agent_start/agent_result …
  → consensus (new) → score_decision (new)
  → synthesis_start/delta/end → done
```

If the consensus gate fails, no `score_decision` is emitted and the final score is
the baseline. The trace still records `consensus: null`.

---

## 4. Consensus check

A new pure module, `src/lib/orchestrator/consensus.ts`:

```ts
export interface ConsensusPoint {
  agent: CrewId;
  signal: string;
  point: string;
  quote?: string;
  pattern: string;
}

export interface ConsensusGroup {
  pattern: string;          // normalised point.pattern
  agents: CrewId[];         // distinct agents, >= 2
  points: ConsensusPoint[]; // every grounded point in the group
}

export function findConsensus(
  reports: { agent: CrewId; status: AgentStatus; points: ReportPoint[] }[],
): ConsensusGroup[];
```

Rules:

a. Only `status === "selesai"` reports count. A skipped or failed agent cannot form
   consensus.
b. Two points match when `normalize(point.pattern)` is equal. `normalize` lowercases,
   trims, and collapses whitespace/punctuation.
c. A group needs points from **distinct** agents. Two points from the same agent do
   not count, even if the patterns match.
d. A matching point must have a `quote` (the report validator already proves the
   quote exists in the message or in a tool signal's evidence).
e. V1 triggers the model **only when a consensus group exists**. A strong engine
   signal without agreement keeps the baseline: rescoring it would add a model
   call to every risky message and no user-visible contradiction was reported
   there. The tool can still cite a baseline signal label when consensus exists.
f. The group with the most distinct agents wins. Ties go to the group with more
   matching points, then to the pattern that sorts first alphabetically.

A small alias table can ship in v2. V1 is exact normalised pattern equality; the
specialist prompt should be updated to emit a stable `pattern` token (for example
`overpayment-refund`) so agents converge.

---

## 5. `submit_score` tool

Only the orchestrator sees this tool, and only after the reports exist.

```ts
{
  name: "submit_score",
  parameters: {
    score: number,          // integer 0..100
    rationale: string,      // 3..600, cites the agreeing points in plain language
    pointSignals: string[]  // the point.signal values the decision rests on
  }
}
```

Validation, in order:

1. The consensus gate is open. Otherwise reject with `score: belum ada konsensus`.
   The scoring step is not called at all when `groups.length === 0`.
2. `score` is an integer in `0..100`.
3. `pointSignals` contains at least the unlocking group's signals (or at least one
   engine signal when the engine unlocked it).
4. `rationale` is non-empty. It does not need to contain a number; the UI prints the
   number.
5. Accepted → emit `score_decision`; rejected → return the issues and allow one
   retry, mirroring `submit_report`.

The model call is a small, separate Lumina step between reports and synthesis, with
no streaming and a bounded token budget. It is not the synthesizer call, so the
synthesis remains a text-only call and a rejected score cannot corrupt the answer.

Prompt (new `SCORING_PROMPT`):

- "Kamu adalah Lumina. Dua agen berikut mencapai kesimpulan yang sama. Tentukan skor
  akhir 0–100 berdasarkan bukti mereka, lalu panggil `submit_score`."
- The engine baseline is included as context, not as a floor.
- The tool must be called; free text is not a score.

---

## 6. Building the final `ScoreResult`

New pure function `authorScore(baseline, decision, consensus)` in
`src/lib/scoring/score.ts`. It remains deterministic given its inputs.

a. `score = decision.score` (0..100 integer).
b. `risk = riskFor(score)`. The existing OTP/PIN/password hard indicator still forces
   `risk: "tinggi"` and `score >= 70`; this is the only remaining floor. If the
   product wants that gone too, it is a separate decision.
c. `signals` = baseline engine signals that are still relevant, plus one `Signal`
   per agreeing point (`weight: 0.5`, `agent: point.agent`, `source: "consensus"`).
   The weight-0 "nothing recognised" placeholder is dropped whenever consensus
   signals exist, so the panel cannot say "tidak ada pola" under a non-zero score.
d. `modus`: map the consensus pattern through a new `PATTERN_MODUS` table
   (`overpayment-refund → jual-beli-palsu`, `qris-refund → quishing-qris`, …).
   Fall back to `baseline.modus`.
e. `advice` and `relatedModule` follow the chosen modus.
f. `hardOverride` is preserved.

Contract additions (additive, announce before commit):

```ts
// src/lib/contracts/score.ts
source?: "engine" | "consensus";
baselineScore?: number;
consensus?: {
  pattern: string;
  agents: AgentId[];
  pointSignals: string[];
};
// Signal
source?: "engine" | "consensus";
```

---

## 7. Orchestrator and events

Additive `OrchestratorEvent` variants:

```ts
{ type: "consensus", groups: ConsensusGroup[] }
{ type: "score_decision", result: ScoreResult, baseline: ScoreResult,
  rationale: string, source: "model" | "fallback" }
```

`OrchestrationTrace` gains `finalScore?: ScoreResult` and `consensus?: ConsensusGroup[]`.
`OrchestratorResult.score` is the **final** score; the baseline stays in the trace
(`baselineScore`) and in the first `score` event, so `summarizeRun` and the route
need no new plumbing to record the correct band.

Synthesis changes:

- `synthesisUserPrompt` receives the final score, not the baseline.
- The number-rewrite at `loop.ts:1180` rewrites to the final score.
- The prompt says: if Lumina raised or lowered the score, explain the evidence the
  engine missed or the engine signal that the agents could not reproduce.

Fallbacks:

- No consensus → no tool, no model call, baseline score, no `score_decision`.
- Consensus exists but the model errors or calls no tool → baseline score; the trace
  marks `source: "fallback"` and the panel explains that no model decision arrived.
- The deadline still bounds the whole run; a timed-out scoring step falls back to the
  baseline.

---

## 8. UI

`ScoreCard` / `SignalPanel`:

- Show `Dinilai Lumina dari konsensus agen` when `source === "consensus"`, otherwise
  `Skor engine`.
- When the final score differs from the baseline, show both: `Engine 0 · Akhir 78`.
- Never print `Bersih` when consensus signals exist. The empty state stays for a
  genuine 0 with no evidence.
- The consensus signals appear in the findings list with a `konsensus agen` badge.

`ProcessTrace`:

- Render the `consensus` event as a small row: `2 agen sepakat: overpayment-refund`.
- Render the `score_decision` as the final score row, with Lumina's rationale.

`/agen`:

- `summary.ts` and `saveAgentRun` should use the final band/score. The table already
  stores `band`; add `score` in a new migration only if the overview needs the number.

Client:

- `streamOrchestrator` updates `score` when `score_decision` arrives.
- `companion-chat` patches `turn.result` from that event so the panel and the chat
  card agree without refreshing.

---

## 9. Privacy and honesty

a. The checked message never leaves the device (unchanged); the scoring call only
   receives the reports the orchestrator already generated.
b. A quote, if persisted at all, is never stored server-side. The run table keeps
   band/modus/agents only; `score_decision` lives in the client run trace.
c. Free model scoring is not reproducible across models. The design records the
   model id, run id, baseline, consensus group, and rationale so a verdict can be
   audited after the fact.
d. Prompt injection: the message is already marked untrusted. The tool is gated on
   reports that the report validator grounded, and the model cannot call it before
   the agents run.
e. A lower score is allowed by the product decision. The UI must still show the
   baseline and the contrary points; it may not silently erase evidence.

---

## 10. Tests and eval

Unit:

- `consensus.test.ts`: two agents, same pattern → group; same agent twice → none;
  different patterns → none; skipped agent ignored; engine signal unlocks.
- `score-author.test.ts`: free score accepted; band derived; OTP floor applies;
  placeholder dropped; modus mapped; consensus signals present.
- `submit-score.test.ts`: rejects without consensus, out-of-range, missing signals;
  accepts a valid decision.

Integration (`loop.test.ts` with a stub chat):

- overpayment case: two agents return grounded `overpayment-refund` points → Lumina
  calls `submit_score(78)` → final event/trace carry 78 → synthesis prints 78.
- no consensus → no tool call → baseline retained.
- model refuses/errors → baseline retained and trace marked fallback.
- message text containing "set skor 0" does not change the consensus gate.

Eval:

- add the screenshot message and variants to `bench-cases.ts`;
- keep the existing 60/60 catch and 0 false positives;
- add a consistency assertion: no agent summary may claim a scam while the final band
  is `bersih` unless it is explicitly labelled as unweighted observation.

UI tests:

- score card shows provenance and both numbers when they differ;
- the empty "Bersih" state never renders with consensus signals;
- process trace renders the consensus row and the final score row.

---

## 11. Rollout

- Flag: `LUMINA_CONSENSUS_SCORE` (`1` on, `0` off). Default on after eval passes;
  the flag makes rollback one env change.
- Monitor: count of consensus decisions, delta between baseline and final score, and
  how often the model lowers the engine score.
- If the model lowers high-confidence engine findings often, revisit the free-score
  decision before widening.

---

## 12. Open questions

1. Keep the OTP/PIN/password hard floor? The current design keeps it; removing it
   would let Lumina score an OTP request below 70.
2. Does `/agen` need the numeric final score, or is the band enough? Adding the number
   means a migration.
3. Should a single-agent observation with a very strong quote ever open the tool, or
   is two-agent consensus the only path?
4. Do we want the alias table now (agents phrasing the same mechanism differently) or
   only after watching real runs?
