"use client";

import { Award, Lock } from "lucide-react";
import {
  BADGE_LABEL,
  useStoredProgress,
} from "@/components/belajar/belajar-progress";
import { Card } from "@/components/ui/card";
import { MODUS_BY_NO } from "@/lib/modus";
import { BADGE_FOR_MODULE } from "@/lib/progress";
import { cn } from "@/lib/utils";

/**
 * Badge strip for the catalog. A badge exists only when `progress.ts` awards
 * it on a real completion, so an unearned badge says what would earn it
 * instead of pretending to be a locked reward from a game economy.
 *
 * This lives in the article, not the right rail, because the badges are also
 * the rail's third destination — the anchor has to exist at every width.
 */

const ENTRIES = Object.entries(BADGE_FOR_MODULE);

export function BelajarLencana() {
  const progress = useStoredProgress();
  const badges = progress?.badges ?? [];

  return (
    <section
      id="lencana"
      aria-labelledby="lencana-judul"
      className="mt-10 scroll-mt-24"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="lencana-judul">Lencana</h2>
        <p className="appnext-caption">
          Satu lencana untuk tiap modul yang benar-benar selesai.
        </p>
      </div>

      <Card className="mt-4 gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
        <ul className="grid list-none gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3">
          {ENTRIES.map(([no, badgeId]) => {
            const earned = badges.includes(badgeId);
            const modul = MODUS_BY_NO.get(Number(no));

            return (
              <li key={badgeId} className="flex items-center gap-3 p-2.5">
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
                    earned
                      ? "bg-[var(--appnext-accent-deep)] text-bg"
                      : "bg-panel-2 text-dim",
                  )}
                >
                  {earned ? (
                    <Award className="size-4" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-sm text-txt">
                    {BADGE_LABEL[badgeId] ?? badgeId}
                  </span>
                  <span className="appnext-caption block">
                    {!progress
                      ? "Memuat progres di perangkat ini…"
                      : earned
                        ? "Sudah kamu dapatkan."
                        : `Selesaikan modul ${no}${modul ? ` — ${modul.nama}` : ""}.`}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
