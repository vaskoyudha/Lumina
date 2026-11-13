# src/lib/orchestrator — multi-agent streaming pipeline

## OVERVIEW
Runs `planner → specialists → synthesizer → score decision → consensus` server-side, streams `OrchestratorEvent`s to the client, and persists nothing itself. The deterministic engine score is the baseline; a model may only re-author it from grounded consensus.

## STRUCTURE
| Area | Files |
|---|---|
| Pipeline | `loop.ts` (`runOrchestrator`), `agents.ts` (`SPECIALISTS`), `prompts.ts` |
| Scoring | `consensus.ts` (`findConsensus`), `score-decision.ts` (`validateScoreDecision`), `report.ts` |
| Tools | `tools.ts` (`TOOL_DEFS`), `subagent-runtime.ts` (process-local follow-ups) |
| Client | `client.ts` (`streamOrchestrator`) |
| Flags | `flag.ts` (`isOrchestratorEnabled`, `orchestratorDeadlineMs`, `isConsensusScoreEnabled`) |

## WHERE TO LOOK
| Task | File | Notes |
|---|---|---|
| Pipeline order | `loop.ts` | emits `run_start → commander_say → score → plan → agent_* → consensus → score_decision? → synthesis_* → trace → done` |
| Consensus gate | `consensus.ts:21` | ≥2 distinct crew agents, same normalized pattern, exact quote |
| Score rewrite | `loop.ts:1061` `emitScoreSafe` | 16-char tail buffer keeps `\d/100` from splitting; final text in `synthesis_end` |
| Deadline budget | `loop.ts:1236` | agents get `deadline - min(30s, 25%)`; synthesis keeps 25% |
| Tool surface | `tools.ts:159` `TOOL_DEFS` | specialists only read `score_message`/`scan_detector` + add cited points |

## CONVENTIONS (different from root)
- LLM egress is server-only through `lib/server/llm.ts` `fetchChat`; round-robin `LUMINA_LLM_LANES`, fallback only on 429/5xx.
- Flags are env strings inverted on `0|false|off|no`; model env falls back `LUMINA_AGENT_MODEL` → `LUMINA_ORCHESTRATOR_MODEL` → `LUMINA_LLM_MODEL`.
- `SubagentRuntime` is in-memory, capped 32, keyed `caseId:agent`, explicitly not durable; use `.send` for follow-ups.
- Server appends `evidence` last in prompts (`ensureEvidenceLast`); do not select it in the planner prompt.
- Browser entry `streamOrchestrator` never throws; callers fall back to deterministic templates.

## ANTI-PATTERNS (THIS DIRECTORY)
- Never let a model write the baseline score without a real `ConsensusGroup`; `validateScoreDecision` rejects otherwise.
- Never accept report points whose quote is absent from message/signal evidence (≤2 points, ≤1 when signals exist).
- Never instruct sending OTP/PIN/password (`unsafeInstruction`); never include a message body in a tool/specialist payload.
- Do not concatenate untrusted text into prompts without wrapper/escape (`<message>`, `</prior_turns>` stripping).
- Do not treat offline `503`/`not-configured` as a defect.
