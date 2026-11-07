"use client";

import {
  ChevronRight,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { NavRail } from "@/components/companion/nav-rail";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * Sidebar — the left column of the chat shell, with two states.
 *
 * Chrome is a 1:1 clone of the Cortex reference: brand sparkle squircle and
 * wordmark, a full-width black "Percakapan baru", a white search field with a
 * shortcut chip, destination rows, thread rows, and a footer card.
 *
 * The panels: history and navigation are collapsible sections. `Collapse` folds
 * the whole column to a 60px icon rail (an icon drawer, not a second navigation
 * tree); the same button expands it again. On `< md` the sidebar is the overlay
 * drawer and always renders expanded, because a 60px rail over the conversation
 * is not a drawer, it is a stripe.
 *
 * What is still ours:
 *   a. Session rows are two lines. Cortex prints one line with a timestamp, but
 *      here the second line carries the measured risk band of the last check —
 *      true information that the judge needs before opening a thread.
 *   b. The footer is the privacy promise, not an account card. History lives in
 *      React state only (§11.6), so the bottom slot says exactly that.
 *   c. The `⌘K` chip is wired: it focuses the search field, it is not a decal.
 */

export interface SessionSummary {
  id: number;
  title: string;
  /** Measured band of the last check in this conversation, if any. */
  risk?: "bersih" | "rendah" | "mencurigakan" | "tinggi";
  /** Pre-formatted; the reference prints a short time on the title row. */
  time?: string;
  /** Epoch ms of the last turn; buckets the row under Hari ini / Kemarin. */
  updatedAt?: number;
}

const RISK_META: Record<
  NonNullable<SessionSummary["risk"]>,
  { label: string; className: string }
> = {
  bersih: { label: "Bersih", className: "text-brand" },
  rendah: { label: "Risiko rendah", className: "text-brand" },
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
        data-pressable
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-[7px] px-1.5 py-[6px] text-left transition-[background-color,color,box-shadow] duration-150 ease-out",
          active
            ? "bg-panel font-medium text-ink shadow-rest"
            : "text-ink-soft hover:bg-txt/[0.04] hover:text-ink",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-[12px] leading-[1.35]">
          {session.title}
        </span>
        {meta ? (
          <ShieldAlert
            aria-hidden
            strokeWidth={1.8}
            className={cn("size-3 shrink-0", meta.className)}
          />
        ) : null}
        {session.time ? (
          <span className="shrink-0 text-[10.5px] text-ink-faint tabular">
            {session.time}
          </span>
        ) : null}
        {meta ? <span className="sr-only">{meta.label}</span> : null}
      </button>
    </li>
  );
}

function SectionTrigger({
  open,
  label,
  count,
}: {
  open: boolean;
  label: string;
  count?: number;
}) {
  return (
    <CollapsibleTrigger
      className={cn(
        "group flex w-full items-center gap-1.5 rounded-[7px] px-1.5 py-1 text-left",
        "font-medium text-[10.5px] text-ink-faint transition-colors duration-150",
        "hover:bg-txt/[0.04] hover:text-ink-soft",
      )}
    >
      <ChevronRight
        aria-hidden
        strokeWidth={2}
        className={cn(
          "size-3 shrink-0 transition-transform duration-150",
          open && "rotate-90",
        )}
      />
      <span className="flex-1 truncate">{label}</span>
      {count === undefined ? null : (
        <span className="shrink-0 tabular text-[10px] text-ink-faint">
          {count}
        </span>
      )}
    </CollapsibleTrigger>
  );
}

