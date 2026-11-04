import {
  BADGE_FOR_MODULE,
  completeModule,
  EMPTY_PROGRESS,
  loadProgress,
  ProgressSchema,
  STORAGE_KEY,
  saveProgress,
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

  it("rejects module numbers outside 1..12 in the schema", () => {
    const base = { version: 1, badges: [], missedPatterns: [], updatedAt: "x" };
    expect(
      ProgressSchema.safeParse({ ...base, completedModules: [0] }).success,
    ).toBe(false);
    expect(
      ProgressSchema.safeParse({ ...base, completedModules: [13] }).success,
    ).toBe(false);
  });
});
