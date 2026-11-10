import type { ModuleContent, QuizQuestion } from "@/data/modul-schema";
import { PATTERNS, type PatternId } from "@/data/patterns";
import { patternForQuestion } from "@/lib/learning/pattern-map";
import { dueReviews } from "@/lib/learning/review";
import type { Progress } from "@/lib/progress";
export type PracticeQuestion = QuizQuestion & {
  moduleNo: number;
  patternId: PatternId;
};
export function selectPractice(
  progress: Progress,
  modules: ModuleContent[],
  now: Date,
  patternId?: string,
): PracticeQuestion[] {
  const questions = modules
    .flatMap((m) =>
      m.kuis.map((q) => ({
        ...q,
        moduleNo: m.no,
        patternId: patternForQuestion(q.id),
      })),
    )
    .filter((q): q is PracticeQuestion => q.patternId !== null);
  const completed = new Set(progress.completedModules);
  const patterns = patternId
    ? [patternId]
    : [
        ...new Set([
          ...dueReviews(progress, now).map((r) => r.patternId),
          ...progress.missedPatterns,
          ...PATTERNS.filter((p) => completed.has(p.moduleNo)).map((p) => p.id),
        ]),
      ];
  // Round-robin across modules prevents a five-question single-module block.
  const picked: PracticeQuestion[] = [];
  const priority = new Set(
    patternId
      ? [patternId]
      : [
          ...dueReviews(progress, now).map((r) => r.patternId),
          ...progress.missedPatterns,
        ],
  );
  const pending = patterns
    .map((id) => questions.find((q) => q.patternId === id))
    .filter((q): q is PracticeQuestion => !!q);
  while (
    pending.length &&
    priority.has(pending[0].patternId) &&
    picked.length < 5
  )
    picked.push(...pending.splice(0, 1));
  while (pending.length && picked.length < 5) {
    const index = pending.findIndex(
      (q) => q.moduleNo !== picked.at(-1)?.moduleNo,
    );
    picked.push(...pending.splice(index < 0 ? 0 : index, 1));
  }
  return picked;
}
