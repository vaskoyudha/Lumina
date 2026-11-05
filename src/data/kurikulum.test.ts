import { courseFor, isPublished, KURIKULUM } from "@/data/kurikulum";
import { MODUL_10 } from "@/data/modul-10";
import { ModuleContentSchema } from "@/data/modul-schema";
import { MODUS } from "@/lib/modus";

describe("kurikulum", () => {
  it("publishes exactly the courses that have written content", () => {
    expect(isPublished(10)).toBe(true);
    expect(courseFor(10)?.no).toBe(10);

    // Everything the catalog marks "lengkap" must have real content. This is
    // the guard that keeps `modulStatus` from being a claim again.
    for (const m of MODUS) {
      if (m.modulStatus === "lengkap") {
        expect(KURIKULUM[m.no]).toBeDefined();
      }
    }
  });

  it("does not publish numbers with no content", () => {
    expect(isPublished(2)).toBe(false);
    expect(courseFor(2)).toBeNull();
  });

  it("every published course satisfies the same schema the editor enforces", () => {
    for (const course of Object.values(KURIKULUM)) {
      expect(ModuleContentSchema.safeParse(course).success).toBe(true);
    }
  });

  it("the written module still parses with its published shape", () => {
    expect(ModuleContentSchema.parse(MODUL_10).no).toBe(10);
  });
});
