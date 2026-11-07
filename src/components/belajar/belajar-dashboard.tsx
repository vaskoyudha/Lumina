"use client";

import { ArrowRight, Bell, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BelajarLencana } from "@/components/belajar/belajar-lencana";
import { useStoredProgress } from "@/components/belajar/belajar-progress";
import {
  type KatalogItem,
  LevelFilter,
  ModulKatalog,
} from "@/components/belajar/modul-katalog";
import { CoverIcon } from "@/components/belajar/modul-visual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * The catalog's main column: greeting header with a real progress chip, search
 * and badge shortcut; the campaign hero for the one complete module; the
 * filterable course grid; then the earned badges. Content is unchanged from the
 * page — only the reference dashboard's layout is adopted.
 */

export type FeaturedModule = {
  no: number;
  nama: string;
  ciri: string[];
  laporanLabel: string;
  kerugian: string;
  level: number;
};

export function BelajarDashboard({
  items,
  featured,
  complete,
  total,
}: {
  items: KatalogItem[];
  featured: FeaturedModule | null;
  complete: number;
  total: number;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<number | null>(null);
  const progress = useStoredProgress();
  const done = progress?.completedModules.length ?? 0;
  const hasBadge = (progress?.badges.length ?? 0) > 0;

  return (
    <>
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div className="min-w-0">
          <h1 className="font-bold text-[22px] text-txt tracking-tight sm:text-2xl">
            Halo! Siap belajar?
          </h1>
          <p className="mt-0.5 font-medium text-dim text-xs sm:text-[13px]">
            Kenali polanya sebelum uangmu hilang. Urutan katalog mengikuti
            jumlah laporan IASC — {complete} dari {total} modul lengkap ditulis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap xl:gap-3">
          <span
            className="flex shrink-0 items-center gap-2 rounded-xl border border-brand-line bg-brand-soft px-3 py-2 shadow-sm"
            title="Progres belajar di perangkat ini"
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-brand-strong font-black text-[11px] text-bg">
              {progress ? done : "—"}
            </span>
            <span className="tabular font-extrabold text-brand-ink text-xs">
              {progress ? `${done}/${total}` : `—/${total}`}
            </span>
            <span className="rounded-md bg-brand-soft-2 px-1.5 py-0.5 font-semibold text-[10px] text-brand-ink">
              MODUL
            </span>
          </span>

          <div className="relative order-3 w-full min-w-0 xl:order-none xl:w-64 xl:flex-none">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-dim"
            />
            <Input
              type="search"
              aria-label="Cari modul"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari modul atau ciri…"
              className="h-10 w-full rounded-xl border border-line bg-panel pr-8 pl-10 text-xs text-txt shadow-sm placeholder:text-dim focus-visible:border-brand-line focus-visible:ring-brand-glow/40"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Hapus pencarian"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-dim transition-colors hover:text-txt"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            ) : null}
          </div>

          <Link
            href="#lencana"
            aria-label="Lihat lencana"
            title="Lencana"
            className="relative ml-auto flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-panel text-txt shadow-sm transition-colors hover:bg-panel-2 xl:ml-0"
          >
            <Bell aria-hidden className="size-4" />
            {hasBadge ? (
              <span
                aria-hidden
                className="absolute top-2 right-2.5 size-2 rounded-full bg-brand ring-2 ring-panel"
              />
            ) : null}
          </Link>
        </div>
      </header>

      {featured ? (
        <section className="appnext-campaign relative overflow-hidden rounded-[22px] p-6 text-bg shadow-[var(--appnext-shadow-soft)] sm:p-7">
          <svg
            aria-hidden
            role="presentation"
            viewBox="0 0 800 220"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full opacity-45"
          >
            <path
              d="M-40 180 C 140 90, 290 230, 480 140 C 640 65, 720 150, 840 95 L 840 240 L -40 240 Z"
              className="fill-bg/10"
            />
            <path
              d="M-20 205 C 180 120, 340 215, 530 145 C 670 95, 760 165, 850 130"
              fill="none"
              strokeWidth="2.5"
              className="stroke-bg/25"
            />
            <path
              d="M40 220 C 240 135, 390 200, 590 125 C 700 85, 770 120, 850 90"
              fill="none"
              strokeWidth="1.75"
              className="stroke-bg/20"
            />
          </svg>

          <div className="relative z-10 flex items-center justify-between gap-6">
            <div className="max-w-lg">
              <div className="mb-2.5 inline-flex items-center rounded-full border border-bg/20 bg-bg/15 px-2.5 py-1 font-semibold text-[11px] backdrop-blur-sm">
                <span>AKADEMI ANTI-PENIPUAN LUMINA</span>
              </div>
              <h2 className="font-bold text-bg text-xl leading-tight tracking-tight sm:text-[26px]">
                {featured.nama}
              </h2>
              <p className="mt-2 max-w-md text-bg/85 text-xs leading-relaxed sm:text-sm">
                {featured.ciri.join(" · ")}. {featured.laporanLabel} ·{" "}
                {featured.kerugian}.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  className="min-h-10 rounded-xl bg-[var(--appnext-ink-2)] px-5 font-semibold text-bg text-xs shadow-lg hover:bg-[var(--appnext-ink-3)]"
                >
                  <Link href={`/belajar/${featured.no}`} data-pressable>
                    Buka modul lengkap
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="min-h-10 rounded-xl border-bg/25 bg-bg/15 px-4 font-semibold text-bg text-xs backdrop-blur-md hover:bg-bg/25 hover:text-bg"
                >
                  <Link href="#semua-modul" data-pressable>
                    Lihat semua modul
                  </Link>
                </Button>
              </div>
            </div>

            <div className="hidden shrink-0 flex-col items-center gap-2 pr-2 sm:flex">
              <span className="flex size-20 flex-col items-center justify-center rounded-[26px] bg-bg text-brand-ink shadow-lg">
                <CoverIcon no={featured.no} className="size-7" />
                <span className="tabular mt-1 font-black text-xl">
                  {String(featured.no).padStart(2, "0")}
                </span>
              </span>
              <span className="rounded-full border border-bg/20 bg-bg/15 px-2.5 py-0.5 font-semibold text-[10px] text-bg">
                Satu modul lengkap
              </span>
            </div>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="semua-modul" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 id="semua-modul" className="font-bold text-[18px] text-txt">
              Modul belajarmu
            </h3>
            <LevelFilter
              items={items}
              level={level}
              onChange={setLevel}
              className="hidden md:flex"
            />
          </div>
          <p className="tabular font-semibold text-dim text-xs">
            {complete} lengkap · {total - complete} segera
          </p>
        </div>

        <ModulKatalog
          items={items}
          query={query}
          onQueryChange={setQuery}
          level={level}
          onLevelChange={setLevel}
        />
      </section>

      <BelajarLencana />
    </>
  );
}
