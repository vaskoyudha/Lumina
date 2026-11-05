import { MODUL_10 } from "@/data/modul-10";

describe("modul 10 — File APK via WhatsApp", () => {
  it("has the agreed shape: 5 anatomy steps, 5 checklist items, 4 quiz questions, 4 report steps", () => {
    expect(MODUL_10.no).toBe(10);
    expect(MODUL_10.anatomi).toHaveLength(5);
    expect(MODUL_10.checklist).toHaveLength(5);
    expect(MODUL_10.kuis).toHaveLength(4);
    expect(MODUL_10.lapor).toHaveLength(4);
    expect(MODUL_10.scenarioId).toBe("L1-kurir-apk");
  });

  it("wires every quiz question with a valid answer and a rationale", () => {
    for (const q of MODUL_10.kuis) {
      expect(q.prompt.length).toBeGreaterThan(10);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.options.map((o) => o.id)).toContain(q.correctId);
      expect(q.rationale.length).toBeGreaterThan(10);
      // Every question asks what the learner does, not trivia (§5-B).
      expect(q.prompt).toMatch(/apa yang kamu lakukan/i);
    }
  });

  it("marks the dangerous segments of the example message", () => {
    const joined = MODUL_10.contohIsi.map((s) => s.text).join("");
    expect(joined).toMatch(/\.apk/i);
    const flagged = MODUL_10.contohIsi.filter((s) => s.berbahaya);
    expect(flagged.length).toBeGreaterThan(0);
    expect(flagged.map((s) => s.text).join(" ")).toMatch(/apk|instal/i);
    // No real phone numbers or names in the anonymised example.
    expect(joined).not.toMatch(/08\d{8,}/);
  });
});
