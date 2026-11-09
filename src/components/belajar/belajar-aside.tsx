"use client";

import {
  Award,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  FileText,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import {
  ProgressRing,
  useStoredProgress,
} from "@/components/belajar/belajar-progress";
import { CoverIcon } from "@/components/belajar/modul-visual";
import { Card } from "@/components/ui/card";
import { MODUS } from "@/lib/modus";
import { cn } from "@/lib/utils";

/**
 * Right rail of the catalog, shaped like the supplied dashboard's profile,
 * calendar, activity and task column. Every number is real: completion comes
 * from `lib/progress.ts`, the module map from `modus.json`, and `readyModules`
 * is the list the server says is actually written. There is no streak, no XP
 * and no invented activity chart.
 *
 * It renders skeletons until mount, so server HTML never claims "0 selesai"
 * and hydration never swaps a different number in.
 */

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 rounded-card border border-line py-0 ring-0 shadow-[var(--appnext-shadow-ambient)]">
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-sm text-txt">{title}</h2>
          {action}
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </Card>
  );
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function ProgressChart({
  completed,
  focusNo,
  total,
}: {
  completed: number[];
  focusNo: number;
  total: number;
}) {
  const fillId = `chart-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const x0 = 20;
  const x1 = 332;
  const yTop = 18;
  const yBottom = 122;

  const points = MODUS.map((m, index) => {
    const cum = MODUS.slice(0, index + 1).filter((x) =>
      completed.includes(x.no),
    ).length;
    return {
      no: m.no,
      cum,
      x: x0 + index * ((x1 - x0) / Math.max(1, total - 1)),
      y: yBottom - (cum / total) * (yBottom - yTop),
    };
  });

  const found = points.findIndex((p) => p.no === focusNo);
  const active = points[found >= 0 ? found : points.length - 1];
  const d = smoothPath(points);
  const tipX = Math.min(Math.max(active.x - 58, 6), 230);
  const tipY = Math.max(active.y - 36, 4);

  return (
    <Card className="gap-0 rounded-card border border-line py-0 ring-0 shadow-[var(--appnext-shadow-ambient)]">
      <div className="p-3.5">
        <svg
          viewBox="0 0 352 130"
          role="img"
          aria-label={`Progres kumulatif: ${active.cum} dari ${total} modul selesai`}
          className="h-24 w-full overflow-visible"
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--appnext-ink-2)"
                stopOpacity="0.16"
              />
              <stop
                offset="100%"
                stopColor="var(--appnext-ink-2)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          <path
            d={`${d} L ${x1} ${yBottom} L ${x0} ${yBottom} Z`}
            fill={`url(#${fillId})`}
          />

          <rect
            x={active.x - 8}
            y={active.y}
            width="16"
            height={yBottom - active.y}
            rx="6"
            fill="var(--appnext-ink-2)"
            fillOpacity="0.12"
          />

          <path
            d={d}
            fill="none"
            stroke="var(--appnext-ink-2)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />

          {points.map((point) => {
            const isActive = point.no === active.no;
            return (
              <circle
                key={point.no}
                cx={point.x}
                cy={point.y}
                r={isActive ? 5 : 3.5}
                fill={
                  isActive ? "var(--appnext-ink-2)" : "var(--appnext-white)"
                }
                stroke="var(--appnext-ink-2)"
                strokeWidth="2"
              />
            );
          })}

          <g transform={`translate(${tipX}, ${tipY})`}>
            <rect width="116" height="24" rx="12" fill="var(--appnext-ink-2)" />
            <text
              x="58"
              y="15.5"
              textAnchor="middle"
              fill="var(--appnext-white)"
              fontSize="9.5"
              fontWeight="700"
            >
              {active.cum} modul selesai
            </text>
          </g>
        </svg>

        <div className="flex items-center justify-between border-line border-t px-1 pt-1 font-medium text-[10px] text-dim">
          <span>
            Aktif :{" "}
            <strong className="text-txt">
              Modul {String(active.no).padStart(2, "0")}
            </strong>
          </span>
          <span className="font-semibold text-brand-ink">
            {active.cum} modul selesai
          </span>
        </div>
      </div>
    </Card>
  );
}

