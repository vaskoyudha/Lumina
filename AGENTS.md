# Repository Guidelines

**Repository:** `Lumina` — an Indonesian anti-scam learning companion. This file is the binding guide for AI coding assistants. Read it before changing code, then consult `docs/plan.md` (product truth), `docs/architecture/`, and the nearest module tests.

## Project Overview

Lumina helps readers inspect suspicious messages, learn scam patterns, practise simulations, and discuss cases in a public community. The product decisions of 9 November 2026 are binding:

- Emergency mode, triage, and PDF export were removed. `/komunitas` is the replacement surface.
- Learning material, quizzes, and simulation scenarios are read from PostgreSQL. Per-account progress and simulation results are stored in PostgreSQL; checked messages and conversations remain on the device.
- The deterministic scoring engine is the verdict source. The LLM writes language, not scores. Consensus may set a final score only when at least two agents agree on the same pattern and cite evidence; the engine score stays visible.
- Do not edit `main` directly. Create `codex/<job-name>` before editing. `main` is the integration branch.
- Checked message text, attachments, and transcripts must not leave the device. See “Privacy invariants” below before touching AI payloads.

Main surfaces:

| Surface | Route group | Purpose |
|---|---|---|
| Marketing | `src/app/(marketing)` | Landing page and public product story |
| Account | `src/app/(app)` | Profile and account progress |
| Workspace | `src/app/(chat)` | `/companion`, `/agen`, `/belajar`, `/simulasi`, `/komunitas` |
| Admin | `src/app/admin` | Curriculum workbench; deliberately unlinked from public nav |
| Studio | `src/app/studio` | Allowlisted coding agent (`STUDIO_ALLOWED_IDS`) |
| Auth | `src/app/masuk`, `src/app/daftar` | Email/password and Google sign-in |

## Architecture & Data Flow

The app uses Next.js 16 App Router with Turbopack and Cache Components, React 19, strict TypeScript, Tailwind v4, and PostgreSQL through `pg`.

```text
Browser
  ├─ RSC pages             src/app/**/{page,layout}.tsx
  ├─ Server Actions        src/lib/{auth,community,learning,companion}/actions.ts
  └─ Route handlers        src/app/api/**/route.ts
        └─ src/lib/server/request.ts  validate → authorize → rate-limit → deadline
              └─ domain modules in src/lib/
```

- **Route handlers stay thin.** Parse with Zod, enforce ownership/rate limits, set an abort deadline, then delegate. Shared request helpers live in `src/lib/server/request.ts`; LLM egress lives in `src/lib/server/llm.ts`.
- **Companion path:** the browser scores locally with `src/lib/scoring/score.ts`, routes the turn in `src/lib/companion/turn.ts`, builds a privacy-filtered payload in `src/lib/companion/{answer-client,voice-client}.ts`, then calls `/api/companion/answer` or `/api/companion/orchestrate`.
- **Orchestrator:** `planner → specialists → synthesizer → score decision → consensus` in `src/lib/orchestrator/loop.ts`. It streams events to the client; synthesis deltas are score-safe and final text arrives in `synthesis_end`.
- **Offline fallback:** when `LUMINA_LLM_URL` or `LUMINA_LLM_MODEL` is empty, the companion uses deterministic templates and AI routes return `503`/`not-configured`. This is a demo path, not a defect.
- **Persistence:** PostgreSQL stores accounts, sessions, limits, learning/simulation progress, community data, and companion metadata. Content is loaded from `content/competition.json` through `npm run db:seed`, which runs `scripts/seed-content.mjs` and validates `ContentBundleSchema`; the app never creates tables.

## Key Directories

