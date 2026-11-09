# Lumina Documentation

This is the index of Lumina's technical and product documentation. Start with
the [architecture set](architecture/README.md) if you are changing code; start
with the product documents if you are evaluating behavior.

## Architecture

| Document | Scope |
| --- | --- |
| [Architecture index](architecture/README.md) | Map, invariants, reading paths, maintenance rules. |
| [System overview](architecture/overview.md) | Product shape, principles, topology, request lifecycle. |
| [Frontend](architecture/frontend.md) | Routes, shells, components, tokens, rendering, accessibility. |
| [Backend](architecture/backend.md) | Route handlers, Server Actions, LLM routes, limits, API reference. |
| [Data model](architecture/data-model.md) | Tables, constraints, indexes, migrations, seeds, retention. |
| [Scoring engine](architecture/scoring-engine.md) | Detectors, scoring math, validator, modus classification, evaluation. |
| [Companion](architecture/companion.md) | Lane routing, agent trace, evidence, voice/vision, tools, privacy. |
| [Learning and simulation](architecture/learning-simulation.md) | Content, quizzes, SRS, scenarios, server-authoritative results. |
| [Community](architecture/community.md) | Discussion model, permissions, moderation, limits. |
| [Job scanner](architecture/loker.md) | Crawl pipeline, adapters, dual verdicts, locks, scheduling. |
| [Security and privacy](architecture/security-privacy.md) | Threat model, auth, authorization, rate limits, data boundaries. |
| [Operations](architecture/operations.md) | Build, deploy, migrate, backup, restore, rollback, configuration. |
| [Testing](architecture/testing.md) | Test layers, database integration, evaluation, release gate. |
| [Decisions](architecture/decisions.md) | Architecture decision records. |
| [Glossary](architecture/glossary.md) | Indonesian domain terms used in code and copy. |

## Product and feature guides

| Document | Scope |
| --- | --- |
| [Product plan](plan.md) | Product intent, streams, gates, historical decisions. |
| [Implementation status](../STATUS.md) | What shipped, with dated evidence and known limits. |
| [Authentication](auth.md) | Accounts, sessions, Google OAuth, demo account, limits. |
| [Learning database](learning-database.md) | Content storage, per-account progress, deployment steps. |
| [Community](community.md) | Competition-version discussion feature and moderation. |
| [Job tool](loker-tool.md) | Scanner integration, dual verdicts, operations. |
| [Job tool guide](loker-tool-guide.md) | User-facing walkthrough with screenshots. |
| [Link verification](link-verification.md) | url.vet integration and privacy. |
| [Agent orchestration](agent-orchestration.md) | Trace contract, crew bubbles, status semantics. |
| [Report template](report-template.md) | Deterministic report drafting and model polish. |
| [Deployment](deploy.md) | VPS topology, first deploy, backups, rollback. |
| [Backend validation](backend-validation.md) | Dated evidence for the PostgreSQL/VPS backend. |
| [Design system](design-system/appnext.md) | AppNext token and surface rules. |

## Research and plans

- [Plans](plans/) — dated implementation plans and execution records.
- [Superpowers specs](superpowers/specs/) — feature design specifications.
- [Superpowers plans](superpowers/plans/) — feature implementation plans.
- [Research](research/) — explorations that informed shipped decisions.
- [Audits](audits/) — dated security and UX audits.

## Assets

- [Report-template screenshots](assets/report-template/) — committed evidence of
  the report card at desktop and 380 px.
- [Landing screenshots](screenshots/landing/) — responsive landing captures.
- [Demo assets](research/demo-assets.md) — synthetic, watermarked demo material.

## Documentation rules

1. **One source of truth per topic.** Link, do not duplicate.
2. **Code wins.** If a document and `src/`, `migrations/`, or `scripts/`
   disagree, the code is correct and the document is a bug.
3. **Date measured claims.** Accuracy, latency, and test counts are only
   meaningful with a corpus size and commit.
4. **Document limits.** Every feature document should state what it does not
   do.
