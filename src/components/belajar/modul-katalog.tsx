"use client";

import { ArrowUpRight, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { LevelMeter } from "@/components/belajar/level-meter";
import { ModuleDoneMark } from "@/components/belajar/module-done-mark";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Catalog body. The server hands over a flat, serialisable view of `modus.json`
 * so this island never imports module content into the client bundle. Search
 * and the level filter are the only state; both are presentational — nothing
 * is stored, and an empty result is a state you can back out of.
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

function ModuleCard({ m }: { m: KatalogItem }) {
  return (
    <Card className="h-full gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
      <Link
        href={`/belajar/${m.no}`}
        data-pressable
        className="group flex h-full flex-col rounded-[24px] p-5 transition-transform duration-200 ease-out hover:-translate-y-0.5"
      >
        <span className="flex items-start justify-between gap-3">
          <span
            aria-hidden
            className={cn(
              "tabular inline-flex size-11 shrink-0 items-center justify-center rounded-2xl font-medium text-[15px]",
              m.ready
                ? "bg-[var(--appnext-accent-wash)] text-[color:var(--appnext-accent-deep)]"
                : "bg-panel-2 text-txt",
            )}
          >
            {String(m.no).padStart(2, "0")}
          </span>
          <span className="flex items-center gap-2">
            <ModuleDoneMark no={m.no} />
            <ArrowUpRight
              aria-hidden
              className="size-4 text-dim transition-transform duration-150 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </span>
        </span>

        <span className="mt-4 block font-medium text-lg text-txt leading-snug">
          {m.nama}
        </span>
        <span className="mt-1.5 line-clamp-2 block text-dim text-sm leading-relaxed">
          {m.ciri.join(" · ")}
        </span>

        <span className="mt-auto block pt-5">
          <span className="flex items-end justify-between gap-3 border-line border-t pt-3">
            <span className="min-w-0">
              <LevelMeter level={m.level} />
              <span className="tabular mt-1 block truncate text-dim text-xs">
                {m.laporanLabel} · {m.kerugian}
              </span>
            </span>
            <Badge
              variant="secondary"
              className={cn(
                "shrink-0",
                m.ready
                  ? "bg-[var(--appnext-accent-wash)] text-[color:var(--appnext-accent-deep)]"
                  : "text-dim",
              )}
            >
              {m.ready ? "Mulai belajar" : "Segera"}
            </Badge>
          </span>
        </span>
      </Link>
    </Card>
  );
}

export function ModulKatalog({ items }: { items: KatalogItem[] }) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<number | null>(null);

  const levels = useMemo(
    () => [...new Set(items.map((m) => m.level))].sort((a, b) => a - b),
    [items],
  );

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

  return (
    <div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor={searchId} className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Cari modul</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-dim"
          />
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari modus, misalnya “APK”"
            className="h-11 rounded-full pl-9"
          />
        </label>

        <fieldset className="flex flex-wrap items-center gap-1 border-0 p-0">
          <legend className="sr-only">Saring menurut level</legend>
          <FilterPill active={level === null} onClick={() => setLevel(null)}>
            Semua level
          </FilterPill>
          {levels.map((value) => (
            <FilterPill
              key={value}
              active={level === value}
              onClick={() => setLevel(value)}
            >
              Level {value}
            </FilterPill>
          ))}
        </fieldset>
      </div>

      <p aria-live="polite" className="appnext-caption tabular mt-4">
        {visible.length} dari {items.length} modul ditampilkan
      </p>

      {visible.length > 0 ? (
        <ul className="mt-4 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
          {visible.map((m) => (
            <li key={m.no} className="min-w-0">
              <ModuleCard m={m} />
            </li>
          ))}
        </ul>
      ) : (
        <Card className="mt-4 gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
          <div className="flex flex-col items-start gap-3 p-6">
            <p className="font-medium text-txt">
              Tidak ada modul yang cocok dengan saringan ini.
            </p>
            <p className="appnext-caption">
              Coba kata kunci lain, atau kembali ke daftar lengkap. Katalognya
              tetap dua belas modus — tidak ada yang disembunyikan.
            </p>
            <button
              type="button"
              data-pressable
              onClick={() => {
                setQuery("");
                setLevel(null);
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink-line bg-[var(--appnext-ink-2)] px-4 text-bg text-sm"
            >
              <RotateCcw aria-hidden className="size-4" />
              Atur ulang saringan
            </button>
          </div>
        </Card>
      )}

      {filtering && visible.length > 0 ? (
        <p className="mt-4">
          <button
            type="button"
            data-pressable
            onClick={() => {
              setQuery("");
              setLevel(null);
            }}
            className="inline-flex min-h-11 items-center gap-2 text-dim text-sm hover:text-txt"
          >
            <RotateCcw aria-hidden className="size-4" />
            Atur ulang saringan
          </button>
        </p>
      ) : null}
    </div>
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
        "inline-flex min-h-11 items-center rounded-full px-3.5 text-sm transition-colors duration-150 ease-out",
        active
          ? "border border-ink-line bg-[var(--appnext-ink-2)] font-medium text-bg"
          : "text-dim hover:bg-panel-2 hover:text-txt",
      )}
    >
      {children}
    </button>
  );
}
