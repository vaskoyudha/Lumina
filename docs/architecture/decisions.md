# Decisions and Invariants

This page records the architectural decisions that explain the shape of the
codebase. It is not a chronological log; it is the "why" a new engineer needs
before changing behavior.

---

## 1. Non-negotiable invariants

| # | Invariant | Enforcement |
| --- | --- | --- |
| 1 | The verdict is deterministic and computed on the device. | `src/lib/scoring/score.ts` is pure; no I/O, no clock, no randomness. |
| 2 | The model never decides scam status. | Detection runs before the LLM call; outbound schemas carry verdict/advice, not a question to classify. |
| 3 | A checked message never leaves the browser. | Client scoring; outbound answer/voice schemas have no message or evidence field. |
| 4 | Evidence is an exact substring of the analysed input. | Signals are validated against `text.includes(evidence)`. |
| 5 | Risk is derived from score, signals are sorted, advice is bounded. | Contract validator and tests. |
| 6 | The site works without an LLM. | Template fallbacks on every AI surface. |
| 7 | The app never creates tables; migrations do. | `scripts/migrate.mjs`; SQL only under `migrations/`. |
| 8 | Writes are scoped by session identity, never by client-supplied user ids. | Store/action signatures and integration tests. |
| 9 | Community reads are public; saves and reports are not. | `deleted_at`/`hidden_at` filters; owner-only queries. |
| 10 | Caution wins in the job tool. | `src/lib/loker/verdict.ts`. |
| 11 | No two scans run concurrently. | PostgreSQL advisory lock. |
| 12 | Builds are immutable release artifacts. | Tagged `APP_IMAGE` and no build on start. |

If a change violates one of these, it is not a normal feature change; it needs
an explicit decision entry here and matching tests.

---

## 2. Product-level decisions

### D1 — Four surfaces, one workspace shell

Companion, Belajar, Simulasi, and Komunitas share `WorkspaceShell`: left
navigation, a scrolling column, a 340 px right rail, and a mobile bottom bar.
This keeps navigation predictable and avoids four unrelated layouts. Marketing,
auth, and legal pages sit outside the shell.

### D2 — Companion is an orchestrator, not a chatbot

A general chatbot would answer anything and blur the product's purpose. The
Companion classifies the turn, routes to a deterministic capability (check,
lesson, simulation, community, job tool), and uses the model only to phrase the
answer or fill knowledge gaps under a strict schema.

### D3 — Deterministic verdict, probabilistic language

Scam detection must be explainable and reproducible. Language generation is
allowed to vary. Merging them would make the verdict unauditable and would
require sending the message to a third party.

### D4 — Competition scope over platform breadth

Features were trimmed to what can be finished and defended: no DMs, realtime,
uploads, email notifications, password reset, or mobile app. The retired
Darurat/triage/PDF surface was replaced by Komunitas. Each removal reduces the
surface that must be secured and tested.

### D5 — Local scoring over server scoring

Server-side scoring would centralize updates and telemetry, but it would require
uploading private messages. Local scoring was chosen to keep the privacy claim
literal and to keep the tool usable offline.

### D6 — PostgreSQL over SQLite

Auth originally used SQLite. PostgreSQL was mandated for concurrency, JSONB for
content payloads, server-side rate-limit counters shared across processes, and
one durable store for all state. The SQLite import path exists to preserve
existing accounts during the cutover.

---

## 3. Architecture decisions

### D7 — Route groups separate marketing from the app

`(marketing)` owns `/`; the app routes are `/companion`, `/belajar`,
`/simulasi`, `/komunitas`. There is no `(app)/page.tsx`. The root layout does not
render app navigation; each app page renders `WorkspaceShell`. This prevents
marketing chrome from leaking into the workspace and keeps `/` a marketing page.

### D8 — Server Components by default, client only at interaction

Pages and layouts are Server Components. Client boundaries are pushed down to
the smallest interactive leaf (composer, dialogs, filters, timers). This keeps
JavaScript small and keeps data access on the server.

### D9 — Server Actions for mutations, route handlers for streaming/API

Server Actions cover form-style mutations (auth, community, account, learning
answers, simulation events). Route handlers cover AI, verification, health, and
job scanning, where a typed JSON request/response, streaming, or a non-form
caller is needed.

### D10 — `cacheComponents: true` with explicit dynamic boundaries

Next.js 16 cache components reject `export const runtime` and
`export const dynamic`. Dynamic pages declare `export const instant = false` or
`await connection()`. Cookie reads in layouts are wrapped in `Suspense`. The
build gate enforces these; a route that violates them fails `next build`, not
just review.

### D11 — Contracts are the boundary, `.strict()` at the edge

`src/lib/contracts/` defines `ScoreResult`, `AgentRun`, `Answer`, `Evidence`,
`Verify`, `Vision`, `ToolCall`, and `Report`. Outbound AI payloads are built with
`.strict()` objects so an accidental extra field fails validation instead of
silently leaking data. Contracts are frozen; changes are additive and announced.