| Path | Purpose |
|---|---|
| `src/app/(marketing)` | Landing page, theme slider, public shell |
| `src/app/(app)` | Signed-in app shell and profile |
| `src/app/(chat)` | Workspace surfaces with their own sidebars and scroll |
| `src/app/admin` | Curriculum authoring; export + commit, not a publish button |
| `src/app/api` | AI, auth, account/session, link/file verification, loker, health |
| `src/components/ui` | shadcn/radix primitives; do not hand-edit except registry fixes |
| `src/components/companion` | Conversation state machine, evidence panel, agent run, composer |
| `src/components/{belajar,simulasi,community,shell,auth,brand}` | Surface and shared shell components |
| `src/lib/contracts` | Frozen cross-stream schemas; additive changes only |
| `src/lib/scoring` | Deterministic detectors, score engine, evaluation corpus |
| `src/lib/orchestrator` | Planner, specialists, consensus, score decision, streaming |
| `src/lib/companion` | Turn routing, fallback replies, SSE clients, history metadata |
| `src/lib/auth`, `src/lib/server` | Database pool, sessions, OAuth, request limits, LLM helpers |
| `src/lib/{learning,content,simulasi,community,loker,studio,verify,evidence}` | Domain modules |
| `src/data` | Static curriculum, patterns, modus/tactics, official domains |
| `src/styles` | Token layers for app, landing, and Powder sections |
| `content/` | Seed bundle (`competition.json`), validated by schema |
| `migrations/` | Numbered SQL; applied only by `npm run db:migrate` |
| `scripts/` | Migration, cleanup, seeds, SQLite import, standalone linking, work report |
| `scanner/` | Vendored career-ops engine; run as subprocess; do not edit |
| `deploy/` | Caddy, database init, backup |
| `docs/` | Architecture, product plan, deployment, security/privacy, testing |
| `.agents/skills/` | Shared skills read by OpenCode, Claude Code, Codex, Hermes |

## Subdirectory Guides

These subtrees carry a deeper `AGENTS.md`; read the nearest one before editing there. Root rules still apply.

| Guide | Owns |
|---|---|
| `src/app/AGENTS.md` | Route surfaces, groups, RSC/Suspense/`instant`, hex exceptions, moderation 404 |
| `src/app/api/AGENTS.md` | Thin HTTP edges, handler→lib map, body/deadline/rate guards, privacy gating |
| `src/lib/scoring/AGENTS.md` | Verdict production, detectors, accumulate, `finalize` caps, eval |
| `src/lib/orchestrator/AGENTS.md` | Planner→specialists→synthesis→score→consensus, score-safe streaming, consensus gate |
| `src/lib/companion/AGENTS.md` | Lane routing, fallbacks, attachment/vision privacy, SSE clients, history metadata |
| `src/lib/contracts/AGENTS.md` | Frozen Zod schemas, additive-only, strict outbound payloads |
| `src/lib/loker/AGENTS.md` | Scanner subprocess, board adapters, deterministic audit/trust/fee rules |
| `src/lib/auth/AGENTS.md` | pg pool, hashed sessions, PKCE OAuth, server-only boundaries |
| `src/lib/community/AGENTS.md` | Posts/replies/moderation SQL, session authorship, allowlist moderation |
| `src/lib/server/AGENTS.md` | Request limits/abort, single LLM egress, DNS-pinned SSRF guard |
| `src/lib/learning/AGENTS.md` | Progress/quizzes/SM-2 review, advisory-lock transactions, pure scheduling |
| `src/components/companion/AGENTS.md` | Chat state machine, display-only scores, panel algebra, honesty rules |
| `src/components/belajar/AGENTS.md` | Course reader/quiz/practice, content-as-prop, “Segera” labelling |
| `src/components/marketing/AGENTS.md` | Landing tokens/theme, scripted hero demo, shared auth, generated Powder |
| `src/components/ui/AGENTS.md` | shadcn radix-nova registry, `asChild`, no hand-edits, dead `glass-folder` |
| `src/data/AGENTS.md` | Compile-time curriculum/patterns/tactics/domains, schema coupling |

## Development Commands

Requires **Node >= 24** and **npm** (`package-lock.json`; use `npm ci` for clean installs).

```bash
npm run dev                 # Next dev server with Turbopack
npm run build               # next build + standalone symlink repair
npm run start               # production server
npm run verify              # typecheck → Biome → Jest → build (release gate)
npm run typecheck           # tsc --noEmit
npm run lint                # biome check
npm run lint:fix            # biome check --write
npm run format              # biome format --write

npm test                    # all Jest suites
npm test -- src/lib/scoring/score.test.ts   # one file
npm test -- -t "nama test"  # one test by name
npm test -- --runInBand     # serial; required style for shared DB suites
npm run test:watch
npm run test:coverage       # informational; no coverage threshold

npm run db:migrate          # applies migrations; DATABASE_URL must target the DB
npm run db:seed             # additive seed from content/competition.json
npm run db:seed -- content/competition.json --replace  # replace named rows
npm run db:seed:community
npm run db:seed:community:agents
npm run db:cleanup
npm run db:import-sqlite -- <backup.sqlite>
npm run wip                 # dirty files + unpushed commits across all worktrees
```

