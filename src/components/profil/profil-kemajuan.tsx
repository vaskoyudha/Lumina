"use client";

import { BookOpen, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ProgressRing,
  useStoredProgress,
} from "@/components/belajar/belajar-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { LearningSummary } from "@/lib/content/schema";
import { dueReviews } from "@/lib/learning/review";

import { BADGE_LABEL } from "@/lib/progress";

export function ProfilKemajuan({ modules }: { modules: LearningSummary[] }) {
  const MODUS_BY_NO = new Map(modules.map((m) => [m.no, m]));
  const progress = useStoredProgress();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  if (!progress) {
    return (
      <div className="flex flex-col gap-4" aria-hidden>
        <div className="flex items-center gap-3">
          <Skeleton className="size-[52px] rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    );
  }

  const done = progress.completedModules.length;
  const total = modules.length;
  const pct = Math.min(100, Math.round((done / total) * 100));
  const completed = [...progress.completedModules].sort((a, b) => a - b);
  const badges = Object.entries(BADGE_LABEL).filter(([id]) =>
    progress.badges.includes(id),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <ProgressRing pct={pct} />
        <div className="min-w-0">
          <p className="tabular font-medium text-txt">
            {done} dari {total} modul selesai
          </p>
          <p className="text-dim text-sm">
            Progres tersimpan di akun dan dapat dibuka dari perangkat lain.
          </p>
        </div>
      </div>

      <Progress
        value={pct}
        aria-label="Progres belajar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-2.5 bg-panel-2 [&>[data-slot=progress-indicator]]:bg-brand"
      />

      {badges.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-dim text-sm">Lencana:</span>
          {badges.map(([id, label]) => (
            <Badge key={id} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>
      ) : null}

      {progress.missedPatterns.length > 0 ? (
        <p className="text-dim text-sm">
          <span className="tabular font-medium text-txt">
            {progress.missedPatterns.length}
          </span>{" "}
          pola perlu ditinjau.{" "}
          <Link
            className="appnext-link inline-flex min-h-11 items-center"
            href="/belajar/latihan"
          >
            Latih kembali
          </Link>
        </p>
      ) : null}

      <p className="text-sm text-dim">
        <Link
          className="appnext-link inline-flex min-h-11 items-center"
          href="/belajar/latihan"
        >
          {now ? dueReviews(progress, now).length : "—"} ulangan jatuh tempo
        </Link>
        {now &&
        !progress.missedPatterns.length &&
        !dueReviews(progress, now).length
          ? " · Tidak ada yang tertunda."
          : ""}
      </p>

      {done > 0 ? (
        <ul className="flex flex-col">
          {completed.map((no) => {
            const modus = MODUS_BY_NO.get(no);
            return (
              <li key={no}>
                <Link
                  href={`/belajar/${no}`}
                  data-pressable
                  className="-mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-panel-2"
                >
                  <CheckCircle2
                    aria-hidden
                    className="size-4 shrink-0 text-brand"
                  />
                  <span className="tabular shrink-0 text-dim text-sm">
                    {String(no).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-txt">
                    {modus?.nama ?? `Modul ${no}`}
                  </span>
                  <span className="shrink-0 text-dim text-xs">
                    {modus?.ready ? "Lengkap" : "Segera"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty className="border border-line">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Belum ada modul selesai</EmptyTitle>
            <EmptyDescription>
              Selesaikan satu modul, lalu kemajuannya muncul di sini.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline" className="h-11">
              <Link href="/belajar" data-pressable>
                Mulai belajar
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
