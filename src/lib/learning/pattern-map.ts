import { PATTERN_BY_ID, PATTERNS, type PatternId } from "@/data/patterns";

const byQuestion = new Map<string, PatternId>(
  PATTERNS.flatMap((p) => p.questions.map((q) => [q, p.id] as const)),
);
export function patternForQuestion(questionId: string): PatternId | null {
  return byQuestion.get(questionId) ?? null;
}
export function questionsForPattern(patternId: string): string[] {
  return [...(PATTERN_BY_ID.get(patternId)?.questions ?? [])];
}
export function migrateMisses(ids: string[]): PatternId[] {
  return [
    ...new Set(
      ids
        .map((id) =>
          PATTERN_BY_ID.has(id) ? (id as PatternId) : patternForQuestion(id),
        )
        .filter((id): id is PatternId => id !== null),
    ),
  ];
}
