import { z } from "zod";
import { CREW_IDS, type CrewId } from "@/lib/agents/identities";
import { AnswerHistoryEntrySchema } from "@/lib/contracts/answer";
import { ReportPointSchema } from "@/lib/orchestrator/report";

/**
 * The real multi-agent orchestration contract.
 *
 * `message` is the raw content the reader asked us to inspect. The user
 * explicitly chose to let the model see it; `consent: true` is still required
 * so a handcrafted request cannot silently turn on raw-content processing.
 */
export const OrchestratorRequestSchema = z
  .object({
    lane: z.literal("periksa"),
    /** Stable case id lets a follow-up reuse the same child sessions. */
    caseId: z.string().min(1).max(120).optional(),
    question: z.string().min(1).max(2000),
    message: z.string().min(1).max(20_000),
    history: z.array(AnswerHistoryEntrySchema).max(10).default([]),
    priorTurns: z.array(z.string().min(1).max(20_000)).max(5).default([]),
    consent: z.literal(true),
  })
  .strict();

export type OrchestratorRequest = z.infer<typeof OrchestratorRequestSchema>;

export const SPECIALIST_IDS = CREW_IDS;
export type SpecialistId = CrewId;

export const ACTOR_IDS = ["planner", ...SPECIALIST_IDS, "synthesizer"] as const;
export type ActorId = (typeof ACTOR_IDS)[number];

export const AGENT_STATUSES = [
  "berjalan",
  "selesai",
  "gagal",
  "dilewati",
] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const PlanStepSchema = z
  .object({
    agent: z.enum(SPECIALIST_IDS),
    task: z.string().min(1).max(600),
    skills: z.array(z.string().min(1).max(80)).max(8).default([]),
    tools: z.array(z.string().min(1).max(80)).max(8).default([]),
  })
  .strict();

export type PlanStep = z.infer<typeof PlanStepSchema>;

const BaseEventSchema = z
  .object({
    runId: z.string().min(1).max(80),
    seq: z.number().int().min(0),
    at: z.number().int().min(0),
  })
  .strict();

export const OrchestratorEventSchema = z.discriminatedUnion("type", [
  BaseEventSchema.extend({
    type: z.literal("run_start"),
    question: z.string().min(1).max(2000),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("commander_say"),
    text: z.string().min(1).max(400),
    focus: z.string().max(120).default(""),
    source: z.enum(["model", "fallback"]),
    ms: z.number().int().min(0),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("plan"),
    rationale: z.string().max(1200),
    agents: z.array(PlanStepSchema).min(1).max(6),
    planner: z.enum(["model", "fallback"]),
    ms: z.number().int().min(0),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("score"),
    result: z.unknown(),
    trace: z.unknown(),
    ms: z.number().int().min(0),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("agent_start"),
    agent: z.enum(SPECIALIST_IDS),
    label: z.string().min(1).max(80),
    task: z.string().min(1).max(600),
    skills: z.array(z.string().max(80)).max(8),
    tools: z.array(z.string().max(80)).max(8),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("thought"),
    agent: z.enum(ACTOR_IDS),
    text: z.string().min(1).max(2000),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("tool_call"),
    agent: z.enum(SPECIALIST_IDS),
    callId: z.string().min(1).max(120),
    tool: z.string().min(1).max(80),
    args: z.unknown(),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("tool_result"),
    agent: z.enum(SPECIALIST_IDS),
    callId: z.string().min(1).max(120),
    tool: z.string().min(1).max(80),
    ok: z.boolean(),
    ms: z.number().int().min(0),
    output: z.string().max(4000),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("agent_result"),
    agent: z.enum(SPECIALIST_IDS),
    label: z.string().min(1).max(80),
    status: z.enum(AGENT_STATUSES),
    summary: z.string().max(4000),
    findings: z.array(z.string().max(600)).max(20).default([]),
    points: z.array(ReportPointSchema).max(5).default([]),
    ms: z.number().int().min(0),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("synthesis_start"),
    agent: z.literal("synthesizer"),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("synthesis_delta"),
    agent: z.literal("synthesizer"),
    text: z.string().max(8000),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("synthesis_end"),
    agent: z.literal("synthesizer"),
    text: z.string().max(8000),
    ms: z.number().int().min(0),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("trace"),
    trace: z.unknown(),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("done"),
    totalMs: z.number().int().min(0),
    degraded: z.boolean(),
  }).strict(),
  BaseEventSchema.extend({
    type: z.literal("error"),
    message: z.string().max(600),
  }).strict(),
]);

export type OrchestratorEvent = z.infer<typeof OrchestratorEventSchema>;

export const OrchestrationAgentSchema = z
  .object({
    id: z.enum(SPECIALIST_IDS),
    label: z.string(),
    task: z.string(),
    skills: z.array(z.string()),
    tools: z.array(z.string()),
    status: z.enum(AGENT_STATUSES),
    summary: z.string(),
    points: z.array(ReportPointSchema).max(5).default([]),
    ms: z.number().int().min(0),
  })
  .strict();

export const OrchestrationTraceSchema = z
  .object({
    runId: z.string(),
    planner: z
      .object({
        rationale: z.string(),
        agents: z.array(PlanStepSchema),
        source: z.enum(["model", "fallback"]),
        ms: z.number().int().min(0),
      })
      .strict(),
    agents: z.array(OrchestrationAgentSchema),
    synthesis: z.string(),
    totalMs: z.number().int().min(0),
    degraded: z.boolean(),
  })
  .strict();

export type OrchestrationTrace = z.infer<typeof OrchestrationTraceSchema>;
