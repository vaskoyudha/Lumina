# Backend Architecture

## 1. Three server entry points

| Mechanism | Used for | Files |
| --- | --- | --- |
| **React Server Components** | Read pages and initial data | `src/app/**/page.tsx`, `layout.tsx` |
| **Server Actions** | Authenticated mutations from UI | `src/lib/**/actions.ts`, `src/lib/learning/store.ts`, `src/lib/community/actions.ts` |
| **Route handlers** | AI calls, OAuth, health, scans, public status | `src/app/api/**/route.ts` |

Domain logic lives in `src/lib/`, not in route bodies. A route handler performs
validation, authorization, rate limiting, deadline control, and response
mapping; it delegates the actual work.

---

## 2. Common request pipeline

```
Request
  │
  ├─ body size cap (readJson)              → 413 payload-too-large
  ├─ Zod schema (.strict where outbound)   → 400 invalid-request
  ├─ session / ownership check             → 401 unauthorized / 403
  ├─ rate limit (PostgreSQL counter)       → 429 rate-limited
  ├─ upstream deadline (AbortController)   → 504 upstream-timeout
  ├─ upstream call
  └─ bounded JSON response + no-store
```

### 2.1 Body limits

| Route family | Cap |
| --- | --- |
| `/api/companion/answer`, `/voice`, `/tools/report`, `/tools/summary` | 65,536 bytes |
| `/api/companion/vision` | 8,100,000 bytes (~8.1 MB) |
| `/api/link/verify`, `/api/verify-link` | 4,096 bytes |
| `/api/verify-file` | 512 bytes |

`readJson()` checks `content-length` first, then streams with a running total
and cancels as soon as the cap is exceeded. It never buffers an unbounded body.

### 2.2 Deadlines

| Route | Server deadline | Client behavior |
| --- | --- | --- |
| `/api/companion/answer` | 20 s | Client aborts at ~23 s. |
| `/api/companion/voice` | 20 s | Client aborts at 23 s; server always gives up first. |
| `/api/companion/vision` | 45 s | Client downscales images before upload. |
| `/api/companion/tools/report` | 20 s | Deterministic draft is used on failure. |
| `/api/companion/tools/summary` | 20 s | Deterministic sentence is used on failure. |
| `/api/link/verify` | 20 s | url.vet scans in 1–15 s. |
| `/api/verify-link` | 2.5 s | Returns a `gagal` verification with a local note. |
| `/api/verify-file` | 2.5 s | Optional; disabled by default. |

`upstreamAbort(request, ms)` combines the client's abort signal with a timer and
returns `{ signal, abort, cleanup }`.

### 2.3 Rate limiting

Limits are stored in PostgreSQL (`auth_attempts`) through `consumeAttempt()`, so
they survive restarts and are shared across processes. Keys are SHA-256 hashes;
plaintext emails or IPs are never used as keys.

| Bucket | Limit | Window |
| --- | --- | --- |
| Login per email | 10 | 15 min |
| Registration per email | 5 | 15 min |
| Google begin, global | 200 | 15 min (default `consumeAttempt`) |
| AI text per client key | 10 | 1 min |
| AI vision per client key | 3 | 1 min |
| AI global | `LUMINA_AI_GLOBAL_LIMIT`, default 200 (Compose 100) | 1 min |
| Link verification per client key | 6 | 1 min |
| Job scan per client key | 1 | 10 min |
| Community topic writes per account | 5 | 1 min |
| Community reply writes per account | 15 | 1 min |
| Other community actions per account | 60 | 1 min |

`clientKey()` returns the `X-Lumina-Client-IP` value only when
`TRUST_PROXY=true` and the value is a valid IP; otherwise every anonymous user
shares the `anonymous` bucket. `X-Forwarded-For` is never trusted.

---

## 3. Route handler reference

### 3.1 Session and account

#### `GET /api/session`

Returns the current session or `null`. No auth required.

```json
{ "ok": true, "session": { "nama": "...", "email": "...", "createdAt": "..." } }
```

`Cache-Control: no-store`.

#### `GET /api/account`

Requires a session. Returns identity, whether a password exists, and up to 50
active sessions with device label, IP (only if proxy-trusted), timestamps, and
a `current` flag.

