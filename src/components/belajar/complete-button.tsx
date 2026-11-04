"use client";

import { CheckCircle2, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BADGE_FOR_MODULE,
  completeModule,
  loadProgress,
  type Progress,
  saveProgress,
} from "@/lib/progress";

/**
 * Client island for module completion. Rendered only after the quiz reports
 * a pass (≥60%) — the badge is earned, never shown ahead of the work.
 */
export function CompleteButton({ moduleNo }: { moduleNo: number }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const done = progress?.completedModules.includes(moduleNo) ?? false;
  const badge = progress?.badges.includes(BADGE_FOR_MODULE[moduleNo] ?? "")
    ? BADGE_FOR_MODULE[moduleNo]
    : null;

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  function finish() {
    const next = completeModule(loadProgress(), moduleNo);
    saveProgress(next);
    setProgress(next);
  }

  return (
    <section aria-label="Selesaikan modul" className="flex flex-col gap-3">
      {done ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-safe">
            <CheckCircle2 aria-hidden className="size-3.5" />
            Modul selesai
          </Badge>
          {badge ? (
            <Badge variant="outline" className="text-warn">
              <GraduationCap aria-hidden className="size-3.5" />
              Penjaga APK
            </Badge>
          ) : null}
        </div>
      ) : (
        <Button type="button" className="min-h-11 w-fit" onClick={finish}>
          Tandai modul selesai
        </Button>
      )}
    </section>
  );
}
