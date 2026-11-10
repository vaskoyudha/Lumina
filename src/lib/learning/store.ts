import "server-only";
import { authDatabase } from "@/lib/auth/database";
import { getModule, getSimulation } from "@/lib/content/store";
import type { SimulationSubmission } from "@/lib/learning/validation";
import {
  BADGE_FOR_MODULE,
  EMPTY_PROGRESS,
  type Progress,
} from "@/lib/progress";

export class LearningError extends Error {}

export async function readAccountProgress(userId: string): Promise<Progress> {
  const { rows } = await authDatabase().query<{
    module_no: number;
    missed_patterns: string[];
    completed_at: Date | null;
    updated_at: Date;
  }>(
    "SELECT module_no, missed_patterns, completed_at, updated_at FROM learning_progress WHERE user_id=$1 ORDER BY module_no",
    [userId],
  );
  const completedModules = rows
    .filter((r) => r.completed_at)
    .map((r) => r.module_no);
  return {
    ...EMPTY_PROGRESS,
    completedModules,
    badges: completedModules
      .map((no) => BADGE_FOR_MODULE[no])
      .filter((id): id is string => !!id),
    missedPatterns: [...new Set(rows.flatMap((r) => r.missed_patterns))],
    updatedAt: rows.length
      ? new Date(
          Math.max(...rows.map((r) => r.updated_at.getTime())),
        ).toISOString()
      : EMPTY_PROGRESS.updatedAt,
  };
}

export async function saveQuiz(
  userId: string,
  no: number,
  answers: Record<string, string>,
  complete: boolean,
) {
  const module = await getModule(no);
  if (!module?.content) throw new LearningError("Modul tidak tersedia.");
  const questions = module.content.kuis;
  if (
    Object.keys(answers).length !== questions.length ||
    questions.some((q) => !q.options.some((o) => o.id === answers[q.id]))
  )
    throw new LearningError("Jawab semua soal sebelum menyimpan.");
  const missed = questions
    .filter((q) => answers[q.id] !== q.correctId)
    .map((q) => q.id);
  const score = questions.length - missed.length;
  if (complete && score / questions.length < 0.6)
    throw new LearningError(
      "Lulus kuis minimal 60% untuk menyelesaikan modul.",
    );
  await authDatabase().query(
    `INSERT INTO learning_progress(user_id,module_no,answers,score,total,missed_patterns,completed_at)
    VALUES ($1,$2,$3,$4,$5,$6,CASE WHEN $7 THEN now() ELSE NULL END)
    ON CONFLICT(user_id,module_no) DO UPDATE SET answers=EXCLUDED.answers,score=EXCLUDED.score,total=EXCLUDED.total,
      missed_patterns=EXCLUDED.missed_patterns,completed_at=COALESCE(learning_progress.completed_at,EXCLUDED.completed_at),updated_at=now()`,
    [
      userId,
      no,
      JSON.stringify(answers),
      score,
      questions.length,
      missed,
      complete,
    ],
  );
  return readAccountProgress(userId);
}

export async function readSimulationResults(userId: string) {
  const { rows } = await authDatabase().query<{
    scenario_id: string;
    mode: string;
    outcome: string;
    finished_at: Date;
  }>(
    "SELECT scenario_id,mode,outcome,finished_at FROM simulation_results WHERE user_id=$1 ORDER BY finished_at DESC LIMIT 20",
    [userId],
  );
  return rows.map((r) => ({
    scenarioId: r.scenario_id,
    mode: r.mode,
    outcome: r.outcome,
    finishedAt: r.finished_at.toISOString(),
  }));
}

