import { z } from "zod";
import { VoiceDigestSchema } from "@/lib/contracts/agent-run";

/**
 * The payload for the conversational lanes.
 *
 * This schema is the privacy guarantee, not a promise in prose. There is no key
 * that can hold a message someone sent you: `question` is what the user typed,
 * `digest` is the same lossy findings payload the verdict route already sends,
 * and `modules`/`tactics` are from `modus.json` and `tactics.ts`.
 *
 * `.strict()` is applied at every level. An extra key is a rejected request
 * rather than a silently dropped one, which is what makes "the checked message
 * never leaves the device" testable.
 */

export const AnswerLaneSchema = z.enum(["tanya", "lanjutan", "obrolan"]);
export type AnswerLane = z.infer<typeof AnswerLaneSchema>;

export const AnswerHistoryEntrySchema = z
  .object({
    role: z.enum(["user", "companion"]),
    text: z.string().min(1).max(2000),
  })
  .strict();

export const AnswerModuleSchema = z
  .object({
    no: z.number().int().min(1).max(12),
    nama: z.string().min(1).max(120),
    ciri: z.array(z.string().min(1).max(240)).max(8),
  })
  .strict();

export const AnswerTacticSchema = z
  .object({
    nama: z.string().min(1).max(120),
    cara: z.string().min(1).max(400),
    tanda: z.string().min(1).max(400),
    pembeda: z.string().min(1).max(400),
  })
  .strict();

export const AnswerRequestSchema = z
  .object({
    lane: AnswerLaneSchema,
    /** What the user typed. Never a message they received. */
    question: z.string().min(1).max(2000),
    /** Chat-lane turns only. The client filters checked turns out. */
    history: z.array(AnswerHistoryEntrySchema).max(10).default([]),
    /** The last verdict's lossy digest, when one exists. */
    digest: VoiceDigestSchema.nullable().default(null),
    /** Public scheme facts from `modus.json`, for grounded answers. */
    modules: z.array(AnswerModuleSchema).max(12).default([]),
    /** Public tactic facts, with no `evidence` field to leak a quote. */
    tactics: z.array(AnswerTacticSchema).max(6).default([]),
  })
  .strict();

export type AnswerRequest = z.infer<typeof AnswerRequestSchema>;

export const AnswerChipSchema = z
  .object({
    label: z.string().min(1).max(40),
    /** Text sent as a normal turn when the chip is tapped. */
    send: z.string().min(1).max(200),
  })
  .strict();

export type AnswerChip = z.infer<typeof AnswerChipSchema>;
