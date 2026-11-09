import { z } from "zod";
import { ModuleContentSchema } from "@/data/modul-schema";
import type { Modus } from "@/lib/modus";
import { TACTIC_IDS } from "@/lib/simulasi/types";
import { validateScenario } from "@/lib/simulasi/validate";

export const ModuleMetadataSchema = z.object({
  id: z.string().min(1),
  no: z.number().int().min(1).max(99),
  nama: z.string().min(3),
  laporan: z.number().int().nonnegative().nullable(),
  laporanNote: z.string().nullable(),
  kerugian: z.string().min(1),
  ciri: z.array(z.string().min(1)).min(1),
  level: z.number().int().min(1).max(5),
  modulStatus: z.enum(["lengkap", "segera"]),
  scenarioId: z.string().nullable(),
  scenarioPlanned: z.string().nullable(),
  detectors: z.array(z.enum(["message", "link", "identity", "conversation"])),
});
export const LearningModuleSchema = z
  .object({
    metadata: ModuleMetadataSchema,
    content: ModuleContentSchema.nullable(),
  })
  .refine(
    (m) => !m.content || m.metadata.no === m.content.no,
    "Nomor modul tidak sama",
  );
export type LearningModule = z.infer<typeof LearningModuleSchema>;
export type LearningSummary = Modus & { ready: boolean };

const text = z.string().min(1);
const tool = z.enum(["isolation", "permissions", "report"]);
const tactic = z.enum(TACTIC_IDS);
const choice = z.object({
  label: text,
  verdict: z.enum(["benar", "salah"]),
  rationale: text.optional(),
  panic: z.number().optional(),
  tactic: tactic.optional(),
  compromisesDevice: z.boolean().optional(),
  sharesOtp: z.boolean().optional(),
  next: text,
});
const scene = {
  id: text,
  chapter: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
};
export const ScenarioSchema = z
  .object({
    scenario: z.object({
      id: text,
      level: z.number().int().min(1),
      title: text,
      difficulty: z.literal("mudah"),
    }),
    hud: z.object({
      panic: z.object({
        start: z.number(),
        max: z.number(),
        fail_at: z.number(),
        fail_message: text,
      }),
      intrusion: z.object({
        start: z.number(),
        max: z.number(),
        rate_per_second: z.number(),
        fail_message: text,
      }),
    }),
    tools: z.array(z.object({ id: tool, name: text, unlocked_at: text })),
    start: text,
    nodes: z
      .array(
        z.discriminatedUnion("type", [
          z.object({
            ...scene,
            type: z.literal("message"),
            speaker: text,
            text,
            next: text,
            delay_ms: z.number().optional(),
            attachment: z.object({ name: text, detail: text }).optional(),
          }),
          z.object({
            ...scene,
            type: z.literal("choice"),
            prompt: text,
            choices: z.array(choice).min(1),
          }),
          z.object({
            ...scene,
            type: z.literal("tool_task"),
            tool,
            prompt: text,
            on_success: text,
          }),
          z.object({
            ...scene,
            type: z.literal("ending"),
            variant: z.enum(["success", "recovery", "compromised"]),
            title: text,
            text,
            debrief: z.tuple([text, text, text, text]),
          }),
        ]),
      )
      .min(1),
    scoring: z.object({
      grades: z.array(z.object({ min: z.number(), label: text })).min(1),
    }),
  })
  .superRefine((s, ctx) => {
    for (const message of validateScenario(s))
      ctx.addIssue({ code: "custom", message });
  });

export const SimulationSchema = z
  .object({
    moduleNo: z.number().int().min(1).max(99).nullable(),
    scenario: ScenarioSchema,
    mission: z.object({
      title: text,
      role: text,
      context: text,
      objective: text,
      duration: text,
      contact: text,
      contactDetail: text,
      chapters: z.array(text).length(3),
    }),
    tactics: z.array(
      z.object({ id: tactic, name: text, quote: text, lesson: text }),
    ),
    permissions: z
      .array(z.object({ id: text, label: text, detail: text }))
      .min(1),
    reportArtifacts: z
      .array(z.object({ id: text, label: text, safe: z.boolean() }))
      .min(1),
    chapterNotes: z.array(text).length(3),
    summary: z.array(text).min(1),
    tips: z.array(text).min(1),
  })
  .superRefine((s, ctx) => {
    const ids = new Set(s.tactics.map((t) => t.id));
    for (const n of s.scenario.nodes)
      if (n.type === "choice")
        for (const c of n.choices)
          if (c.tactic && !ids.has(c.tactic))
            ctx.addIssue({
              code: "custom",
              message: `Taktik ${c.tactic} belum ditulis`,
            });
    for (const items of [s.permissions, s.reportArtifacts, s.tactics])
      if (new Set(items.map((i) => i.id)).size !== items.length)
        ctx.addIssue({ code: "custom", message: "Id duplikat" });
  });
export type SimulationContent = z.infer<typeof SimulationSchema>;
export const ContentBundleSchema = z
  .object({
    modules: z.array(LearningModuleSchema),
    simulations: z.array(SimulationSchema),
  })
  .superRefine((b, ctx) => {
    if (
      new Set(b.modules.map((m) => m.metadata.no)).size !== b.modules.length ||
      new Set(b.simulations.map((s) => s.scenario.scenario.id)).size !==
        b.simulations.length
    )
      ctx.addIssue({ code: "custom", message: "Konten duplikat" });
  });
