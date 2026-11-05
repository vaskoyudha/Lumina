import { L1_KURIR_APK, type Scenario } from "@/lib/simulasi/scenario";
import { validateScenario } from "@/lib/simulasi/validate";

function cloneScenario(): Scenario {
  return JSON.parse(JSON.stringify(L1_KURIR_APK)) as Scenario;
}

function reachableFrom(scenario: Scenario, startId: string): Set<string> {
  const nodes = new Map(scenario.nodes.map((node) => [node.id, node]));
  const reachable = new Set<string>();
  const pending = [startId];
  while (pending.length > 0) {
    const id = pending.pop();
    if (!id || reachable.has(id)) continue;
    reachable.add(id);
    const node = nodes.get(id);
    if (!node) continue;
    if (node.type === "message") pending.push(node.next);
    if (node.type === "choice")
      pending.push(...node.choices.map((choice) => choice.next));
    if (node.type === "tool_task") pending.push(node.on_success);
  }
  return reachable;
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

  it("catches dangling choice and tool-task edges", () => {
    const choiceScenario = cloneScenario();
    const decision = choiceScenario.nodes.find(
      (node) => node.id === "decision",
    );
    if (!decision || decision.type !== "choice")
      throw new Error("Fixture choice missing");
    decision.choices[0].next = "missing-choice-target";
    expect(
      validateScenario(choiceScenario).some((error) =>
        error.includes('Choice in "decision" points to missing node'),
      ),
    ).toBe(true);

    const taskScenario = cloneScenario();
    const task = taskScenario.nodes.find((node) => node.id === "isolate");
    if (!task || task.type !== "tool_task")
      throw new Error("Fixture task missing");
    task.on_success = "missing-task-target";
    expect(
      validateScenario(taskScenario).some((error) =>
        error.includes('Node "isolate" points to missing node'),
      ),
    ).toBe(true);
  });

  it("rejects a start id that does not name a node", () => {
    const scenario = cloneScenario();
    scenario.start = "missing";

    expect(validateScenario(scenario)).toContain(
      'Start node "missing" does not exist.',
    );
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

  it("catches duplicate node and tool ids", () => {
    const scenario = cloneScenario();
    const intro = scenario.nodes.find((node) => node.id === "intro");
    if (!intro) throw new Error("Fixture node missing");
    scenario.nodes.push({ ...intro });
    scenario.tools.push({ ...scenario.tools[0] });

    const errors = validateScenario(scenario);
    expect(errors).toContain('Duplicate node id "intro".');
    expect(errors).toContain('Duplicate tool id "isolation".');
  });

  it("requires each tool unlock node to exist and be reachable", () => {
    const missingUnlock = cloneScenario();
    missingUnlock.tools[0].unlocked_at = "missing";
    expect(validateScenario(missingUnlock)).toContain(
      'Tool "isolation" unlocks at missing node "missing".',
    );

    const unreachableUnlock = cloneScenario();
    unreachableUnlock.tools[0].unlocked_at = "orphan-unlock";
    unreachableUnlock.nodes.push({
      id: "orphan-unlock",
      type: "message",
      speaker: "Test",
      text: "Tidak terjangkau",
      next: "ending",
    });
    expect(validateScenario(unreachableUnlock)).toContain(
      'Tool "isolation" unlock node "orphan-unlock" is unreachable from "intro".',
    );
  });

  it("rejects a tool task reachable before its declared unlock node", () => {
    const scenario = cloneScenario();
    const decision = scenario.nodes.find((node) => node.id === "decision");
    if (!decision || decision.type !== "choice")
      throw new Error("Fixture choice missing");
    scenario.tools[0].unlocked_at = "inspect";
    expect(
      validateScenario(scenario).some((error) =>
        error.includes(
          'Tool task "isolate" can be reached before tool "isolation" unlocks',
        ),
      ),
    ).toBe(true);
  });

  it("rejects empty choices and wrong choices without rationale", () => {
    const noChoices = cloneScenario();
    const decision = noChoices.nodes.find((node) => node.id === "decision");
    if (!decision || decision.type !== "choice")
      throw new Error("Fixture choice missing");
    decision.choices = [];
    expect(validateScenario(noChoices)).toContain(
      'Choice node "decision" must have at least one choice.',
    );

    const noRationale = cloneScenario();
    const otpDecision = noRationale.nodes.find(
      (node) => node.id === "otp-decision",
    );
    if (!otpDecision || otpDecision.type !== "choice")
      throw new Error("Fixture choice missing");
    const wrongOtpChoice = otpDecision.choices.find(
      (choice) => choice.verdict === "salah",
    );
    if (!wrongOtpChoice) throw new Error("Wrong choice missing");
    wrongOtpChoice.rationale = "  ";
    expect(validateScenario(noRationale)).toContain(
      'Wrong choice in "otp-decision" must have a non-empty rationale.',
    );
  });

  it("requires every reachable node to have a path to an ending", () => {
    const scenario = cloneScenario();
    const isolate = scenario.nodes.find((node) => node.id === "isolate");
    if (!isolate || isolate.type !== "tool_task")
      throw new Error("Fixture task missing");
    isolate.on_success = "trap-a";
    scenario.nodes.push(
      {
        id: "trap-a",
        type: "message",
        speaker: "X",
        text: "X",
        next: "trap-b",
      },
      {
        id: "trap-b",
        type: "message",
        speaker: "X",
        text: "X",
        next: "trap-a",
      },
    );

    expect(
      validateScenario(scenario).some((error) =>
        error.includes('Reachable node "trap-a" cannot reach an ending.'),
      ),
    ).toBe(true);
  });

  it("requires exactly four non-empty debrief lines", () => {
    const scenario = cloneScenario();
    const ending = scenario.nodes.find((node) => node.id === "ending");
    if (!ending || ending.type !== "ending")
      throw new Error("Fixture ending missing");
    ending.debrief[1] = " ";

    expect(validateScenario(scenario)).toContain(
      'Ending node "ending" must have four non-empty debrief lines.',
    );
  });

  it("rejects a debrief with a runtime-invalid number of lines", () => {
    const scenario = cloneScenario();
    const ending = scenario.nodes.find((node) => node.id === "ending");
    if (!ending || ending.type !== "ending")
      throw new Error("Fixture ending missing");
    ending.debrief = [
      "satu",
      "dua",
      "tiga",
    ] as unknown as typeof ending.debrief;

    expect(validateScenario(scenario)).toContain(
      'Ending node "ending" must have exactly four debrief lines.',
    );
  });

  it("requires finite, bounded HUD values and positive rates", () => {
    const scenario = cloneScenario();
    scenario.hud.panic.start = Number.NaN;
    scenario.hud.panic.fail_at = 101;
    scenario.hud.intrusion.max = 101;
    scenario.hud.intrusion.rate_per_second = -1;

    const errors = validateScenario(scenario);
    expect(
      errors.some((error) => error.includes("HUD panic start must be finite")),
    ).toBe(true);
    expect(errors).toContain(
      "HUD panic fail_at must be finite, above start, and at most max.",
    );
    expect(
      errors.some((error) =>
        error.includes("HUD intrusion start must be finite"),
      ),
    ).toBe(true);
    expect(errors.some((error) => error.includes("rate_per_second"))).toBe(
      true,
    );
  });

  it.each([
    ["zero max", (scenario: Scenario) => (scenario.hud.panic.max = 0)],
    ["start at max", (scenario: Scenario) => (scenario.hud.panic.start = 100)],
    [
      "fail threshold at start",
      (scenario: Scenario) => (scenario.hud.panic.fail_at = 25),
    ],
    [
      "zero intrusion rate",
      (scenario: Scenario) => (scenario.hud.intrusion.rate_per_second = 0),
    ],
  ])("rejects degenerate HUD settings: %s", (_label, mutate) => {
    const scenario = cloneScenario();
    mutate(scenario);
    expect(
      validateScenario(scenario).some((error) => error.startsWith("HUD")),
    ).toBe(true);
  });

  it("rejects non-finite or out-of-range choice panic effects and grade values", () => {
    const scenario = cloneScenario();
    const decision = scenario.nodes.find((node) => node.id === "decision");
    if (!decision || decision.type !== "choice")
      throw new Error("Fixture choice missing");
    decision.choices[0].panic = Number.POSITIVE_INFINITY;
    scenario.scoring.grades[0].min = Number.NaN;

    const errors = validateScenario(scenario);
    expect(
      errors.some((error) => error.includes("panic effect must be finite")),
    ).toBe(true);
    expect(errors).toContain(
      "Grade min values must be finite numbers between 0 and 100.",
    );
  });

  it("validates chapter, message delay, tactic references, and optional flags", () => {
    const scenario = cloneScenario();
    const intro = scenario.nodes.find((node) => node.id === "intro");
    const decision = scenario.nodes.find((node) => node.id === "decision");
    if (!intro || intro.type !== "message")
      throw new Error("Fixture message missing");
    if (!decision || decision.type !== "choice")
      throw new Error("Fixture choice missing");

    (intro as unknown as { chapter: number }).chapter = 4;
    intro.delay_ms = Number.POSITIVE_INFINITY;
    decision.choices[0].tactic = "made-up" as never;
    decision.choices[0].compromisesDevice = "yes" as unknown as boolean;
    decision.choices[0].sharesOtp = 1 as unknown as boolean;

    const errors = validateScenario(scenario);
    expect(errors).toContain('Node "intro" chapter must be 1, 2, or 3.');
    expect(errors).toContain(
      'Message node "intro" delay_ms must be finite and between 0 and 10000.',
    );
    expect(errors).toContain(
      'Choice in "decision" references unknown tactic "made-up".',
    );
    expect(errors).toContain(
      'Choice in "decision" compromisesDevice must be a boolean.',
    );
    expect(errors).toContain(
      'Choice in "decision" sharesOtp must be a boolean.',
    );
  });

  it.each([
    ["negative", -1],
    ["over ten seconds", 10_001],
  ])("rejects message delay that is %s", (_label, delay) => {
    const scenario = cloneScenario();
    const intro = scenario.nodes.find((node) => node.id === "intro");
    if (!intro || intro.type !== "message")
      throw new Error("Fixture message missing");
    intro.delay_ms = delay;
    expect(validateScenario(scenario)).toContain(
      'Message node "intro" delay_ms must be finite and between 0 and 10000.',
    );
  });

  it("keeps the safe branch clear of device cleanup and sends shared OTP to compromise", () => {
    const safeDecision = L1_KURIR_APK.nodes.find(
      (node) => node.id === "safe-decision",
    );
    if (!safeDecision || safeDecision.type !== "choice")
      throw new Error("Fixture safe decision missing");
    const safeChoice = safeDecision.choices.find(
      (choice) => choice.verdict === "benar",
    );
    if (!safeChoice) throw new Error("Safe choice missing");
    const safeRoute = reachableFrom(L1_KURIR_APK, safeChoice.next);
    expect(safeRoute.has("isolate")).toBe(false);
    expect(safeRoute.has("inspect")).toBe(false);
    expect(safeRoute.has("ending-safe")).toBe(true);

    const otpDecision = L1_KURIR_APK.nodes.find(
      (node) => node.id === "otp-decision",
    );
    if (!otpDecision || otpDecision.type !== "choice")
      throw new Error("Fixture OTP decision missing");
    const sharedOtp = otpDecision.choices.find((choice) => choice.sharesOtp);
    if (!sharedOtp) throw new Error("OTP-sharing choice missing");
    const compromisedRoute = reachableFrom(L1_KURIR_APK, sharedOtp.next);
    expect(compromisedRoute.has("ending-compromised")).toBe(true);
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
