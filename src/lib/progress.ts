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
  10: "penjaga-apk",
};

/** Badge id → display label. Add a row here when a new module earns a badge. */
export const BADGE_LABEL: Record<string, string> = {
  "penjaga-apk": "Penjaga APK",
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
  // Islands are separate client components; a same-tab DOM event keeps the
  // catalog header, module marks and completion card in sync without a provider.
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

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

/**
 * Demo accounts ship a preview of "already learned" state. Merge it into
 * whatever is already on this device — a demo login must never delete work the
 * learner did here. Written through `saveProgress`, so the schema stays valid,
 * `updatedAt` moves and sibling islands re-read.
 */
export function seedProgress(seed: {
  completedModules: number[];
  badges: string[];
  missedPatterns?: string[];
}): Progress {
  const prev = loadProgress();
  const completedModules = [...prev.completedModules];
  for (const no of seed.completedModules) {
    if (!completedModules.includes(no)) completedModules.push(no);
  }
  const badges = [...prev.badges];
  for (const badge of seed.badges) {
    if (!badges.includes(badge)) badges.push(badge);
  }
  const missedPatterns = [...prev.missedPatterns];
  for (const id of seed.missedPatterns ?? []) {
    if (!missedPatterns.includes(id)) missedPatterns.push(id);
  }
  const next: Progress = {
    ...prev,
    completedModules,
    badges,
    missedPatterns,
  };
  saveProgress(next);
  return next;
}
