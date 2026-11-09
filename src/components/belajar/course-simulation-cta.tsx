"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useStoredProgress } from "@/components/belajar/belajar-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The B → C handoff from `docs/plan.md`: every course opens its matching
 * simulation directly. Modules with a full mission use it; the rest fall back
 * to the short practice drill built from the course itself. The button is
 * visible before completion so the path is discoverable; the copy changes once
 * the module is finished.
 */
export function CourseSimulationCta({
  moduleNo,
  scenarioId,
}: {
  moduleNo: number;
  scenarioId: string | null;
}) {
  const progress = useStoredProgress();
  const done = progress?.completedModules.includes(moduleNo) ?? false;

  const href = scenarioId
    ? `/simulasi/${scenarioId}`
    : `/simulasi/pola-${moduleNo}`;
  const practice = !scenarioId;

  return (
    <Card
      id="simulasi"
      aria-label="Lanjut ke simulasi"
      className="scroll-mt-24 gap-0 rounded-card border border-brand-line bg-brand-soft/40 py-0 shadow-[var(--appnext-shadow-ambient)]"
    >
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-bg"
          >
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-txt">
              {done ? "Modul selesai" : "Latihan pola"}
            </p>
            <p className="appnext-caption">
              {done
                ? practice
                  ? "Uji pola ini lewat latihan keputusan singkat dari modul yang baru kamu selesaikan."
                  : "Uji pola ini di simulasi yang cocok dengan modul ini."
                : practice
                  ? "Buka latihan keputusan singkat dari modul ini kapan saja."
                  : "Buka simulasi yang cocok dengan modul ini kapan saja."}
            </p>
          </div>
        </div>

        <Button
          asChild
          className="min-h-11 w-fit rounded-full border border-ink-line bg-[var(--appnext-ink-2)] px-5 text-bg hover:bg-brand-strong"
        >
          <Link href={href} data-pressable>
            {done
              ? practice
                ? "Lanjut ke latihan pola"
                : "Lanjut ke simulasi"
              : practice
                ? "Buka latihan pola"
                : "Buka simulasi"}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
