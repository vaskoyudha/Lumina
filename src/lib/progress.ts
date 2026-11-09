import { z } from "zod";

/** Account progress returned by authenticated server actions. No browser persistence. */

export const ProgressSchema = z.object({
  version: z.literal(1),
  /** Module numbers from `modus.json` (1..99) finished on this device. */
  completedModules: z.array(z.number().int().min(1).max(99)),
  badges: z.array(z.string()),
  /** Patterns the learner missed in quizzes — read by Stream C later (§11.4). */
  missedPatterns: z.array(z.string()),
  updatedAt: z.string(),
});

export type Progress = z.infer<typeof ProgressSchema>;

export const STORAGE_KEY = "lumina-progress-v1";

/** Fired after every write so sibling client islands re-read the same store. */
export const PROGRESS_EVENT = "lumina:progress";

export const EMPTY_PROGRESS: Progress = {
  version: 1,
  completedModules: [],
  badges: [],
  missedPatterns: [],
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
export function recordMissed(prev: Progress, missed: string[]): Progress {
  const merged = [...prev.missedPatterns];
  for (const id of missed) {
    if (!merged.includes(id)) merged.push(id);
  }
  return { ...prev, missedPatterns: merged };
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
