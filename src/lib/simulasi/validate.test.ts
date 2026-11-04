import { L1_KURIR_APK, type Scenario } from "@/lib/simulasi/scenario";
import { validateScenario } from "@/lib/simulasi/validate";

function cloneScenario(): Scenario {
  return JSON.parse(JSON.stringify(L1_KURIR_APK)) as Scenario;
}

describe("validateScenario", () => {
  it("accepts the playable L1 scenario", () => {
    expect(validateScenario(L1_KURIR_APK)).toEqual([]);
  });

  it("catches dangling next edges", () => {
    const scenario = cloneScenario();
    const message = scenario.nodes.find((node) => node.id === "intro");
    if (!message || message.type !== "message")
      throw new Error("Fixture node missing");
    message.next = "missing";

    expect(
      validateScenario(scenario).some((error) =>
        error.includes("missing node"),
      ),
    ).toBe(true);
  });

  it("catches unreachable nodes", () => {
    const scenario = cloneScenario();
    scenario.nodes.push({
      id: "orphan",
      type: "message",
      speaker: "Test",
      text: "Orphan",
      next: "intro",
    });

    expect(
      validateScenario(scenario).some((error) =>
        error.includes('Node "orphan" is unreachable'),
      ),
    ).toBe(true);
  });

  it("catches undeclared tools", () => {
    const scenario = cloneScenario();
    const task = scenario.nodes.find((node) => node.id === "isolate");
    if (!task || task.type !== "tool_task")
      throw new Error("Fixture task missing");
    task.tool = "report";
    scenario.tools = scenario.tools.filter((tool) => tool.id !== "report");

    expect(
      validateScenario(scenario).some((error) =>
        error.includes("undeclared tool"),
      ),
    ).toBe(true);
  });

  it("requires grades to be strictly descending", () => {
    const scenario = cloneScenario();
    scenario.scoring.grades = [
      { min: 0, label: "bawah" },
      { min: 70, label: "atas" },
    ];

    expect(
      validateScenario(scenario).some((error) => error.includes("descending")),
    ).toBe(true);
  });
});
