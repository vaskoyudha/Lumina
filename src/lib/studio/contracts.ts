import { z } from "zod";

export const StudioMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    text: z.string().min(1).max(8000),
  })
  .strict();

export const StudioRequestSchema = z
  .object({
    question: z.string().min(1).max(8000),
    history: z.array(StudioMessageSchema).max(8).default([]),
  })
  .strict();

export type StudioRequest = z.infer<typeof StudioRequestSchema>;

export const StudioToolResultSchema = z
  .object({
    ok: z.boolean(),
    output: z.string().max(60_000),
    truncated: z.boolean().optional(),
    exitCode: z.number().int().optional(),
    error: z.string().max(300).optional(),
  })
  .strict();

export type StudioToolResult = z.infer<typeof StudioToolResultSchema>;

export const StudioToolRecordSchema = z
  .object({
    id: z.string(),
    name: z.enum(["read", "write", "edit", "ls", "grep", "bash", "check_url"]),
    arguments: z.record(z.string(), z.unknown()),
    result: StudioToolResultSchema,
    ms: z.number().int().min(0),
  })
  .strict();

export type StudioToolRecord = z.infer<typeof StudioToolRecordSchema>;

/**
 * One visible step in the agent's process, Pi-style: a short plan line the
 * model wrote before acting, or a typed tool call with its result.
 *
 * This is deliberately not hidden chain-of-thought. The model is asked for a
 * one-sentence intent; the tool result is the measured observation.
 */
export const StudioProcessStepSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("thought"),
      text: z.string().min(1).max(2000),
    })
    .strict(),
  z
    .object({
      kind: z.literal("tool"),
      tool: StudioToolRecordSchema,
    })
    .strict(),
]);

export type StudioProcessStep = z.infer<typeof StudioProcessStepSchema>;

export const StudioResponseSchema = z
  .object({
    ok: z.literal(true),
    text: z.string(),
    tools: z.array(StudioToolRecordSchema),
    process: z.array(StudioProcessStepSchema).max(20).default([]),
  })
  .strict();

export type StudioResponse = z.infer<typeof StudioResponseSchema>;
