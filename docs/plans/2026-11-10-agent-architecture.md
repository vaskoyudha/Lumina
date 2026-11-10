# Agent Architecture — Implementation Plan

**Status:** Draft · 10 November 2026
**Owner:** Stream A (engine + companion)
**Goal:** Turn Lumina’s visible “crew” from a static fan-out of detectors into a validated, observable pipeline — with a real validator, honest evidence sufficiency, bounded tool use, and a Pi-compatible runtime only where it earns its place.

**Architecture:** Keep the deterministic engine as the judge. Add four layers around it:

```text
user input
   │
   ├─ Triage (pure)                decides which optional tools are worth calling
   │
   ├─ Detectors (pure, 7 today)    message · link · identity · conversation ·
   │                               job · marketplace · qris
   │
   ├─ Validator (pure)             cluster correlated signals · drop weak
   │                               duplicates · detect contradiction ·
   │                               decide evidence sufficiency
   │
   ├─ Finalize (pure)              the only place score/risk/signals exist
   │
   ├─ Optional enrichment          URL / email / file verification returns
   │                               Signal[]; re-finalize with extraSignals
   │
   └─ Voice                        language only; never a finding, never a score
```

**Tech stack:** Next 16.4.5 App Router, React 19.3, TypeScript strict, zod 4, Jest 30, Biome 2.x. Pi packages only in the gated phases: `@earendil-works/pi-ai` and, if justified, `@earendil-works/pi-agent-core` 1.5.2 (MIT).

**Spec:** `docs/plan.md` §3 (AI Agents), §11.1 (scoring), §11.6 (privacy), §11.7 (LLM boundary).
**Related:** `docs/plans/2026-11-10-detection-coverage.md`, `docs/plans/2026-11-10-learning-companion.md`.

---

## 1. Baseline: what is actually there

| Component | Current behaviour | File |
|---|---|---|
| Pipeline | One ordered `DETECTORS` list; all run synchronously | `src/lib/scoring/score.ts:210-260` |
| Aggregation | Probabilistic OR of every weight | `src/lib/scoring/score.ts:33-36` |
| Dedupe | By label only, keeping the highest weight | `src/lib/scoring/score.ts:43-50` |
| Finalize | Merges signals, sorts, applies OTP hard override, classifies modus | `src/lib/scoring/score.ts:264-313` |
| Trace | One stage per detector + scoring stage; measured `ms` | `src/lib/scoring/score.ts:326-383` |
| Contracts | `Signal`, `ScoreResult` frozen; `AgentTrace` additive | `src/lib/contracts/score.ts`, `agent-run.ts` |
| LLM | Voice only; digest schema drops `evidence` | `src/lib/contracts/agent-run.ts:101-138` |
| Conversational lanes | `tanya`, `lanjutan`, `obrolan`; no tools | `src/lib/contracts/answer.ts:17` |
| Tool calling | None in the product | — |
| Memory | Session transcript in the client; no case store | — |

**The three real defects this plan fixes:**

1. **Correlated signals triple-count one mechanism.** “Transfer ke rekening”, “rekening a.n.”, and “top up” are three weights combined as if independent. A single scam mechanism can reach a high score without a second, independent finding.
2. **There is no reflection step.** The UI calls the stages “agents”, but no stage checks whether the evidence is sufficient, contradictory, or thin. The `<5%` false-positive claim depends on the bench, not on a runtime guard.
3. **There is no tool loop.** The system cannot verify a link, fetch reputation, or ask a follow-up question. It is a classifier with a chat voice, not an agent runtime.

The plan is deliberately ordered so the first two are fixed **without** adding a model runtime, and the third is added only when the product has a tool that genuinely needs a loop.

---

## 2. Contract changes (additive only)

`src/lib/contracts/**` is frozen for existing fields. This plan adds optional fields and new union members. Announce all of them before the commit, per `AGENTS.md` §5.

```ts
// contracts/score.ts — additive
export interface Signal {
  // existing: label, weight, evidence, agent
  /** Mechanism this finding belongs to, e.g. "payment-redirect". */
  mechanism?: MechanismId;
  /** Stable rule id for audit and bench mapping. */
  ruleId?: string;
}

// contracts/agent-run.ts — additive
export type StageId =
  | AgentId
  | "voice"
  | "job-search"
  | "triage"
  | "validator"
  | "verify";

export interface ValidationSummary {
  verdict: "cukup" | "tipis" | "bertentangan";
  clusters: number;
  topWeight: number;
  capped: boolean;
  note: string;
}

export interface AgentTrace {
  stages: AgentStage[];
  totalMs: number;
  validation?: ValidationSummary; // additive
}
```

`ScoreResult` does **not** change. “Perlu tinjauan” is a presentation of `ValidationSummary`, not a new risk band. `riskFor()` remains the only place a score becomes a band.

