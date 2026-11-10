import { courseFor, isPublished, KURIKULUM } from "@/data/kurikulum";
import { MODUL_10 } from "@/data/modul-10";
import { ModuleContentSchema } from "@/data/modul-schema";
import { MODUS, MODUS_BY_NO } from "@/lib/modus";

describe("kurikulum", () => {
  it("publishes every original module and nothing without content", () => {
    for (const no of Array.from({ length: 12 }, (_, i) => i + 1)) {
      expect(isPublished(no)).toBe(true);
      expect(courseFor(no)?.no).toBe(no);
    }
    // Admin-added numbers stay unpublished until they are written.
    expect(isPublished(13)).toBe(false);
    expect(courseFor(13)).toBeNull();
  });

  it("does not publish numbers outside the catalog", () => {
    expect(courseFor(99)).toBeNull();
  });

  it("keeps every published course parseable by the same schema the editor enforces", () => {
    for (const course of Object.values(KURIKULUM)) {
      expect(ModuleContentSchema.safeParse(course).success).toBe(true);
    }
  });

  it("every published course carries the professional layer", () => {
    for (const course of Object.values(KURIKULUM)) {
      expect(course.ringkasan?.length ?? 0).toBeGreaterThanOrEqual(40);
      expect(course.tujuan?.length ?? 0).toBeGreaterThanOrEqual(2);
      expect(course.poinKunci?.length ?? 0).toBeGreaterThanOrEqual(2);
      expect(course.estimasiMenit ?? 0).toBeGreaterThanOrEqual(3);
    }
  });

  it("matches the catalog: no orphan course, no mismatched number", () => {
    for (const course of Object.values(KURIKULUM)) {
      expect(MODUS_BY_NO.get(course.no)).toBeDefined();
      expect(course.no).toBe(MODUS_BY_NO.get(course.no)?.no);
    }
  });

  it("teaches what the plan requires: anatomy, a dangerous example, a quiz, reporting", () => {
    for (const course of Object.values(KURIKULUM)) {
      expect(course.anatomi.length).toBeGreaterThanOrEqual(3);
      expect(course.anatomi.length).toBeLessThanOrEqual(8);
      expect(course.checklist.length).toBeGreaterThanOrEqual(3);
      expect(course.checklist.length).toBeLessThanOrEqual(8);
      expect(course.kuis.length).toBeGreaterThanOrEqual(3);
      expect(course.kuis.length).toBeLessThanOrEqual(6);
      expect(course.lapor.length).toBeGreaterThanOrEqual(2);
      expect(course.lapor.length).toBeLessThanOrEqual(6);
      expect(course.contohIsi.some((s) => s.berbahaya)).toBe(true);

      // Quiz integrity: unique ids, unique options, and the answer exists.
      const ids = course.kuis.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const q of course.kuis) {
        expect(q.prompt).toMatch(/apa yang kamu lakukan/i);
        expect(new Set(q.options.map((o) => o.id)).size).toBe(q.options.length);
        expect(q.options.some((o) => o.id === q.correctId)).toBe(true);
        expect(q.rationale.length).toBeGreaterThan(10);
      }
    }
  });

  it("keeps the example anonymised: no phone numbers or real accounts", () => {
    for (const course of Object.values(KURIKULUM)) {
      const joined = course.contohIsi.map((s) => s.text).join("");
      expect(joined).not.toMatch(/08\d{8,}/);
      expect(joined).not.toMatch(/\+62\s?8/);
    }
  });

  it("wires five modules to their playable simulations", () => {
    const withScenario = Object.values(KURIKULUM).filter(
      (course) => course.scenarioId !== null,
    );
    expect(
      withScenario.map((course) => [course.no, course.scenarioId]),
    ).toEqual([
      [2, "L4-fake-call"],
      [4, "L3-lowongan-berbayar"],
      [7, "L2-phishing-tautan"],
      [9, "L3-pinjol-fiktif"],
      [10, "L1-kurir-apk"],
    ]);
  });

  it("the written module still parses with its published shape", () => {
    expect(ModuleContentSchema.parse(MODUL_10).no).toBe(10);
  });

  it("keeps the catalog's own lengkap claim honest", () => {
    for (const m of MODUS) {
      if (m.modulStatus === "lengkap") {
        expect(KURIKULUM[m.no]).toBeDefined();
      }
    }
  });
});
