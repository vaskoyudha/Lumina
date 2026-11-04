import { z } from "zod";

/**
 * Local learning progress — plan §5-B step 1, §8 (no database, no account).
 *
 * Everything lives on this device under one versioned key. The module list
 * itself never lives here: `modus.json` is the source of truth for what
 * exists, this file only records what the learner finished on this device.
 */

export const ProgressSchema = z.object({
  version: z.literal(1),
  /** Module numbers from `modus.json` (1..12) finished on this device. */
  completedModules: z.array(z.number().int().min(1).max(12)),
  badges: z.array(z.string()),
  /** Patterns the learner missed in quizzes — read by Stream C later (§11.4). */
  missedPatterns: z.array(z.string()),
  updatedAt: z.string(),
});

export type Progress = z.infer<typeof ProgressSchema>;

export const STORAGE_KEY = "lumina-progress-v1";

export const EMPTY_PROGRESS: Progress = {
  version: 1,
  completedModules: [],
  badges: [],
  missedPatterns: [],
  updatedAt: new Date(0).toISOString(),
};

/** One badge per written module. §11.4 level-5 social badges are cut (§5-B). */
export const BADGE_FOR_MODULE: Record<number, string> = {
  10: "penjaga-apk",
};

export function loadProgress(): Progress {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = ProgressSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY_PROGRESS;
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function saveProgress(p: Progress): void {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...p, updatedAt: new Date().toISOString() }),
  );
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
