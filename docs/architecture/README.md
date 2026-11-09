# Lumina Architecture Documentation

This directory is the technical reference for how Lumina is built: its runtime
topology, request flows, data model, deterministic detection engine, agent
orchestration, learning and simulation systems, community, job scanner,
security posture, and operations.

It is written for engineers who need to change the system safely, and for
reviewers who need to verify claims against the code rather than against a
pitch deck.

**Baseline:** `main` at `02f9d9e` (10 November 2026). Every path in these
documents is relative to the repository root. When code and prose disagree,
the code wins; update the document in the same change.

---

## Document map

| Document | Answers |
| --- | --- |
| [overview.md](overview.md) | What the system is, its principles, runtime topology, and the lifecycle of a request. |
| [frontend.md](frontend.md) | How routes, shells, components, tokens, and client state are organized. |
| [backend.md](backend.md) | Route handlers, Server Actions, LLM integration, limits, and API contracts. |
| [data-model.md](data-model.md) | Every PostgreSQL table, constraint, index, migration, and seed/import path. |
| [scoring-engine.md](scoring-engine.md) | The deterministic pipeline, detectors, scoring math, validator, and evaluation harness. |
| [companion.md](companion.md) | Lane routing, agent trace, evidence, voice/vision, tools, and privacy boundaries. |
| [learning-simulation.md](learning-simulation.md) | Content storage, quiz grading, spaced repetition, scenario state machine, and server-authoritative results. |
| [community.md](community.md) | Discussion domain, permissions, moderation, verification, limits, and data policy. |
| [loker.md](loker.md) | Job-scanner pipeline, board adapters, dual verdicts, scheduling, and advisory locking. |
| [security-privacy.md](security-privacy.md) | Threat model, authentication, authorization, rate limits, secrets, and what data leaves the device. |
| [operations.md](operations.md) | Build, deploy, migrate, back up, restore, roll back, observe, and configure. |
| [testing.md](testing.md) | Test layers, database integration setup, evaluation, and the release gate. |
| [decisions.md](decisions.md) | Architecture decision records and their consequences. |
| [glossary.md](glossary.md) | Indonesian product and fraud-domain terms used in code and copy. |

Product intent and historical planning live in
[docs/plan.md](../plan.md). Binding engineering rules live in
[AGENTS.md](../../AGENTS.md). Feature-specific guides remain authoritative for
their domains:

- [Authentication](../auth.md)
- [Learning and simulation database](../learning-database.md)
- [Community](../community.md)
- [Job tool](../loker-tool.md)
- [Link verification](../link-verification.md)
- [Agent orchestration](../agent-orchestration.md)
- [Report template](../report-template.md)
- [Deployment](../deploy.md)

---

## System at a glance

Lumina is a Next.js App Router application backed by PostgreSQL. Four product
surfaces share one account system and one deterministic detection engine:

```
Companion  →  Belajar  →  Simulasi
     └──────────┬──────────┘
             Komunitas
```

```
Browser
  │  HTML / RSC payload / Server Action POST / route-handler fetch
  ▼
Caddy  ──TLS, compression, trusted client IP──►  Next.js standalone (Node 24)
                                                    │
                    ┌───────────────────────────────┼──────────────────────────┐
                    ▼                               ▼                          ▼
              PostgreSQL 18                  LLM provider (optional)    url.vet (optional)
              accounts, sessions,            OpenAI-compatible          link crawling
              content, progress,             chat/completions
              results, community,
              companion metadata,
              job corpus
```

The **verdict is computed in the browser** by a synchronous TypeScript engine.
The model is a language layer only: it explains findings, transcribes images,
and chooses whether to open a tool card. It never sets a score, never adds a
signal, and never receives the message being checked.

---

## The five invariants

These rules explain most of the architecture. A change that violates one is a
design change, not a refactor.

1. **The verdict is deterministic.** `src/lib/scoring/score.ts` is the only
   producer of `score`, `risk`, and `signals`.
2. **The model is voice, not judge.** LLM routes receive a lossy digest or the
   user's own question, never the checked message.
3. **Strict schemas enforce privacy structurally.** Outbound AI payloads use
   Zod `.strict()`; an extra field is a rejected request, not a silently
   forwarded one.
4. **The database is the shared state, and migrations are the only DDL.** The
   app never creates tables at runtime.
5. **The UI reports what happened.** Agent status, counts, durations, and skip
   reasons come from measurements and traces, not from designed animation.

---

## Reading paths

**New engineer**

1. [overview.md](overview.md)
2. [frontend.md](frontend.md)
3. [backend.md](backend.md)
4. [data-model.md](data-model.md)
5. [testing.md](testing.md)
6. [operations.md](operations.md)

**Detection or AI change**

1. [scoring-engine.md](scoring-engine.md)
2. [companion.md](companion.md)
3. [security-privacy.md](security-privacy.md)
4. [testing.md](testing.md) — especially the evaluation harness.

**Product surface change**

1. [frontend.md](frontend.md)
2. The relevant domain document: [learning-simulation.md](learning-simulation.md),
   [community.md](community.md), or [loker.md](loker.md).
3. [backend.md](backend.md) and [data-model.md](data-model.md) if the change
   adds a route, action, table, or column.

**Reviewer**

1. [decisions.md](decisions.md)
2. [security-privacy.md](security-privacy.md)
3. [testing.md](testing.md)
4. The feature document whose claims you are checking.

---

## Conventions used here

- **Path references** are exact and relative to the repository root.
- **Diagrams** are Mermaid and render on GitHub.
- **Status codes, limits, and token budgets** are copied from code, not from
  memory. If you change a constant, update the table that names it.
- **Measured numbers** are labeled with the corpus size and date. They are
  outputs of `runEval()`, not marketing copy.
- **Known limits** are part of the documentation. A design document that lists
  only strengths is incomplete.

---

## Maintaining this documentation

Treat these files as code:

1. Change behavior and its document in the same branch.
2. Run `npm run verify` before committing.
3. If a route, environment variable, migration, or contract changes, update the
   corresponding table. Search for the old name first.
4. Keep product-facing Indonesian copy in the product docs; keep this directory
   in English for technical precision.
5. Do not add a second source of truth. Link to an existing guide instead of
   copying its content.
