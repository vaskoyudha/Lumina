import { MODUL_10 } from "@/data/modul-10";
import { tutorContext, tutorFallback } from "@/lib/learning/tutor";

it("grounds the tutor in one published module without quiz answers or progress", () => {
  const context = tutorContext(MODUL_10, "File APK", ["APK via chat"]);
  expect(context.moduleNo).toBe(10);
  expect(context.anatomi).toEqual(MODUL_10.anatomi);
  const wire = JSON.stringify(context);
  expect(wire).not.toMatch(/correctId|rationale|kuis|missedPatterns|progress/);
  expect(tutorFallback(MODUL_10)).toContain(MODUL_10.ringkasan);
});