- `db:*` scripts load `.env.local` with `node --env-file-if-exists`; they do not load `.env.production` locally.
- `npm run verify` is the only release gate; there is no CI.
- Migrations are a separate release step. The app and container entrypoint never create tables.
- Migration files are applied in lexicographic filename order by `scripts/migrate.mjs` and recorded in `schema_migrations` by full filename; an advisory lock prevents concurrent runs. There are no down migrations, never rename an applied file, and note that duplicate numeric prefixes exist (`005`, `006`, `008`). Deploy the migration before the code that needs it.
- Before `git switch`/`git checkout` in this shared checkout, run `npm run wip`. Commit per path (`git commit -- <files>`) and push a branch once a slice works.

## Code Conventions & Common Patterns

### Naming and layout

- Kebab-case files, PascalCase components/types, `@/*` for `src/*`.
- Tests sit beside source: `src/**/*.test.ts?(x)`.
- Product vocabulary is Indonesian (`ScoreResult.risk`, `signals`, `modus`, `periksa`); infrastructure names are English.
- Keep route groups meaningful: do not add `(app)/page.tsx` (it collides with `/`).

### Server/client boundaries

- Add `"use client"` only when hooks or browser APIs are needed.
- Add `import "server-only"` to DB/secret modules; tests mock it with `jest.mock("server-only", () => ({}), { virtual: true })`.
- Wrap session/cookie readers in `Suspense` (see `src/components/shell/nav-with-session.tsx`) so a layout read does not make every route dynamic.
- Route handlers validate body size (`readJson`), schema (Zod), ownership/session, rate limits, and deadline before calling domain code.

### Score ownership and contracts

- `src/lib/scoring/score.ts` is the only score producer. Do not invent or adjust `score`, `risk`, or `signals` in components, routes, or prompts.
- `riskFor()` in `src/lib/contracts/score.ts` is the only bander and `RISK_TOKEN` the only color map. The orchestrator may re-author a score only on ≥2-agent grounded consensus and must keep `baselineScore`.
- `src/lib/contracts/**` is frozen. Prefer additive fields; announce changes because all surfaces consume them.
- Outbound AI schemas are `.strict()` at every level and must not be able to carry the checked message or `Signal.evidence`.
- OTP/PIN/password requests force the high-risk band. Model consensus cannot override that.

### Honesty invariants

- The evidence panel prints engine findings only. Every agent in the panel must actually run; an identity agent abstains rather than inventing a finding.
- A module that is not written yet is labeled “Segera”, not rendered as an empty stub. An unimplemented simulation level is labeled “Rencana”, not playable.
- Accuracy claims come from `runEval()` on the 120-case corpus (60 scam / 60 legitimate), not from proposal targets. Re-measure after detector changes.
- Link/file verification never writes back into `signals`; it is opt-in and hash/URL-only. A model fallback must not change the deterministic score.

### Validation, errors, and async

- Co-locate Zod schemas with the domain; parse at read/seed boundaries.
- Server actions return discriminated results: `{ ok: true, ... } | { ok: false, error: string }`.
- Prefer domain error classes (`AuthError`, `CommunityError`, `LearningError`, `StudioUpstreamError`) over string throwing.
- Network helpers degrade honestly; do not throw past the boundary when an optional dependency is unavailable.
- Use abort signals and deadlines. Streaming parsers live in `src/lib/companion/voice-stream.ts`; do not add a second SSE parser. The orchestrator streams synthesis through `emitScoreSafe` (16-char tail) so a `\d/100` token never splits across deltas.
- Inject clocks, `fetch`, and `chat` functions for testability (see `src/lib/orchestrator/loop.test.ts`, `src/lib/evidence/bundle.ts`).

### State and UI

