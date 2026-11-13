# src/components/companion — chat state machine and evidence UI

## OVERVIEW
The largest UI subtree: `CompanionChat` owns the turn pipeline and transcript; `SignalPanel`, `AgentRun`, `ProcessTrace`, and the panel algebra render engine/agent evidence. Components display scores, never produce them.

## STRUCTURE
| Area | Files |
|---|---|
| Chat | `companion-chat.tsx` (state machine), `composer.tsx`, `session-sidebar.tsx`, `companion-markdown.tsx` |
| Evidence | `signal-panel.tsx`, `agent-run.tsx`, `agents-view.tsx`, `agents-detail-panel.tsx`, `process-trace.tsx` |
| Panel algebra | `panel-wires.ts` (geometry), `panel-ledger.ts` (outcomes), `agents.ts` (`AGENT_REGISTRY`) |
| Cards/tools | `score-card.tsx`, `explanation-card.tsx`, `report-template.tsx`, `loker-tool.tsx`, `link-verify.tsx` |
| Entry | `companion-with-session.tsx` (server wrapper), `companion-entry.tsx` (dead) |

## WHERE TO LOOK
| Task | File | Notes |
|---|---|---|
| Turn pipeline | `companion-chat.tsx:860` `send` | intent → medium → `scoreWithTrace`; orchestrator SSE batches `synthesis_delta` 50 ms |
| Client deadlines | `companion-chat.tsx` | orchestrator abort 55 s (route 60 s); job summary 21 s |
| Panel outcomes | `panel-ledger.ts` | `no_object` (dilewati) ≠ `clean` (selesai); never merge |
| Wire geometry | `panel-wires.ts` | Pure, measured — never invent coordinates |
| Honesty rules | `score-card.tsx:22` | No weighted finding → say nothing matched; coverage from trace |
| Agent registry | `agents.ts:60` | Single source of identity/order for panel, diagram, trace |

## CONVENTIONS (different from root)
- Local `useState`/`useRef` only; concurrency guard is a `Symbol` in `inFlight.current`; `stop()` aborts controllers/timers.
- `appendText` is an epoch guard: only patches while `turn.streaming`; `runSettled` gates the score band.
- Inline colors use `color-mix(... var(--lumina-*))`; motion via `motion/react` + `useReducedMotion`.
- Tests render the real tree; mock only `next/link`, `next/navigation`, and domain clients; use accessible queries.

## ANTI-PATTERNS (THIS DIRECTORY)
- Never compute or adjust `score`, `risk`, or `signals`; `SignalPanel` filters `weight > 0` and prints engine findings only.
- Never claim a skipped/failed stage finished; an identity agent abstains instead of inventing a finding.
- Do not read `Date.now()` or create object URLs during render.
- Do not gate the result card on `risk`; render on `result`.
- Raw `<img>` only for local `blob:` attachments, with the existing `biome-ignore`.
- Do not add a second SSE parser or a new score/risk color map.
