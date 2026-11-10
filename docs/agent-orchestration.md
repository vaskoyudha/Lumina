# Agent orchestration and crew bubbles

**Status:** Implemented 8 November 2026; hardened 9 November 2026; consensus
scoring 12 November 2026
**Plan:** `docs/superpowers/plans/2026-11-08-agent-orchestration-ui.md`
**Design:** `docs/superpowers/specs/2026-11-08-agent-orchestration-design.md`

The companion shows its deterministic pipeline as a crew. A checked message
produces one `AgentTrace`; `AgentRun` draws one orchestrator card and one
compact bubble per stage. Every status, finding count, duration, and skip reason
is read from the trace — the UI never scores and never invents work.

## Data flow

```
message + prior turns
        │
        ▼
planTurn()  ──► lane = periksa | tanya | lanjutan | obrolan
        │                 (only `periksa` runs the engine)
        ▼
scoreWithTrace()
  ├─ DETECTORS (synchronous, fixed order)
  │    message · link · identity · conversation · job · marketplace · qris
  ├─ finalize()  ──► ScoreResult (score, risk, signals, modus, advice)
  └─ scoring stage appended, findings re-counted against the result
        │
        ▼
companion-chat appends:
  ├─ evidence stage   (only for a checked turn; skipped when 0 artifacts)
  └─ voice stage      (attached `berjalan`, replaced when the model settles)
        │
        ▼
AgentRun  ── orchestrator card + one bubble per specialist + voice bubble
```

The trace is the only contract between the engine and the UI. The three contracts
this feature touches — `src/lib/contracts/score.ts`,
`src/lib/contracts/agent-run.ts`, and `src/lib/contracts/orchestrator.ts` — are
frozen; changes there must stay additive and be announced to the other owners
before a commit (AGENTS.md §5). In `orchestrator.ts`, `commander_say` is additive
while `trace.commander` is a required field added together with its producer.

## Orchestrator pipeline

The streaming orchestrator emits one ordered pipeline:

```
run_start → commander_say → score → plan → agent_start/agent_result (serial, ≤6) → consensus → score_decision → synthesis_end → done
```

Specialists run one at a time under `LUMINA_ORCHESTRATOR_DEADLINE_MS` (default
120000 for serial runs, maximum 180000); agents not started by the deadline are
reported as `dilewati`. The commander sees the OCR'd message, prior turns, and
the baseline score/modus/risk; it never states a score or band itself, and the
band is revealed after synthesis.

## Consensus scoring

After the specialists report, `findConsensus()` groups points whose normalized
pattern matches across at least two distinct agents and whose quotes passed the
report validator. Only then does Lumina get a `submit_score` tool; it may set any
score, raise or lower, with a short rationale and the supporting signal labels.
`authorScore()` turns that decision into the final `ScoreResult`: the band comes
from `riskFor()`, the consensus points become `source: "consensus"` signals, and
the engine score stays visible as `baselineScore`. If the model errors, returns
no tool call, or the deadline hits, the engine score survives and the trace marks
`source: "fallback"`. Set `LUMINA_CONSENSUS_SCORE=0` to keep the engine score.
The design is in
`docs/superpowers/specs/2026-11-12-consensus-score-design.md`.

## The crew

`AGENT_SEQUENCE` in `src/components/companion/agents.ts` is the display order.
Labels and tasks are read from `STAGE_LABEL`, never copied, so the trace, the
overview, and the detail pane cannot drift apart.

| # | id | Bubble name | Stage label | Rules |
|---|---|---|---|---|
| 1 | `message` | Mochi | Message Agent | urgency, authority, lures, OTP/APK asks |
| 2 | `link` | Bubu | Link Agent | brand look-alikes, shorteners, risky TLDs, fake login paths |
| 3 | `identity` | Piyo | Identity Agent | sender number, institutional claims, foreign numbers |
| 4 | `conversation` | Naga | Conversation Agent | stacked vectors, escalation across checked turns |
| 5 | `job` | Kiko | Lowongan Agent | upfront fees, pay-to-earn, overseas placement costs |
| 6 | `marketplace` | Lala | Marketplace Agent | off-platform payment, implausible price, fake receipt |
| 7 | `qris` | Ruru | QRIS Agent | EMVCo TLV, CRC-16, mismatched merchant |
| 8 | `evidence` | Bao | Evidence Agent | quotes, amounts, contacts for the report |