- Local `React.useState`/`useReducer`; no Redux/Zustand. Anonymous progress may use local storage helpers; account progress uses server actions.
- Never hardcode hex colors. Use mapped utilities from `src/app/globals.css` (`bg-bg`, `text-txt`, `border-line`, `bg-panel`, `text-danger`, `bg-brand`).
- Token layers: `--lumina-*` root, `.appnext` mounted once on `<body>`, and landing `--ls-*` via `.landing[data-theme]`. Powder uses `--pw-*` mapped to `--ls-*`. Do not add a second `.appnext` wrapper or use landing tokens inside the app.
- Supported floor is **380px**. Icon-only controls require accessible names. Prefer `getByRole`/accessible queries in tests.
- Motion must respect `prefers-reduced-motion`; keep interactive controls keyboard reachable.

### Next.js 16 constraints

- `cacheComponents: true` rejects `export const runtime`, `export const dynamic`, and similar segment config. Use `export const instant = false` on dynamic pages or `await connection()` inside handlers.
- Do not read `AUTH_URL` or request origin at module scope; read per request (`src/app/robots.ts`).
- Check `node_modules/next/dist/docs/` before using APIs remembered from older Next versions.

### Workflow and ownership

- Work on `codex/<job-name>`, never directly on `main`.
- Stream ownership (code, not branches):
  - A: `src/lib/scoring`, `src/lib/contracts`, `src/components/companion`, `/companion`, `data/modus.json`.
  - B: `/belajar`, `components/belajar`, curriculum data, `lib/progress.ts`, `/admin`.
  - C: `/simulasi`, `lib/simulasi`, `components/simulasi`.
  - D: `/komunitas`, `components/community`, `lib/community`, `app/layout.tsx`, `globals.css`, `styles/`.
  - Loker: `scanner/`, `lib/loker`, `api/loker`, loker tools/cards, `migrations/002_loker.sql`.
- Shared surfaces: `components/brand`, `components/auth`, `components/shell`, `lib/auth`, `lib/server`, `app/api`, `migrations/`, `styles/`. Announce changes in the commit/PR. `src/lib/contracts`, `lib/scoring`, and `components/companion` are shared too; the vendored `scanner/` is never edited.
- Do not commit `.opencode/` screenshots (`PNG`, `shots/`, `walk-*/`); tracked entries there are skill symlinks only.

### Skills

- Edit `.agents/skills/<name>/SKILL.md`; `.opencode/skills/<name>` and `.claude/skills/<name>` are symlinks.
- Frontmatter requires `name` and `description`; the description must say *when* to use the skill.
- To add a skill: create it under `.agents/skills/`, then link it into each harness directory. Removing a skill requires removing its symlinks too.

### Privacy invariants

- Checked messages never leave the device. Only the user’s question/history, lossy finding digests without quotes, and public `modus.json`/`tactics.ts` facts may be sent.
- `/api/companion/vision` only copies text from an image; its contract has no score/risk/signal fields.
- Link verification is opt-in per link and sends only `{ "url": ... }`; file verification sends only a SHA-256 hash. Neither writes back into `signals`.
- `companion_conversations` stores metadata only (title, turn count, risk, timestamps). Message bodies, attachments, and transcripts are not sent to the server.

## Known Gotchas

- `src/data/modul-11.ts` checklist drifts from `content/competition.json` module 11; no cross-check test guards it.
- Dead/no-importer: `components/companion/companion-entry.tsx`, `components/ui/glass-folder.tsx`, and the `lib/verify/{account,phone,crypto}` exports. Remove rather than extend.
- `components/companion/companion-chat.test.tsx` declares `jest.mock("@/lib/companion/history")` twice.
- Non-token colors survive in `agents-detail-panel.tsx`, `(chat)/simulasi/page.tsx`, and `Runner.tsx`; these are documented exceptions, do not copy them.
- `scripts/seed-demo.mjs` is not wired to any npm script.

## Important Files

- `AGENTS.md` — this file; binding rules and workflow.
- `docs/plan.md`, `docs/architecture/overview.md`, `docs/architecture/backend.md`, `docs/architecture/security-privacy.md` — product and system truth.
- `src/lib/contracts/score.ts` — score/risk/signal invariants.
- `src/lib/scoring/score.ts` — only verdict producer; add detectors here.
- `src/lib/orchestrator/loop.ts` + `src/lib/contracts/orchestrator.ts` — agent-run contract and streaming.
- `src/lib/companion/turn.ts` — pure lane router; `src/components/companion/companion-chat.tsx` — client state machine.
- `src/lib/server/request.ts`, `src/lib/server/llm.ts` — request limits, abort, provider fallback.
- `src/lib/auth/database.ts`, `src/lib/auth/server-session.ts` — pool and session access.
- `src/lib/content/store.ts`, `migrations/`, `content/competition.json` — content source of truth.
- `next.config.ts`, `jest.config.ts`, `jest.setup.ts`, `biome.json`, `Dockerfile`, `compose.yaml` — build/test/runtime constraints.