---

## 3. Task A1 — Mechanism taxonomy

**Files:** create `src/lib/scoring/mechanism.ts`, `src/lib/scoring/mechanism.test.ts`; modify detectors to attach `mechanism` to each weighted signal.

Mechanisms (start small; extend only when two signals are genuinely independent):

| Mechanism | Examples |
|---|---|
| `authority-claim` | “dari Bank BCA”, “petugas kepolisian” |
| `urgency-pressure` | deadline, account blocked, “sekarang juga” |
| `payment-redirect` | transfer to personal account, top-up, DP |
| `credential-request` | OTP, PIN, password, screen share |
| `link-deception` | lookalike domain, shortener, credential path |
| `attachment-risk` | APK, double extension, unexpected PDF |
| `reward-lure` | prize, commission, refund, overpayment |
| `relationship-lure` | love scam, family emergency |
| `identity-mismatch` | sender number vs claimed institution |
| `platform-evasion` | move payment/chat outside marketplace |
| `escalation` | staged conversation progression |
| `injection` | instructions aimed at the checker |

Rules:

- Every weighted signal must have a `mechanism`. A test walks the bench and fails on any weighted signal without one.
- A signal may belong to one mechanism only. If it feels like two, split the rule.
- `ruleId` is stable and namespaced: `message.otp-request`, `link.lookalike`, `job.upfront-fee`, `email.dmarc-fail`.

**Tests:** every detector’s test asserts its signals’ mechanisms; the bench walk fails on an unmapped signal; mechanism ids are unique strings and exported as a union.

---

## 4. Task A2 — Validator

**Files:** create `src/lib/scoring/validate.ts`, `src/lib/scoring/validate.test.ts`; modify `src/lib/scoring/score.ts` (`finalize`, `scoreWithTrace`).

### Algorithm

Input: `readonly Signal[]` plus `hardOverride: boolean`.

1. **Group by mechanism.** For each cluster, keep the **maximum** weight, not the OR of all members. Record how many raw findings were collapsed.
2. **Contradiction check.** A cluster is contradicted when a higher-confidence signal with the same mechanism says the opposite (for example, an official-domain match vs a lookalike; a warning quote vs a lure). The current detectors rarely emit opposites, so start with a small explicit table:
   - `link.official-domain` contradicts `link.lookalike` (keep official only if no other link signal).
   - `message.quoted-warning` suppresses the exact rule it quotes, not the whole message.
3. **Sufficiency.**
   - `hardOverride` → `cukup`; no cap.
   - `clusters >= 2` → `cukup`.
   - `clusters == 1` and `topWeight >= 0.5` → `cukup`.
   - `clusters == 1` and `topWeight < 0.5` → `tipis`; cap the score at **39** (`rendah`).
   - Any contradiction without another independent cluster → `bertentangan`; cap at **39**.
4. **Return** validated signals (the cluster maxima, preserving the best evidence), `ValidationSummary`, and the raw-to-validated mapping for the trace.

### Worked examples the tests must pin

| Input signals | Before | After | Why |
|---|---|---|---|
| transfer (0.45) + rekening (0.35) + top-up (0.30) — all `payment-redirect` | OR ≈ 75 | max 0.45 → 45 `mencurigakan` | one mechanism, not three |
| OTP request (hard) + urgency | 70+ | 70+ | hard override untouched |
| lookalike domain (0.55) alone | 55 | 55 `mencurigakan` | one strong mechanism is enough |
| weak urgency (0.25) alone | 25 `rendah` | 25, `tipis` | no false confidence |
| official domain + lookalike | OR | official only, `bertentangan` | contradiction is explicit |
| two independent mechanisms (attachment 0.5 + urgency 0.3) | OR 65 | 65 `mencurigakan` | genuine corroboration |

**Acceptance:** no bench scam drops below `mencurigakan`; no bench legit case becomes risky; the correlated-trio test drops at least 25 points vs the old OR.

### Integration

`finalize()` calls `validate()` before `accumulate()`. `scoreWithTrace()` appends a `validator` stage with `findings = validated.clusters`, `status = "selesai" | "temuan" | "dilewati"`, and `note = summary.note`. The validator stage owns no signal; it explains the decision.

`AgentTrace.validation` is populated for the UI. `scoreText()` keeps its signature.

---

## 5. Task A3 — Evidence-strength UI

**Files:** `src/components/companion/agent-run.tsx`, `signal-panel.tsx`, tests beside each.