`conversation` only sees prior turns that were themselves checked. Chat-lane
history is excluded so a question cannot manufacture an escalation.

Two stages are not detectors and are not in `AGENT_SEQUENCE`:

a. `scoring` — the deterministic engine. `scoreWithTrace()` appends it and owns
   no findings.
b. `voice` — the language layer. It writes the answer from the digest; it never
   re-scores and never adds or removes signals.

## Status semantics

`AgentStage.status` is derived, not designed:

| Condition | Status | What the bubble says |
|---|---|---|
| Findings survive de-duplication | `temuan` | `<n> temuan`, filled warn dot |
| No findings, and the detector explained why | `dilewati` | skip glyph + the note |
| No findings, no note | `selesai` | `Selesai · 0 temuan` |
| Identity inspected a number but found no claim | `selesai` | `Tidak melapor`, eye-off glyph |
| Identity had nothing to inspect | `dilewati` | skip glyph + `Tidak ada nomor untuk diperiksa.` |
| Voice still writing | `berjalan` | spinner, `menyusun jawaban…` |

`scoreWithTrace()` derives only three statuses for detector stages:
`findings > 0 ? "temuan" : note ? "dilewati" : "selesai"`. It never emits
`menunggu`, `berjalan`, or `gagal`. `berjalan` is attached by the chat shell for
`voice`. `gagal` is a contract status the bubble can render (failure glyph +
note), but the synchronous engine has no failure path: a thrown detector aborts
the turn rather than settling one stage, and a voice failure settles as
`dilewati` with the template note.

Honesty rules the UI enforces:

a. `identity` may decline to report; that is not a success tick.
b. `evidence` and `voice` never print `0 temuan` or “tidak menemukan pola” —
   they assemble quotes and write language, they do not detect patterns.
c. `evidence` is `dilewati` when the bundle has zero artifacts, with the reason
   recorded.
d. A skipped or failed stage always shows a note; if the trace omitted one, the
   row says `Tidak ada alasan tercatat.`
e. A visible `berjalan` stage always counts as running, even if a stale `live`
   prop says the run is over.
f. The header counts are disjoint: `clean + withFindings + skipped + failed =
   specialists`. `engineMs = totalMs − voice.ms`.

The expanded body shows the task, the full note, mechanism chips, the QRIS
caveat, and only the signals this agent owns. The collapsed trigger keeps a
two-line note for any row that has one (skipped/failed rows, and an evidence row
that recorded quotes); when expanded, the note moves into the body so it is not
read twice.

## UI anatomy

`AgentRun` (`src/components/companion/agent-run.tsx`):

a. **Orchestrator card** — “Orkestrator”, the agent count, the settled summary,
   the three `LUMINA_STEPS` (`Jalankan agen → Kumpulkan temuan → Hitung skor`),
   the scoring duration, and the crew avatars (first 8 plus `+N`).
b. **Crew bubbles** — a left border in the agent's identity token, a portrait or
   icon, the short name plus the stage label, status, measured duration, and a
   `Collapsible` body. Durations print in milliseconds below one second and in
   seconds above it, so a slow voice stage stays on one line. On the live run the
   list staggers in; reduced motion renders it settled immediately. The stagger
   is display-only.
c. **Voice bubble** — rendered after the specialists, with no identity token.

