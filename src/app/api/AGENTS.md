# src/app/api — HTTP route handlers

## OVERVIEW
Thin HTTP edges over `src/lib/*`. Each handler parses with Zod, enforces size/ownership/rate limits and a deadline, then delegates; domain logic and SQL never live here.

## STRUCTURE
| Group | Routes |
|---|---|
| `companion/` | `answer`, `orchestrate` (SSE), `voice`, `vision`, `tools/summary`, `tools/report` |
| `auth/google` | `route` (begin), `callback` (PKCE exchange, sets session cookie) |
| `account/`, `session/` | `GET /api/account`, `GET /api/account/progress`, `GET /api/session` |
| `link/verify`, `verify-link`, `verify-file` | Opt-in link/file verification |
| `loker/scan`, `loker/scan/status` | Background scan trigger + public status |
| `health/` | DB-only liveness (`SELECT 1`, 2 s) |
| `studio/chat` | Allowlisted agent loop |

## WHERE TO LOOK
| Handler | Delegates to |
|---|---|
| `companion/answer` | `lib/companion/intent`, `lib/content/store`, `lib/learning/tutor`, `lib/server/llm` |
| `companion/orchestrate` | `lib/orchestrator/{flag,loop,summary}`, `lib/agent/runs` |
| `companion/voice` | `lib/companion/voice-stream` (the only SSE reader) |
| `companion/vision` | `lib/contracts/vision`, `lib/server/llm` |
| `link/verify` | `lib/link-verify/urlvet` (rate-limited 6/min) |
| `verify-link`, `verify-file` | `lib/verify/{link,file}` |
| `studio/chat` | `lib/studio/{access,contracts,loop}` |
| `loker/scan` | `lib/loker/start` (`acquireScanLease`, `runLeasedScan`) |

## CONVENTIONS (different from root)
- Shared guards: `readJson` (body cap), `limitAI(request, "text"|"vision")`, `upstreamAbort`, `requestMeta`, `clientKey` from `lib/server/request`.
- Relaxation responses: `{ status: "dilewati" }` when `VERIFY_LINK`/`VERIFY_FILE !== "on"` — intended opt-in, not failure.
- `cache-control: no-store` on auth/poll responses; SSE adds `no-store, no-transform` + `x-accel-buffering: no`.
- `orchestrate` persists run metadata via `saveAgentRun` after the stream; deadline comes from `orchestratorDeadlineMs()` (10s–180s, default 120s).
- Use `await connection()` inside dynamic handlers, not segment config.

## ANTI-PATTERNS (THIS DIRECTORY)
- `answer`: `attachmentContext` is rejected unless `contentQuestion`, forbidden for `lane === "belajar"`, capped 12,000 chars. Do not widen.
- `answer`: tool availability is gated by the original wording (`linkApproved`), not by prior observations.
- `verify-file` sends only a SHA-256 hash; `verify-link`/`link/verify` send only `{ url }`. Neither writes back into `signals`.
- `/api/loker/scan/status` is public and must stay free of user data.
- `/api/health` never probes the LLM; `503 not-configured` from AI routes is the offline demo path.
- Do not add a second SSE parser; `voice-stream.ts` owns streaming.
