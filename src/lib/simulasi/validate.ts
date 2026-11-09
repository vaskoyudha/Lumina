import {
  type Scenario,
  type ScenarioNode,
  TACTIC_IDS,
} from "@/lib/simulasi/types";

const HUD_MIN = 0;
const HUD_MAX = 100;

function targets(node: ScenarioNode): string[] {
  if (node.type === "message") return [node.next];
  if (node.type === "choice") return node.choices.map((choice) => choice.next);
  if (node.type === "tool_task") return [node.on_success];
  return [];
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

export function validateScenario(scenario: Scenario): string[] {
  const errors: string[] = [];
  const tacticIds = new Set<string>(TACTIC_IDS);
  const nodeIds = new Set<string>();
  const toolIds = new Set<string>();
  const nodesById = new Map<string, ScenarioNode>();

  for (const node of scenario.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id "${node.id}".`);
    } else {
      nodeIds.add(node.id);
      nodesById.set(node.id, node);
    }
  }

  for (const tool of scenario.tools) {
    if (toolIds.has(tool.id)) errors.push(`Duplicate tool id "${tool.id}".`);
    toolIds.add(tool.id);
  }

  const start = nodesById.get(scenario.start);
  if (!start) errors.push(`Start node "${scenario.start}" does not exist.`);

  for (const node of scenario.nodes) {
    if (
      node.chapter !== undefined &&
      node.chapter !== 1 &&
      node.chapter !== 2 &&
      node.chapter !== 3
    ) {
      errors.push(`Node "${node.id}" chapter must be 1, 2, or 3.`);
    }

    if (
      node.type === "message" &&
      node.delay_ms !== undefined &&
      (!isFiniteNumber(node.delay_ms) ||
        node.delay_ms < 0 ||
        node.delay_ms > 10_000)
    ) {
      errors.push(
        `Message node "${node.id}" delay_ms must be finite and between 0 and 10000.`,
      );
    }

    if (node.type === "message" && !nodeIds.has(node.next)) {
      errors.push(`Node "${node.id}" points to missing node "${node.next}".`);
    }

    if (node.type === "choice") {
      if (node.choices.length === 0) {
        errors.push(`Choice node "${node.id}" must have at least one choice.`);
      }
      for (const choice of node.choices) {
        if (!choice.label.trim()) {
          errors.push(`Choice in "${node.id}" must have a non-empty label.`);
        }
        if (choice.verdict === "salah" && !choice.rationale?.trim()) {
          errors.push(
            `Wrong choice in "${node.id}" must have a non-empty rationale.`,
          );
        }
        if (
          choice.panic !== undefined &&
          (!isFiniteNumber(choice.panic) ||
            choice.panic < 0 ||
            choice.panic > HUD_MAX)
        ) {
          errors.push(
            `Choice in "${node.id}" panic effect must be finite and between 0 and ${HUD_MAX}.`,
          );
        }
        if (choice.tactic !== undefined && !tacticIds.has(choice.tactic)) {
          errors.push(
            `Choice in "${node.id}" references unknown tactic "${choice.tactic}".`,
          );
        }
        if (
          choice.compromisesDevice !== undefined &&
          typeof choice.compromisesDevice !== "boolean"
        ) {
          errors.push(
            `Choice in "${node.id}" compromisesDevice must be a boolean.`,
          );
        }
        if (
          choice.sharesOtp !== undefined &&
          typeof choice.sharesOtp !== "boolean"
        ) {
          errors.push(`Choice in "${node.id}" sharesOtp must be a boolean.`);
        }
        if (!nodeIds.has(choice.next)) {
          errors.push(
            `Choice in "${node.id}" points to missing node "${choice.next}".`,
          );
        }
      }
    }

    if (node.type === "tool_task") {
      if (!toolIds.has(node.tool)) {
        errors.push(`Node "${node.id}" uses undeclared tool "${node.tool}".`);
      }
      if (!nodeIds.has(node.on_success)) {
        errors.push(
          `Node "${node.id}" points to missing node "${node.on_success}".`,
        );
      }
    }
  }

  for (const tool of scenario.tools) {
    if (!nodeIds.has(tool.unlocked_at)) {
      errors.push(
        `Tool "${tool.id}" unlocks at missing node "${tool.unlocked_at}".`,
      );
    }
  }

  const reachable = new Set<string>();
  const pending = start ? [start.id] : [];
  while (pending.length > 0) {
    const id = pending.pop();
    if (!id || reachable.has(id)) continue;
    reachable.add(id);
    const node = nodesById.get(id);
    if (!node) continue;
    for (const target of targets(node)) {
      if (nodeIds.has(target)) pending.push(target);
    }
  }

  for (const node of scenario.nodes) {
    if (!reachable.has(node.id)) {
      errors.push(`Node "${node.id}" is unreachable from "${scenario.start}".`);
    }
  }

  for (const tool of scenario.tools) {
    if (nodeIds.has(tool.unlocked_at) && !reachable.has(tool.unlocked_at)) {
      errors.push(
        `Tool "${tool.id}" unlock node "${tool.unlocked_at}" is unreachable from "${scenario.start}".`,
      );
    }
  }

  // A tool task may occur at its unlock node, or only on paths that have
  // already crossed that node. Removing the unlock node exposes bypass paths.
  for (const node of scenario.nodes) {
    if (node.type !== "tool_task") continue;
    const tool = scenario.tools.find((candidate) => candidate.id === node.tool);
    if (
      !tool ||
      !nodeIds.has(tool.unlocked_at) ||
      node.id === tool.unlocked_at
    ) {
      continue;
    }
    const withoutUnlock = new Set<string>();
    const path = start && start.id !== tool.unlocked_at ? [start.id] : [];
    while (path.length > 0) {
      const id = path.pop();
      if (!id || id === tool.unlocked_at || withoutUnlock.has(id)) continue;
      withoutUnlock.add(id);
      const current = nodesById.get(id);
      if (current) path.push(...targets(current));
    }
    if (withoutUnlock.has(node.id)) {
      errors.push(
        `Tool task "${node.id}" can be reached before tool "${tool.id}" unlocks at "${tool.unlocked_at}".`,
      );
    }
  }

  const canReachEnding = new Set(
    scenario.nodes
      .filter((node) => node.type === "ending")
      .map((node) => node.id),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of scenario.nodes) {
      if (
        !canReachEnding.has(node.id) &&
        targets(node).some((target) => canReachEnding.has(target))
      ) {
        canReachEnding.add(node.id);
        changed = true;
      }
    }
  }
  for (const node of scenario.nodes) {
    if (reachable.has(node.id) && !canReachEnding.has(node.id)) {
      errors.push(`Reachable node "${node.id}" cannot reach an ending.`);
    }
  }

  const { panic, intrusion } = scenario.hud;
  for (const [name, hud] of [
    ["panic", panic],
    ["intrusion", intrusion],
  ] as const) {
    if (
      !isFiniteNumber(hud.start) ||
      !isFiniteNumber(hud.max) ||
      hud.start < HUD_MIN ||
      hud.max > HUD_MAX ||
      hud.max <= HUD_MIN ||
      hud.start >= hud.max
    ) {
      errors.push(
        `HUD ${name} start must be finite and below a positive max no greater than ${HUD_MAX}.`,
      );
    }
  }
  if (
    !isFiniteNumber(panic.fail_at) ||
    panic.fail_at <= panic.start ||
    panic.fail_at > panic.max
  ) {
    errors.push(
      "HUD panic fail_at must be finite, above start, and at most max.",
    );
  }
  if (
    !isFiniteNumber(intrusion.rate_per_second) ||
    intrusion.rate_per_second <= 0 ||
    intrusion.rate_per_second > HUD_MAX
  ) {
    errors.push(
      `HUD intrusion rate_per_second must be finite, above 0, and at most ${HUD_MAX}.`,
    );
  }

  for (const node of scenario.nodes) {
    if (node.type === "ending" && node.debrief.some((line) => !line.trim())) {
      errors.push(
        `Ending node "${node.id}" must have four non-empty debrief lines.`,
      );
    }
    if (node.type === "ending" && node.debrief.length !== 4) {
      errors.push(
        `Ending node "${node.id}" must have exactly four debrief lines.`,
      );
    }
  }

  for (let index = 1; index < scenario.scoring.grades.length; index += 1) {
    if (
      scenario.scoring.grades[index - 1].min <=
      scenario.scoring.grades[index].min
    ) {
      errors.push("Grades must be ordered by descending min.");
      break;
    }
  }
  for (const grade of scenario.scoring.grades) {
    if (
      !isFiniteNumber(grade.min) ||
      grade.min < HUD_MIN ||
      grade.min > HUD_MAX
    ) {
      errors.push("Grade min values must be finite numbers between 0 and 100.");
      break;
    }
  }

  return errors;
}
