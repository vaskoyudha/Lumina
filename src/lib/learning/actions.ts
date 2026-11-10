"use server";

import { consumeAttempt } from "@/lib/auth/accounts";
import { getSession } from "@/lib/auth/server-session";
import { savePractice } from "@/lib/learning/review-store";
import {
  LearningError,
  readAccountProgress,
  readSimulationResults,
  recordSimulationIntrusion,
  saveQuiz,
  saveSimulation,
} from "@/lib/learning/store";
import {
  QuizSubmissionSchema,
  ReviewSubmissionSchema,
  SimulationSubmissionSchema,
  SimulationTimerSchema,
} from "@/lib/learning/validation";

function failure(error: unknown) {
  return {
    ok: false as const,
    error:
      error instanceof LearningError
        ? error.message
        : "Progres belum tersimpan. Coba lagi sebentar.",
  };
}

export async function startSimulationIntrusion(input: unknown) {
  try {
    const session = await getSession();
    if (!session)
      return {
        ok: false as const,
        error: "Masuk untuk menyimpan hasil simulasi di akun.",
      };
    const parsed = SimulationTimerSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false as const, error: "Percobaan tidak valid." };
    await consumeAttempt(`simulation:timer:${session.id}`, 30, 60000);
    await recordSimulationIntrusion(session.id, parsed.data);
    return { ok: true as const };
  } catch (error) {
    return failure(error);
  }
}
export async function getAccountProgress() {
  try {
    const session = await getSession();
    if (!session)
      return {
        ok: false as const,
        error: "Masuk untuk menyimpan progres di akun.",
        unauthorized: true,
      };
    const [progress, simulations] = await Promise.all([
      readAccountProgress(session.id),
      readSimulationResults(session.id),
    ]);
    return { ok: true as const, progress, simulations };
  } catch (error) {
    return failure(error);
  }
}
export async function submitQuiz(input: unknown) {
  try {
    const session = await getSession();
    if (!session)
      return {
        ok: false as const,
        error: "Masuk untuk menyimpan progres di akun.",
        unauthorized: true,
      };
    const parsed = QuizSubmissionSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false as const, error: "Jawaban kuis tidak valid." };
    const { moduleNo, answers, complete, attemptId } = parsed.data;
    return {
      ok: true as const,
      progress: await (attemptId
        ? saveQuiz(session.id, moduleNo, answers, complete, attemptId)
        : saveQuiz(session.id, moduleNo, answers, complete)),
    };
  } catch (error) {
    return failure(error);
  }
}
export async function submitReview(input: unknown) {
  try {
    const session = await getSession();
    if (!session)
      return {
        ok: false as const,
        error: "Masuk untuk menyimpan latihan di akun.",
        unauthorized: true,
      };
    const parsed = ReviewSubmissionSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false as const, error: "Jawaban latihan tidak valid." };
    await consumeAttempt(`learning:review:${session.id}`, 60, 60000);
    const feedback = await savePractice(session.id, parsed.data);
    return {
      ok: true as const,
      ...feedback,
      progress: await readAccountProgress(session.id),
    };
  } catch {
    return { ok: false as const, error: "Latihan belum tersimpan. Coba lagi." };
  }
}
export async function submitSimulation(input: unknown) {
  try {
    const session = await getSession();
    if (!session)
      return {
        ok: false as const,
        error: "Masuk untuk menyimpan hasil simulasi di akun.",
        unauthorized: true,
      };
    const parsed = SimulationSubmissionSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false as const, error: "Hasil simulasi tidak valid." };
    await saveSimulation(session.id, parsed.data);
    return { ok: true as const };
  } catch (error) {
    return failure(error);
  }
}
