import {
  completeModule,
  EMPTY_PROGRESS,
  ProgressSchema,
  recordMissed,
} from "@/lib/progress";

describe("account progress shape", () => {
  it("awards completion once without mutating the previous snapshot", () => {
    const done = completeModule(EMPTY_PROGRESS, 10);
    expect(completeModule(done, 10)).toEqual(done);
    expect(done.badges).toEqual(["penjaga-apk"]);
    expect(EMPTY_PROGRESS.completedModules).toEqual([]);
  });
  it("deduplicates missed patterns", () =>
    expect(
      recordMissed(EMPTY_PROGRESS, ["apk-q1", "apk-q1"]).missedPatterns,
    ).toEqual(["apk-tak-diminta"]));
  it("validates the server snapshot", () =>
    expect(
      ProgressSchema.safeParse({ ...EMPTY_PROGRESS, completedModules: ["10"] })
        .success,
    ).toBe(false));
});
