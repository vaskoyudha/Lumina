import type { Progress, Review } from "@/lib/progress";
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;
/** UTC calendar arithmetic makes an account's due date identical on every device. */
export function dueDate(now: Date, box: number): string {
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  date.setUTCDate(date.getUTCDate() + REVIEW_INTERVALS_DAYS[box]);
  return date.toISOString();
}
export function dueReviews(progress: Progress, now: Date): Review[] {
  return (progress.reviews ?? [])
    .filter((r) => Date.parse(r.dueAt) <= now.getTime())
    .sort(
      (a, b) =>
        a.dueAt.localeCompare(b.dueAt) ||
        a.patternId.localeCompare(b.patternId),
    );
}
export function gradeReview(
  progress: Progress,
  patternId: string,
  correct: boolean,
  now: Date,
): Progress {
  const previous = (progress.reviews ?? []).find(
    (r) => r.patternId === patternId,
  );
  const box = correct ? Math.min((previous?.box ?? 0) + 1, 4) : 0;
  const review: Review = {
    patternId,
    box,
    dueAt: dueDate(now, box),
    lastSeenAt: now.toISOString(),
    correct: (previous?.correct ?? 0) + Number(correct),
    wrong: (previous?.wrong ?? 0) + Number(!correct),
  };
  return {
    ...progress,
    version: 2,
    reviews: [
      ...(progress.reviews ?? []).filter((r) => r.patternId !== patternId),
      review,
    ].slice(-100),
    missedPatterns: correct
      ? progress.missedPatterns.filter((id) => id !== patternId)
      : [...new Set([...progress.missedPatterns, patternId])],
    updatedAt: now.toISOString(),
  };
}
export function nextDueLabel(review: Review, now: Date): string {
  const days = Math.ceil((Date.parse(review.dueAt) - now.getTime()) / 86400000);
  return days <= 0 ? "hari ini" : days === 1 ? "besok" : `${days} hari lagi`;
}
