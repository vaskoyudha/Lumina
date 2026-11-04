import type { Scenario } from "@/lib/simulasi/scenario";

export function validateScenario(scenario: Scenario): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(scenario.nodes.map((node) => node.id));
  const tools = new Set(scenario.tools.map((tool) => tool.id));
  const start = scenario.nodes.find((node) => node.id === scenario.start);

  if (!start) errors.push(`Start node "${scenario.start}" does not exist.`);

  for (const node of scenario.nodes) {
    if (node.type === "message" && !nodeIds.has(node.next)) {
      errors.push(`Node "${node.id}" points to missing node "${node.next}".`);
    }
    if (node.type === "choice") {
      for (const choice of node.choices) {
        if (!nodeIds.has(choice.next)) {
          errors.push(
            `Choice in "${node.id}" points to missing node "${choice.next}".`,
          );
        }
      }
    }
    if (node.type === "tool_task") {
      if (!tools.has(node.tool))
        errors.push(`Node "${node.id}" uses undeclared tool "${node.tool}".`);
      if (!nodeIds.has(node.on_success)) {
        errors.push(
          `Node "${node.id}" points to missing node "${node.on_success}".`,
        );
      }
    }
  }

  const reachable = new Set<string>();
  const pending = start ? [start.id] : [];
  while (pending.length > 0) {
    const id = pending.pop();
    if (!id || reachable.has(id)) continue;
    reachable.add(id);
    const node = scenario.nodes.find((item) => item.id === id);
    if (!node) continue;
    if (node.type === "message") pending.push(node.next);
    if (node.type === "choice")
      pending.push(...node.choices.map((choice) => choice.next));
    if (node.type === "tool_task") pending.push(node.on_success);
  }

  for (const node of scenario.nodes) {
    if (!reachable.has(node.id))
      errors.push(`Node "${node.id}" is unreachable from "${scenario.start}".`);
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

  return errors;
}