`AgentsView` (`src/components/companion/agents-view.tsx`) is the overview opened
from the rail; when the signed-in account has a run, it also renders that
latest-run summary (modus, band, per-agent status, durations) and never the
message. It reads `AGENT_SEQUENCE` for its count, cards, and diagram.
`AgentsDetailPanel` is its right-hand brief pane; selection is a highlight, not a
filter, and the pane is a `role="region"` with `aria-current` on the selected
brief.

Announcements: `AgentRun` exports `runAnnouncement(trace)`. In the chat shell the
transcript's `AgentRun` renders with `announce={false}` and the shell owns a
single live region, because opening the Agents view unmounts the transcript. Only
the turn that just settled may announce; a plain reply cannot re-announce an
older check.

## Tokens and accessibility

a. Identity colour is `--lumina-agent-<id>` with `--lumina-agent-<id>-soft` for
   the tint and avatar. It is used only for border/tint; status still uses
   `brand`, `warn`, `danger`, and neutral tokens.
b. No hex, `rgba()`, or Tailwind palette literals in the feature. Elevation uses
   the shared tokens `shadow-rest`, `shadow-lift`, `shadow-orb`, and
   `shadow-sm`; the one arbitrary shadow mixes `--lumina-ink` with `color-mix`.
c. Rows are `min-h-[44px]`; expanded content is unmounted by Radix while closed,
   so it never leaks into the accessibility tree.
d. Long notes and evidence use `[overflow-wrap:anywhere]`; the shell is verified
   at 380 px with no horizontal scroll.
e. Reduced motion is honoured by `useReducedMotion()` plus `motion-reduce:*`,
   including the detail-pane scroll (`behavior: "auto"`).

## Privacy boundary

a. The checked message stays on the device. The engine runs locally.
b. Only the question/history, a lossy digest, and public `modus`/tactic facts are
   sent to `/api/companion/answer`. `VoiceDigestSchema` has no `evidence` field,
   so a verbatim quote cannot leave by construction.
c. Vision only copies text from an image; it has no score/risk/signal fields and
   its output must re-enter `scoreText()`.
d. The engine score is the baseline. After two distinct agents ground the same
   pattern with quotes, Lumina may author the final score through
   `submit_score`; the engine score stays visible, `source` marks the origin,
   and the OTP/PIN/password floor still applies. The model may not invent
   signals.

## Files

| Path | Role |
|---|---|
| `src/lib/contracts/agent-run.ts` | `StageStatus`, `AgentStage`, `AgentTrace`, `STAGE_LABEL`, voice digest |
| `src/lib/contracts/score.ts` | `AgentId`, `Signal`, `ScoreResult` |
| `src/lib/scoring/score.ts` | `DETECTORS`, `finalize()`, `scoreWithTrace()` |
| `src/lib/scoring/{job,marketplace,qris}.ts` | new deterministic detectors |
| `src/components/companion/agents.ts` | registry: name, flavour, mechanisms, portrait, identity token |
| `src/components/companion/agent-run.tsx` | orchestrator, bubbles, status/glyph logic, announcement |
| `src/components/companion/agents-view.tsx` | Agents overview |
| `src/components/companion/agents-detail-panel.tsx` | agent brief pane |
| `src/components/companion/companion-chat.tsx` | trace assembly (evidence + voice), shell live region |

## Adding an agent

The contract is frozen, so the change is coordinated and additive:

1. Add the id to `AgentId` in `src/lib/contracts/score.ts` and a matching
   `STAGE_LABEL` entry in `src/lib/contracts/agent-run.ts`.
2. Write `src/lib/scoring/<id>.ts` as a pure `(text) => { signals, note? }`
   detector, plus `<id>.test.ts` covering hits, context gate, negatives, and
   `signal.agent`.
3. Register it in `DETECTORS` in `src/lib/scoring/score.ts`.
4. Add the registry profile and `--lumina-agent-<id>` / `-soft` tokens, and
   append it to `AGENT_SEQUENCE`.
5. Add bench cases (`src/lib/scoring/bench-cases.ts`) and update the measured
   comments from `runEval()` — never type an accuracy number by hand.

