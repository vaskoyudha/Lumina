"use client";

import {
  CheckCircle2,
  FileText,
  Layers,
  Play,
  RotateCcw,
  Search,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { useStoredProgress } from "@/components/belajar/belajar-progress";
import { CoverIcon, LevelSignalBadge } from "@/components/belajar/modul-visual";
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
        <Card className="mt-4 gap-0 rounded-[22px] border border-line py-0 ring-0 shadow-[var(--appnext-shadow-ambient)]">
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
              className="min-h-11 rounded-full bg-[var(--appnext-ink-2)] px-4 text-bg hover:bg-[var(--appnext-ink-3)]"
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
        "flex flex-wrap items-center gap-1 rounded-xl bg-panel-2 p-1",
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
  const laporanShort = m.laporanLabel.replace(/\s*laporan$/i, "");

  return (
    <Card className="group/card h-full gap-0 rounded-[22px] border border-line bg-panel py-0 ring-0 shadow-[var(--appnext-shadow-ambient)] transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-line hover:shadow-[var(--appnext-shadow-soft)]">
      <Link
        href={`/belajar/${m.no}`}
        data-pressable
        className="flex h-full flex-col justify-between p-3.5"
      >
        <div>
          <div
            className={cn(
              "relative h-44 overflow-hidden rounded-[16px] shadow-inner",
              m.ready ? "appnext-campaign" : "appnext-cover--muted",
            )}
          >
            {m.ready ? (
              <span
                aria-hidden
                className="appnext-cover-scrim absolute inset-0"
              />
            ) : null}

            <span
              aria-hidden
              className={cn(
                "tabular absolute -right-3 -bottom-9 select-none font-semibold text-[150px] leading-none",
                m.ready ? "text-bg/10" : "text-txt/5",
              )}
            >
              {String(m.no).padStart(2, "0")}
            </span>

            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-3 top-2.5 text-center",
                m.ready ? "text-bg" : "text-txt",
              )}
            >
              <span className="block truncate font-black text-[12px] uppercase tracking-wider">
                Modus {String(m.no).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "mt-0.5 block truncate font-medium text-[10px]",
                  m.ready ? "text-bg/80" : "text-dim",
                )}
              >
                {m.ciri[0]}
              </span>
            </span>

            <span
              className="absolute top-2.5 left-2.5 inline-flex max-w-[88px] items-center gap-1 rounded-full bg-brand-soft/95 px-2 py-0.5 font-extrabold text-[10px] text-brand-ink shadow"
              title={`Laporan IASC: ${m.laporanLabel}`}
            >
              <FileText aria-hidden className="size-2.5 shrink-0" />
              <span className="truncate">{laporanShort}</span>
            </span>

            <span
              className={cn(
                "absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 font-bold text-[10px] shadow backdrop-blur-md",
                m.ready ? "bg-bg/90 text-txt" : "bg-panel/90 text-dim",
              )}
            >
              {m.ready ? "Lengkap" : "Segera"}
            </span>

            <span className="absolute bottom-2.5 left-2.5">
              <LevelSignalBadge level={m.level} />
            </span>

            <span
              className={cn(
                "absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold text-[10px] shadow transition-colors",
                done
                  ? "bg-brand-soft text-brand-ink"
                  : m.ready
                    ? "bg-bg/95 text-txt group-hover/card:bg-brand-strong group-hover/card:text-bg"
                    : "bg-panel/90 text-dim",
              )}
            >
              {done ? (
                <CheckCircle2 aria-hidden className="size-3" />
              ) : (
                <Play aria-hidden className="size-2.5 fill-current" />
              )}
              <span>{done ? "Selesai" : m.ready ? "Mulai" : "Ringkasan"}</span>
            </span>
          </div>

          <div className="mt-3.5 flex items-start justify-between gap-2 px-0.5">
            <h4 className="line-clamp-2 font-bold text-[14px] text-txt leading-snug transition-colors group-hover/card:text-brand-ink">
              {m.nama}
            </h4>
            <span
              aria-hidden
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink ring-1 ring-brand-line"
            >
              <CoverIcon no={m.no} className="size-4" />
            </span>
          </div>

          <p className="mt-1 px-0.5 font-medium text-[11px] text-dim">
            Modul {String(m.no).padStart(2, "0")} · Level {m.level}
          </p>

          <div className="mt-3 flex items-center justify-between gap-1 border-line border-t px-0.5 pt-2.5 font-semibold text-[10px] text-txt">
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
        </div>

        <div className="mt-3.5 px-0.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-2">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                done
                  ? "bg-brand"
                  : "bg-[var(--appnext-ink-2)] group-hover/card:bg-brand",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="font-medium text-dim">
              Selesai :{" "}
              <strong className="text-txt">{loading ? "—" : `${pct}%`}</strong>
            </span>
            <span className="font-medium text-dim">
              Ciri : <strong className="text-txt">{m.ciri.length}</strong>
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
        "inline-flex min-h-9 items-center rounded-lg px-2.5 font-semibold text-[11px] transition-colors duration-150 ease-out",
        active
          ? "bg-panel font-bold text-txt shadow-sm"
          : "text-dim hover:bg-panel/60 hover:text-txt",
      )}
    >
      {children}
    </button>
  );
}
