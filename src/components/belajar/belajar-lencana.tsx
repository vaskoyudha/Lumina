"use client";

import { Award, Lock } from "lucide-react";
import Link from "next/link";
import {
  BADGE_LABEL,
  useAccountProgress,
  useStoredProgress,
} from "@/components/belajar/belajar-progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { BADGE_FOR_MODULE } from "@/lib/progress";
import { cn } from "@/lib/utils";

/**
 * Badge strip for the catalog, shaped like the reference dashboard's
 * "Best Instructors" pair. A badge exists only when `progress.ts` awards it on
 * a real completion, so an unearned badge says what would earn it instead of
 * pretending to be a locked reward from a game economy.
 *
 * This lives in the article, not the right rail, because the badges are also
 * the rail's third destination — the anchor has to exist at every width.
 */

const ENTRIES = Object.entries(BADGE_FOR_MODULE);

export function BelajarLencana() {
  const progress = useStoredProgress();
  const MODUS_BY_NO = new Map(
    useAccountProgress().modules.map((m) => [m.no, m]),
  );
  const badges = progress?.badges ?? [];

  return (
    <section
      id="lencana"
      aria-labelledby="lencana-judul"
      className="mt-auto scroll-mt-24 pt-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="lencana-judul" className="font-bold text-[18px] text-txt">
          Lencana
        </h3>
        <p className="font-semibold text-[11px] text-dim">
          Satu lencana untuk tiap modul yang benar-benar selesai.
        </p>
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ENTRIES.map(([no, badgeId]) => {
          const earned = badges.includes(badgeId);
          const modul = MODUS_BY_NO.get(Number(no));

          return (
            <Card
              key={badgeId}
              className={cn(
                "gap-0 rounded-card border border-line bg-panel p-3.5 py-3.5 ring-0 shadow-[var(--appnext-shadow-ambient)] transition-all hover:border-brand-line hover:shadow-md",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3.5">
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex size-11 shrink-0 items-center justify-center rounded-full",
                      earned
                        ? "bg-brand-soft text-brand-ink ring-1 ring-brand-line"
                        : "bg-panel-2 text-dim",
                    )}
                  >
                    {earned ? (
                      <Award className="size-5" />
                    ) : (
                      <Lock className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-txt">
                      {BADGE_LABEL[badgeId] ?? badgeId}
                    </h4>
                    <p className="mt-0.5 font-medium text-[11px] text-dim">
                      {!progress
                        ? "Memuat progres di akunmu…"
                        : earned
                          ? "Sudah kamu dapatkan di akunmu."
                          : `Selesaikan modul ${no}${
                              modul ? ` — ${modul.nama}` : ""
                            } untuk membukanya.`}
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  className={cn(
                    "rounded-xl font-semibold text-xs",
                    earned
                      ? "border border-ink-line bg-[var(--appnext-ink-2)] text-bg hover:bg-[var(--appnext-ink-3)]"
                      : "bg-panel-2 text-txt hover:bg-line",
                  )}
                >
                  <Link href={`/belajar/${no}`} data-pressable>
                    Modul {no}
                  </Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
