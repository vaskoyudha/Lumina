import { PATTERN_BY_ID } from "@/data/patterns";
import type { LearningSummary } from "@/lib/content/schema";
import { dueReviews } from "@/lib/learning/review";
import type { Progress } from "@/lib/progress";
export interface LearningStep {
  kind: "review" | "remediation" | "module" | "practice" | "done";
  moduleNo: number | null;
  patternIds: string[];
  title: string;
  reason: string;
  href: string;
  minutes: number | null;
  scenarioId?: string;
}
export function nextStep(
  progress: Progress,
  now: Date,
  modules: LearningSummary[],
  playable: readonly string[] = [],
): LearningStep {
  const ready = modules.filter((m) => m.ready);
  const base = { moduleNo: null, patternIds: [], minutes: null };
  const due = dueReviews(progress, now).find((r) =>
    ready.some((m) => m.no === PATTERN_BY_ID.get(r.patternId)?.moduleNo),
  );
  if (due)
    return {
      ...base,
      kind: "review",
      moduleNo: PATTERN_BY_ID.get(due.patternId)?.moduleNo ?? null,
      patternIds: [due.patternId],
      title: "Ulangi pola ini",
      reason: "Sudah waktunya diulang.",
      href: `/belajar/latihan?pola=${encodeURIComponent(due.patternId)}`,
    };
  const missed = progress.missedPatterns
    .map((id) => PATTERN_BY_ID.get(id))
    .find(
      (p) =>
        p &&
        ready.some((m) => m.no === p.moduleNo) &&
        progress.completedModules.includes(p.moduleNo) &&
        !(progress.reviews ?? []).some((r) => r.patternId === p.id),
    );
  if (missed)
    return {
      ...base,
      kind: "remediation",
      moduleNo: missed.moduleNo,
      patternIds: [missed.id],
      title: missed.label,
      reason: "Pola ini kamu lewatkan di kuis.",
      href: `/belajar/${missed.moduleNo}#tinjau`,
    };
  const module = [...ready]
    .sort((a, b) => a.level - b.level || a.no - b.no)
    .find((m) => !progress.completedModules.includes(m.no));
  if (module)
    return {
      ...base,
      kind: "module",
      moduleNo: module.no,
      title: module.nama,
      reason: "Langkah berikutnya di jalur ini.",
      href: `/belajar/${module.no}`,
      ...(module.scenarioId && playable.includes(module.scenarioId)
        ? { scenarioId: module.scenarioId }
        : {}),
    };
  return ready.length
    ? {
        ...base,
        kind: "practice",
        title: "Latihan campuran",
        reason: "Jaga ingatan dengan lima soal campur.",
        href: "/belajar/latihan",
      }
    : {
        ...base,
        kind: "done",
        title: "Belum ada modul yang bisa dipelajari",
        reason: "Materi yang tersedia akan muncul di sini.",
        href: "/belajar",
      };
}