export function SessionSidebar({
  sessions,
  activeId,
  onSelect,
  onNew,
  className,
  onClose,
  collapsed = false,
  onToggleCollapse,
  auth,
}: {
  sessions: readonly SessionSummary[];
  activeId?: number;
  onSelect: (id: number) => void;
  onNew: () => void;
  className?: string;
  onClose?: () => void;
  /** Desktop icon rail. Ignored below `md`, where the drawer is always full. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Account slot; the flag is true when the sidebar is the 60px rail. */
  auth?: (iconsOnly: boolean) => React.ReactNode;
}) {
  const [query, setQuery] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [openPanels, setOpenPanels] = React.useState({
    history: true,
    menu: true,
  });

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k") return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [query, sessions]);

  /*
   * `Date.now()` may never be read while rendering: Next 16 refuses to prerender
   * a client component that does, exactly as it does for the composer's
   * `voiceStartedAt`. So the clock lands in state after mount, and the first
   * render (server and hydration alike) treats every thread as "Hari ini".
   */
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => setNow(Date.now()), []);

  /**
   * Newest first, then bucketed the way the reference buckets threads:
   * "Hari ini", "Kemarin", "7 hari lalu", "Lebih lama". A session with no
   * `updatedAt` has never been checked, so it reads as untouched and joins
   * "Hari ini" — it is the one the reader just opened.
   */
  const groups = React.useMemo(() => {
    const day = 24 * 60 * 60 * 1000;
    const buckets: Array<{ label: string; items: SessionSummary[] }> = [
      { label: "Hari ini", items: [] },
      { label: "Kemarin", items: [] },
      { label: "7 hari lalu", items: [] },
      { label: "Lebih lama", items: [] },
    ];

    for (const session of [...visible].reverse()) {
      const stamp = session.updatedAt;
      const index =
        stamp === undefined || now === null
          ? 0
          : stamp > now - day
            ? 0
            : stamp > now - 2 * day
              ? 1
              : stamp > now - 7 * day
                ? 2
                : 3;
      buckets[index]?.items.push(session);
    }

    return buckets.filter((bucket) => bucket.items.length > 0);
  }, [visible, now]);

  const brandMark = (
    <Link
      href="/"
      data-pressable
      aria-label="Lumina — beranda"
      className="grid size-[26px] shrink-0 place-items-center rounded-[7px] bg-gradient-to-br from-brand-soft-2 via-brand-glow to-brand-strong shadow-[0_2px_6px_color-mix(in_oklab,var(--lumina-brand-glow)_35%,transparent)]"
    >
      <svg
        role="presentation"
        viewBox="0 0 24 24"
        className="size-4 text-white"
        fill="currentColor"
      >
        <path d="M10 3.2c.45 0 .82.34.88.78l.27 2.02a2.7 2.7 0 0 0 2.31 2.31l2.02.27a.89.89 0 0 1 0 1.76l-2.02.27a2.7 2.7 0 0 0-2.31 2.31l-.27 2.02a.89.89 0 0 1-1.76 0l-.27-2.02a2.7 2.7 0 0 0-2.31-2.31l-2.02-.27a.89.89 0 0 1 0-1.76l2.02-.27a2.7 2.7 0 0 0 2.31-2.31l.27-2.02c.06-.44.43-.78.88-.78Z" />
      </svg>
    </Link>
  );

  const historyBody =
    groups.length === 0 ? (
      <p className="px-1.5 py-2 text-ink-faint text-xs">
        {query ? "Tidak ada yang cocok." : "Belum ada percakapan."}
      </p>
    ) : (
      groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-1.5 font-medium text-[10.5px] text-ink-faint">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                active={session.id === activeId}
                onSelect={() => onSelect(session.id)}
              />
            ))}
          </ul>
        </div>
      ))
    );

  const expanded = (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Brand row — the squircle is the app mark, not a decorative topper. */}
        <div className="mb-3.5 flex items-center gap-1.5 px-1.5">
          {brandMark}
          <span className="min-w-0 flex-1 truncate font-semibold text-[16.5px] text-ink tracking-[-0.02em]">
            Lumina
          </span>
          {onClose ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Tutup riwayat"
              className="size-6 shrink-0 rounded-[6px] text-ink-mute hover:bg-txt/[0.05] hover:text-ink md:hidden"
            >
              <svg
                role="presentation"
                viewBox="0 0 18 18"
                className="size-[15px]"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2.5" width="14" height="13" rx="2.5" />
                <line x1="6.5" y1="2.5" x2="6.5" y2="15.5" />
                <polyline points="11.5 7 9.2 9 11.5 11" />
              </svg>
            </Button>
          ) : null}
          {onToggleCollapse ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              aria-label="Ciutkan bilah samping"
              aria-expanded
              className="hidden size-6 shrink-0 rounded-[6px] text-ink-faint hover:bg-txt/[0.05] hover:text-ink md:grid"
            >
              <PanelLeftClose
                aria-hidden
                strokeWidth={1.7}
                className="size-4"
              />
            </Button>
          ) : null}
        </div>

        <Button
          onClick={onNew}
          data-pressable
          className="h-[38px] w-full gap-2 rounded-[10px] bg-ink text-[12.5px] font-medium text-white shadow-rest hover:bg-ink-hover"
        >
          <Plus aria-hidden strokeWidth={2} className="size-4" />
          Percakapan baru
        </Button>

        <label className="relative mt-2.5 flex h-[34px] items-center rounded-[10px] border border-hairline bg-panel pr-2 pl-2.5 shadow-rest focus-within:border-brand-glow">
          <Search
            aria-hidden
            strokeWidth={1.7}
            className="pointer-events-none size-3.5 shrink-0 text-ink-mute"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari"
            className="min-w-0 flex-1 bg-transparent px-2 text-[12px] text-txt outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
          />
          <kbd
            aria-hidden
            className="grid h-[19px] min-w-[19px] shrink-0 place-items-center rounded-[5px] bg-brand-soft px-1 font-sans text-[10.5px] text-brand-ink-soft"
          >
            ⌘K
          </kbd>
          <span className="sr-only">Cari percakapan</span>
        </label>

        <div className="my-2.5 border-t border-txt/[0.06]" />

        {/* Two collapsible panels: the thread list and the destinations. */}
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
          <Collapsible
            open={openPanels.history}
            onOpenChange={(open) =>
              setOpenPanels((prev) => ({ ...prev, history: open }))
            }
          >
            <SectionTrigger
              open={openPanels.history}
              label="Riwayat"
              count={visible.length}
            />
            <CollapsibleContent className="space-y-3 pt-1.5">
              {historyBody}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible
            open={openPanels.menu}
            onOpenChange={(open) =>
              setOpenPanels((prev) => ({ ...prev, menu: open }))
            }
          >
            <SectionTrigger open={openPanels.menu} label="Menu" count={4} />
            <CollapsibleContent className="pt-0.5">
              <NavRail />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {auth?.(false)}

      <div className="mt-2 flex items-center gap-2.5 rounded-[12px] border border-hairline bg-panel p-2 shadow-rest">
        <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-brand-soft text-brand-ink">
          <Lock aria-hidden strokeWidth={1.8} className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-[11.5px] leading-[1.3] text-txt">
            Riwayat di tab ini
          </span>
          <span className="block truncate font-light text-[10.5px] leading-[1.4] text-ink-faint">
            Tutup tab, hilang.
          </span>
        </span>
      </div>
    </>
  );

  /*
   * The icon rail is the same sidebar with its labels folded away — every
   * control is the control it was, only named by an accessible label.
   */
  const rail = (
    <>
      {brandMark}

      {onToggleCollapse ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          aria-label="Buka bilah samping"
          aria-expanded={false}
          className="size-8 rounded-[8px] text-ink-faint hover:bg-txt/[0.05] hover:text-ink"
        >
          <PanelLeftOpen aria-hidden strokeWidth={1.7} className="size-4" />
        </Button>
      ) : null}

      <Button
        onClick={onNew}
        data-pressable
        aria-label="Percakapan baru"
        title="Percakapan baru"
        className="size-9 rounded-[10px] bg-ink p-0 text-white shadow-rest hover:bg-ink-hover"
      >
        <Plus aria-hidden strokeWidth={2} className="size-4" />
      </Button>

      <div className="my-1 w-8 border-t border-txt/[0.06]" />

      <NavRail iconsOnly />

      <div className="my-1 w-8 border-t border-txt/[0.06]" />

      <div className="flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-y-auto py-0.5">
        {visible.length === 0 ? (
          <span className="px-1 py-2 text-center text-[9px] text-ink-faint leading-[1.3]">
            —
          </span>
        ) : (
          [...visible].reverse().map((session) => (
            <button
              key={session.id}
              type="button"
              data-pressable
              onClick={() => onSelect(session.id)}
              aria-current={session.id === activeId ? "page" : undefined}
              aria-label={session.title}
              title={session.title}
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-[8px] transition-colors duration-150",
                session.id === activeId
                  ? "bg-panel text-ink shadow-rest"
                  : "text-ink-faint hover:bg-txt/[0.04] hover:text-ink",
              )}
            >
              <span className="font-medium text-[12px] leading-none">
                {session.title.trim().charAt(0).toUpperCase()}
              </span>
            </button>
          ))
        )}
      </div>

      {auth?.(true)}

      <span
        title="Riwayat di tab ini — tutup tab, hilang."
        className="mt-1 grid size-9 shrink-0 place-items-center rounded-[9px] bg-brand-soft text-brand-ink"
      >
        <Lock aria-hidden strokeWidth={1.8} className="size-3.5" />
        <span className="sr-only">Riwayat di tab ini, tutup tab hilang.</span>
      </span>
    </>
  );

  return (
    <aside
      className={cn(
        "flex shrink-0 select-none flex-col justify-between",
        collapsed
          ? "w-[220px] px-2 pt-2 pb-1 md:w-[60px] md:items-center md:gap-1.5 md:px-1.5"
          : "w-[220px] px-2 pt-2 pb-1",
        className,
      )}
    >
      {collapsed ? (
        <>
          <div className="hidden min-h-0 flex-1 flex-col items-center gap-1.5 md:flex">
            {rail}
          </div>
          <div className="flex min-h-0 flex-1 flex-col md:hidden">
            {expanded}
          </div>
        </>
      ) : (
        expanded
      )}
    </aside>
  );
}
