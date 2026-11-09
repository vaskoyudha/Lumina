# Glossary

Terms used across the codebase and these documents. Indonesian product terms are
kept because they appear in the UI and in code identifiers.

| Term | Meaning |
| --- | --- |
| **Lumina** | The product: a scam-detection and learning companion for Indonesia. |
| **Companion** | The `/companion` surface: check a message, ask a question, continue a case. |
| **Belajar** | The `/belajar` surface: structured modules with anatomy, examples, checklist, quiz, reporting steps. |
| **Simulasi** | The `/simulasi` surface: scripted conversations with an attacker and server-side grading. |
| **Komunitas** | The `/komunitas` surface: public discussion, reports, moderation. |
| **Mode** | The companion lane: `periksa`, `tanya`, `belajar`, `simulasi`, `komunitas`, `loker`. |
| **Cek** | A message check: local scoring plus optional model phrasing. |
| **Verdict** | The deterministic result of scoring: score, risk, signals, modus, advice. |
| **Risk** | `bersih` \| `rendah` \| `mencurigakan` \| `tinggi`. |
| **Signal** | One finding: label, weight, exact evidence substring, optional agent/mechanism/rule id. |
| **Evidence** | The exact quoted substring supporting a signal; must occur in the input. |
| **Modus** | The scam scheme classification (e.g. impersonation, fake job, phishing link), or `tidak-dikenali`. |
| **Advice** | 1–4 imperative next steps shown with a verdict. |
| **Detector** | A scoring rule family: `message`, `link`, `identity`, `conversation`, `job`, `marketplace`, `qris`, `email`, `injection`. |
| **Agent** | One of eight named analyst identities that narrate a finding; not an autonomous LLM agent. |
| **Trace** | `AgentRun`: the ordered agent steps, timings, tool calls, and evidence for one companion turn. |
| **Tool** | A deterministic capability the companion can call: link check, file check, job search, lesson lookup, report draft. |
| **Lane** | The deterministic route chosen for a turn before any model call. |
| **Digest** | A minimal structured summary of a verdict sent to the model instead of the message. |
| **Module** | A Belajar teaching unit stored in `learning_modules`; `no`, metadata, content. |
| **Segera** | UI state for a module whose `content` is null (not yet published). |
| **Scenario** | A Simulasi script stored in `simulation_scenarios`; messages, choices, timers, grading. |
| **Intrusion timer** | A server-side deadline in `simulation_intrusion_timers` that forces a scenario event. |
| **Attempt** | One quiz or scenario submission recorded in `learning_attempts` / `simulation_results`. |
| **Review** | A spaced-repetition item in `learning_reviews` scheduled from progress. |
| **Pattern map** | The mapping from learned patterns to detector labels used to connect lessons and checks. |
| **Post / Reply** | Community content rows; posts are discussions, replies are chronological responses. |
| **Helpful** | A public per-account reaction on a post. |
| **Save** | A private bookmark, visible only to its owner. |
| **Report** | A member flag on a post/reply, visible only to moderators. |
| **Moderator** | An account whose UUID is in `COMMUNITY_MODERATOR_IDS`. |
| **Verified** | A moderator-reviewed badge on a community post; not a fact-check guarantee. |
| **Agent post** | A seeded post authored by a detector identity (`author_kind = "agent"`). |
| **Sentinel** | The structural/trust audit for job postings (URL, domain age, company mismatch, demand signals). |
| **Loker** | The job scanner and its UI (`/companion` job tool). |
| **Posting** | One row in `loker_postings`, deduped by `url_key`. |
| **Scan run** | One crawl recorded in `loker_scan_runs`. |
| **Prewarm** | The scheduled background scan started by `instrumentation.ts`. |
| **Lease** | The advisory-lock handle that makes scans mutually exclusive. |
| **Advisory lock** | PostgreSQL `pg_try_advisory_lock` used for migrations and scans. |
| **Hard rule** | A scoring rule that by itself forces a minimum risk (e.g. OTP request). |
| **Weight** | A signal's 0–1 contribution to the score. |
| **Modus classifier** | The deterministic mapping from signals to a scheme id. |
| **Validator** | `validateScoreResult` / `validateAgentRun`: contract enforcement at runtime. |
| **RSC** | React Server Component; the default rendering mode. |
| **Server Action** | A Next.js `"use server"` function called from a form/transition. |
| **Route handler** | `route.ts` exporting `GET`/`POST`; used for API and streaming. |
| **Cache component** | Next.js 16 model enabled by `cacheComponents: true`. |
| **`instant = false`** | Route segment config declaring a dynamic page under cache components. |
| **`connection()`** | Next.js API that opts a component into request-time rendering. |
| **Workspace shell** | The shared app chrome: sidebar, content column, right rail, mobile nav. |
| **Right rail** | The 340 px contextual column on app pages. |
| **Session** | A 24-hour login record; cookie token hashed in `sessions`. |
| **Attempt counter** | A rate-limit row in `auth_attempts`, keyed by a hash. |
| **OAuth state** | A 10-minute row binding state/verifier/nonce to an intent. |
| **Demo account** | A server-configured account for judging; disabled when env vars are blank. |
| **`url_key`** | The normalised dedupe key for a job posting URL. |
| **RDAP** | Registration-data lookup used to estimate domain age. |
| **url.vet** | The external link scanner used only after an explicit user action. |
| **Fallback** | Deterministic template output used when the model is unavailable. |
| **No-store** | Response header preventing caching of sensitive API responses. |
| **`schema_migrations`** | The table recording applied migration filenames. |