If the stage is not a pattern detector (like `evidence` or `voice`), do not add
it to `SIGNAL_AGENTS`; give it its own status/copy rules instead.

## Tests

Behavior is pinned by user-visible assertions, not snapshots:

| Suite | Pins |
|---|---|
| `agent-run.test.tsx` | status words, glyphs, header arithmetic, `engineMs`, notes, voice-name de-duplication, long-duration formatting, per-agent signal attribution, announcement |
| `agent-run-reduced.test.tsx` | reduced-motion tree without remount |
| `agents.test.ts` | registry completeness, labels/tasks mirror the contract, identity tokens |
| `companion-chat.test.tsx` | trace appears only for checked turns, evidence skipped at zero artifacts, voice settles on 503, mid-run announcement, digest privacy |
| `companion-shell.test.tsx` | agent count follows the registry, Agents view opens |
| `src/lib/scoring/*.test.ts` | detector boundaries, QRIS vectors, bench recall/FP, eval |

```bash
npm test -- src/components/companion/agent-run.test.tsx \
  src/components/companion/agent-run-reduced.test.tsx \
  src/components/companion/agents.test.ts \
  src/components/companion/companion-chat.test.tsx \
  src/components/companion/companion-shell.test.tsx

npm test -- src/lib/scoring
npm run verify        # typecheck + lint + test + build
```

## Detector notes worth preserving

These are regression-prone boundaries that the suites now pin:

a. **Job fees** — a denial only waives the fee it directly governs. `tanpa
   biaya apa pun, termasuk biaya pendaftaran` is clean; `gratis biaya
   administrasi, biaya pelatihan Rp100.000` still flags the second fee. A Rupiah
   thousands dot (`Rp100.000`) is not a sentence break. `ditanggung perusahaan`
   waives; `ditanggung pelamar` is a demand.
b. **Marketplace DP** — accepts `%`, `persen`, `rb/ribu/juta`, and
   `Rp200.000`, in either order (`DP 50% transfer`, `transfer DP 50%`). It
   rejects `0%`, `1234%`, cashback, and already-paid wording (`sudah`, `lunas`),
   while still flagging `transfer dulu, sudah saya transfer`.
c. **QRIS** — a valid CRC only proves the payload is well formed. A matching,
   valid Rupiah payload produces zero signals; the caveat next to the row says
   to verify the merchant name on screen.

## Known limits

a. Detectors are synchronous. There is no per-detector `menunggu → berjalan`
   animation; only `voice` is genuinely live.
b. `voice` is best-effort. A timeout, 503, or truncated reply settles as
   `dilewati` with the template fallback named in the note.
c. Heuristics are tuned for Indonesian message text; they are not a
   general-purpose classifier.
d. The overview is explanatory; it is not a control surface and does not start
   runs by itself.

## Measured 2026-11-12

- Eval corpus (`npm test -- src/lib/scoring/eval.test.ts`, the `EVAL` line):
  60 scam + 60 legitimate cases, `caught 60/60`, `legitNotRisky 60/60`,
  `falsePositives 0`, modus classification 56/60, `slowestCpuMs 3.637`. The
  suite already pins 60/60 catches and zero false positives; `slowestCpuMs` is
  CPU time for the slowest single case, not wall clock.
- Serial latency with a 40 ms stub specialist, from a single run
  (`LUMINA_LATENCY=1 npm test -- src/lib/orchestrator/serial-latency.test.ts`):
  the planner is asked for 2 agents, and `ensureEvidenceLast` appends `evidence`,
  so 3 agents execute (`message, qris, evidence`); the planner is asked for 6
  and 6 execute (the evidence rule replaces the last planner choice). Measured
  `twoAgentMs 162` and `sixAgentMs 256` from the `LATENCY` line. The same run
  confirms every `agent_start` is immediately followed by its own
  `agent_result`, and that the start/result event count equals twice the trace's
  agent count at both sizes, so the crew really runs one at a time.
