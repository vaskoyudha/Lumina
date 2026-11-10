import { z } from "zod";
import { JobSearchArgsSchema } from "@/lib/contracts/tool";

/**
 * Bounded agent-loop contracts.
 *
 * This mirrors the part of Pi's agent loop that matters here: a tool call is
 * untrusted data, its result comes back as one typed observation, and the next
 * model request is rebuilt from those observations. The schemas are strict so a
 * model cannot smuggle a checked message, an evidence quote, a filename, or a
 * URL into a tool result.
 */

export const MAX_AGENT_STEPS = 3;
export const MAX_OBSERVATIONS = 2;
export const MAX_OBSERVATION_POSTINGS = 5;

const PostingObservationSchema = z
  .object({
    title: z.string().min(1).max(200),
    company: z.string().min(1).max(200),
    sentinelStatus: z.enum(["clean", "suspicious", "rejected"]),
    luminaRisk: z.enum(["bersih", "rendah", "mencurigakan", "tinggi"]),
  })
  .strict();

/**
 * Only a completed `job_search` has an observation.
 *
 * `report_draft` is terminal: it opens a local card and ends the loop, so there
 * is no second model request to carry its result.
 */
export const ToolObservationSchema = z
  .object({
    name: z.literal("job_search"),
    callId: z.string().min(1).max(100),
    arguments: JobSearchArgsSchema,
    ok: z.literal(true),
    result: z
      .object({
        count: z.number().int().min(0).max(10_000),
        total: z.number().int().min(0).max(10_000),
        capped: z.boolean(),
        postings: z
          .array(PostingObservationSchema)
          .max(MAX_OBSERVATION_POSTINGS),
      })
      .strict(),
  })
  .strict();

export type ToolObservation = z.infer<typeof ToolObservationSchema>;
