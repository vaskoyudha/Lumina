import type { ModuleContent } from "@/data/modul-schema";
/** Select fields explicitly: neither quiz answers nor account progress can enter. */
export function tutorContext(
  module: ModuleContent,
  title: string,
  signs: readonly string[],
) {
  return {
    moduleNo: module.no,
    title,
    ringkasan: module.ringkasan ?? "",
    tujuan: module.tujuan ?? [],
    poinKunci: module.poinKunci ?? [],
    anatomi: module.anatomi,
    checklist: module.checklist,
    lapor: module.lapor,
    ciri: [...signs],
  };
}
export function tutorFallback(module: ModuleContent): string {
  return [
    module.ringkasan ?? module.anatomi[0]?.teks ?? "Materi belum tersedia.",
    module.poinKunci?.[0] ?? module.checklist[0],
  ]
    .filter(Boolean)
    .join(" ");
}