| Status | Body |
| --- | --- |
| 200 | `{ ok:true, account, hasPassword, sessions }` |
| 401 | `{ ok:false, error:"unauthorized" }` |

#### `GET /api/account/progress`

Requires a session. Returns the account's `Progress` plus the total number of
learning modules.

| Status | Body |
| --- | --- |
| 200 | `{ ok:true, progress, moduleCount }` |
| 401 | `{ ok:false, error:"unauthorized" }` |
| 503 | `{ ok:false, error:"unavailable" }` |

### 3.2 Authentication

#### `GET /api/auth/google`

Starts OAuth. Accepts `?intent=masuk|daftar`. Consumes a global attempt, creates
state/verifier/nonce, stores only the state hash, sets the state cookie for
`/api/auth/google`, and redirects to Google.

On failure redirects to `/{intent}?error=google-unavailable`.

#### `GET /api/auth/google/callback`

Validates state against the cookie with timing-safe comparison, atomically
deletes the state row (replay protection), exchanges the code with PKCE,
verifies the ID token signature/issuer/audience/expiry and nonce, requires a
verified email, then creates a session and redirects to `/companion`.

Error redirects use `?error=` with one of `google-cancelled`, `google-expired`,
`google-link-required`, `google-unavailable`, `google-failed`. The state cookie
is cleared; the response is `no-store` and `Referrer-Policy: no-referrer`.

### 3.3 Companion AI

#### `POST /api/companion/answer`

Conversational lanes. No session required. Validated by
`AnswerRequestSchema` (`.strict()`).

Request:

```json
{
  "lane": "tanya | lanjutan | obrolan | belajar",
  "moduleNo": 10,
  "question": "user text, max 2000",
  "history": [{ "role": "user|companion", "text": "..." }],
  "digest": { "risk": "...", "score": 0, "modusName": "...", "findings": [], "advice": [], "moduleNo": null, "locale": "id" },
  "modules": [{ "no": 1, "nama": "...", "ciri": [] }],
  "tactics": [{ "nama": "...", "cara": "...", "tanda": "...", "pembeda": "..." }]
}
```

Behavior:

- `belajar` requires `moduleNo`; loads the published module and builds the
  tutor context. No tools are offered.
- `tanya`, `lanjutan`, `obrolan` use lane-specific system prompts.
- Tools are offered only when intent detection allows: `job_search` for an
  explicit job request; `report_draft` for an explicit report request.
- Tool calls are re-validated against strict schemas; unknown names, bad
  arguments, or extra keys are dropped, not forwarded.
- Model output is never accepted as a score or signal.

Responses:

| Status | Body |
| --- | --- |
| 200 | `{ ok:true, text, toolCalls, source? }` |
| 400 | `invalid-request`, `module-required` |
| 404 | `module-unavailable` |
| 413 | `invalid-request` (body too large) |
| 429 | `rate-limited` |
| 503 | `not-configured`, `content-unavailable`, `upstream-failed`, `upstream-timeout`, `upstream-unreachable`, `upstream-empty` |

`source: "module"` marks the deterministic tutor fallback.

#### `POST /api/companion/voice`

Streams the language layer. Request is `VoiceDigestSchema` (`.strict()`), which
has no field for an evidence quote.

| Status | Body |
| --- | --- |
| 200 | `text/plain; charset=utf-8`, streamed |
| 400 | `invalid-digest` |
| 413 | `invalid-request` |
| 429 | `rate-limited` |
| 503 | `not-configured`, `upstream-failed`, `upstream-timeout`, `upstream-unreachable` |

The upstream is called with `stream: true`, `temperature: 0.3`,
`reasoning_effort: "none"`, and `max_tokens: 800`. The 800 cap is measured:
reasoning tokens are billed inside completion tokens, so smaller caps truncate
visible text.

#### `POST /api/companion/vision`

Image transcription only. Request is `VisionRequestSchema` (`.strict()`):
`{ image: { mediaType: "image/png|jpeg|webp|gif", data: base64 } }`.

The response is `{ ok: true, text }` capped at 6,000 characters. There is no
score, risk, or signal field. The client must feed the text back into
`scoreText()`. `temperature: 0.1`, `max_tokens: 2000`, 45 s deadline.

