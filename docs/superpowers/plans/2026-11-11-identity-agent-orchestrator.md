# Identity Agent Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Lumina's Orchestrator spawn the eight identity agents from the Agents view, and make each agent generate grounded findings, reasons, patterns, and watchouts through a validated `submit_report` tool.

**Architecture:** One server-safe identity registry feeds the panel, planner, specialist specs, and process trace. The planner selects 2–3 of the eight crew ids; specialists receive deterministic tool evidence and must submit a typed report. Invalid reports are returned as tool errors and corrected once; a second failure is marked `gagal`. Synthesis consumes validated points.

**Tech Stack:** TypeScript, Next.js, Zod, Jest, Playwright/Chromium.

**Spec:** `docs/superpowers/specs/2026-11-11-identity-agent-orchestrator-design.md`

## Global Constraints

- Final score/risk/signals remain owned by `src/lib/scoring/score.ts`; no model writes them.
- Spawnable ids: `message`, `link`, `identity`, `conversation`, `job`, `marketplace`, `qris`, `evidence`.
- Do not spawn `injection` or `email`; they stay deterministic stages in the evidence panel.
- Display names/fields/portraits must match the eight-card Agents view exactly.
- `agent_result.points` max 5; each point has `signal`, `point`, `reason`, `pattern`, `watchout`, optional `quote`.
- `submit_report` invalid → one correction attempt; second failure is `gagal`, never fabricated points.
- `ProcessTrace` process block stays visible by default; `Pemikiran agen` stays collapsed by default.
- No raw JSON in summaries or cards.
- Indonesian UI copy; code comments English.
- Verify with typecheck, targeted Jest, full Jest, build, restart, and live Playwright.

## Review Focus

- A planner response naming a non-crew id must be rejected, not silently mapped.
- A report citing a signal that exists in another agent's detector but was not returned to this agent must be rejected.
- A quote must match the message or the signal evidence; a paraphrase must not pass.
- An empty report on a safe message must be valid, while an empty report when tool signals exist must be rejected.
- The UI must keep working when only `agent_result.findings` (old shape) or no points are present.
- The live run must show the identity name (Mochi/Bubu/Piyo/Naga/Kiko/Lala/Ruru/Bao), never "Injection Agent" as a crew card.

---

### Task 1: Canonical identity crew

**Files:**
- Create: `src/lib/agents/identities.ts`
- Modify: `src/lib/community/agents.ts` (re-export the eight profiles and add `label`, `task`, `purpose`, `mechanisms`)
- Modify: `src/components/companion/agents.ts` (consume the shared identity data for the eight; keep injection/email local)
- Modify: `src/lib/contracts/orchestrator.ts` (`SPECIALIST_IDS` = eight crew)
- Modify: `src/lib/orchestrator/agents.ts` (`SPECIALISTS` = eight; add `field`, `purpose`, `portrait`)
- Modify: `src/lib/orchestrator/loop.ts` (`defaultPlan`, `normalizePlan`; no forced injection/evidence)
- Modify: `src/lib/orchestrator/prompts.ts` (planner lists only crew)
- Test: `src/lib/agents/identities.test.ts`, `src/lib/community/agents.test.ts`, `src/components/companion/agents.test.ts`, `src/lib/orchestrator/agents.test.ts`, `src/lib/orchestrator/loop.test.ts`

**Interfaces:**
- Produces: `CREW_IDS`, `CrewId`, `AGENT_IDENTITIES` with `{ id, displayName, field, label, task, purpose, portrait, mechanisms }`.
- Produces: `SPECIALIST_IDS: readonly CrewId[]`; `SPECIALISTS: Record<CrewId, SpecialistSpec>`.
- Produces: `defaultPlan()` only returns crew ids; `normalizePlan()` never injects `injection`/`email`.

- [ ] **Step 1: Write the failing registry test**

