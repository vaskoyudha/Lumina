# Panel Bukti Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the fixed eight-branch result graph in the right-hand Panel Bukti with an outcome-grouped evidence ledger that accounts for every agent and adapts its height to the findings.

**Architecture:** A pure `buildPanelLedger()` derives six outcomes from `AgentTrace` plus surviving signals. `SignalPanel` keeps its empty-state teaching graph, but its result state renders a verdict card, a coverage strip, finding-agent cards, collapsible clean/no-object/pending groups, failed cards, a compact synthesis, and a trace disclosure. The evidence link reuses `EvidenceText`'s controlled selection.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, shadcn/Radix, Jest 30 + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-09-panel-bukti-ledger-design.md`

**Status:** Implemented · 2026-11-09

## Global Constraints

- Do not change `src/lib/scoring/**`, `src/lib/contracts/**`, or any scoring behavior.
- No new dependencies, no new design tokens, no new API routes.
- Preserve Indonesian copy and the existing app-next token vocabulary.
- All eight agents remain represented; `dilewati` is rendered as “Tanpa objek”, never “Dilewati” or “skipped”.
- No fake live states; only a real `berjalan` stage may pulse.
- No commits; the worktree remains uncommitted unless the user asks.
- Readable at 1440×900 and 380×800 with no horizontal overflow.

## Review Focus

- A result with no `trace` still shows its findings and never invents coverage.
- A clean result still renders the `Temuan terdeteksi` list with its empty message.
- A trace missing the `evidence` stage shows `Belum tercatat`, not `8 diperiksa`.
- A failed stage is never collapsed or hidden.
- The “Lihat di pesan” button is absent when no callback is supplied.
- Clicking a finding twice clears the message highlight.

---

### Task 1: Ledger model

**Files:**
- Create: `src/components/companion/panel-ledger.ts`
- Test: `src/components/companion/panel-ledger.test.ts`

**Interfaces:**
- Consumes: `DetectorAgent` from `agents.ts`, `AgentTrace` from `contracts/agent-run.ts`, `Signal` from `contracts/score.ts`.
- Produces:

```ts
export type PanelOutcome =
  | "finding"
  | "clean"
  | "no_object"
  | "failed"
  | "live"
  | "pending";

export interface PanelAgent {
  agent: DetectorAgent;
  outcome: PanelOutcome;
  count: number;
  findings: Signal[];
  note?: string;
  ms?: number;
}

export interface PanelLedger {
  agents: PanelAgent[];
  findingAgents: PanelAgent[];
  cleanAgents: PanelAgent[];
  noObjectAgents: PanelAgent[];
  failedAgents: PanelAgent[];
  liveAgents: PanelAgent[];
  pendingAgents: PanelAgent[];
  otherFindings: Signal[];
  counts: {
    checked: number;
    finding: number;
    clean: number;
    noObject: number;
    failed: number;
    live: number;
    pending: number;
  };
}

export function buildPanelLedger(
  sequence: readonly DetectorAgent[],
  trace: AgentTrace | null | undefined,
  findings: readonly Signal[],
): PanelLedger;
```

- [x] **Step 1: Write the failing tests**

Cover:
- APK result: `agents.length === AGENT_SEQUENCE.length`, `findingAgents` includes `message`, every finding agent has `count > 0`.
- Clean result: `findingAgents.length === 0`; every non-pending agent is `clean`, `no_object`, or `failed`.
- Synthetic `failed` stage: outcome is `failed`, note preserved.
- Synthetic `berjalan` stage: outcome is `live`.
- Result without trace: findings still appear; every non-finding agent is `pending`; `counts.checked === 0`.
- Positive signal with `agent: "scoring"`: appears in `otherFindings`, not in an agent card.
- Invariant: `counts.checked + counts.live + counts.pending === sequence.length`.

Run: `npx jest src/components/companion/panel-ledger.test.ts --runInBand`
Expected: FAIL because the module does not exist.

- [x] **Step 2: Implement the pure builder**

Use `stageById = new Map(trace?.stages.map(...))`. Group positive findings by `signal.agent ?? "scoring"`. For each sequence agent, derive:

- `finding` when its surviving count is greater than zero.
- Otherwise, `live` for `berjalan`, `failed` for `gagal`, `no_object` for `dilewati`, `clean` for `selesai` or `temuan` with zero surviving findings, `pending` otherwise.
- No trace means `pending` for every agent with no findings.

Compute the filtered arrays in pipeline order and the counts from outcomes. `checked` is finding + clean + no_object + failed; live and pending are separate.

Run the test. Expected: PASS.

---

### Task 2: Ledger view primitives

**Files:**
- Create: `src/components/companion/panel-ledger-view.tsx`
- Test: `src/components/companion/panel-ledger-view.test.tsx`

**Interfaces:**
- Consumes: `PanelLedger`, `PanelAgent`, `AgentTrace`, `STAGE_LABEL`, `AGENT_REGISTRY`.
- Produces:

```ts
export function CoverageStrip({ ledger }: { ledger: PanelLedger }): ReactNode;
export function FindingsSection({
  agents,
  titleId,
  onSelectEvidence,
}: {
  agents: readonly PanelAgent[];
  titleId: string;
  onSelectEvidence?: (evidence: string) => void;
}): ReactNode;
export function CoverageGroup({
  label,
  agents,
  defaultOpen,
}: {
  label: string;
  agents: readonly PanelAgent[];
  defaultOpen?: boolean;
}): ReactNode;
export function TraceDisclosure({ trace }: { trace: AgentTrace }): ReactNode;
```

- [x] **Step 1: Write failing component tests**

Assert:
- `CoverageStrip` renders eight `[data-coverage-tick]` elements and the sentence `8 diperiksa`.
- `FindingsSection` always renders `role="list"` named `Temuan terdeteksi`; with no agents it renders the empty message; with a finding agent it renders the agent label, quote, and calls `onSelectEvidence` with the exact quote.
- `CoverageGroup` is closed by default, opens on click, and reveals the trace note.
- `TraceDisclosure` is closed by default, opens on click, and reveals a stage label and duration.

Run: `npx jest src/components/companion/panel-ledger-view.test.tsx --runInBand`
Expected: FAIL because the module does not exist.

- [x] **Step 2: Implement the view primitives**

Use existing `Collapsible`, `Button`, `AGENT_REGISTRY[agent].icon`, and tokens. `CoverageStrip` uses eight flex ticks with `data-outcome`; keep the ticks `aria-hidden` and the sentence visible. `CoverageGroup` uses a `CollapsibleTrigger` with `aria-expanded` supplied by Radix and a rotating `ChevronDown`. `FindingsSection` uses a single outer `<ul aria-label="Temuan terdeteksi">`; each agent is an `<li>` with a nested finding list. The “Lihat di pesan” button appears only when `onSelectEvidence` is provided and the signal has evidence.

Run the test. Expected: PASS.

---

### Task 3: Integrate the ledger into SignalPanel

**Files:**
- Modify: `src/components/companion/signal-panel.tsx`
- Modify: `src/components/companion/signal-panel.test.tsx`
- Modify: `src/components/companion/companion-chat.test.tsx` (coverage assertion only)

**Interfaces:**
- Consumes: `buildPanelLedger`, `CoverageStrip`, `FindingsSection`, `CoverageGroup`, `TraceDisclosure`.
- Produces: `SignalPanel` result state with the ledger; no new exported API yet.

- [x] **Step 1: Update the panel tests first**

Replace assertions that depend on the old graph:
- Header no longer contains `Q4→…`; it contains the coverage sentence `8 diperiksa` and the findings badge.
- A finding still appears under `Temuan terdeteksi`, credited to its agent.
- The prize message shows a `Tanpa objek` group; opening it reveals `Link Agent` and the trace note.
- A clean result still renders the `Temuan terdeteksi` list and `0 temuan`.
- The emergency link and privacy copy remain.
- The result state has no `[data-port]` nodes; the empty state still has the teaching list.
- The live test still finds `data-live="true"` only on the voice node.

Run: `npx jest src/components/companion/signal-panel.test.tsx --runInBand`
Expected: FAIL against the current panel.

- [x] **Step 2: Implement the result ledger**

At the top of `SignalPanel`, compute `findings = result?.signals.filter(s => s.weight > 0) ?? []` and `ledger = buildPanelLedger(sequence, trace, findings)`.

Header:
- Keep the title and subtitle.
- Replace the `Q4→…` and `x/8 agen` badges with `{findings.length} temuan` when `result` exists, or `{sequence.length} agen` when empty.
- Render `<CoverageStrip ledger={ledger} />` under the subtitle only when `result` exists.

Result state:
- Remove the measured canvas, zoom toolbar, Q-codes, and “Then →” rows from the result branch.
- Render `RootNode` as the verdict card with `port={false}` and no code/kind.
- Render `FindingsSection` with `findingAgents`.
- Render `CoverageGroup` for clean, no-object, and pending agents. Default-open both clean and no-object when there are no findings; pending opens only when it is the only group.
- Render failed agents as full inline rows, never inside a collapsed group.
- Render a compact synthesis card with the total findings badge and artifacts.
- Render `TraceDisclosure` inside synthesis when `trace` exists.
- Render `VoiceNode` without a Q-code.
- Keep the privacy note and emergency link.

Empty state:
- Keep the existing teaching graph and list.
- Update the header badge only.

Make `RootNode`’s `code`, `kind`, and port optional; make `VoiceNode`’s `code` optional. Remove the old result-only `nodes`, `ranCount`, `synthesisStatus`, and `coverageCount` code once unused.

Run the panel test. Expected: PASS.

- [x] **Step 3: Update the chat coverage assertion**

Replace `\d+ dari 8 agen memeriksa pesan ini` with `/8 diperiksa/` in `companion-chat.test.tsx`. Run that suite. Expected: PASS.

