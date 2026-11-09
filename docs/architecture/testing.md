# Testing and Quality Gates

Quality is enforced by five gates: TypeScript strict, Biome, Jest, the live
content validator, and `next build`. This document explains what each gate
proves, how the suites are structured, and what is deliberately not covered.

---

## 1. Commands

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` over the whole repo. |
| `npm run lint` | `biome check` — lint + format check, Next/React/a11y domains. |
| `npm run lint:fix` | `biome check --write`. |
| `npm run format` | `biome format --write` only. |
| `npm test` | Jest, all unit/component/integration suites. |
| `npm run test:watch` | Jest watch. |
| `npm run test:coverage` | Jest with coverage. |
| `npm run build` | `next build` — catches RSC/client-boundary/cache violations. |
| `npm run verify` | typecheck → lint → test → build. The release gate. |
| `npm run db:seed -- FILE --replace` | Content schema/graph validation with rollback. |
| `npm run wip` | Work-in-progress report. |

`npm run verify` is the definition of "done" for a change. It does not deploy.

Test database:

```bash
export TEST_DATABASE_URL="postgresql://lumina_app:PASSWORD@127.0.0.1:5432/lumina_test"
```

The name must end with `_test`; integration suites refuse anything else. With
`TEST_DATABASE_URL` set, Jest forces `maxWorkers: 1` because every integration
suite truncates/reset the same database.

---

## 2. Jest configuration

| Setting | Value | Why |
| --- | --- | --- |
| `testEnvironment` | `jsdom` | Components are exercised with real DOM. |
| `maxWorkers` | `1` with `TEST_DATABASE_URL`, else `"50%"` | Isolation for DB suites. |
| `testTimeout` | 15 s | Real user-event sequences on loaded hosts. |
| `setupFilesAfterEnv` | `jest.setup.ts` | jsdom gaps. |
| `testMatch` | `src/**/*.test.ts?(x)` | Tests live beside code. |
| CSS/module/alias handling | `next/jest` + explicit `@/*` mapper | `jest.mock("@/…")` needs the mapper. |

`jest.setup.ts` fills gaps that would otherwise make privacy claims untested:

- `TextEncoder`/`TextDecoder`.
- `crypto.subtle` via `node:crypto.webcrypto` — hashing used by local evidence
  and privacy paths.
- `structuredClone` via V8 serialization — copy-on-read stores.
- `matchMedia`, `ResizeObserver`, `print`, `scrollIntoView`, object URLs —
  component behaviour in jsdom.

Lockdowns live in tests, not in global config: `Object.freeze` on contracts and
fake timers where a clock matters.

---

## 3. Test layers

```mermaid
flowchart TD
    C[Component tests<br/>jsdom + Testing Library<br/>src/components/**, src/app/**/*.test.tsx]
    U[Unit/property tests<br/>contracts, scoring, parsers]
    I[Integration tests<br/>PostgreSQL, real SQL<br/>src/lib/**/store.test.ts, actions.test.ts]
    B[Build gate<br/>next build]
    C --> B
    U --> B
    I --> B