export function BelajarAside({ readyModules }: { readyModules: number[] }) {
  const progress = useStoredProgress();
  const ready = new Set(readyModules);
  const total = MODUS.length;

  const completed = progress?.completedModules ?? [];
  const done = completed.length;
  const pct = Math.min(100, Math.round((done / total) * 100));

  const next = MODUS.filter(
    (m) => ready.has(m.no) && !completed.includes(m.no),
  ).sort((a, b) => a.no - b.no)[0];

  const lastCompletedNo = [...completed].sort((a, b) => a - b).pop();
  const focus = next ?? MODUS.find((m) => m.no === lastCompletedNo) ?? MODUS[0];

  const upcoming = MODUS.filter((m) => !completed.includes(m.no))
    .sort((a, b) => a.no - b.no)
    .slice(0, 3);

  const stats = [
    {
      label: "Selesai",
      value: progress ? done : "—",
      Icon: CheckCircle2,
    },
    {
      label: "Tersisa",
      value: progress ? total - done : "—",
      Icon: CircleDashed,
    },
    {
      label: "Lencana",
      value: progress ? progress.badges.length : "—",
      Icon: Award,
    },
    { label: "Modul", value: total, Icon: Layers },
    { label: "Lengkap", value: readyModules.length, Icon: FileText },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card className="gap-0 rounded-card border border-line p-3.5 py-3.5 ring-0 shadow-[var(--appnext-shadow-ambient)]">
        <div
          aria-hidden
          className="appnext-campaign relative h-20 overflow-hidden rounded-xl"
        >
          <svg
            role="presentation"
            viewBox="0 0 320 90"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full opacity-85"
          >
            <path d="M-20 90 L80 -10 L170 90 Z" className="fill-bg/15" />
            <path
              d="M95 -10 L220 90 L310 -10 Z"
              className="fill-[var(--appnext-ink-2)]/25"
            />
            <circle cx="260" cy="30" r="45" className="fill-bg/10" />
          </svg>
        </div>

        <div className="relative -mt-8 flex flex-col items-center">
          <div className="relative">
            <span className="inline-flex rounded-full bg-panel p-1 shadow-sm">
              {progress ? (
                <ProgressRing pct={pct} size={72} />
              ) : (
                <CircleDashed
                  aria-hidden
                  className="size-16 animate-pulse text-line"
                />
              )}
            </span>
          </div>

          <h2 className="mt-2 font-bold text-sm text-txt">Belajar</h2>
          <p className="font-medium text-[11px] text-dim">
            Data di perangkat ini
          </p>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-1.5 rounded-xl border border-line bg-panel-2 p-2.5">
          {stats.map(({ label, value, Icon }) => (
            <div
              key={label}
              className="flex flex-col items-center justify-center rounded-lg py-1.5"
              title={label}
            >
              <Icon aria-hidden className="mb-1.5 size-3.5 text-dim" />
              <span className="tabular font-bold text-[11px] text-txt">
                {value}
              </span>
              <span className="mt-0.5 text-[8px] text-dim leading-none">
                {label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Panel
        title="Peta modul"
        action={
          <span className="tabular font-semibold text-[11px] text-dim">
            {progress ? `${done}/${total}` : "—"}
          </span>
        }
      >
        <ul className="grid list-none grid-cols-6 gap-1.5 p-0">
          {MODUS.map((m) => {
            const isCompleted = progress?.completedModules.includes(m.no);
            const isReady = ready.has(m.no);
            const isNext = progress ? next?.no === m.no : false;
            return (
              <li key={m.no} className="min-w-0">
                <Link
                  href={`/belajar/${m.no}`}
                  data-pressable
                  aria-label={`Modul ${m.no}: ${m.nama}${
                    isCompleted
                      ? " — selesai"
                      : isNext
                        ? " — berikutnya"
                        : isReady
                          ? " — lengkap"
                          : " — segera"
                  }`}
                  className={cn(
                    "tabular flex aspect-square items-center justify-center rounded-full font-bold text-[11px] transition-colors",
                    isCompleted
                      ? "bg-brand-strong text-bg shadow-sm"
                      : isNext
                        ? "bg-[var(--appnext-ink-2)] text-bg shadow-sm"
                        : isReady
                          ? "bg-brand-soft text-brand-ink ring-1 ring-brand-line"
                          : "bg-panel-2 text-dim hover:bg-line",
                  )}
                >
                  {m.no}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex items-center justify-between border-line border-t pt-3 font-medium text-[10px] text-dim">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-brand" />
            Selesai
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2 rounded-full bg-[var(--appnext-ink-2)]"
            />
            Berikutnya
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2 rounded-full bg-brand-soft ring-1 ring-brand-line"
            />
            Lengkap
          </span>
        </div>
      </Panel>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-txt">Progres kumulatif</h2>
          <span className="rounded-lg bg-[var(--appnext-ink-2)] px-3 py-1.5 font-semibold text-[11px] text-bg shadow-sm">
            {progress ? `${done}/${total}` : "—"}
          </span>
        </div>
        {progress ? (
          <ProgressChart
            completed={completed}
            focusNo={focus.no}
            total={total}
          />
        ) : (
          <Card className="gap-0 rounded-card border border-line py-0 ring-0 shadow-[var(--appnext-shadow-ambient)]">
            <div className="h-24 animate-pulse rounded-card bg-panel-2" />
          </Card>
        )}
      </div>

      <div className="mt-auto space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-txt">Antrean berikutnya</h2>
          <Link
            href="/belajar#semua-modul"
            className="font-semibold text-[11px] text-dim transition-colors hover:text-txt"
          >
            Lihat semua
          </Link>
        </div>

        {progress ? (
          upcoming.length > 0 ? (
            <div className="space-y-2.5">
              {upcoming.map((m) => (
                <Link
                  key={m.no}
                  href={`/belajar/${m.no}`}
                  data-pressable
                  className="flex items-center justify-between gap-3 rounded-card border border-line bg-panel p-3 shadow-[var(--appnext-shadow-ambient)] transition-all hover:border-brand-line hover:shadow-md"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink shadow-sm"
                    >
                      <CoverIcon no={m.no} className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-bold text-xs text-txt">
                        <span className="truncate">{m.nama}</span>
                        {ready.has(m.no) ? (
                          <CheckCircle2
                            aria-hidden
                            className="size-3.5 shrink-0 text-brand-ink"
                          />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block font-medium text-[10px] text-dim">
                        Modul {String(m.no).padStart(2, "0")} ·{" "}
                        {ready.has(m.no) ? "Lengkap" : "Segera"}
                      </span>
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="size-4 shrink-0 text-dim"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <Card className="gap-0 rounded-card border border-line py-0 ring-0">
              <p className="p-4 text-dim text-sm">
                Semua modul sudah selesai di perangkat ini.
              </p>
            </Card>
          )
        ) : (
          <div className="flex flex-col gap-2.5" aria-hidden>
            <span className="h-16 rounded-2xl bg-panel-2" />
            <span className="h-16 rounded-2xl bg-panel-2" />
            <span className="h-16 rounded-2xl bg-panel-2" />
          </div>
        )}
      </div>
    </div>
  );
}