### D12 — Domain logic in `src/lib`, thin routes and components

Route handlers parse, authorize, rate-limit, and map errors. Components render
and dispatch. Business rules live in `src/lib/<domain>/`. This is what makes the
logic unit-testable without a browser or a server.

### D13 — One storage abstraction per domain

Each domain owns its SQL (`scoring` is pure and has none; `learning`, `community`,
`loker`, `auth` each have a store). There is no generic ORM or cross-domain
repository. Explicit SQL keeps queries auditable and avoids a framework that
hides N+1 or missing scopes.

### D14 — JSONB for teaching content, relational columns for queries

Learning modules and simulation payloads are JSONB validated by Zod, because
they are documents edited together. Identity, ownership, timestamps, and
foreign keys stay relational. The split keeps queries simple without a wide,
fragile schema.

### D15 — Soft delete for content, hard delete for auth state

Content needs moderation and recovery: `deleted_at`/`hidden_at`. Sessions, OAuth
states, rate counters, and intrusion timers expire and are hard-deleted by
`db:cleanup`. The distinction is intentional; do not "clean up" content rows.

### D16 — Cumulative job corpus, not live search

The scanner appends to `loker_postings` and dedupes by `url_key`. The UI filters
a bounded snapshot in the browser. A live search index would add infrastructure
and a new failure mode for a feature that is not the core product.

### D17 — Two independent verdicts, caution wins

Sentinel (structural/trust) and Lumina scoring (content) can disagree. The tool
shows both and takes the more cautious recommendation. A single blended score
would hide which engine objected and would be harder to explain.

### D18 — Evidence labels persist, quotes do not

`loker_postings.lumina_signals` stores `{label, weight}` only. The checked
message and evidence quotes are not retained in the corpus. This keeps the job
corpus useful for ranking without turning it into a store of user text.

---

## 4. Operational decisions

### D19 — Migrations before traffic, always

The app never runs DDL at request time. `npm run db:migrate` is an explicit
release step, serialized by an advisory lock, recorded in `schema_migrations`.
This makes deploy failures visible before users arrive.

### D20 — Additive migrations for rollback safety

Rollback swaps the image, not the schema. Therefore migrations must be
backward-compatible with the previous image: add columns/tables/indexes, do not
drop or rename in the same release.

### D21 — Immutable image tags

`APP_IMAGE` is tagged with a commit or release id. `up -d --no-build` deploys a
known artifact. `latest` alone makes rollback and provenance ambiguous.

### D22 — Only the proxy is public

Caddy publishes 80/443; the app and database are on internal networks. The app
trusts a client-IP header only when `TRUST_PROXY=true`. This prevents rate-limit
spoofing and database exposure.

### D23 — Single-host, single-writer assumptions

The advisory lock, local scan directory, and in-process pool assume one host.
Horizontal scaling would require an external queue, object storage for scan
data, and a shared limiter. That is deliberately out of scope.

### D24 — Health is database-only

`/api/health` answers "can this process reach its durable store?" It does not
claim the LLM, scanner, or Google are healthy. A green health check is not a
green product; use the verification ladder in [operations.md](operations.md).

---

## 5. Rejected alternatives

| Alternative | Why rejected |
| --- | --- |
| Server-side message scoring | Breaks the privacy claim; adds latency and a failure mode. |
| LLM-as-classifier | Non-deterministic, unexplainable, prompt-injectable, expensive. |
| Generic chatbot companion | Blurs scope, invites ungrounded answers, harder to evaluate. |
| SQLite for everything | Weak concurrent writes and JSONB; auth only, then migrated. |
| ORM | Hides SQL shape and scopes; the domain is small enough for explicit SQL. |
| Client-only app | Accounts, progress, community, and job corpus need durable shared state. |
| Microservices | One team, one deploy, no independent scaling need. |
| Realtime community | Not needed for the competition; adds sockets and presence state. |
| Live job search API | Cost, rate limits, and a new dependency; a cumulative corpus suffices. |
| Single blended job score | Hides which engine objected; harder to explain and audit. |
| Storing evidence quotes in the corpus | Turns public postings into a store of quoted text; labels suffice. |

---

## 6. When to revisit a decision

Revisit when one of these becomes true:

- Multiple app hosts are required → D23, D16.
- Moderators need self-service → role table, replacing the env allowlist.
- Email ownership matters → verification and password reset.
- The message may be sent to a model → D3/D5 require an explicit privacy
  decision and user consent, not a silent schema change.
- The job corpus needs live coverage → a search index, replacing snapshot
  filtering.
- Content edits need history → an append-only revision table, not overwriting.

Any change to an invariant in section 1 must update this document, the affected
architecture page, and the tests in the same change.
