import { CONTENT_FIXTURE } from "@/lib/content/fixtures";
import { buildPracticeSimulation } from "@/lib/simulasi/from-module";
import { validateScenario } from "@/lib/simulasi/validate";

describe("buildPracticeSimulation", () => {
  it("builds a valid practice drill from every published course", () => {
    const published = CONTENT_FIXTURE.modules.filter((m) => m.content);
    expect(published.length).toBeGreaterThan(0);

    for (const module of published) {
      const simulation = buildPracticeSimulation(module);
      expect(simulation.scenario.scenario.id).toBe(
        `pola-${module.metadata.no}`,
      );
      expect(simulation.moduleNo).toBe(module.metadata.no);
      expect(validateScenario(simulation.scenario)).toEqual([]);
      expect(
        simulation.scenario.nodes.some((node) => node.type === "ending"),
      ).toBe(true);
    }
  });

  it("uses the course quiz as the decision chain", () => {
    const module = CONTENT_FIXTURE.modules.find(
      (candidate) => candidate.metadata.no === 1,
    );
    if (!module?.content) throw new Error("Modul 1 tidak ditemukan");

    const simulation = buildPracticeSimulation(module);
    const choices = simulation.scenario.nodes.filter(
      (node) => node.type === "choice",
    );
    expect(choices).toHaveLength(3);
    expect(simulation.scenario.nodes[0]).toMatchObject({
      type: "message",
      next: "tanya-1",
    });
  });
});
