"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { BADGE_FOR_MODULE, loadProgress, type Progress } from "@/lib/progress";

/** Module numbers finished on this device — read by the list page rows. */
export function useCompletedModules(): Set<number> {
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => {
    setProgress(loadProgress());
  }, []);
  return new Set(progress?.completedModules ?? []);
}

/**
 * Client island for the list header. Renders nothing until mounted so the
 * static list never flashes a "0 selesai" claim before local data exists
 * (and never mismatches the server HTML).
 */
export function BelajarProgress() {
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  if (!progress || progress.completedModules.length === 0) return null;

  const badgeNames = progress.badges
    .map((b) => Object.entries(BADGE_FOR_MODULE).find(([, v]) => v === b)?.[0])
    .filter(Boolean);

  return (
    <output className="tabular mt-4 flex flex-wrap items-center gap-2 text-dim text-sm">
      <CheckCircle2 aria-hidden className="size-4 text-safe" />
      <span>
        {progress.completedModules.length} dari 12 modul selesai di perangkat
        ini
        {badgeNames.length > 0 ? " · Penjaga APK" : ""}
      </span>
    </output>
  );
}
