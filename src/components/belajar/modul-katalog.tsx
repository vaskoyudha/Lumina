"use client";

import {
  ArrowRight,
  Bookmark,
  FileText,
  Layers,
  RotateCcw,
  Search,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { useStoredProgress } from "@/components/belajar/belajar-progress";
import { CoverIcon, coverArtFor } from "@/components/belajar/modul-visual";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Progress as StoredProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

/**
 * Catalog body. The server hands over a flat, serialisable view of `modus.json`
 * so this island never imports module content into the client bundle. Search
 * and the level filter are the only state; both are presentational — nothing
 * is stored, and an empty result is a state you can back out of.
 *
 * The card shape follows the supplied dashboard: painted cover with overlaid
 * art, difficulty signal, a three-metric row, a completion bar and a footer.
 * The metrics are the real IASC count, the real loss estimate and the number
 * of warning signs — never a progress percentage this app cannot measure. The
 * only bar shown is per-device completion, which `progress.ts` does record.
 */

export type KatalogItem = {
  no: number;
  nama: string;
  ciri: string[];
  laporanLabel: string;
  kerugian: string;
  level: number;
  ready: boolean;
};

export function ModulKatalog({
  items,
  query: controlledQuery,
  onQueryChange,
  level: controlledLevel,
  onLevelChange,
}: {
  items: KatalogItem[];
  query?: string;
  onQueryChange?: (value: string) => void;
  level?: number | null;
  onLevelChange?: (value: number | null) => void;
}) {
  const searchId = useId();
  const [internalQuery, setInternalQuery] = useState("");
  const [internalLevel, setInternalLevel] = useState<number | null>(null);
  const progress = useStoredProgress();

  const query = controlledQuery ?? internalQuery;
  const level = controlledLevel !== undefined ? controlledLevel : internalLevel;
  const setQuery = onQueryChange ?? setInternalQuery;
  const setLevel = onLevelChange ?? setInternalLevel;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((m) => {
      if (level !== null && m.level !== level) return false;
      if (!q) return true;
      return (
        m.nama.toLowerCase().includes(q) ||
        m.ciri.some((ciri) => ciri.toLowerCase().includes(q))
      );
    });
  }, [items, level, query]);

  const filtering = query.trim() !== "" || level !== null;

  function resetFilters() {
    setQuery("");
    setLevel(null);
  }

  return (
    <div>
      {controlledQuery === undefined || controlledLevel === undefined ? (
        <div className="mt-1 flex flex-col gap-3 rounded-[18px] bg-panel-2 p-2 sm:flex-row sm:items-center sm:justify-between">
          {controlledQuery === undefined ? (
            <label
              htmlFor={searchId}
              className="relative block w-full sm:max-w-xs"
            >
              <span className="sr-only">Cari modul</span>
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-dim"
              />
              <Input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari modus, misalnya “APK”"
                className="h-11 rounded-full border-0 bg-panel pl-10 text-sm shadow-sm"
              />
            </label>
          ) : null}

          {controlledLevel === undefined ? (
            <LevelFilter items={items} level={level} onChange={setLevel} />
          ) : null}
        </div>
      ) : null}

      <p
        aria-live="polite"
        className="appnext-caption tabular mt-4 text-[11px]"
      >
        {visible.length} dari {items.length} modul ditampilkan
      </p>

      {visible.length > 0 ? (
        <ul className="mt-4 grid list-none gap-5 p-0 md:grid-cols-2 xl:grid-cols-3 min-[1750px]:grid-cols-4">
          {visible.map((m) => (
            <li key={m.no} className="min-w-0">
              <ModuleCard m={m} progress={progress} />
            </li>
          ))}
        </ul>
      ) : (
        <Card className="mt-4 gap-0 rounded-card border border-line py-0 ring-0 shadow-[var(--appnext-shadow-ambient)]">
          <div className="flex flex-col items-start gap-3 p-6">
            <p className="font-medium text-txt">
              Tidak ada modul yang cocok dengan saringan ini.
            </p>
            <p className="appnext-caption">
              Coba kata kunci lain, atau kembali ke daftar lengkap. Katalognya
              tetap dua belas modus — tidak ada yang disembunyikan.
            </p>
            <Button
              type="button"
              data-pressable
              onClick={resetFilters}
              className="min-h-11 rounded-full border border-ink-line bg-[var(--appnext-ink-2)] px-4 text-bg hover:bg-[var(--appnext-ink-3)]"
            >
              <RotateCcw aria-hidden className="size-4" />
              Atur ulang saringan
            </Button>
          </div>
        </Card>
      )}

      {filtering && visible.length > 0 ? (
        <p className="mt-4">
          <Button
            type="button"
            variant="ghost"
            data-pressable
            onClick={resetFilters}
            className="min-h-11 gap-2 px-0 text-dim text-sm hover:bg-transparent hover:text-txt"
          >
            <RotateCcw aria-hidden className="size-4" />
            Atur ulang saringan
          </Button>
        </p>
      ) : null}
    </div>
  );
}

