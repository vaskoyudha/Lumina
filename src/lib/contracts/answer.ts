import { z } from "zod";
import { VoiceDigestSchema } from "@/lib/contracts/agent-run";
import { MAX_OBSERVATIONS, ToolObservationSchema } from "@/lib/contracts/loop";

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

export const AnswerLaneSchema = z.enum([
  "tanya",
  "lanjutan",
  "obrolan",
  "belajar",
]);
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

/**
 * Extracted attachment text for a turn where the user explicitly asked about
 * the attachment's content.
 *
 * This is the one deliberate exception to the old "no attachment content"
 * posture. It is only populated for a content question (never a safety check),
 * carries no filename or URL, and is capped. The scoring path still runs
 * entirely on the device; a checked message never enters this field.
 */
export const AnswerAttachmentSchema = z
  .object({
    kind: z.enum(["image", "text", "pdf", "link", "other"]),
    text: z.string().min(1).max(6000),
  })
  .strict();

export type AnswerAttachment = z.infer<typeof AnswerAttachmentSchema>;

export const AnswerRequestSchema = z
  .object({
    lane: AnswerLaneSchema,
    moduleNo: z.number().int().min(1).max(99).optional(),
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
    /** True when the question is about what an attachment says, not its safety. */
    contentQuestion: z.boolean().default(false),
    /** Extracted text for an explicit content question. No filenames or URLs. */
    attachmentContext: z.array(AnswerAttachmentSchema).max(3).default([]),
    /** Whether the client holds a verdict the report tool may use. */
    hasVerdict: z.boolean().default(false),
    /** Tool results from earlier loop steps, in order. */
    observations: z
      .array(ToolObservationSchema)
      .max(MAX_OBSERVATIONS)
      .default([]),
    /** Last step: the route withholds tools so the loop cannot run away. */
    final: z.boolean().default(false),
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
