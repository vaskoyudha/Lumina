"use client";

import { MoreHorizontal, Plus, Search, ShieldAlert } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Session sidebar — extracted from the reference's `SessionListItem.vue` and
 * `PageSidebarNav.vue`, not re-designed.
 *
 * The structural detail I had wrong: a session row is **two lines**, not one.
 *
 *   ┌────────────────────────────────────────┐
 *   │ APK undangan pernikahan...     12.04   │  title 13px · time 11px
 *   │ ⚠ Risiko tinggi                        │  logo 16px · label 11px
 *   └────────────────────────────────────────┘
 *
 * Row metrics, copied: padding 8px/10px, radius 6px, margin-bottom 2px,
 * hover `accent/6%`, active `accent/12%` + weight 500, title 13px with
 * ellipsis, time 11px in the muted colour, second-row logo 16px with a 6px gap
 * to its label at 11px.
 *
 * The reference puts the agent logo on the second row; this product has no
 * agent per session, so the second row carries what is actually true here —
 * the risk band of the last check. Same slot, same size, honest content.
 */

export interface SessionSummary {
  id: number;
  title: string;
  /** Measured band of the last check in this conversation, if any. */
  risk?: "bersih" | "rendah" | "mencurigakan" | "tinggi";
  /** Pre-formatted; the reference prints a short time on the title row. */
  time?: string;
}

const RISK_META: Record<
  NonNullable<SessionSummary["risk"]>,
  { label: string; className: string }
> = {
  bersih: { label: "Bersih", className: "text-safe" },
  rendah: { label: "Risiko rendah", className: "text-safe" },
  mencurigakan: { label: "Mencurigakan", className: "text-warn" },
  tinggi: { label: "Risiko tinggi", className: "text-danger" },
};

function SessionRow({
  session,
  active,
  onSelect,
}: {
  session: SessionSummary;
  active: boolean;
  onSelect: () => void;
}) {
  const meta = session.risk ? RISK_META[session.risk] : null;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        className={cn(
          // Extracted: 8px/10px padding, 6px radius, 2px between rows.
          "mb-0.5 w-full rounded-[6px] px-2.5 py-2 text-left transition-colors duration-150",
          active
            ? "bg-txt/12 font-medium text-txt"
            : "text-dim hover:bg-txt/6 hover:text-txt",
        )}
      >
        {/* Line 1 — title, then the time flush right. */}
        <span className="flex items-center justify-between gap-2.5">
          <span className="min-w-0 truncate text-[13px] leading-tight">
            {session.title}
          </span>
          {session.time ? (
            <span className="shrink-0 text-[11px] text-dim tabular">
              {session.time}
            </span>
          ) : null}
        </span>

        {/* Line 2 — 16px mark, 6px gap, 11px label. */}
        {meta ? (
          <span className="mt-1 flex items-center gap-1.5">
            <ShieldAlert
              aria-hidden
              strokeWidth={1.6}
              className={cn("size-4 shrink-0", meta.className)}
            />
            <span className={cn("text-[11px] leading-tight", meta.className)}>
              {meta.label}
            </span>
          </span>
        ) : null}
      </button>
    </li>
  );
}

export function SessionSidebar({
  sessions,
  activeId,
  onSelect,
  onNew,
  className,
  onClose,
}: {
  sessions: readonly SessionSummary[];
  activeId?: number;
  onSelect: (id: number) => void;
  onNew: () => void;
  className?: string;
  onClose?: () => void;
}) {
  const [query, setQuery] = React.useState("");

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [query, sessions]);

  return (
    <aside
      className={cn(
        // Extracted: 240px column, 8px gap between blocks.
        "flex w-60 shrink-0 flex-col gap-2 px-2 py-3",
        className,
      )}
    >
      {/*
        Search row, extracted from `PageSidebarNav.vue`: the field takes the
        row and the two icon actions sit beside it at 4px gap. The field is a
        5% tint with a 3.5 icon inset — no border, so it does not read as a
        form control competing with the composer.
      */}
      <div className="flex items-center gap-1">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Cari percakapan</span>
          <Search
            aria-hidden
            strokeWidth={1.6}
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-dim"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari"
            className="h-8 w-full rounded-md border-0 bg-txt/5 pr-2 pl-8 text-txt text-xs outline-none transition-colors duration-150 placeholder:text-dim focus-visible:bg-txt/8"
          />
        </label>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNew}
          aria-label="Percakapan baru"
          className="size-8 shrink-0 text-dim hover:text-txt"
        >
          <Plus aria-hidden strokeWidth={1.8} className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Opsi daftar percakapan"
          className="size-8 shrink-0 text-dim hover:text-txt max-sm:hidden"
        >
          <MoreHorizontal aria-hidden strokeWidth={1.8} className="size-4" />
        </Button>
        {onClose ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Tutup riwayat"
            className="size-8 shrink-0 text-dim hover:text-txt md:hidden"
          >
            <span aria-hidden className="text-base leading-none">
              ×
            </span>
          </Button>
        ) : null}
      </div>

      <p className="mt-1 px-1.5 font-medium text-[0.65rem] text-dim uppercase tracking-[0.06em]">
        Riwayat
      </p>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <li className="px-1.5 py-2 text-dim text-xs">
            {query ? "Tidak ada yang cocok." : "Belum ada percakapan."}
          </li>
        ) : (
          visible.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              active={session.id === activeId}
              onSelect={() => onSelect(session.id)}
            />
          ))
        )}
      </ul>

      <p className="px-1.5 text-[0.65rem] text-dim leading-snug">
        Riwayat hanya ada di tab ini. Tutup tab, hilang.
      </p>
    </aside>
  );
}
