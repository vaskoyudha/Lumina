"use client";

import { CheckCircle2 } from "lucide-react";
import { useCompletedModules } from "@/components/belajar/belajar-progress";

/** Check mark shown on a list row once that module is finished on this device. */
export function ModuleDoneMark({ no }: { no: number }) {
  const completed = useCompletedModules();
  if (!completed.has(no)) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 font-medium text-[11px] text-brand-ink">
      <CheckCircle2 aria-hidden className="size-3" />
      Selesai
    </span>
  );
}
