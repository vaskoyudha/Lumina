# src/lib/companion — turn routing, fallbacks, browser clients

## OVERVIEW
Browser-side and isomorphic logic behind the chat: lane routing, intent, reply/explanation composition, attachment/vision handling, SSE clients, report drafts, and history metadata. No score production.

## STRUCTURE
| Area | Files |
|---|---|
| Routing | `turn.ts` (`planTurn`, `Lane`), `intent.ts`, `reply.ts` |
| Payloads | `answer-client.ts` (`buildAnswerRequest`), `agent-loop.ts`, `tool-client.ts` |
| Attachments | `attachment-reader.ts` (device-only), `vision-client.ts` (canvas downscale) |
| Explain/report | `explain.ts`, `highlights.ts`, `report-template.ts`, `report-client.ts` |
| Streaming | `voice-stream.ts` (`streamChatText`) — the only SSE reader |
| History | `history.ts` (`"use server"`, metadata only), `run-state.ts` |

## WHERE TO LOOK
| Task | File | Notes |
|---|---|---|
| Lane order | `turn.ts:233` `planTurn` | links/phones/attachments → `lanjutan` → money/length; first match wins |
| Tunable constants | `turn.ts` | `PASTE_LENGTH = 160`, `SHORTEST_SCAM = 24` (pinned by `turn.test.ts`) |
| Question guard | `turn.ts` `isQuestionAbout` | Must run before `scoreWithTrace`; prevents re-scoring follow-ups |
| Privacy projection | `attachment-reader.ts` `attachmentContext` | Drops filenames/per-file notes; caps 3 items / 12k chars |
| Greeting safety | `reply.ts` `isGreeting` | All tokens greeting vocab, ≤8 tokens; a greeting-prefixed scam still scores |
| History | `history.ts` | Stores title/turn count/risk/timestamps only |

## CONVENTIONS (different from root)
- Pure functions, no network except the explicit clients; inject clocks/`fetch` for tests.
- `answer-client`, `report-client`, `tool-client`, `vision-client`, `agent-loop` return typed outcomes and never throw; callers use `reply.ts` fallbacks.
- Lanes are Indonesian values; identifiers stay English (`Lane = "periksa" | "tanya" | "lanjutan" | "obrolan" | "belajar"`).
- Attachment reads happen on device; only lossy `attachmentContext` text may leave.

## ANTI-PATTERNS (THIS DIRECTORY)
- Never re-score a `lanjutan` question; routing precedes scoring by design.
- Never send a message body, `Signal.evidence`, filenames, or blob URLs to the server.
- Do not add a second SSE parser; `voice-stream.ts` owns streaming.
- Do not persist message text in `history.ts`; conversations store metadata only.
- Do not widen the vision contract to carry score/risk/signal fields.