```ts
import { CREW_IDS, AGENT_IDENTITIES } from "@/lib/agents/identities";
import { AGENT_REGISTRY } from "@/components/companion/agents";

expect(CREW_IDS).toEqual([
  "message", "link", "identity", "conversation",
  "job", "marketplace", "qris", "evidence",
]);
for (const id of CREW_IDS) {
  expect(AGENT_IDENTITIES[id].displayName).toBe(AGENT_REGISTRY[id].displayName);
  expect(AGENT_IDENTITIES[id].portrait).toBe(AGENT_REGISTRY[id].portrait);
  expect(AGENT_IDENTITIES[id].field.length).toBeGreaterThan(3);
}
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx jest src/lib/agents/identities.test.ts --runInBand`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the shared registry and wire the eight profiles**

Create the registry with the exact eight rows from the spec. In
`components/companion/agents.ts`, read `displayName`, `field`, `purpose`,
`mechanism`, and `portrait` from the shared registry for those ids. Keep
`injection` and `email` profiles local. Add `field` and `purpose` to
`SpecialistSpec` and set them from the shared registry.

- [ ] **Step 4: Make the planner crew-only**

Change `SPECIALIST_IDS` to `CREW_IDS`, remove the forced injection/evidence
insertion, and make `defaultPlan` start with `message` plus the most relevant
domain agent (link/identity/conversation/job/marketplace/qris) from baseline
signals, then `evidence` only when no domain agent matched. Return at most
`MAX_AGENTS` (2) and never an id outside the crew.

- [ ] **Step 5: Run the focused tests**

Run: `npx jest src/lib/agents/identities.test.ts src/lib/community/agents.test.ts src/lib/orchestrator/loop.test.ts --runInBand`
Expected: PASS, including a new assertion that `defaultPlan` contains no
`injection`/`email` and every id is in `CREW_IDS`.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

---

### Task 2: Typed report contract and validator

**Files:**
- Create: `src/lib/orchestrator/report.ts`
- Test: `src/lib/orchestrator/report.test.ts`

**Interfaces:**
- Produces: `ReportPointSchema`, `SubmitReportSchema`, `ReportPoint`, `SubmitReport`.
- Produces: `validateReport(input, { message, signals })` → `{ ok: true; report } | { ok: false; issues: string[] }`.
- Produces: `SUBMIT_REPORT_TOOL` JSON-schema definition for `openAITools`.

- [ ] **Step 1: Write failing tests for the validator**

```ts
const signals = [{ label: "Meminta kode OTP", evidence: "kirim kode OTP" }];
const valid = {
  thought: "Pesan meminta OTP.",
  summary: "Permintaan OTP adalah indikator kritis.",
  points: [{
    signal: "Meminta kode OTP",
    point: "Pesan meminta kode OTP.",
    reason: "Bank tidak meminta OTP lewat chat.",
    pattern: "credential-request",
    watchout: "Jangan kirim kode OTP.",
    quote: "kirim kode OTP",
  }],
  watchouts: ["Jangan kirim kode OTP."],
  confidence: 0.9,
};
expect(validateReport(valid, { message, signals }).ok).toBe(true);
```

