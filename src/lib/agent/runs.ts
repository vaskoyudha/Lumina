import "server-only";
import { z } from "zod";
import { authDatabase } from "@/lib/auth/database";
import type { AgentRunSummary } from "@/lib/orchestrator/summary";

const AgentsSchema = z.array(
  z
    .object({
      id: z.string(),
      label: z.string(),
      status: z.string(),
      ms: z.number().int().nonnegative(),
    })
    .strict(),
);

const RowSchema = z.object({
  run_id: z.string(),
  modus: z.string(),
  band: z.enum(["bersih", "rendah", "mencurigakan", "tinggi"]),
  planner_source: z.enum(["model", "fallback"]),
  agents: AgentsSchema,
  total_ms: z.coerce.number().int().nonnegative(),
});

export async function saveAgentRun(
  userId: string,
  summary: AgentRunSummary,
): Promise<void> {
  await authDatabase().query(
    `INSERT INTO agent_runs(user_id,run_id,modus,band,planner_source,agents,total_ms)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [
      userId,
      summary.runId,
      summary.modus,
      summary.band,
      summary.plannerSource,
      JSON.stringify(summary.agents),
      summary.totalMs,
    ],
  );
}

export async function latestAgentRun(
  userId: string,
): Promise<AgentRunSummary | null> {
  const { rows } = await authDatabase().query(
    `SELECT run_id,modus,band,planner_source,agents,total_ms
     FROM agent_runs WHERE user_id=$1
     ORDER BY id DESC LIMIT 1`,
    [userId],
  );
  const parsed = RowSchema.safeParse(rows[0]);
  if (!parsed.success) return null;
  const row = parsed.data;
  return {
    runId: row.run_id,
    modus: row.modus,
    band: row.band,
    plannerSource: row.planner_source,
    totalMs: row.total_ms,
    agents: row.agents,
  };
}
