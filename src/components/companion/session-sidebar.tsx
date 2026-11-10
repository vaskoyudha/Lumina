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
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { LuminaLogo } from "@/components/brand/lumina-logo";
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
 * Chrome is a 1:1 clone of the Cortex reference: brand mascot mark and
 * wordmark, a full-width orange "Percakapan baru", a white search field with a
 * shortcut chip, destination rows, thread rows, and a footer card.
 *
 * The panels: history and navigation are collapsible sections. `Collapse` folds
 * the whole column to a 60px icon rail (an icon drawer, not a second navigation
 * tree); the same button expands it again. On
 * `< md` the sidebar is the overlay drawer and always renders expanded, because
 * a 60px rail over the conversation is not a drawer, it is a stripe.
 *
 * What is still ours:
 *   a. Session rows are two lines. Cortex prints one line with a timestamp, but
 *      here the second line carries the measured risk band of the last check —
 *      true information that the judge needs before opening a thread.
 *   b. The sidebar is two glass cards, matching the reference: the navigation
 *      block, then the account card as its own surface. The icon rail keeps a
 *      lock glyph for the tab-only history promise (§11.6) that the expanded
 *      footer used to spell out.
 *   c. The `⌘K` chip is wired: it focuses the search field, it is not a decal.
 *   d. The "Agen" option in `NavRail` opens the detector overview in the center
 *      column, read straight from `AGENT_SEQUENCE` + `STAGE_LABEL` so that view
 *      and the evidence panel can never disagree about who checks what.
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
          "flex min-h-9 w-full items-center gap-2 rounded-[8px] px-2 py-1.5 font-medium text-left",
          "transition-[background-color,color,box-shadow] duration-150 ease-out",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1",
          active
            ? "bg-panel font-semibold text-ink shadow-rest"
            : "text-ink-soft hover:bg-txt/[0.04] hover:text-ink",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-[12.5px] leading-5">
          {session.title}
        </span>
        {meta ? (
          <ShieldAlert
            aria-hidden
            strokeWidth={1.8}
            className={cn("size-3.5 shrink-0", meta.className)}
          />
        ) : null}
        {session.time ? (
          <span className="shrink-0 tabular text-[11px] text-ink-faint">
            {session.time}
          </span>
        ) : null}
        {meta ? <span className="sr-only">{meta.label}</span> : null}
      </button>
    </li>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 px-1.5 font-semibold text-[10.5px] text-ink-mute uppercase tracking-[0.12em]">
      {children}
    </p>
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
        "group flex w-full items-center gap-1.5 rounded-[7px] px-1.5 py-1.5 text-left",
        "font-semibold text-[10.5px] text-ink-mute uppercase tracking-[0.12em] transition-colors duration-150",
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
        <span className="shrink-0 rounded-full bg-panel-2 px-1.5 py-0.5 tabular text-[10px] text-ink-mute normal-case tracking-normal">
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
  agentsActive = false,
  onShowAgents,
  onShowChat,
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
  /** True while the center column shows the detector overview. */
  agentsActive?: boolean;
  onShowAgents?: () => void;
  /** Companion row: return the center column to the conversation. */
  onShowChat?: () => void;
  /** Account slot; the flag is true when the sidebar is the 60px rail. */
  auth?: (iconsOnly: boolean) => React.ReactNode;
}) {
  const [query, setQuery] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [openPanels, setOpenPanels] = React.useState({
    history: true,
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

    for (const session of visible) {
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
      className="grid size-[30px] shrink-0 place-items-center"
    >
      <LuminaLogo variant="mark" className="h-[30px] w-auto" />
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
          <p className="mb-1.5 px-1.5 font-semibold text-[11px] text-ink-mute">
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
      {/* Main panel card. The reference splits the sidebar into two glass
          cards: the navigation/promo block and the account card below it, so
          the profile reads as its own surface instead of a footer strip. */}
      <div className="flex min-h-0 flex-1 flex-col rounded-[24px] border border-white/80 bg-panel/95 px-3 pt-4 pb-2.5 shadow-panel backdrop-blur-md">
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Brand row — the squircle is the app mark, not a decorative topper. */}
          <div className="mb-3.5 flex items-center gap-1.5 px-1.5">
            <Link
              href="/"
              data-pressable
              aria-label="Lumina — beranda"
              className="min-w-0 flex-1"
            >
              <LuminaLogo className="h-[36px] w-auto" />
            </Link>
            {onClose ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Tutup bilah samping"
                className="size-11 shrink-0 rounded-[6px] text-ink-mute hover:bg-txt/[0.05] hover:text-ink md:hidden"
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
            className="h-auto w-full justify-between gap-2 rounded-full border-0 bg-gradient-to-r from-brand-cta-from to-brand-cta-to py-2 pr-1.5 pl-3.5 font-semibold text-[13px] text-bg shadow-[inset_0_1px_0_0_var(--color-brand-edge),0_4px_0_0_var(--color-brand-ink)] transition-[background-color,color,transform,translate,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:from-brand-cta-hover-from hover:to-brand-cta-hover-to hover:shadow-[inset_0_1px_0_0_var(--color-brand-edge),0_6px_0_0_var(--color-brand-ink)] active:translate-y-[4px]! active:transform-none active:shadow-[inset_0_1px_0_0_var(--color-brand-edge),0_0px_0_0_var(--color-brand-ink)] active:[--t-approach:80ms] active:duration-75"
          >
            <span>Percakapan baru</span>
            <span className="flex size-6 items-center justify-center rounded-full bg-bg text-brand-ink shadow-sm">
              <Plus aria-hidden strokeWidth={2.8} className="size-3.5" />
            </span>
          </Button>

          <div className="my-2.5 border-t border-txt/[0.06]" />

          {/* Destinations are a flat block, not a collapsed group: they are the
            primary navigation, so they never hide behind a trigger. Search
            stays above them so it reads as global, not as part of a destination;
            Riwayat sits below as the only collapsible group. */}
          <div className="-ml-3 min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-0.5 pl-3">
            <label className="relative flex h-[38px] items-center rounded-[10px] border border-hairline bg-panel pr-2 pl-2.5 shadow-rest focus-within:border-brand-glow">
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
                placeholder="Cari percakapan"
                className="min-w-0 flex-1 bg-transparent px-2 text-[16px] text-txt outline-none placeholder:text-ink-faint sm:text-[13px] [&::-webkit-search-cancel-button]:hidden"
              />
              <kbd
                aria-hidden
                className="grid h-[20px] min-w-[20px] shrink-0 place-items-center rounded-[5px] border border-hairline bg-panel-2 px-1 font-sans text-[10.5px] text-ink-mute"
              >
                ⌘K
              </kbd>
              <span className="sr-only">Cari percakapan</span>
            </label>

            <div>
              <SectionLabel>Ruang kerja</SectionLabel>
              <NavRail
                agentsActive={agentsActive}
                onShowAgents={onShowAgents}
                onShowChat={onShowChat}
              />
            </div>

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
          </div>
        </div>

        <div className="relative mt-2.5 flex min-h-[158px] shrink-0 select-none flex-col justify-end overflow-hidden rounded-[20px] p-3.5 shadow-rest">
          <Image
            src="/brand/promo-dashboard.png"
            alt=""
            fill
            sizes="204px"
            className="pointer-events-none object-cover"
          />
          <div className="relative z-10 max-w-[115px] pt-7">
            <p className="font-bold text-[12px] text-txt leading-[1.25]">
              Saling jaga, bersama.
            </p>
            <p className="mt-1 mb-2.5 text-[9.5px] text-dim leading-[1.35]">
              Bagikan pola baru dan belajar dari pengalaman anggota.
            </p>
            <Button
              asChild
              className="h-auto justify-center gap-1.5 rounded-full border-0 bg-gradient-to-r from-brand-cta-from to-brand-cta-to px-3 py-1.5 font-semibold text-[10.5px] text-bg shadow-slab transition-[filter,transform,box-shadow] duration-150 ease-out hover:from-brand-cta-hover-from hover:to-brand-cta-hover-to active:translate-y-[2px] active:shadow-slab-pressed"
            >
              <Link href="/komunitas" data-pressable>
                <span>Buka komunitas</span>
                <ChevronRight
                  aria-hidden
                  strokeWidth={2.4}
                  className="size-3"
                />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-2.5 shrink-0 rounded-[20px] border border-white/80 bg-panel/95 px-3.5 py-2.5 shadow-panel backdrop-blur-md">
        {auth?.(false)}
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
        className="size-9 rounded-full border-0 bg-gradient-to-r from-brand-cta-from to-brand-cta-to p-0 text-bg shadow-[inset_0_1px_0_0_var(--color-brand-edge),0_3px_0_0_var(--color-brand-ink)] transition-[background-color,color,transform,translate,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:from-brand-cta-hover-from hover:to-brand-cta-hover-to hover:shadow-[inset_0_1px_0_0_var(--color-brand-edge),0_5px_0_0_var(--color-brand-ink)] active:translate-y-[3px]! active:transform-none active:shadow-[inset_0_1px_0_0_var(--color-brand-edge),0_0px_0_0_var(--color-brand-ink)] active:[--t-approach:80ms] active:duration-75"
      >
        <Plus aria-hidden strokeWidth={2} className="size-4" />
      </Button>

      <div className="my-1 w-8 border-t border-txt/[0.06]" />

      <NavRail
        iconsOnly
        agentsActive={agentsActive}
        onShowAgents={onShowAgents}
        onShowChat={onShowChat}
      />

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
                "grid size-10 shrink-0 place-items-center rounded-[8px] transition-colors duration-150",
                session.id === activeId
                  ? "bg-panel text-ink shadow-rest"
                  : "text-ink-faint hover:bg-txt/[0.04] hover:text-ink",
              )}
            >
              <span className="font-semibold text-[12.5px] leading-none">
                {session.title.trim().charAt(0).toUpperCase()}
              </span>
            </button>
          ))
        )}
      </div>

      <span
        title="Riwayat di tab ini — tutup tab, hilang."
        className="mt-1 grid size-9 shrink-0 place-items-center rounded-[9px] bg-panel-2 text-ink-mute"
      >
        <Lock aria-hidden strokeWidth={1.8} className="size-3.5" />
        <span className="sr-only">Riwayat di tab ini, tutup tab hilang.</span>
      </span>
    </>
  );

  return (
    <aside
      className={cn(
        "flex shrink-0 select-none flex-col justify-between overflow-hidden",
        "md:transition-[width] md:duration-200 md:ease-[cubic-bezier(0.22,1,0.36,1)]",
        collapsed
          ? "w-[248px] px-3 pt-2.5 pb-2 md:w-[64px] md:items-center md:gap-2.5 md:px-2"
          : "w-[248px] px-3 pt-2.5 pb-2",
        className,
      )}
    >
      {collapsed ? (
        <>
          {/* The rail is the same glass surface as the expanded panel: without
              it the icons float on the peach field and the white pill that
              marks the sidebar disappears. The account stays a second card. */}
          <div className="hidden w-full min-h-0 flex-1 flex-col items-center gap-1.5 rounded-[24px] border border-white/80 bg-panel/95 px-1 py-2 shadow-panel backdrop-blur-md md:flex md:animate-in md:fade-in-0 md:duration-150">
            {rail}
          </div>
          <div className="hidden w-full shrink-0 place-items-center rounded-[20px] border border-white/80 bg-panel/95 px-1 py-2 shadow-panel backdrop-blur-md md:grid">
            {auth?.(true)}
          </div>
          <div className="flex min-h-0 flex-1 flex-col md:hidden">
            {expanded}
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col justify-between md:animate-in md:fade-in-0 md:duration-150">
          {expanded}
        </div>
      )}
    </aside>
  );
}