| Status | Body |
| --- | --- |
| 200 | `{ ok:true, text }` |
| 400 | `invalid-image` |
| 413 | `invalid-request` |
| 429 | `rate-limited` |
| 502 | `empty-transcription` |
| 503 | `not-configured`, `upstream-failed`, `upstream-unreachable` |

#### `POST /api/companion/tools/report`

Polishes a deterministic report draft. Request is `ReportPolishRequestSchema`
(`.strict()`): channel id, subject/body, scheme name, tactics. No checked
message, quotes, or score field.

| Status | Body |
| --- | --- |
| 200 | `{ ok:true, text }` |
| 400 | `invalid-request` |
| 413 | `invalid-request` |
| 429 | `rate-limited` |
| 503 | `not-configured`, `upstream-failed`, `upstream-empty`, `upstream-timeout`, `upstream-unreachable` |

#### `POST /api/companion/tools/summary`

One sentence about postings the client already filtered. Request is
`ToolSummaryRequestSchema` (`.strict()`): count and up to 20 postings with
title, company, Sentinel status, and Lumina risk. No query, description, apply
URL, or saved list.

The server derives recommendation counts with `ringkasRekomendasi()` and tells
the model to repeat them. `max_tokens: 160`.

### 3.4 Health

#### `GET /api/health`

Runs `SELECT 1` with a 2-second timeout. It does **not** check the LLM, url.vet,
or the job scanner.

| Status | Body |
| --- | --- |
| 200 | `{ "status": "ok" }` |
| 503 | `{ "status": "unavailable" }` |

Uses `await connection()` because the route must not be cached.

### 3.5 Link and file verification

#### `POST /api/link/verify`

Body: `{ "url": "https://..." }` (max 2,048). Sends only the URL to the
url.vet-compatible scanner configured by `URLVET_API_URL`.

| Status | Body |
| --- | --- |
| 200 | `{ ok:true, verdict }` |
| 400 | `invalid-request` |
| 413 | `invalid-request` |
| 429 | `rate-limited` |
| 503 | `not-configured`, `upstream-failed`, `upstream-invalid` |
| 504 | `upstream-timeout` |

The verdict never changes the deterministic score.

#### `POST /api/verify-link`

Optional deeper verification behind `VERIFY_LINK=on`. When disabled, returns a
`dilewati` verification with a note. When enabled, performs a bounded 2.5 s
lookup and returns local partial results on timeout. Body: `{ url, mode? }`.

#### `POST /api/verify-file`

Optional hash reputation behind `VERIFY_FILE=on`. Body:
`{ "sha256": "<64 hex>" }`. When disabled, returns a `dilewati` verification
with the hash and a note. Files are never uploaded.

### 3.6 Job scanner

#### `POST /api/loker/scan`

Requires a session. Consumes 1 request per 10 minutes per client key, then tries
the PostgreSQL advisory lock. Returns `202 { ok:true, runId }` and schedules the
job with `after()`.

| Status | Body |
| --- | --- |
| 202 | `{ ok:true, runId }` |
| 401 | `unauthorized` |
| 409 | `scan-running` |
| 429 | `rate-limited` |
| 503 | `unavailable` |

#### `GET /api/loker/scan/status`

Public. Returns the latest run plus live corpus count, or `204` before any run.

```json
{ "status": "running|ok|failed", "found": 0, "added": 0, "dropped": 0, "finishedAt": null, "postings": 0 }
```

### 3.7 Removed routes

`/darurat`, triage, and PDF generation were removed on 9 November 2026 and
replaced by `/komunitas`. A request to the old route returns 404. The report
template tool produces plain text, not PDF.

---

## 4. Server Actions

### 4.1 Auth (`src/lib/auth/actions.ts`)

| Action | Behavior |
| --- | --- |
| `register` | Validates name/email/password/consent, 5/15 min per email, scrypt hash, creates user. |
| `login` | 10/15 min per email, verifies scrypt hash with timing-safe compare, rotates session. |
| `logout` | Revokes the current session. |
| `updateNama` | 1–80 characters, scoped to session user. |
| `changePasswordAction` | Requires current password unless Google-only account; revokes other sessions. |
| `revokeSessionAction` | Deletes one session owned by the session user. |
| `logoutEverywhere` | Deletes all sessions for the user. |

### 4.2 Learning (`src/lib/learning/store.ts`)