- Render a small badge on the validator row: `Bukti cukup`, `Bukti tipis`, or `Ada kontradiksi`.
- When `tipis`, show one line under the result: “Hanya satu pola yang kuat. Periksa ulang sebelum menyimpulkan.” Do not change the risk label.
- When `bertentangan`, show which two findings conflict, in plain Indonesian.
- 380 px: no horizontal scroll; the badge wraps.
- No colour outside existing tokens (`warn`, `danger`, `brand`, `dim`).
- Reduced motion: none.

**Tests:** `tipis` renders the note; `cukup` does not; `bertentangan` names both findings; hard override still shows `cukup`; long labels wrap at 380 px.

---

## 6. Task A4 — Triage and enrichment budget

**Files:** create `src/lib/verify/plan.ts`, `plan.test.ts`; create `src/lib/contracts/verify.ts`.

Triage is pure and deterministic. It does **not** skip cheap local detectors; it decides whether optional work is worth doing. The file lives under `src/lib/verify/` because `src/data/triage.ts` already means the emergency checklist — do not reuse that name.

```ts
interface TriagePlan {
  verify: Array<"link" | "email" | "file">;
  reason: string;
  budgetMs: number; // max 2500
}
export function planEnrichment(input: {
  text: string;
  hasLink: boolean;
  hasHeaders: boolean;
  hasAttachment: boolean;
  localRisk: Risk;
}): TriagePlan;
```

Rules:

- A link is verified only when `hasLink` and (`localRisk` is `mencurigakan+` or the link is unknown to the official allowlist).
- Email headers are parsed locally; no network. The `email` entry is for future raw-header verification, not for fetching.
- A file is hash-checked only when the user attached one and consented.
- Maximum 2 verification targets per turn. The reason is shown in the trace.
- Triage never blocks the verdict: it runs after `scoreWithTrace()`.

**Tests:** clean text with no link → empty plan; suspicious link → one target; official domain link → skipped with reason; three links → capped at two; attachment + link → both within budget; reason always non-empty.

---

## 7. Task A5 — Enrichment client and re-score

**Files:** create `src/lib/companion/enrich.ts`, `enrich.test.ts`; modify `companion-chat.tsx`, `agent-run.tsx`.

Flow:

1. Local `scoreWithTrace()` returns instantly.
2. If triage says `verify`, call `/api/verify-link` (and later `/api/verify-file`).
3. On success, collect `Signal[]`, call `scoreText({ text, extraSignals })` again — the same engine, no new scorer.
4. Merge the trace: append a `verify` stage with `status: "selesai" | "gagal" | "dilewati"`, measured `ms`, and the honest note.
5. On timeout or failure, keep the local result unchanged and show `"Verifikasi lanjutan tidak tersedia"`.

Hard rules:

- Enrichment may add signals; it may never remove an existing local signal. If a verified official domain should reduce a lookalike false positive, that belongs in the validator’s contradiction table, not in the network layer.
- Only the URL or hash leaves the device. Never the message, the sender, the account number, or the user identity.
- The client abort is 3 s; the route abort is 2.5 s.

**Tests:** success adds a signal and re-scores; failure leaves the result byte-identical; timeout aborts; no message text in the request body; a late response after unmount is ignored.

---

## 8. Task A6 — Pi `pi-ai` as the voice provider (gated)

**Decision:** use `@earendil-works/pi-ai` only as a provider abstraction for the existing voice and answer lanes. It does not judge, route, or call tools. Keep the current `fetch` path as a fallback behind an env flag.

**Files:** add dependency; create `src/lib/ai/provider.ts`, `provider.test.ts`; modify `src/lib/companion/voice-stream.ts` and `src/app/api/companion/voice/route.ts` behind `VOICE_PROVIDER=pi|fetch`.

Requirements:

- Node runtime check: Pi 1.5.2 needs Node ≥ 22.19.0. If the deployment is older, the flag stays `fetch`.
- Pin the version exactly; add MIT notice to `THIRD_PARTY_NOTICES.md`.
- Preserve the existing streaming contract and abort deadline (20 s route, 23 s client).
- Provider fallback order from env; log provider and latency, never the prompt or the message.
- The voice digest remains the only payload; no raw message.

**Tests:** mock provider stream; abort mid-stream; provider error falls back; digest is unchanged; no key in logs.

**Acceptance:** switching `VOICE_PROVIDER` does not change any test expectation outside the adapter.

---

## 9. Task A7 — Bounded tool loop with `pi-agent-core` (only if needed)

**Decision gate:** do not add this runtime just to say “we use Pi”. Add it only when the companion must perform **more than one dependent tool call** (for example: verify URL → if redirect, verify final host → if blocklisted, fetch the campaign label). If Task A5 already covers the demo, stop at A6.

**Files:** add `@earendil-works/pi-agent-core`; create `src/lib/agent/runtime.ts`, `src/lib/agent/tools.ts`, `src/lib/agent/tools.test.ts`; route `src/app/api/companion/verify/route.ts`.