export async function saveSimulation(
  userId: string,
  submission: SimulationSubmission,
) {
  const content = await getSimulation(submission.scenarioId);
  if (!content) throw new LearningError("Simulasi tidak tersedia.");
  const scenario = content.scenario;
  let id = scenario.start;
  let panic = scenario.hud.panic.start;
  let compromised = false;
  let isolated = false;
  const skipMessages = () => {
    const visited = new Set<string>();
    for (;;) {
      const node = scenario.nodes.find((n) => n.id === id);
      if (!node || node.type !== "message") return node;
      if (visited.has(id))
        throw new LearningError("Alur simulasi tidak valid.");
      visited.add(id);
      id = node.next;
    }
  };
  let stepIndex = 0;
  for (const step of submission.steps) {
    if (submission.breathingAt === stepIndex) panic = Math.max(0, panic - 15);
    stepIndex++;
    const node = skipMessages();
    if (!node || node.id !== step.nodeId)
      throw new LearningError("Urutan keputusan tidak valid.");
    if (node.type === "choice" && step.choiceIndex !== undefined) {
      const choice = node.choices[step.choiceIndex];
      if (!choice) throw new LearningError("Pilihan tidak valid.");
      panic = Math.min(scenario.hud.panic.max, panic + (choice.panic ?? 0));
      if (
        panic >= scenario.hud.panic.fail_at &&
        stepIndex < submission.steps.length
      )
        throw new LearningError(
          "Simulasi sudah berakhir saat batas panik tercapai.",
        );
      compromised ||= !!choice.compromisesDevice;
      id = choice.next;
    } else if (node.type === "tool_task" && step.choiceIndex === undefined) {
      if (node.tool === "isolation") isolated = true;
      id = node.on_success;
    } else throw new LearningError("Langkah simulasi tidak valid.");
  }
  const final = skipMessages();
  let intrusionFailed = false;
  if (
    submission.outcome === "failed" &&
    submission.mode === "tantangan" &&
    compromised &&
    !isolated &&
    final?.type !== "ending"
  ) {
    const { start, max, rate_per_second: rate } = scenario.hud.intrusion;
    if (Number.isFinite(rate) && rate > 0) {
      // Allow one display tick of scheduling/network skew. Paused time cannot
      // be proved from a browser, but an immediate fabricated failure is rejected.
      const seconds = Math.max(0, (max - start) / rate - 1);
      const timer = await authDatabase().query(
        "SELECT 1 FROM simulation_intrusion_timers WHERE attempt_id=$1 AND user_id=$2 AND scenario_id=$3 AND started_at <= now()-$4*interval '1 second'",
        [submission.attemptId, userId, submission.scenarioId, seconds],
      );
      intrusionFailed = !!timer.rowCount;
    }
  }
  const failure = panic >= scenario.hud.panic.fail_at || intrusionFailed;
  const outcome = failure
    ? "failed"
    : final?.type === "ending"
      ? final.variant
      : null;
  if (!outcome || submission.outcome !== outcome)
    throw new LearningError("Simulasi belum selesai atau hasil tidak cocok.");
  const { rows } = await authDatabase().query(
    `INSERT INTO simulation_results(attempt_id,user_id,scenario_id,mode,outcome,decisions)
    VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(attempt_id) DO NOTHING RETURNING attempt_id`,
    [
      submission.attemptId,
      userId,
      submission.scenarioId,
      submission.mode,
      outcome,
      JSON.stringify(submission.steps),
    ],
  );
  if (!rows.length) {
    const duplicate = await authDatabase().query(
      "SELECT 1 FROM simulation_results WHERE attempt_id=$1 AND user_id=$2 AND scenario_id=$3 AND mode=$4 AND outcome=$5 AND decisions=$6::jsonb",
      [
        submission.attemptId,
        userId,
        submission.scenarioId,
        submission.mode,
        outcome,
        JSON.stringify(submission.steps),
      ],
    );
    if (!duplicate.rowCount)
      throw new LearningError("Percobaan tidak cocok. Mulai misi baru.");
  }
}

/** Idempotent receipt of the first compromised-device event, scoped to an account. */
export async function recordSimulationIntrusion(
  userId: string,
  input: { attemptId: string; scenarioId: string },
) {
  if (!(await getSimulation(input.scenarioId)))
    throw new LearningError("Simulasi tidak tersedia.");
  await authDatabase().query(
    "INSERT INTO simulation_intrusion_timers(attempt_id,user_id,scenario_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
    [input.attemptId, userId, input.scenarioId],
  );
  const found = await authDatabase().query(
    "SELECT 1 FROM simulation_intrusion_timers WHERE attempt_id=$1 AND user_id=$2 AND scenario_id=$3",
    [input.attemptId, userId, input.scenarioId],
  );
  if (!found.rowCount)
    throw new LearningError("Percobaan tidak cocok. Mulai misi baru.");
}