```

### 3.1 Unit and property tests

Target pure logic: scoring detectors, normalisation, link/QRIS/email rules,
contract validators, content schemas, scenario graphs, rate-limit keying,
date/window calculations.

Properties that are pinned rather than example-only:

- `scoreText()` returns an integer 0–100, at least one signal with an exact
  evidence substring, a sorted signal list, and a risk consistent with score.
- The same input produces the same output; no randomness or clock in scoring.
- Every `evidence` is a substring of the analysed text.
- `advice` has 1–4 steps.
- Adding a scam signal cannot lower risk.
- Detector ids are unique and stable.

### 3.2 Component tests

Use Testing Library and real user events. They assert what a person sees and
can do:

- Composer sends the typed message; attachment filename reaches the engine.
- Risk panel renders the contract, not mock strings.
- Belajar/Simulasi gates render locked/available/complete states.
- Community editor validates and submits; report dialog requires a reason.
- Dialogs trap focus and close with Escape.
- Mobile navigation exists at narrow widths.

Components are client components only where interaction requires it; the test
renders the same boundary the app uses.

### 3.3 Integration tests

`*.store.test.ts` and `*.actions.test.ts` run real SQL against PostgreSQL:

- migrations/cleanup preconditions,
- uniqueness and soft-delete behavior,
- pagination and search,
- session rotation and revocation,
- rate-limit counters,
- learning progress and review scheduling,
- simulation timers.

They skip or fail loudly when `TEST_DATABASE_URL` is absent; they never point at
production.

### 3.4 API contract tests

Route handler tests call the exported `POST`/`GET` with a `Request`, a mocked
session, and a mocked provider. They pin:

- 413 for oversized bodies,
- 400 for schema violations,
- 401/403 for session/ownership,
- 429 for rate limits,
- 504 for upstream timeouts,
- `Cache-Control: no-store`,
- outbound payload shape (`.strict()` and no message/evidence field).

### 3.5 Build gate

`next build` is a test. It catches:

- a client component importing server-only code,
- a server component using hooks,
- forbidden `export const runtime`/`dynamic` under `cacheComponents: true`,
- missing Suspense around cookie reads,
- invalid route exports.

A green Jest run with a red build is not shippable.

---

## 4. Coverage map

| Area | Representative suites | What they protect |
| --- | --- | --- |
| Scoring | `src/lib/scoring/*.test.ts` | Contract, detectors, weights, determinism, injection. |
| Contracts | `src/lib/contracts/*.test.ts` | Frozen shapes, Zod bounds, agent trace. |
| Companion | `src/lib/companion/*.test.ts`, `src/components/companion/*.test.tsx` | Routing, tools, evidence, history, voice privacy. |
| Auth | `src/lib/auth/*.test.ts` | scrypt, sessions, OAuth, rate limits. |
| Learning | `src/lib/learning/*.test.ts` | Path, practice, reviews, pattern map. |
| Simulation | `src/lib/simulasi/*.test.ts` | Scenario validation, timers, grading. |
| Community | `src/lib/community/*.test.ts` | Store, actions, moderation. |
| Job scanner | `src/lib/loker/**/*.test.ts` | Adapters, audit, ingest, verdict, lease. |
| Link/file verification | `src/lib/verify/*.test.ts` | URL/file guards, provider mapping. |
| Marketing/UI | `src/components/**/*.test.tsx` | Rendering, dialogs, navigation, responsive. |

Counts move; at the baseline there are 173 test files and roughly 1,286 test
cases. Treat the counts as a snapshot, not a target.

---

## 5. Test conventions

1. **Behaviour over implementation.** Assert user-visible outcomes and contract
   fields, not internal call order unless the call is the contract.
2. **No network.** Mock `fetch` or the provider module. Tests must pass offline.
3. **No wall clock.** Use fake timers for expiry, reviews, and scan windows.
4. **Determinism.** Seed any randomness; do not assert on generated UUIDs,
   timestamps, or AI text.
5. **One reason to fail.** A test name states the invariant, not the method.
6. **Privacy assertions are real.** For AI payload tests, parse the request body
   and assert the absence of `message`, `evidence`, `transcript`.
7. **DB tests own their data.** Use unique emails/ids per test and clean up, or
   rely on the suite's reset; never depend on seed rows.
8. **Skip is loud.** A missing `TEST_DATABASE_URL` must not silently turn an
   integration suite into a green no-op. Prefer an explicit skip with a reason.
9. **Regression tests name the bug.** When fixing a defect, add the case that
   would have caught it.

---

## 6. What is not covered

| Gap | Consequence |
| --- | --- |
| No browser E2E (Playwright) in the repo | Full click-through flows are verified manually. |
| No visual regression | Layout drift is caught by review. |
| No load/performance tests | Rate limits and pool size are reasoned, not measured. |
| No real LLM in CI | Prompt/answer quality is not asserted; only shape and fallbacks. |
| No real Google OAuth in CI | The flow is unit-tested with mocked token/ID-token responses. |
| No scanner end-to-end in CI | Adapters and audit are unit-tested; a real crawl needs a host. |
| No mutation testing | Coverage is a signal, not a proof. |

Do not claim these are tested. When a release depends on one, run it manually
and record the result.

---

## 7. Adding a feature: the test checklist

1. Contract change? Add a contract/schema test and update the frozen shape.
2. New detector? Add positive, negative, evidence-substring, and determinism
   cases; update `detector-ids` and the eval corpus if applicable.
3. New route? Add 413/400/401/429/504 cases as applicable and assert
   `no-store`.
4. New table? Add a migration, a store integration test, and a cleanup rule if
   the data expires.
5. New client interaction? Add a component test with `userEvent`, including the
   keyboard path.
6. New AI payload? Add a test that parses the outbound JSON and asserts no
   message/evidence field.
7. New content section? Update the schema, the seed validator, and the render
   test for `content = null` → **Segera**.
8. Run `npm run verify`. A partial run is not a pass.

---

## 8. CI expectations

The repository does not ship a CI workflow file at this baseline. A correct
pipeline runs, in order:

```bash
npm ci
npm run typecheck
npm run lint
npm test          # TEST_DATABASE_URL against a disposable PostgreSQL service
npm run build
```

Rules for CI:

- Pin Node 24 and PostgreSQL 18.
- Provide `TEST_DATABASE_URL` ending in `_test`; never reuse a shared database.
- Cache npm downloads, not `.next`.
- Fail on lint warnings that Biome treats as errors.
- Do not inject production secrets; use dummy values for build-time reads.
- Upload the build log on failure; it is the only record of an RSC/boundary
  error.

---

## 9. Release verification

Before calling a deploy done:

1. `npm run verify` is green on the commit being deployed.
2. `npm run db:migrate` ran and `schema_migrations` lists the new version.
3. `/api/health` returns 200 through the public URL.
4. A commit-unique marker proves the served bundle is the new build.
5. Login, one learning module, one simulation, and one community read work.
6. If the job scanner changed, one scan completes and writes a run row.
7. If auth changed, both email/password and Google paths were exercised in the
   target environment.