| Action | Behavior |
| --- | --- |
| `saveQuiz` | Validates every question is answered, grades on the server, requires ≥ 60% to complete, upserts progress, records attempt. |
| `saveSimulation` | Replays the scenario server-side, validates order/outcome, idempotent on `attempt_id`. |
| `recordSimulationIntrusion` | Records the first compromised-device event for challenge-mode timer validation. |

### 4.3 Community (`src/lib/community/actions.ts`)

| Action | Limit | Behavior |
| --- | --- | --- |
| `publishPost` | 5/min | Session identity, Zod, insert. |
| `publishReply` | 15/min | Validates post exists, inserts, returns page. |
| `deleteContent` | 60/min | Ownership check; soft delete and clear body. |
| `markHelpful` | 60/min | One row per account/post. |
| `markSaved` | 60/min | Private bookmark. |
| `flagContent` | 60/min | One report per reporter/target. |
| `moderateContent` | 60/min | Moderator allowlist; hide/show and resolve report. |
| `verifyPost` | 60/min | Moderator allowlist; set/clear badge. |

### 4.4 Companion history (`src/lib/companion/history.ts`)

| Action | Behavior |
| --- | --- |
| `listConversationHistory` | Up to 50 metadata rows for the session user. |
| `saveConversationHistory` | Validates UUID/title/turns/risk; upserts only for the owner. |

Titles are sanitized: only a fixed allowlist of public titles is stored;
anything else becomes `"Percakapan Companion"`. Message excerpts are never
stored.

---

## 5. LLM integration

The provider is any OpenAI-compatible chat-completions endpoint configured by:

```dotenv
LUMINA_LLM_URL=https://provider.example/v1
LUMINA_LLM_MODEL=model-name
LUMINA_LLM_KEY=secret
```

Calls go to `${LUMINA_LLM_URL}/chat/completions`. If URL or model is empty,
AI routes return `503 not-configured` and the client uses deterministic
fallbacks. This is a supported offline mode, not a defect.

### Model posture

| Route | Temperature | Max tokens | Stream | Purpose |
| --- | --- | --- | --- | --- |
| answer | 0.4 | 800 | No | Conversational answer. |
| voice | 0.3 | 800 | Yes | Explain findings in 1–3 sentences. |
| vision | 0.1 | 2000 | No | Transcribe visible text only. |
| report | 0.3 | 600 | No | Tone rewrite preserving `[BLANKS]`. |
| summary | 0.3 | 160 | No | One sentence about filtered postings. |

All system prompts forbid inventing findings, scoring, and asking for
OTP/PIN/passwords. Prompt instructions are a second line of defense; the strict
schema is the first.

---

## 6. Error model

Clients receive a stable machine-readable `error` string. They must not parse
human messages.

| HTTP | Meaning | Typical errors |
| --- | --- | --- |
| 400 | Invalid input | `invalid-request`, `invalid-image`, `invalid-digest`, `module-required` |
| 401 | No/expired session | `unauthorized` |
| 404 | Missing content | `module-unavailable` |
| 409 | Conflict | `scan-running` |
| 413 | Body too large | `invalid-request`, `payload-too-large` |
| 429 | Rate limit | `rate-limited` |
| 502 | Upstream returned unusable output | `empty-transcription` |
| 503 | Feature unavailable or upstream failed | `not-configured`, `unavailable`, `upstream-failed`, `upstream-empty`, `upstream-unreachable`, `content-unavailable` |
| 504 | Upstream timeout | `upstream-timeout` |

Internal error details are not returned. The health route never includes
connection details.

---

## 7. Adding a backend feature

1. Decide the mechanism: read (RSC), mutation (Server Action), or external
   integration (route handler).
2. Put domain logic in `src/lib/<domain>/`; keep the route/action thin.
3. Resolve identity from the session, never from the body.
4. Validate with Zod. For outbound AI payloads use `.strict()` and ensure the
   schema has no field for the checked message or evidence.
5. Add the body cap and deadline for any network call.
6. Add the rate-limit bucket if the endpoint is costly or abusable.
7. Add a migration if state is new. Never create tables at runtime.
8. Return a stable error code; do not leak upstream bodies.
9. Add tests for validation, auth, limits, timeout, and fallback.
10. Update [backend.md](backend.md) and [security-privacy.md](security-privacy.md).