export function LevelFilter({
  items,
  level,
  onChange,
  className,
}: {
  items: KatalogItem[];
  level: number | null;
  onChange: (value: number | null) => void;
  className?: string;
}) {
  const levels = useMemo(
    () => [...new Set(items.map((m) => m.level))].sort((a, b) => a - b),
    [items],
  );

  return (
    <fieldset
      aria-label="Saring menurut level"
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-full bg-panel-2 p-1",
        className,
      )}
    >
      <legend className="sr-only">Saring menurut level</legend>
      <FilterPill active={level === null} onClick={() => onChange(null)}>
        Semua
      </FilterPill>
      {levels.map((value) => (
        <FilterPill
          key={value}
          active={level === value}
          onClick={() => onChange(value)}
        >
          Level {value}
        </FilterPill>
      ))}
    </fieldset>
  );
}

function ModuleCard({
  m,
  progress,
}: {
  m: KatalogItem;
  progress: StoredProgress | null;
}) {
  const done = progress?.completedModules.includes(m.no) ?? false;
  const loading = progress === null;
  const pct = done ? 100 : 0;
  const art = coverArtFor(m.no);

  return (
    <Card className="group/card flex h-full gap-0 overflow-hidden rounded-card border-0 bg-panel py-0 ring-0 shadow-[var(--appnext-shadow-ambient)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--appnext-shadow-soft)]">
      <Link
        href={`/belajar/${m.no}`}
        data-pressable
        className="flex h-full flex-col"
      >
        <div
          className={cn(
            "relative w-full overflow-hidden",
            art
              ? ""
              : m.ready
                ? "appnext-cover aspect-[1200/670]"
                : "appnext-cover--muted aspect-[1200/670]",
          )}
        >
          {art ? (
            <Image
              src={art}
              alt=""
              width={1200}
              height={670}
              sizes="(min-width: 1750px) 25vw, (min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="block h-auto w-full"
            />
          ) : (
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center text-brand-ink/35"
            >
              <CoverIcon no={m.no} className="size-16" />
            </span>
          )}

          {art ? (
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/45 to-transparent"
            />
          ) : null}

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
            <span
              className={cn(
                "font-bold text-[10px] uppercase tracking-wider",
                art ? "text-bg" : "text-txt",
              )}
            >
              Modus {String(m.no).padStart(2, "0")}
            </span>
            <span
              aria-hidden
              className="inline-flex size-8 items-center justify-center rounded-full bg-bg/90 text-brand-strong shadow-sm backdrop-blur-sm"
            >
              <Bookmark className="size-3.5" />
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-3.5">
          <h3 className="line-clamp-2 font-bold text-[14px] text-txt leading-snug transition-colors group-hover/card:text-brand-ink">
            {m.nama}
          </h3>

          <p className="mt-0.5 font-medium text-[10.5px] text-dim">
            Modul {String(m.no).padStart(2, "0")} · Level {m.level}
          </p>

          <div className="mt-2 flex items-center justify-between gap-1 border-line border-t pt-2 font-semibold text-[10px] text-txt">
            <span
              className="inline-flex min-w-0 items-center gap-1.5"
              title="Laporan IASC"
            >
              <FileText aria-hidden className="size-3.5 shrink-0 text-dim" />
              <span className="tabular truncate">{m.laporanLabel}</span>
            </span>
            <span
              className="inline-flex min-w-0 items-center justify-center gap-1.5"
              title="Estimasi kerugian"
            >
              <Wallet aria-hidden className="size-3.5 shrink-0 text-dim" />
              <span className="truncate">{m.kerugian}</span>
            </span>
            <span
              className="inline-flex min-w-0 items-center justify-end gap-1.5"
              title="Jumlah ciri yang dijelaskan"
            >
              <Layers aria-hidden className="size-3.5 shrink-0 text-dim" />
              <span className="tabular">{m.ciri.length}</span>
            </span>
          </div>

          <div className="mt-auto flex items-center gap-2 pt-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-2">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  done
                    ? "bg-brand-strong"
                    : "bg-[var(--appnext-ink-2)]/25 group-hover/card:bg-brand",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="tabular font-bold text-[10px] text-brand-strong">
              {loading ? "—" : `${pct}%`}
            </span>
            <span
              aria-hidden
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink ring-1 ring-brand-line transition-colors group-hover/card:bg-brand-strong group-hover/card:text-bg"
            >
              <ArrowRight className="size-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </Card>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-pressable
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center rounded-full px-3 font-semibold text-[11px] transition-colors duration-150 ease-out",
        active
          ? "bg-brand-strong font-bold text-bg shadow-sm"
          : "text-dim hover:bg-panel/60 hover:text-txt",
      )}
    >
      {children}
    </button>
  );
}
