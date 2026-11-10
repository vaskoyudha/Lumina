import { z } from "zod";

/**
 * The report-polish request.
 *
 * `.strict()` at every level: the checked message, its quotes, and the score
 * have no field to travel in. This is the same posture as `AnswerRequestSchema`
 * and `ToolSummaryRequestSchema`.
 */

export const ReportDraftSchema = z
  .object({
    subject: z.string().min(1).max(160),
    body: z.string().min(1).max(1200),
  })
  .strict();

export const ReportFactsSchema = z
  .object({
    modus: z.string().min(1).max(80),
    tactics: z.array(z.string().min(1).max(40)).max(6),
  })
  .strict();

export const ReportChannelIdSchema = z.enum([
  "iasc",
  "komdigi",
  "patrolisiber",
  "cekrekening",
]);

export const ReportPolishRequestSchema = z
  .object({
    channelId: ReportChannelIdSchema,
    draft: ReportDraftSchema,
    facts: ReportFactsSchema,
  })
  .strict();

export type ReportDraft = z.infer<typeof ReportDraftSchema>;
export type ReportFacts = z.infer<typeof ReportFactsSchema>;
export type ReportPolishRequest = z.infer<typeof ReportPolishRequestSchema>;