Tool registry — read-only, no shell, no file, no exec:

| Tool | Input | Output | Guard |
|---|---|---|---|
| `verify_url` | URL reference from the engine | `LinkVerification` | URL must be in the engine’s extracted set; SSRF guard from the detection plan |
| `domain_age` | domain | days or null | RDAP only |
| `blocklist_check` | URL | source verdicts | cached providers only |
| `lookup_campaign` | fingerprint | template label or null | local data only |

Runtime limits:

- Max 4 tool calls per turn; max 3 s wall clock; max 2 model turns.
- The model receives **opaque references** (`entity:link:1`) for URLs extracted by the deterministic layer. It cannot introduce a new URL, account, or phone number. This is the prompt-injection boundary: even a fully compromised model can only ask about entities the engine already found.
- Every tool argument is validated with zod; unknown keys are rejected.
- No tool may return raw HTML or file bytes; only typed fields.
- A kill switch (`AGENT_TOOLS=off`) returns the local result.

**Tests:** model asks for an unknown URL → rejected; tool timeout → trace `gagal`; 5th call → rejected; injected message instructs “fetch attacker.example” → not in the entity set, rejected; no shell/file tool exists; kill switch returns local result.

**Honesty line:** if this lands, the proposal may say “bounded tool use with a read-only allowlist”, not “autonomous agents”.

---

## 10. Task A8 — Case memory and observability

**Files:** create `src/lib/agent/case-store.ts`, `case-store.test.ts`; modify `scoreWithTrace` callers to record a case id.

Store only what is needed to explain a verdict later:

```ts
interface CaseRecord {
  id: string;
  createdAt: string;
  inputHash: string;       // sha256, not the text
  signals: Array<{ ruleId: string; mechanism: string; weight: number }>;
  validation: ValidationSummary;
  trace: AgentTrace;
  toolCalls: Array<{ name: string; ms: number; status: string }>;
  model?: { provider: string; name: string; version: string };
}
```

- No raw message, no evidence quote, no account number in the store.
- TTL 24 hours in the demo; a database-backed store is a separate plan.
- The UI can export a trace as JSON for debugging.
- Logs are structured and redact any field named `text`, `evidence`, `question`, `authorization`, `key`.

**Tests:** record excludes raw text; hash is stable; TTL expiry; export shape; log redaction.

---

## 11. Task A9 — Evaluation and release gate

**Files:** `src/lib/scoring/validate.test.ts`, `src/lib/scoring/score.bench.test.ts`, `src/lib/agent/runtime.test.ts`, `src/lib/companion/enrich.test.ts`.

Agent-level metrics to record:

- Validator cap rate on scam vs legit cases.
- Scam cases where `clusters == 1` and `topWeight < 0.5` (the dangerous thin-evidence set).
- False positives introduced by enrichment.
- Tool calls per turn, p95 latency, failure rate.
- Provider fallback rate and voice latency.

Gates:

- [ ] Bench recall ≥ 90%, FP ≤ 5%, classification ≥ 85%.
- [ ] No scam case is capped below `mencurigakan` unless it was already weak before this plan.
- [ ] Hard override unchanged: OTP/PIN/password always `tinggi`.
- [ ] Validator tests cover the six worked examples.
- [ ] Enrichment failure is byte-identical to the local result.
- [ ] `npm run verify` passes.
- [ ] `THIRD_PARTY_NOTICES.md` lists Pi and every data source.
- [ ] No secret in any log or test snapshot.

---

## 12. Release slices

1. **Slice 1 — Validator only.** A1 + A2 + A3. No dependency, no network. This is the highest-value change and the one the pitch needs (“validation and explainability”).
2. **Slice 2 — Enrichment.** A4 + A5. Network optional; demo can run offline.
3. **Slice 3 — Pi voice.** A6. Provider abstraction, no tool loop.
4. **Slice 4 — Bounded tools.** A7 only if the product needs dependent calls.
5. **Slice 5 — Memory/observability.** A8 + A9.

---

## 13. Risks and open questions

- **Validator can hide real scams.** A single strong signal must stay `mencurigakan`; only weak single signals are capped. The bench is the guard, and the cap rule is explicit.
- **Mechanism taxonomy can become a second rule engine.** Keep it small; split only when two findings are genuinely independent.
- **Pi adds a dependency and a Node floor.** Gate on Node ≥ 22.19; keep the `fetch` fallback; pin the version.
- **Tool use expands the attack surface.** The opaque-entity design is the mitigation: the model cannot name a new target. Do not relax it for convenience.
- **Contract additions still need announcement.** Even optional fields cross streams.
- **Open question:** does the competition demo need live tools, or is a validated static pipeline more convincing? Default: static pipeline + recorded enrichment trace.
