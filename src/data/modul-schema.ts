import { z } from "zod";

/**
 * Runtime shape of a course. The `interface` alone cannot validate an edited
 * draft — `tsc` is not available inside a browser form — so the admin editor
 * needs the same contract as a zod schema. `modul-10.ts` is parsed with this at
 * test time, which keeps the published content and the editor from drifting.
 *
 * Field rules mirror the pedagogy in `docs/plan.md` §5-B: fail loudly when a
 * course cannot teach (no dangerous segment, no rationale, orphan answer), not
 * silently when it renders.
 */

export const ContohSegmentSchema = z.object({
  text: z.string().min(1, "Segmen tidak boleh kosong"),
  /** Segment the learner must learn to distrust — rendered in danger colour. */
  berbahaya: z.boolean(),
});

/**
 * The shapes a fraud example can take. Not every scam arrives as a message —
 * a phishing link, a fake site and a vishing call each need their own frame,
 * so the shape lives in the course data instead of the renderer.
 */
export const CONTOH_JENIS = ["pesan", "tautan", "situs", "panggilan"] as const;

export const ContohJenisSchema = z.enum(CONTOH_JENIS);

export const QuizOptionSchema = z.object({
  id: z.string().min(1, "Opsi butuh id"),
  label: z.string().min(1, "Opsi tidak boleh kosong"),
});

export const QuizQuestionSchema = z
  .object({
    id: z.string().min(1, "Soal butuh id"),
    prompt: z.string().min(10, "Soal terlalu pendek"),
    options: z.array(QuizOptionSchema).min(2).max(5),
    correctId: z.string().min(1, "Pilih satu jawaban benar"),
    /** Why the chosen answer was wrong — shown instantly, never blocks flow. */
    rationale: z.string().min(10, "Alasan terlalu pendek"),
  })
  .superRefine((q, ctx) => {
    if (new Set(q.options.map((o) => o.id)).size !== q.options.length) {
      ctx.addIssue({
        code: "custom",
        message: "Id opsi duplikat",
        path: ["options"],
      });
    }
    // An orphan answer would pass typecheck yet make the quiz unpassable.
    if (!q.options.some((o) => o.id === q.correctId)) {
      ctx.addIssue({
        code: "custom",
        message: "Jawaban benar tidak ada di daftar opsi",
        path: ["correctId"],
      });
    }
  });

export const ModuleContentSchema = z
  .object({
    /** 1..99: 12 modus awal (§11.2), sisanya boleh ditambah lewat admin. */
    no: z.number().int().min(1).max(99),
    /**
     * Professional layer, all optional so drafts written before it existed
     * still parse. Published courses fill them; the module page renders an
     * orientation card from them instead of dropping the learner straight
     * into step one.
     */
    ringkasan: z.string().min(40).max(400).optional(),
    tujuan: z.array(z.string().min(10)).min(2).max(5).optional(),
    poinKunci: z.array(z.string().min(10)).min(2).max(6).optional(),
    /** Honest reading estimate; omitted means the page makes no claim. */
    estimasiMenit: z.number().int().min(3).max(60).optional(),
    anatomi: z
      .array(
        z.object({
          judul: z.string().min(3, "Judul langkah terlalu pendek"),
          teks: z.string().min(20, "Penjelasan langkah terlalu pendek"),
        }),
      )
      .min(3)
      .max(8),
    contohJudul: z.string().min(5),
    /**
     * Shape of the example. Optional so content written before this field
     * (published modules, drafts in localStorage) still parses — absent means
     * "pesan", the shape every example used to be forced into.
     */
    contohJenis: ContohJenisSchema.optional(),
    /**
     * Source line above the example: sender, address bar, caller id. Required
     * for "situs" below because an address bar without an address teaches
     * nothing; optional elsewhere because the frame has a sensible default.
     */
    contohSumber: z.string().max(160).optional(),
    contohIsi: z
      .array(ContohSegmentSchema)
      .min(1)
      .refine((segs) => segs.some((s) => s.berbahaya), {
        error: "Tandai minimal satu segmen sebagai berbahaya",
      }),
    checklist: z.array(z.string().min(5)).min(3).max(8),
    kuis: z.array(QuizQuestionSchema).min(3).max(6),
    lapor: z.array(z.string().min(5)).min(2).max(6),
    /** Simulation wired to this course, or null. `null` is honest, not a stub. */
    scenarioId: z.string().nullable(),
  })
  .superRefine((m, ctx) => {
    if (m.contohJenis === "situs" && !m.contohSumber?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Bentuk situs butuh baris sumber (alamat di address bar)",
        path: ["contohSumber"],
      });
    }
  });

export type ModuleContent = z.infer<typeof ModuleContentSchema>;
export type ContohSegment = z.infer<typeof ContohSegmentSchema>;
export type ContohJenis = (typeof CONTOH_JENIS)[number];
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizOption = z.infer<typeof QuizOptionSchema>;

/** Parses published content at load time so a typo fails the build, not the demo. */
export function parseModule(raw: unknown): ModuleContent {
  return ModuleContentSchema.parse(raw);
}
