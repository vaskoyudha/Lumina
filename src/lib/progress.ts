import { z } from "zod";
import { migrateMisses } from "@/lib/learning/pattern-map";
import { dueDate, gradeReview } from "@/lib/learning/review";

/** Account progress returned by authenticated server actions. No browser persistence. */

export const ReviewSchema = z.object({
  patternId: z.string(),
  box: z.number().int().min(0).max(4),
  dueAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime(),
  correct: z.number().int().nonnegative(),
  wrong: z.number().int().nonnegative(),
});
export type Review = z.infer<typeof ReviewSchema>;
export const ProgressSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  /** Module numbers from `modus.json` (1..99) finished on this device. */
  completedModules: z.array(z.number().int().min(1).max(99)),
  badges: z.array(z.string()),
  /** Patterns the learner missed in quizzes — read by Stream C later (§11.4). */
  missedPatterns: z.array(z.string()),
  reviews: z.array(ReviewSchema).max(100).optional(),
  attempts: z
    .array(
      z.object({
        moduleNo: z.number().int(),
        score: z.number().int().nonnegative(),
        total: z.number().int().positive(),
        at: z.iso.datetime(),
      }),
    )
    .max(100)
    .optional(),
  updatedAt: z.string(),
});

export type Progress = z.infer<typeof ProgressSchema>;

export const STORAGE_KEY = "lumina-progress-v1";

/** Fired after every write so sibling client islands re-read the same store. */
export const PROGRESS_EVENT = "lumina:progress";

export const EMPTY_PROGRESS: Progress = {
  version: 2,
  completedModules: [],
  badges: [],
  missedPatterns: [],
  reviews: [],
  attempts: [],
  updatedAt: new Date(0).toISOString(),
};

/** One badge per written module. §11.4 level-5 social badges are cut (§5-B). */
export const BADGE_FOR_MODULE: Record<number, string> = {
  1: "penjaga-marketplace",
  2: "penjaga-telepon",
  3: "penjaga-investasi",
  4: "penjaga-lowongan",
  5: "penjaga-hadiah",
  6: "penjaga-relasi",
  7: "penjaga-tautan",
  8: "penjaga-layar",
  9: "penjaga-pinjol",
  10: "penjaga-apk",
  11: "penjaga-qris",
  12: "penjaga-musim",
};

/** Badge id → display label. Add a row here when a new module earns a badge. */
export const BADGE_LABEL: Record<string, string> = {
  "penjaga-marketplace": "Penjaga Marketplace",
  "penjaga-telepon": "Penjaga Telepon",
  "penjaga-investasi": "Penjaga Investasi",
  "penjaga-lowongan": "Penjaga Lowongan",
  "penjaga-hadiah": "Penjaga Hadiah",
  "penjaga-relasi": "Penjaga Relasi",
  "penjaga-tautan": "Penjaga Tautan",
  "penjaga-layar": "Penjaga Layar",
  "penjaga-pinjol": "Penjaga Pinjol",
  "penjaga-apk": "Penjaga APK",
  "penjaga-qris": "Penjaga QRIS",
  "penjaga-musim": "Penjaga Musim",
};

/**
 * Remember patterns the learner missed. Stream C reads this for the adaptive
 * path (§11.4); until then it is the honest record behind "tinjau yang
 * kamu lewatkan". Duplicates are dropped, order is preserved.
 */
export function recordMissed(
  prev: Progress,
  missed: string[],
  now = new Date(),
): Progress {
  const merged = [...prev.missedPatterns];
  const patterns = migrateMisses(missed);
  for (const id of patterns) {
    if (!merged.includes(id)) merged.push(id);
  }
  const reviews = [
    ...(prev.reviews ?? []).filter(
      (r) => !patterns.includes(r.patternId as (typeof patterns)[number]),
    ),
    ...patterns.map((patternId) => ({
      patternId,
      box: 0,
      dueAt: dueDate(now, 0),
      lastSeenAt: now.toISOString(),
      correct:
        prev.reviews?.find((r) => r.patternId === patternId)?.correct ?? 0,
      wrong:
        (prev.reviews?.find((r) => r.patternId === patternId)?.wrong ?? 0) + 1,
    })),
  ].slice(-100);
  return {
    ...prev,
    version: 2,
    missedPatterns: merged,
    reviews,
    updatedAt: now.toISOString(),
  };
}

export const recordReview = gradeReview;
export function recordAttempt(
  prev: Progress,
  moduleNo: number,
  score: number,
  total: number,
  now = new Date(),
): Progress {
  return {
    ...prev,
    version: 2,
    attempts: [
      ...(prev.attempts ?? []),
      { moduleNo, score, total, at: now.toISOString() },
    ].slice(-100),
    updatedAt: now.toISOString(),
  };
}
/** Migration of server snapshots; never reads or writes browser storage. */
export function migrateProgress(raw: unknown): Progress {
  const parsed = ProgressSchema.safeParse(raw);
  if (!parsed.success) return { ...EMPTY_PROGRESS };
  return {
    ...parsed.data,
    version: 2,
    missedPatterns: migrateMisses(parsed.data.missedPatterns),
    reviews: parsed.data.reviews ?? [],
    attempts: parsed.data.attempts ?? [],
  };
}

export function completeModule(prev: Progress, no: number): Progress {
  const completedModules = prev.completedModules.includes(no)
    ? prev.completedModules
    : [...prev.completedModules, no];
  const badge = BADGE_FOR_MODULE[no];
  const badges =
    badge && !prev.badges.includes(badge)
      ? [...prev.badges, badge]
      : prev.badges;
  return { ...prev, completedModules, badges };
}
