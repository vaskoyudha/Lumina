# Learning-evidence loop — implementation plan

**Status:** Implemented · 2026-11-09

> **For agentic workers:** Use TDD for each task: write the failing test, run it, implement, run it again. Keep the diff inside the files named here. Do not commit until the user asks.

**Goal:** Make Lumina's analysis teach the user in place: the exact phrase that triggered a finding is highlighted in their own message, each live agent names the characteristics it checks, and each tactic shows its recognizable sign before the long explanation is opened.

**Architecture:** A pure `evidenceSegments()` helper turns `Signal.evidence` into non-overlapping text ranges. `EvidenceText` renders those ranges as accessible inline highlight controls. `CompanionChat` owns one active-evidence string and passes it to the user bubble next to the companion result. `AgentRun` labels its existing mechanism chips as “Ciri yang dicek”. `ExplanationCard` shows a collapsed `Ciri:` preview from the existing `tactic.tanda` data. No scoring, contract, network, or dependency changes.

**Tech stack:** Next 16.4.5 App Router, React 19.3, TypeScript strict, Tailwind v4, shadcn/Radix, Jest 30 + React Testing Library, Biome 2.x.

**Spec:** This plan is the design (small, additive UI change; no separate spec).

---

## Global constraints

- No changes under `src/lib/scoring/**`, `src/lib/contracts/**`, or `src/data/**`.
- No new dependency, page, route, API, or LLM call.
- Every colour comes from an existing token (`warn`, `txt`, `dim`, `brand`, `panel`); no raw hex.
- The transcript stays inside the existing `max-w-[820px]` column; the 380 px layout must not scroll horizontally.
- Evidence is shown, never invented: only `signal.weight > 0` and a non-empty `signal.evidence` may create a highlight.
- Preserve whitespace and newlines in user messages; copy/paste must still produce the original text.
- Reduced motion: no new motion. Hover/active colour transitions only.
- Run `npm run typecheck`, `npm run lint`, the targeted tests, then `npm run verify` before claiming completion.

## Review focus (failure modes the tests must pin)

1. **Overlapping evidence** — two signals quote overlapping substrings; the rendered text must remain complete, with no duplicated or dropped characters.
2. **Duplicate occurrences** — the same quote appears twice; both occurrences may highlight, and clicking either selects the same finding.
3. **Zero-weight placeholder** — `"Tidak ada pola penipuan..."` must never become a highlight.
4. **No result** — a question-only companion turn has no `result`; the preceding user text must render unchanged.
5. **Whitespace** — newlines and multiple spaces survive because the parent still uses `whitespace-pre-wrap`.
6. **380 px** — inline controls do not introduce horizontal overflow; long quotes wrap.
7. **Active state** — switching sessions clears the selected highlight; a second click clears it.
8. **Accessibility** — each highlight is discoverable as a button with a label naming the finding, and `aria-pressed` reflects the active state.

---

## Task 1: Pure evidence segmentation

**Files:**
- Create: `src/components/companion/evidence-text.tsx`
- Test: `src/components/companion/evidence-text.test.tsx`

**Interfaces:**
- Consumes: `Signal` from `@/lib/contracts/score`.
- Produces:
  ```ts
  export interface EvidenceSegment {
    text: string;
    evidence: string | null;
    labels: string[];
  }
  export function evidenceSegments(
    text: string,
    signals: readonly Signal[],
  ): EvidenceSegment[];
  export function EvidenceText(props: {
    text: string;
    signals: readonly Signal[];
    activeEvidence?: string | null;
    onSelect?: (evidence: string) => void;
    className?: string;
  }): React.ReactElement;
  ```

- [x] **Step 1: Write the failing tests**

Cover:
- plain text with no signals returns one segment;
- a matching quote is isolated and surrounding text preserved;
- case-insensitive match preserves the original casing;
- zero-weight placeholder is ignored;
- overlapping quotes do not duplicate text;
- duplicate occurrences produce two segments with the same `evidence`;
- click calls `onSelect` with the trimmed quote;
- `activeEvidence` sets `aria-pressed="true"`;
- keyboard Enter/Space also selects.

- [x] **Step 2: Run the test and see it fail**

Run: `npx jest src/components/companion/evidence-text.test.tsx --runInBand`
Expected: module not found.

- [x] **Step 3: Implement**

- Normalize with `toLowerCase()` for search; slice the original text for display.
- Collect ranges from `signal.evidence.trim()` when `weight > 0` and the quote is at least 3 characters.
- Sort by start, then weight descending, then length descending; skip ranges that start before the last accepted end.
- Build segments with a cursor; preserve every character.
- Render `<button type="button">` inline, with `bg-warn/15`, dotted underline, `aria-pressed`, and `aria-label={"Temuan: " + labels.join(", ")}`; active state uses `bg-warn/35`.
- If no quote matches, return the text unchanged (no wrapper).

- [x] **Step 4: Run the test and see it pass**

Run: `npx jest src/components/companion/evidence-text.test.tsx --runInBand`
Expected: PASS.

---

## Task 2: Wire highlights into the conversation

**Files:**
- Modify: `src/components/companion/companion-chat.tsx`
- Test: `src/components/companion/companion-chat.test.tsx`

- [x] **Step 1: Write the failing integration test**

In `companion-chat.test.tsx`, after the APK scenario:
- wait for the result (`File APK via WhatsApp`);
- assert at least one button whose accessible name starts with `Temuan:`;
- click it and assert `aria-pressed="true"`;
- click it again and assert `aria-pressed="false"`.

