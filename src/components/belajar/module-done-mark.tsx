"use client";

import { CheckCircle2 } from "lucide-react";
import { useCompletedModules } from "@/components/belajar/belajar-progress";

/** Check mark shown on a list row once that module is finished on this device. */
export function ModuleDoneMark({ no }: { no: number }) {
  const completed = useCompletedModules();
  if (!completed.has(no)) return null;
  return (
    <span className="inline-flex items-center gap-1 font-medium text-[color:var(--appnext-accent-deep)]">
      <CheckCircle2 aria-hidden className="size-3.5" />
      Selesai
    </span>
  );
}