---

### Task 4: Evidence link from panel to message

**Files:**
- Modify: `src/components/companion/signal-panel.tsx`
- Modify: `src/components/companion/companion-chat.tsx`
- Modify: `src/components/companion/companion-chat.test.tsx`

**Interfaces:**
- Consumes: `EvidenceText` already accepts `activeEvidence` and `onSelect`.
- Produces: `SignalPanel` prop `onSelectEvidence?: (evidence: string) => void`; `CompanionChat` owns `activeEvidence`.

- [x] **Step 1: Write the failing integration test**

In `companion-chat.test.tsx`, after opening the APK scenario:
- Find a `Lihat di pesan` button in the panel.
- Click it.
- Assert the matching `Temuan:` button in the user message has `aria-pressed="true"`.
- Click the same panel button again.
- Assert it returns to `aria-pressed="false"`.

Run: `npx jest src/components/companion/companion-chat.test.tsx --runInBand`
Expected: FAIL because the button does not exist.

- [x] **Step 2: Implement the link**

Add `onSelectEvidence` to `SignalPanel` and pass it to `FindingsSection` for both the desktop aside and the mobile sheet.

In `CompanionChat`:
- Add `activeEvidence` state.
- Add a handler that toggles: same quote clears, different quote selects.
- Reset it when the active session changes.
- Pass `activeEvidence` to every `EvidenceText` user bubble.
- After selection, find the first `[data-evidence]` element whose `dataset.evidence` equals the quote and call `scrollIntoView` when available.

Run the test. Expected: PASS.

---

### Task 5: Verification and visual check

**Files:** none.

- [x] **Step 1: Run the full gate**

`npm run verify`
Expected: exit 0; typecheck, Biome, all Jest suites, and production build pass.

- [x] **Step 2: Visual check**

Start the dev server on port 3100 and capture the APK scenario at 1440×900 and 380×800:
- Coverage sentence and eight ticks are visible.
- Finding agent cards show quotes and “Lihat di pesan”.
- `Tanpa objek` and `Diperiksa, nihil` groups open and close.
- Clicking a finding highlights the message phrase.
- No horizontal overflow at 380 px.

- [x] **Step 3: Clean up**

Kill the dev server and Chromium. Leave the worktree uncommitted. Report the exact test counts and any remaining visual issue.

---

## Outcome

Implemented on `feat/sidebar-profile-polish`, uncommitted.

- **Ledger model:** `panel-ledger.ts` maps every `AgentTrace` stage plus every surviving signal to `finding`, `clean`, `no_object`, `failed`, `live`, or `pending`; `panel-ledger.test.ts` covers all six outcomes and the no-trace case.
- **Ledger view:** `panel-ledger-view.tsx` renders the sentence + eight-tick `CoverageStrip`, finding-agent cards with quotes, collapsible `Diperiksa, nihil` / `Tanpa objek` / `Belum tercatat` groups, inline failed cards, a compact synthesis, and the trace disclosure.
- **Panel integration:** the result state no longer renders the fixed eight-branch graph or Q-numbering. It renders verdict → coverage → findings → absence → synthesis → trace, plus the real voice stage and recorded artifacts. The empty state still teaches with the original graph.
- **Evidence link:** `FindingsSection` calls `onSelectEvidence`; `CompanionChat` owns a controlled `activeEvidence`, resets it on session change, scrolls the first matching `[data-evidence]` into view when available, and toggles the same quote off on a second click. Both the desktop aside and mobile sheet receive the callback.
- **Copy:** `dilewati` now reads `tanpa objek`; the panel never calls it “skipped” or hides it. Failed stages stay visible.

### Verification

- Targeted: `npx jest panel-ledger panel-ledger-view signal-panel companion-chat companion-entry evidence-text --runInBand` — 6 suites, 53 tests passed.
- Full gate: `npm run verify` exit 0 — `112 passed, 4 skipped` suites; `875 passed, 19 skipped` tests; Biome clean; production build compiled in 9.7 s.
- Browser: APK scenario at 1440×900 produced `8 diperiksa · 1 menemukan · 1 nihil · 6 tanpa objek`; the finding card showed `Undangan-Pernikahan.apk` and `Lihat di pesan`; clicking it set the matching `Temuan:` button to `aria-pressed="true"`; clicking again cleared it. At 380×800 there was no horizontal overflow (`scrollWidth === clientWidth === 380`) and the panel remained a drawer. Screenshots: `/tmp/lumina_ledger_1440.png`, `/tmp/lumina_ledger_1440_link.png`, `/tmp/lumina_ledger_380.png`.
- Visual review noted only minor density in the coverage strip and synthesis badge; no clipping or hierarchy failure. The scoring engine, contracts, and dependency set were not changed.

Deferred: replacing trace-derived `clean`/`no_object` inference with an additive `outcome`/`reason` field in `AgentTrace`.