- [x] **Step 2: Run it and see it fail**

Run: `npx jest src/components/companion/companion-chat.test.tsx --runInBand -t "highlights"`
Expected: no such button.

- [x] **Step 3: Implement**

- Import `EvidenceText`.
- Add `const [activeEvidence, setActiveEvidence] = React.useState<string | null>(null);`
- Clear it when `activeId` changes.
- Change `turns.map((turn) =>` to `turns.map((turn, turnIndex) =>`.
- For a user turn, read the next turn: `const linked = turns[turnIndex + 1];` and pass `linked?.role === "companion" ? linked.result?.signals ?? [] : []`.
- Replace `{turn.text}` in the user bubble with `<EvidenceText ... />`; do not lift the `whitespace-pre-wrap` class.
- Toggle selection: `setActiveEvidence(current => current === evidence ? null : evidence)`.

- [x] **Step 4: Run it and see it pass**

Run: `npx jest src/components/companion/companion-chat.test.tsx --runInBand -t "highlights"`
Expected: PASS.

---

## Task 3: Name what each agent checks

**Files:**
- Modify: `src/components/companion/agent-run.tsx`
- Test: `src/components/companion/agent-run.test.tsx`

- [x] **Step 1: Write the failing test**

In the existing expanded-signals test, after expanding the message bubble, assert `within(message).getByText("Ciri yang dicek")`.

- [x] **Step 2: Run it and see it fail**

Run: `npx jest src/components/companion/agent-run.test.tsx --runInBand -t "weighted signals"`
Expected: text not found.

- [x] **Step 3: Implement**

Wrap the existing mechanism `<ul>` in a column and add the label above it:

```tsx
<p className="font-mono text-[9px] text-dim uppercase tracking-[0.14em]">
  Ciri yang dicek
</p>
```

Keep the chips unchanged. Do not change the registry or the AgentsView labels.

- [x] **Step 4: Run it and see it pass**

Run: `npx jest src/components/companion/agent-run.test.tsx --runInBand -t "weighted signals"`
Expected: PASS.

---

## Task 4: Preview the recognizable sign in the teaching card

**Files:**
- Modify: `src/components/companion/explanation-card.tsx`
- Test: `src/components/companion/explanation-card.test.tsx`

- [x] **Step 1: Write the failing test**

Add:
```tsx
it("previews the recognizable sign before expansion", () => {
  renderFor(PHISH);
  expect(screen.getAllByText(/^Ciri:/).length).toBeGreaterThan(0);
  expect(screen.getByText(/dalam 2 jam/)).toBeInTheDocument();
});
```

- [x] **Step 2: Run it and see it fail**

Run: `npx jest src/components/companion/explanation-card.test.tsx --runInBand -t "previews"`
Expected: text not found.

- [x] **Step 3: Implement**

Inside `TacticRow`, after the quote, add:

```tsx
<span className="mt-1 block line-clamp-2 text-dim text-xs leading-snug group-data-[state=open]:hidden">
  <span className="font-medium text-txt/80">Ciri: </span>
  {tactic.tanda}
</span>
```

The preview hides when the row opens, so the full `Cirinya` section remains the only copy visible then.

- [x] **Step 4: Run it and see it pass**

Run: `npx jest src/components/companion/explanation-card.test.tsx --runInBand -t "previews"`
Expected: PASS.

---

## Task 5: Verify and inspect

- [x] **Step 1: Targeted tests**

```bash
npx jest \
  src/components/companion/evidence-text.test.tsx \
  src/components/companion/companion-chat.test.tsx \
  src/components/companion/agent-run.test.tsx \
  src/components/companion/explanation-card.test.tsx \
  --runInBand
```

- [x] **Step 2: Full gate**

```bash
npm run verify
```

Expected: typecheck, Biome, all Jest suites, production build pass.

- [x] **Step 3: Visual check**

Start `npm run dev -- -p 3100`, open the APK scenario at 1440×900 and 380×800. Confirm:
- highlight is visible in the user bubble and toggles on click;
- `Ciri:` preview is readable before expansion;
- expanded tactic hides the preview and shows the full `Cirinya`;
- expanded agent row shows `Ciri yang dicek`;
- no horizontal overflow at 380 px.

- [x] **Step 4: Stop the dev server**

Kill the dev server and Chromium after the screenshots. Leave the work uncommitted.

---

## Outcome (2026-11-09)

- Targeted suites: 4 suites, **56 tests passed**.
- Full gate: `npm run verify` exit 0 — **110 suites, 863 tests passed**, 19 skipped; typecheck, Biome, and production build passed.
- Visual: 1440×900 and 380×800 checked. The APK phrase is filled and underlined in the user bubble; clicking toggles `aria-pressed`; the teaching card shows `Ciri:` before expansion and hides it after; the expanded agent row shows `Ciri yang dicek`; no horizontal overflow at 380 px.
- Not committed.

---

## Deliberately not in this plan

- Inline auto-scroll from a finding to the agent bubble: the mobile evidence drawer makes the jump ambiguous; wait for a dedicated interaction design.
- A global “learning mode” toggle: it adds state and clutter without new data.
- LLM-written agent explanations: the teaching layer stays deterministic and auditable.
- Changing the scoring engine: the holdout gaps found in the review are separate work and need their own bench cases.