## Runtime/Tooling Preferences

| Area | Choice |
|---|---|
| Runtime | Node **>= 24**; package manager **npm** with `package-lock.json` |
| Framework | Next.js `16.4.5`, App Router, Turbopack, Cache Components |
| UI | React `19.3`, Tailwind v4 via `@tailwindcss/turbopack`; no PostCSS config |
| Components | shadcn/ui with base **radix**, style `radix-nova`; `lucide-react` icons |
| Language | TypeScript strict, `@/* → src/*` |
| Database | PostgreSQL 18.6 via `pg`; async pool, max 5 connections |
| Lint/format | Biome `2.4.2`; ESLint is not used |
| Tests | Jest 30 via `next/jest`, jsdom, React Testing Library |

- Do not swap the stack without product-owner agreement.
- `next.config.ts` uses `output: "standalone"`. `npm run build` runs `scripts/link-standalone-externals.mjs`; keep it.
- Docker image runs as UID/GID `1001`; Compose runs app + PostgreSQL + Caddy, and only Caddy publishes 80/443. Secrets are env-only, never build args.
- `GET /api/health` checks `SELECT 1` with a 2 s timeout; it does not check the LLM.
- `TRUST_PROXY=true` only behind a proxy that overwrites `X-Lumina-Client-IP`; otherwise all anonymous users share one rate-limit key.
- Biome ignores `scanner/`, `.scan-data/`, `src/components/marketing/powder/sections`, `src/styles/powder-{framer,fonts}.css`, `src/data/powder`, and `cyber_course_dashboard(1).tsx`. Edit those by hand; preserve `framer-*` classes.
- Environment groups `.env.example`: required runtime (`DATABASE_URL`, `AUTH_URL`), optional auth/demo/community/studio, optional LLM/orchestrator, optional verification/scanner, Compose-only (`DOMAIN`, `POSTGRES_*`, `APP_DB_PASSWORD`, `APP_IMAGE`), and test-only (`TEST_DATABASE_URL`). Never commit `.env.local`.
- Deploy/runbook: `docs/deploy.md`. Migrations are applied before the new app version; backups use `deploy/backup.sh`.

## Testing & QA

- **Framework:** Jest 30 with `next/jest` (SWC transform, CSS stubs, `@/*` mapping). Default environment is jsdom; server/DB suites opt into node with `/** @jest-environment node */`.
- **Location:** tests live beside source under `src/**/*.test.ts?(x)`. `scanner/tests/*.mjs` uses its own harness, not Jest.
- **Style:** render real React components and assert user-visible behaviour. Prefer `userEvent` over `fireEvent`, `getByRole`/`getByLabelText` over test IDs, and `findBy*`/`waitFor` for async.
- **No snapshots** and no coverage threshold are configured. `npm run test:coverage` is informational; `npm run verify` including `next build` is the real gate.
- **Database tests:** set `TEST_DATABASE_URL` to a dedicated DB whose name ends `_test` and differs from `DATABASE_URL`; run migrations first. Without it, integration suites skip. When set, Jest forces `maxWorkers: 1` because suites reset one shared database.
- **Mocks:** mock `fetch`, provider modules, and `server-only`; assert privacy by checking outbound bodies do not contain message/evidence/transcript fields.
- **Time:** use fake timers deliberately and restore real timers; companion suites raise timeouts because they are CPU-heavy on loaded workers.
- **Environment caveats:** Studio sandbox tests depend on `bwrap` and unprivileged user namespaces. A host-level namespace error is an environment failure, not a code regression; do not weaken the tests. `serial-latency.test.ts` runs only with `LUMINA_LATENCY=1`.
- **Stale docs:** `STATUS.md` and older execution notes may still mention `/darurat` or old test counts. Treat `docs/plan.md` and current code as truth.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
