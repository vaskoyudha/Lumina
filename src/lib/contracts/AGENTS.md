# src/lib/contracts — frozen cross-stream schemas

## OVERVIEW
Shared Zod schemas and types that every surface consumes: score/risk/signal, orchestrator events, agent traces, answer/tool/report payloads, verification, vision, evidence. Changes here are contract changes.

## STRUCTURE
| File | Owns |
|---|---|
| `score.ts` | `ScoreResult`, `Signal`, `Risk`, `AgentId`, `ConsensusEvidence`, `riskFor`, `RISK_LABEL`, `RISK_TOKEN`, `isRisky` |
| `orchestrator.ts` | `OrchestratorRequestSchema`, `SPECIALIST_IDS`, `OrchestratorEventSchema`, `OrchestrationTrace` |
| `agent-run.ts` | `AgentTrace`, `STAGE_LABEL`, `VoiceDigestSchema`, `voiceDigest` |
| `answer.ts` | `AnswerRequestSchema` / history / module / tactic / attachment / chip |
| `tool.ts`, `report.ts`, `loop.ts` | Tool args + summaries, report polish, `MAX_AGENT_STEPS`/`MAX_OBSERVATIONS` |
| `verify.ts`, `vision.ts`, `evidence.ts` | Verification, vision request, evidence bundle |

## WHERE TO LOOK
| Task | File | Notes |
|---|---|---|
| Risk banding | `score.ts:76` `riskFor()` | Only band source; never re-derive thresholds elsewhere |
| Risk color | `score.ts:91` `RISK_TOKEN` | `safe|warn|danger`; components must not hardcode colors |
| SSE event union | `orchestrator.ts` `OrchestratorEventSchema` | Hottest contract: loop, client, components, agent runs |
| Outbound privacy shape | all request schemas | `.strict()` at every level; extras rejected, not dropped |
| Caps | `loop.ts` | `MAX_AGENT_STEPS`, `MAX_OBSERVATIONS`, `MAX_OBSERVATION_POSTINGS` |

## CONVENTIONS (different from root)
- Additive changes only; announce a new field before committing because all surfaces consume these.
- Every outbound AI payload is a strict Zod object; a schema must not be able to carry the checked message or `Signal.evidence`.
- Types are inferred from schemas (`z.infer`) so runtime and compile-time cannot drift.
- `AgentId`/`SpecialistId`/`CrewId` ids are literals; adding one ripples to orchestrator, UI, and tests.

## ANTI-PATTERNS (THIS DIRECTORY)
- Never change a field non-additively; never loosen `.strict()`.
- Never add a message/evidence/transcript field to an outbound request schema.
- Never duplicate risk thresholds outside `riskFor()` or colors outside `RISK_TOKEN`.
- Never reorder/rename `SPECIALIST_IDS` or stage literals without updating the orchestrator and UI registries.
