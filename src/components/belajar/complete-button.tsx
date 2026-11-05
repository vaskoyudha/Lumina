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
      className="gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]"
    >
      <CardContent className="flex flex-col gap-3 py-4">
        {done ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="text-[color:var(--appnext-accent-deep)]"
            >
              <CheckCircle2 aria-hidden />
              Modul selesai
            </Badge>
            {earned && badgeId ? (
              <Badge
                variant="outline"
                className="text-[color:var(--appnext-warn-deep)]"
              >
                <GraduationCap aria-hidden />
                {BADGE_LABEL[badgeId] ?? badgeId}
              </Badge>
            ) : null}
          </div>
        ) : (
          <Button
            type="button"
            className="w-fit rounded-full bg-[var(--appnext-accent-deep)] text-white hover:bg-[var(--appnext-ink-2)]"
            onClick={finish}
          >
            Tandai modul selesai
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
