import { z } from "zod";

/**
 * The `job_search` tool contract.
 *
 * `.strict()` at every level: a model that invents a `message` argument gets the
 * call dropped rather than silently forwarded, which is the same privacy
 * posture as `AnswerRequestSchema`.
 */

export const JobSearchArgsSchema = z
  .object({
    query: z.string().min(1).max(200),
    location: z.string().max(80).optional(),
    salaryMin: z.number().int().min(0).optional(),
    salaryMax: z.number().int().min(0).optional(),
    hideFlagged: z.boolean().optional(),
  })
  .strict();

export type JobSearchArgs = z.infer<typeof JobSearchArgsSchema>;

export const ToolCallSchema = z
  .object({
    id: z.string(),
    name: z.literal("job_search"),
    arguments: JobSearchArgsSchema,
  })
  .strict();

export type ToolCall = z.infer<typeof ToolCallSchema>;

/**
 * Phase 2 carries no query, no description, no apply URL, and no saved list.
 * The schema is the guarantee, not the prompt.
 */
export const ToolSummaryRequestSchema = z
  .object({
    count: z.number().int().min(0),
    postings: z
      .array(
        z
          .object({
            title: z.string().min(1).max(200),
            company: z.string().min(1).max(200),
            sentinelStatus: z.enum(["clean", "suspicious", "rejected"]),
            luminaRisk: z.enum(["bersih", "rendah", "mencurigakan", "tinggi"]),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();

export type ToolSummaryRequest = z.infer<typeof ToolSummaryRequestSchema>;

/** OpenAI-compatible function definition sent to the model. */
export const JOB_SEARCH_TOOL = {
  type: "function",
  function: {
    name: "job_search",
    description:
      "Cari lowongan kerja dari hasil pindai Lumina. Panggil hanya ketika pengguna meminta mencari lowongan, bukan ketika memeriksa pesan penipuan.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Kata kunci lowongan, misalnya 'React remote' atau 'data analyst'.",
        },
        location: {
          type: "string",
          description: "Kota atau wilayah, misalnya 'Jakarta'.",
        },
        salaryMin: {
          type: "integer",
          description: "Gaji minimum dalam rupiah per bulan.",
        },
        salaryMax: {
          type: "integer",
          description: "Gaji maksimum dalam rupiah per bulan.",
        },
        hideFlagged: {
          type: "boolean",
          description:
            "Sembunyikan lowongan yang ditandai salah satu penilaian.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
} as const;
