"use client";

import { ArrowRight, Bell, Play, Search, Sparkles, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BelajarLencana } from "@/components/belajar/belajar-lencana";
import { useStoredProgress } from "@/components/belajar/belajar-progress";
import {
  type KatalogItem,
  LevelFilter,
  ModulKatalog,
} from "@/components/belajar/modul-katalog";
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
      <header className="-mx-4 flex flex-wrap items-center gap-2.5 border-field border-b px-4 pb-3.5 shadow-sm sm:-mx-5 sm:px-5 lg:-ml-4 lg:mr-0 lg:pl-4 lg:pr-0">
        <div className="relative min-w-0 flex-1 basis-64">
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
            className="h-11 w-full rounded-full border border-line bg-panel pr-10 pl-11 text-xs text-txt shadow-sm placeholder:text-dim focus-visible:border-brand-line focus-visible:ring-brand-glow/40"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Hapus pencarian"
              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-dim transition-colors hover:text-txt"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          ) : null}
        </div>

        <span
          className="flex shrink-0 items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-2 shadow-sm"
          title="Progres belajar di perangkat ini"
        >
          <span className="flex size-5 items-center justify-center rounded-full bg-brand-strong font-black text-[11px] text-bg">
            {progress ? done : "—"}
          </span>
          <span className="tabular font-extrabold text-brand-ink text-xs">
            {progress ? `${done}/${total}` : `—/${total}`}
          </span>
          <span className="rounded-full bg-brand-soft-2 px-1.5 py-0.5 font-semibold text-[10px] text-brand-ink">
            MODUL
          </span>
        </span>

        <Link
          href="#lencana"
          aria-label="Lihat lencana"
          title="Lencana"
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-txt shadow-sm transition-colors hover:bg-panel-2"
        >
          <Bell aria-hidden className="size-4" />
          {hasBadge ? (
            <span
              aria-hidden
              className="absolute top-2.5 right-2.5 size-2 rounded-full bg-brand ring-2 ring-panel"
            />
          ) : null}
        </Link>
      </header>

      <section className="relative isolate overflow-hidden rounded-card text-bg shadow-[var(--appnext-shadow-soft)]">
        <Image
          src="/images/belajar/hero-akademi.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 62vw, 100vw"
          className="object-cover object-[68%_center]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-brand-strong/95 via-brand-strong/55 to-transparent"
        />

        <div className="relative z-10 flex flex-col gap-5 px-6 py-5 sm:px-7">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-bg/25 bg-bg/15 px-3 py-1 font-semibold text-[10px] text-bg uppercase tracking-[0.14em] backdrop-blur-sm">
              <Sparkles aria-hidden className="size-3.5" />
              Akademi Anti-Penipuan Lumina
            </span>
            <h1 className="mt-4 font-bold text-[32px] text-bg leading-[1.03] tracking-tight sm:text-[44px]">
              Halo! Siap belajar?
            </h1>
            <p className="mt-2 max-w-md text-bg/90 text-sm leading-relaxed">
              {featured ? (
                <>
                  Kenali polanya sebelum uangmu hilang. Modul unggulan:{" "}
                  <strong className="font-semibold text-bg">
                    {featured.nama}
                  </strong>{" "}
                  — {featured.laporanLabel} · {featured.kerugian}.
                </>
              ) : (
                "Kenali polanya sebelum uangmu hilang."
              )}
            </p>

            {featured ? (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  className="h-12 rounded-full border-0 bg-bg px-6 font-semibold text-brand-strong text-xs shadow-lg hover:bg-bg/90"
                >
                  <Link href={`/belajar/${featured.no}`} data-pressable>
                    <Play aria-hidden className="size-4 fill-current" />
                    Buka modul lengkap
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="h-12 rounded-full border border-bg/40 bg-bg/10 px-5 font-semibold text-bg text-xs backdrop-blur-sm hover:bg-bg/20 hover:text-bg"
                >
                  <Link href="#semua-modul" data-pressable>
                    Lihat semua modul
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="semua-modul" className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              id="semua-modul"
              className="flex items-center gap-2.5 font-bold text-[18px] text-txt"
            >
              <span aria-hidden className="h-5 w-1.5 rounded-full bg-brand" />
              Modul belajarmu
            </h2>
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