Failure cases: unknown signal, quote not in message/evidence, confidence 1.2,
duplicate signal, points empty when signals non-empty, too many points, raw JSON
string as `summary`.

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx jest src/lib/orchestrator/report.test.ts --runInBand`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the schema and validator**

Use `.strict()` Zod objects. Reject duplicates by normalized `signal`. Require
`points.length >= 1` when `signals.length > 0`. `quote` must be a substring of
`message` or one of the signal `evidence` values after whitespace/case
normalization. `summary` must not start with `{` or a code fence. Return all
issues in one array, human-readable.

- [ ] **Step 4: Run the validator tests**

Run: `npx jest src/lib/orchestrator/report.test.ts --runInBand`
Expected: PASS, all cases.

---

### Task 3: Real specialist tool loop with correction

**Files:**
- Modify: `src/lib/orchestrator/loop.ts` (`runSpecialist`)
- Modify: `src/lib/contracts/orchestrator.ts` (`agent_result.points`, optional profile fields)
- Modify: `src/lib/orchestrator/tools.ts` (export `openAITools` usage / evidence labels)
- Modify: `src/lib/orchestrator/prompts.ts` (submit instructions)
- Test: `src/lib/orchestrator/loop.test.ts`

- [ ] **Step 1: Write a failing loop test**

The mock chat returns an invalid `submit_report` tool call first, then a valid
one. Assert the event order includes `tool_call(submit_report)` →
`tool_result(ok:false)` → `tool_call(submit_report)` → `tool_result(ok:true)` →
`agent_result(points)` and that the final summary contains no `{`.

- [ ] **Step 2: Implement `submit_report` execution**

In `runSpecialist`, after pre-executing evidence tools, send the evidence and
the available tool definitions (`openAITools([...spec.tools, "submit_report"])`)
to the model. Loop up to 2 model calls:

- parse `tool_calls`;
- for `submit_report`, validate against evidence labels; emit tool events;
- on invalid, append the assistant tool call + tool error message and retry;
- on valid, use the report and stop;
- if the model returns no report after the retry, return `status: "gagal"` with
  the grounded tool summary and no points.

Do not parse free-form JSON as a report anymore.

- [ ] **Step 3: Extend the event contract**

Add `points` to `agent_result` with the report schema and default `[]`. Update
the trace schema only if needed. Keep old events parseable.

- [ ] **Step 4: Run the focused tests**

Run: `npx jest src/lib/orchestrator/loop.test.ts src/app/api/companion/orchestrate/route.test.ts --runInBand`
Expected: PASS, including the retry and no-raw-JSON cases.

---

### Task 4: Identity cards and points in the process trace

**Files:**
- Modify: `src/components/companion/process-trace.tsx`
- Modify: `src/components/companion/process-trace.test.tsx`
- Modify: `src/lib/contracts/orchestrator.ts` only if the event shape changed

- [ ] **Step 1: Write failing UI assertions**

Render a trace with `agent_start: message`, `agent_result.points` for OTP.
Assert the card shows `Mochi`, `Pesan & rekayasa sosial`, the point, reason,
pattern chip, and watchout. Assert `Pemikiran agen` exists but its `details` has
no `open` attribute. Assert the outer process `details` is `open`.

- [ ] **Step 2: Render the profile**

Resolve the profile from `AGENT_IDENTITIES` (or `AGENT_REGISTRY` for the eight).
Show portrait (or initial), display name, field, role label, purpose, skills,
and tools. Keep the raw agent id as a small monospace token.

- [ ] **Step 3: Render points**

Add a "Poin temuan" block under the summary:
- `point` as the row title;
- `reason` as prose;
- `pattern` as a chip;
- `watchout` with a label such as "Perhatikan".
Fall back to `findings` for old events with no points.

- [ ] **Step 4: Keep the process visible and thoughts hidden**

Set the outer `details` to `open`; keep the nested `Pemikiran agen` `details`
closed. Verify with Playwright later.

- [ ] **Step 5: Run UI tests**

Run: `npx jest src/components/companion/process-trace.test.tsx --runInBand`
Expected: PASS.

---

### Task 5: Synthesis, full verification, live proof

**Files:**
- Modify: `src/lib/orchestrator/prompts.ts` (include points/watchouts)
- Modify: `src/lib/orchestrator/loop.ts` (pass points to synthesis)
- Modify: `src/lib/orchestrator/loop.test.ts`
- Create: `ui-check-identity-agents.js` in the Hermes scratch directory

- [ ] **Step 1: Add points to the synthesis input test**

Assert `synthesisUserPrompt` includes a point's reason, pattern, and watchout.

- [ ] **Step 2: Pass points through**

Map `SpecialistResult.points` into the synthesis reports. Keep the deterministic
score and advice fallback.

- [ ] **Step 3: Run full gates**

Run: `npx tsc --noEmit && npx biome check src && npx jest --runInBand && npm run build`
Expected: all green.

- [ ] **Step 4: Deploy and verify live**

Restart `lumina.service`, check `/api/health` 200, then run Playwright with the
test session: send an OTP scam, wait for the process, assert the eight-card
identity names (at least Mochi and Ruru) appear with points/reasons/patterns/
watchouts, assert `Pemikiran agen` is collapsed, expand it, and save screenshots.
