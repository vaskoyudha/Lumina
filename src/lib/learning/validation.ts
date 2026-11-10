import { z } from "zod";
export const QuizSubmissionSchema = z.object({
  moduleNo: z.number().int().min(1).max(99),
  answers: z
    .record(z.string().min(1).max(100), z.string().min(1).max(100))
    .refine((a) => Object.keys(a).length <= 6),
  complete: z.boolean(),
  attemptId: z.uuid().optional(),
});
export const ReviewSubmissionSchema = z
  .object({
    attemptId: z.uuid(),
    moduleNo: z.number().int().min(1).max(99),
    questionId: z.string().min(1).max(100),
    answer: z.string().min(1).max(100),
  })
  .strict();
export const SimulationSubmissionSchema = z.object({
  attemptId: z.uuid(),
  scenarioId: z.string().min(1).max(100),
  mode: z.enum(["santai", "tantangan"]),
  outcome: z.enum(["success", "recovery", "compromised", "failed"]),
  breathingAt: z.number().int().min(0).max(200).optional(),
  steps: z
    .array(
      z.object({
        nodeId: z.string().min(1).max(100),
        choiceIndex: z.number().int().min(0).max(10).optional(),
      }),
    )
    .max(200),
});
export type SimulationSubmission = z.infer<typeof SimulationSubmissionSchema>;
export const SimulationTimerSchema = SimulationSubmissionSchema.pick({
  attemptId: true,
  scenarioId: true,
});
