import "server-only";
import { authDatabase } from "@/lib/auth/database";
import {
  LearningModuleSchema,
  type LearningSummary,
  SimulationSchema,
} from "@/lib/content/schema";

export async function listModules() {
  const { rows } = await authDatabase().query(
    "SELECT metadata, content FROM learning_modules ORDER BY no",
  );
  return rows.map((row) => LearningModuleSchema.parse(row));
}
export async function getModule(no: number) {
  const { rows } = await authDatabase().query(
    "SELECT metadata, content FROM learning_modules WHERE no = $1",
    [no],
  );
  return rows[0] ? LearningModuleSchema.parse(rows[0]) : null;
}
export function moduleSummaries(
  modules: Awaited<ReturnType<typeof listModules>>,
): LearningSummary[] {
  return modules.map(({ metadata, content }) => ({
    ...metadata,
    ready: !!content,
    modulStatus: content ? "lengkap" : "segera",
    scenarioId: content?.scenarioId ?? null,
  }));
}
export async function listSimulations() {
  const { rows } = await authDatabase().query(
    "SELECT payload FROM simulation_scenarios ORDER BY id",
  );
  return rows.map((row) => SimulationSchema.parse(row.payload));
}
export async function getSimulation(id: string) {
  const { rows } = await authDatabase().query(
    "SELECT payload FROM simulation_scenarios WHERE id = $1",
    [id],
  );
  return rows[0] ? SimulationSchema.parse(rows[0].payload) : null;
}
