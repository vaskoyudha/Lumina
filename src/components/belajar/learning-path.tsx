"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccountProgress } from "@/components/belajar/belajar-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { nextStep } from "@/lib/learning/path";
export function LearningPath({ playable = [] }: { playable?: string[] }) {
  const { progress, modules } = useAccountProgress();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  if (!progress || !now)
    return (
      <Skeleton
        className="h-32 w-full rounded-card"
        aria-label="Memuat langkah belajar"
      />
    );
  const step = nextStep(progress, now, modules, playable);
  return (
    <Card data-testid="learning-step" className="gap-0 py-0">
      <CardContent className="flex flex-col gap-3 py-5">
        <p className="text-sm text-dim">Langkah berikutnya</p>
        <h2 className="text-xl font-medium">{step.title}</h2>
        <p>{step.reason}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="min-h-11">
            <Link href={step.href}>
              {step.kind === "review" || step.kind === "practice"
                ? "Mulai latihan"
                : "Buka materi"}
            </Link>
          </Button>
          {step.scenarioId && (
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`/simulasi/${step.scenarioId}`}>
                Praktikkan skenario ini
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
