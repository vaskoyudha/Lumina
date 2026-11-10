import { z } from "zod";
import { ReportChannelIdSchema } from "@/lib/contracts/report";

/**
 * Agent tool contracts.
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

/**
 * The report tool carries intent only.
 *
 * There is deliberately no field for the message, the verdict, or the report
 * body: the card is built deterministically on the device from the last
 * `ScoreResult`, and the model's only choice is whether to open it.
 */
export const ReportDraftArgsSchema = z
  .object({
    channel: ReportChannelIdSchema.optional(),
  })
  .strict();

export type ReportDraftArgs = z.infer<typeof ReportDraftArgsSchema>;

/**
 * A link check carries exactly one URL.
 *
 * It is only offered when the reader explicitly asks to inspect a link and the
 * URL is already in the question. The scanner sees the URL, never the message
 * it came from.
 */
export const CheckLinkArgsSchema = z
  .object({
    url: z
      .string()
      .min(1)
      .max(2048)
      .refine((value) => /^https?:\/\//i.test(value), "invalid-url"),
  })
  .strict();

export type CheckLinkArgs = z.infer<typeof CheckLinkArgsSchema>;

/** The confirmation tool carries the URL only so the card can name it. */
export const AskLinkCheckArgsSchema = CheckLinkArgsSchema;
export type AskLinkCheckArgs = z.infer<typeof AskLinkCheckArgsSchema>;

const JobSearchToolCallSchema = z
  .object({
    id: z.string(),
    name: z.literal("job_search"),
    arguments: JobSearchArgsSchema,
  })
  .strict();

const ReportDraftToolCallSchema = z
  .object({
    id: z.string(),
    name: z.literal("report_draft"),
    arguments: ReportDraftArgsSchema,
  })
  .strict();

const CheckLinkToolCallSchema = z
  .object({
    id: z.string(),
    name: z.literal("check_link"),
    arguments: CheckLinkArgsSchema,
  })
  .strict();

const AskLinkCheckToolCallSchema = z
  .object({
    id: z.string(),
    name: z.literal("ask_link_check"),
    arguments: AskLinkCheckArgsSchema,
  })
  .strict();

export const ToolCallSchema = z.discriminatedUnion("name", [
  JobSearchToolCallSchema,
  ReportDraftToolCallSchema,
  CheckLinkToolCallSchema,
  AskLinkCheckToolCallSchema,
]);

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

/** OpenAI-compatible function definition: open the report card for the last verdict. */
export const REPORT_TOOL = {
  type: "function",
  function: {
    name: "report_draft",
    description:
      "Buka template laporan penipuan untuk hasil pemeriksaan terakhir. Panggil hanya ketika pengguna meminta dibuatkan laporan atau template laporan. Jangan menulis isi laporan sendiri; template disusun di perangkat pengguna.",
    parameters: {
      type: "object",
      properties: {
        channel: {
          type: "string",
          enum: ["iasc", "komdigi", "patrolisiber", "cekrekening"],
          description:
            "Lembaga yang diminta pengguna. Kosongkan untuk pilihan pertama.",
        },
      },
      additionalProperties: false,
    },
  },
} as const;

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

/**
 * OpenAI-compatible function definition: inspect one URL with the phishing
 * scanner. The replacement for "paste the link into a separate tool" when the
 * reader asks the agent directly.
 */
export const CHECK_LINK_TOOL = {
  type: "function",
  function: {
    name: "check_link",
    description:
      "Periksa satu tautan dengan pemindai phishing url.vet (DNS, TLS, redirect, umur domain, umpan balik ancaman). Panggil hanya setelah pengguna menyetujui pemeriksaan tautan yang disebutnya. Jangan mengarang atau menebak URL.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "URL persis yang disebut pengguna, harus diawali http:// atau https://.",
        },
      },
      required: ["url"],
      additionalProperties: false,
    },
  },
} as const;

/**
 * OpenAI-compatible function definition: ask before a URL leaves the browser.
 *
 * The scanner is a server-side service, so a link is never sent until the
 * reader taps the confirmation card. The model only names the URL; the card
 * and the approval live in the browser.
 */
export const ASK_LINK_CHECK_TOOL = {
  type: "function",
  function: {
    name: "ask_link_check",
    description:
      "Tanyakan lebih dulu apakah pengguna mau tautan yang disebutnya diperiksa dengan pemindai phishing. Panggil ini ketika pengguna meminta memeriksa tautan, website, atau URL, dan URL-nya sudah ada di pertanyaan. Jangan memanggil check_link sebelum pengguna menyetujui.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "URL persis yang disebut pengguna, harus diawali http:// atau https://.",
        },
      },
      required: ["url"],
      additionalProperties: false,
    },
  },
} as const;
