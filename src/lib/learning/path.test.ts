import { KURIKULUM } from "@/data/kurikulum";
import { PATTERNS } from "@/data/patterns";
import { nextStep } from "@/lib/learning/path";
import {
  migrateMisses,
  patternForQuestion,
  questionsForPattern,
} from "@/lib/learning/pattern-map";
import { selectPractice } from "@/lib/learning/practice";
import { dueReviews, gradeReview, nextDueLabel } from "@/lib/learning/review";
import { MODUS } from "@/lib/modus";
import {
  EMPTY_PROGRESS,
  migrateProgress,
  recordAttempt,
  recordMissed,
} from "@/lib/progress";

const now = new Date("2026-11-10T00:00:00Z");
const modules = MODUS.map((m) => ({ ...m, ready: true }));
describe("published quiz taxonomy", () => {
  it("maps every question exactly once and covers all 24 patterns", () => {
    const ids = PATTERNS.flatMap((p) => [...p.questions]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PATTERNS).toHaveLength(24);
    for (const m of Object.values(KURIKULUM))
      for (const q of m.kuis) {
        const pattern = PATTERNS.find((p) => p.id === patternForQuestion(q.id));
        expect(pattern?.moduleNo).toBe(m.no);
        expect(questionsForPattern(pattern?.id ?? "")).toContain(q.id);
      }
    expect(ids.length).toBe(
      Object.values(KURIKULUM).flatMap((m) => m.kuis).length,
    );
  });
  it("migrates legacy question ids and drops unknown ids", () => {
    expect(migrateMisses(["apk-q1", "apk-q2", "unknown"])).toEqual([
      "apk-tak-diminta",
    ]);
    expect(
      migrateProgress({
        ...EMPTY_PROGRESS,
        version: 1,
        missedPatterns: ["apk-q1"],
      }).version,
    ).toBe(2);
    expect(migrateProgress({ version: 42 })).toEqual(EMPTY_PROGRESS);
  });
});
describe("review and deterministic learning path", () => {
  it("schedules a miss tomorrow, advances to 30 days and resets on wrong answers", () => {
    let progress = recordMissed(EMPTY_PROGRESS, ["apk-q1"], now);
    expect(progress.reviews?.[0].dueAt).toBe("2026-11-11T00:00:00.000Z");
    expect(
      nextDueLabel(
        progress.reviews?.[0] as NonNullable<typeof progress.reviews>[number],
        now,
      ),
    ).toBe("besok");
    for (let i = 0; i < 6; i++)
      progress = gradeReview(progress, "apk-tak-diminta", true, now);
    expect(progress.reviews?.[0].box).toBe(4);
    expect(progress.reviews?.[0].dueAt).toBe("2026-12-10T00:00:00.000Z");
    expect(progress.missedPatterns).toEqual([]);
    progress = gradeReview(progress, "apk-tak-diminta", false, now);
    expect(progress.reviews?.[0].box).toBe(0);
    expect(progress.reviews).toHaveLength(1);
  });
  it("uses due boundary and stable tie breaking", () => {
    const p = recordMissed(
      EMPTY_PROGRESS,
      ["apk-q4", "apk-q1"],
      new Date("2026-11-09T00:00:00Z"),
    );
    expect(dueReviews(p, now).map((r) => r.patternId)).toEqual([
      "apk-tak-diminta",
      "izin-berlebih",
    ]);
    expect(nextStep(p, now, modules).kind).toBe("review");
    expect(nextStep(p, now, modules).href).toContain("pola=apk-tak-diminta");
  });
  it("prioritises remediation, then published level ordering, then maintenance", () => {
    expect(
      nextStep(
        {
          ...EMPTY_PROGRESS,
          completedModules: [10],
          missedPatterns: ["apk-tak-diminta"],
        },
        now,
        modules,
      ).kind,
    ).toBe("remediation");
    expect(nextStep(EMPTY_PROGRESS, now, modules).kind).toBe("module");
    expect(
      nextStep(
        { ...EMPTY_PROGRESS, completedModules: modules.map((m) => m.no) },
        now,
        modules,
      ).kind,
    ).toBe("practice");
    expect(
      nextStep(
        EMPTY_PROGRESS,
        now,
        modules.map((m) => ({ ...m, ready: false })),
      ).kind,
    ).toBe("done");
    expect(
      nextStep(EMPTY_PROGRESS, now, [modules[9]], ["L1-kurir-apk"]).scenarioId,
    ).toBe("L1-kurir-apk");
    expect(
      nextStep(EMPTY_PROGRESS, now, [modules[9]], []).scenarioId,
    ).toBeUndefined();
  });
  it("caps attempts and practice, and respects pattern filters", () => {
    let p = { ...EMPTY_PROGRESS, completedModules: modules.map((m) => m.no) };
    for (let i = 0; i < 110; i++) p = recordAttempt(p, 10, 4, 4, now);
    expect(p.attempts).toHaveLength(100);
    const content = Object.values(KURIKULUM);
    expect(selectPractice(p, content, now)).toHaveLength(5);
    expect(selectPractice(p, content, now)).toEqual(
      selectPractice(p, content, now),
    );
    expect(
      selectPractice(p, content, now, "izin-berlebih").map((q) => q.id),
    ).toEqual(["apk-q4"]);
    expect(selectPractice(EMPTY_PROGRESS, content, now)).toHaveLength(0);
  });
});
