"use client";

import { CheckCircle2, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  BADGE_LABEL,
  useAccountProgress,
  useStoredProgress,
} from "@/components/belajar/belajar-progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { submitQuiz } from "@/lib/learning/actions";
import { BADGE_FOR_MODULE } from "@/lib/progress";

/** Server grades the submitted answers before awarding account completion. */
export function CompleteButton({
  moduleNo,
  answers,
  attemptId,
}: {
  moduleNo: number;
  answers: Record<string, string>;
  attemptId?: string;
}) {
  const { update, authenticated } = useAccountProgress();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = useStoredProgress();
  const badgeId = BADGE_FOR_MODULE[moduleNo];
  const done = progress?.completedModules.includes(moduleNo) ?? false;
  const earned = badgeId && progress?.badges.includes(badgeId);

  async function finish() {
    setPending(true);
    setError(null);
    try {
      const result = await submitQuiz({
        moduleNo,
        answers,
        complete: true,
        ...(attemptId ? { attemptId } : {}),
      });
      if (result.ok) update(result.progress);
      else setError(result.error);
    } catch {
      setError("Progres belum tersimpan. Coba lagi.");
    } finally {
      setPending(false);
    }
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
                ? "Progres dan lencanamu tersimpan di akunmu."
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
        ) : !authenticated ? (
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/masuk">Masuk untuk menyimpan progres</Link>
          </Button>
        ) : (
          <Button
            type="button"
            className="min-h-11 w-fit rounded-full border border-ink-line bg-[var(--appnext-ink-2)] px-5 text-bg hover:bg-brand-strong"
            onClick={() => void finish()}
            disabled={pending}
          >
            {pending ? "Menyimpan…" : "Tandai modul selesai"}
          </Button>
        )}
      </CardContent>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </Card>
  );
}
