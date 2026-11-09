"use client";

import { CheckCircle2, GraduationCap } from "lucide-react";
import {
  BADGE_LABEL,
  useStoredProgress,
} from "@/components/belajar/belajar-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BADGE_FOR_MODULE,
  completeModule,
  loadProgress,
  saveProgress,
} from "@/lib/progress";

/**
 * Client island for module completion. Rendered only after the quiz reports
 * a pass (≥60%) — the badge is earned, never shown ahead of the work.
 * `saveProgress` fires PROGRESS_EVENT, so the hook re-reads without local state.
 */
export function CompleteButton({ moduleNo }: { moduleNo: number }) {
  const progress = useStoredProgress();
  const badgeId = BADGE_FOR_MODULE[moduleNo];
  const done = progress?.completedModules.includes(moduleNo) ?? false;
  const earned = badgeId && progress?.badges.includes(badgeId);

  function finish() {
    saveProgress(completeModule(loadProgress(), moduleNo));
  }

  return (
    <Card
      aria-label="Selesaikan modul"
      className="gap-0 rounded-card border border-line py-0 shadow-[var(--appnext-shadow-ambient)]"
    >
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink"
          >
            <GraduationCap className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-txt">
              {done ? "Modul selesai" : "Tandai modul selesai"}
            </p>
            <p className="appnext-caption">
              {done
                ? "Progres dan lencanamu tersimpan di perangkat ini."
                : "Kuis lulus. Tandai modul untuk menyimpan progres dan membuka lencana."}
            </p>
          </div>
        </div>

        {done ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-brand-soft text-brand-ink">
              <CheckCircle2 aria-hidden />
              Modul selesai
            </Badge>
            {earned && badgeId ? (
              <Badge variant="secondary" className="bg-panel-2 text-brand-ink">
                <GraduationCap aria-hidden />
                {BADGE_LABEL[badgeId] ?? badgeId}
              </Badge>
            ) : null}
          </div>
        ) : (
          <Button
            type="button"
            className="min-h-11 w-fit rounded-full border border-ink-line bg-[var(--appnext-ink-2)] px-5 text-bg hover:bg-brand-strong"
            onClick={finish}
          >
            Tandai modul selesai
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
