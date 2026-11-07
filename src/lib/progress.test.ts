import {
  BADGE_FOR_MODULE,
  BADGE_LABEL,
  completeModule,
  EMPTY_PROGRESS,
  loadProgress,
  PROGRESS_EVENT,
  ProgressSchema,
  recordMissed,
  STORAGE_KEY,
  saveProgress,
  seedProgress,
} from "@/lib/progress";

describe("progress", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty progress when nothing is stored", () => {
    const p = loadProgress();
    expect(p.completedModules).toEqual([]);
    expect(p.badges).toEqual([]);
    expect(p.missedPatterns).toEqual([]);
  });

  it("returns the empty state instead of throwing on corrupted data", () => {
    window.localStorage.setItem(STORAGE_KEY, "{{{");
    expect(() => loadProgress()).not.toThrow();
    expect(loadProgress()).toEqual(EMPTY_PROGRESS);
  });

  it("returns the empty state when the stored shape is invalid", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        completedModules: ["sepuluh"],
        badges: [],
        missedPatterns: [],
        updatedAt: "x",
      }),
    );
    expect(loadProgress()).toEqual(EMPTY_PROGRESS);
  });

  it("round-trips a completed module through localStorage", () => {
    saveProgress(completeModule(loadProgress(), 10));
    const restored = loadProgress();
    expect(restored.completedModules).toContain(10);
  });

  it("gives module 10 the penjaga-apk badge, exactly once", () => {
    expect(BADGE_FOR_MODULE[10]).toBe("penjaga-apk");
    const once = completeModule(loadProgress(), 10);
    expect(once.completedModules).toContain(10);
    expect(once.badges).toContain("penjaga-apk");
    const twice = completeModule(once, 10);
    expect(twice.completedModules.filter((n) => n === 10)).toHaveLength(1);
    expect(twice.badges.filter((b) => b === "penjaga-apk")).toHaveLength(1);
  });

  it("does not hand out a badge for modules that have none", () => {
    const p = completeModule(loadProgress(), 1);
    expect(p.completedModules).toContain(1);
    expect(p.badges).toEqual([]);
  });

  it("records missed patterns without duplicates, preserving order", () => {
    const first = recordMissed(loadProgress(), ["apk-q1", "apk-q3"]);
    const second = recordMissed(first, ["apk-q3", "apk-q2"]);
    expect(second.missedPatterns).toEqual(["apk-q1", "apk-q3", "apk-q2"]);
  });

  it("announces each write so sibling islands can re-read", () => {
    const listener = jest.fn();
    window.addEventListener(PROGRESS_EVENT, listener);
    saveProgress(loadProgress());
    window.removeEventListener(PROGRESS_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("accepts course numbers beyond the original twelve, rejects 0 and 100", () => {
    const base = { version: 1, badges: [], missedPatterns: [], updatedAt: "x" };
    expect(
      ProgressSchema.safeParse({ ...base, completedModules: [0] }).success,
    ).toBe(false);
    // Admin may add courses past 12; progress must survive those numbers.
    expect(
      ProgressSchema.safeParse({ ...base, completedModules: [13, 27] }).success,
    ).toBe(true);
    expect(
      ProgressSchema.safeParse({ ...base, completedModules: [100] }).success,
    ).toBe(false);
  });

  it("labels every badge a module can hand out", () => {
    for (const badge of Object.values(BADGE_FOR_MODULE)) {
      expect(BADGE_LABEL[badge]).toBeTruthy();
    }
  });

  it("merges a demo seed without deleting work done on this device", () => {
    saveProgress(completeModule(loadProgress(), 3));

    const seeded = seedProgress({
      completedModules: [10],
      badges: ["penjaga-apk"],
    });

    expect(seeded.completedModules.sort((a, b) => a - b)).toEqual([3, 10]);
    expect(seeded.badges).toEqual(["penjaga-apk"]);
    expect(loadProgress().completedModules.sort((a, b) => a - b)).toEqual([
      3, 10,
    ]);
  });

  it("merges a seed idempotently and keeps the stored key readable", () => {
    seedProgress({ completedModules: [10], badges: ["penjaga-apk"] });
    const again = seedProgress({
      completedModules: [10],
      badges: ["penjaga-apk"],
    });

    expect(again.completedModules.filter((n) => n === 10)).toHaveLength(1);
    expect(again.badges.filter((b) => b === "penjaga-apk")).toHaveLength(1);
    expect(loadProgress()).toMatchObject({ completedModules: [10] });
  });
});
