"use client";

import {
  Bot,
  GraduationCap,
  type LucideIcon,
  MessageSquare,
  Swords,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { AGENT_SEQUENCE } from "@/components/companion/agents";
import { cn } from "@/lib/utils";

/**
 * Navigation — a stacked block inside the chat sidebar.
 *
 * The shell follows the Cortex skeleton: one left column holding brand,
 * new-chat action, search, destinations, and history. The destinations live
 * here as labelled rows and fold to icon-only squares when the sidebar is
 * collapsed, so the collapsed rail is the same navigation, not a second one.
 *
 * The rows stay one per line: two columns halved the usable width and clipped
 * "Companion" at 11.5px, which reads as a broken label rather than a name.
 *
 * "Agen" is not a route; it is a view of the companion itself. It sits directly
 * under Companion at the same level, switches the center column to the detector
 * overview, and keeps an active highlight while that view is open. In the 60px
 * rail it survives as the Bot icon with the same accessible name. `< 768px` the
 * sidebar is a drawer and this block rides inside it.
 */

const DESTINATIONS: {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Rendered separately at the bottom: it is not a peer of the others. */
  emergency?: boolean;
}[] = [
  { href: "/companion", label: "Companion", icon: MessageSquare },
  { href: "/belajar", label: "Belajar", icon: GraduationCap },
  { href: "/simulasi", label: "Simulasi", icon: Swords },
  { href: "/komunitas", label: "Komunitas", icon: UsersRound },
];

function RailItem({
  href,
  label,
  icon: Icon,
  active,
  emergency = false,
  iconsOnly = false,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  emergency?: boolean;
  iconsOnly?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      data-pressable
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "relative flex min-w-0 items-center rounded-xl transition-[background-color,color] duration-150 ease-out",
        iconsOnly ? "size-10 justify-center" : "gap-2.5 px-3 py-2",
        emergency
          ? active
            ? "bg-danger text-bg"
            : "text-danger hover:bg-danger/10"
          : active
            ? "bg-gradient-to-r from-nav-active-from to-nav-active-to font-bold text-nav-active-ink"
            : "text-ink-soft hover:bg-brand-soft/60 hover:text-ink",
      )}
    >
      {active && !iconsOnly ? (
        <span
          aria-hidden
          className={cn(
            "absolute -left-3 top-1.5 bottom-1.5 w-1 rounded-r-full",
            emergency ? "bg-danger" : "bg-nav-active-icon",
          )}
        />
      ) : null}
      <Icon
        aria-hidden
        strokeWidth={1.8}
        fill={active ? "currentColor" : "none"}
        className={cn(
          "size-4 shrink-0",
          active && !emergency && "text-nav-active-icon",
        )}
      />
      <span
        className={cn(
          "truncate text-[12.5px]",
          active ? "font-bold" : "font-semibold",
          iconsOnly && "sr-only",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

/**
 * The "Agen" row. A button, not a link: it switches a view inside the shell
 * rather than navigating to another route, so it must not masquerade as one.
 */
function AgentItem({
  active,
  onShow,
  iconsOnly = false,
}: {
  active: boolean;
  onShow?: () => void;
  iconsOnly?: boolean;
}) {
  return (
    <button
      type="button"
      data-pressable
      aria-label="Agen pemeriksa"
      title="Agen pemeriksa"
      aria-current={active ? "page" : undefined}
      onClick={onShow}
      className={cn(
        "relative flex min-w-0 items-center rounded-xl transition-[background-color,color] duration-150 ease-out",
        iconsOnly
          ? "size-10 justify-center"
          : "w-full gap-2.5 px-3 py-2 text-left",
        active
          ? "bg-gradient-to-r from-nav-active-from to-nav-active-to font-bold text-nav-active-ink"
          : "text-ink-soft hover:bg-brand-soft/60 hover:text-ink",
      )}
    >
      {active && !iconsOnly ? (
        <span
          aria-hidden
          className="absolute -left-3 top-1.5 bottom-1.5 w-1 rounded-r-full bg-nav-active-icon"
        />
      ) : null}
      <Bot
        aria-hidden
        strokeWidth={1.8}
        fill={active ? "currentColor" : "none"}
        className={cn("size-4 shrink-0", active && "text-nav-active-icon")}
      />
      <span
        className={cn(
          "truncate text-[12.5px]",
          active ? "font-bold" : "font-semibold",
          iconsOnly ? "sr-only" : "min-w-0 flex-1",
        )}
      >
        Agen
      </span>
      {iconsOnly ? null : (
        <span
          aria-hidden
          className="shrink-0 rounded-full bg-panel-2 px-1.5 py-0.5 font-medium tabular text-[10.5px] text-ink-mute"
        >
          {AGENT_SEQUENCE.length}
        </span>
      )}
    </button>
  );
}

export function NavRail({
  className,
  iconsOnly = false,
  agentsActive = false,
  onShowAgents,
  onShowChat,
}: {
  className?: string;
  iconsOnly?: boolean;
  agentsActive?: boolean;
  onShowAgents?: () => void;
  /** Companion row: leave the agents view without changing the route. */
  onShowChat?: () => void;
}) {
  // `usePathname()` is null outside a mounted router (and in tests); without a
  // fallback the `.startsWith` below throws and takes the whole shell with it.
  const pathname = usePathname() ?? "";
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Navigasi utama"
      className={cn(
        "flex flex-col gap-0.5",
        iconsOnly && "items-center",
        className,
      )}
    >
      {DESTINATIONS.map((item, index) => (
        <Fragment key={item.href}>
          {item.emergency ? (
            <div
              aria-hidden
              className={cn(
                "my-1 border-t border-txt/[0.06]",
                iconsOnly ? "w-8" : "",
              )}
            />
          ) : null}
          <RailItem
            {...item}
            active={
              isActive(item.href) &&
              !(item.href === "/companion" && agentsActive)
            }
            iconsOnly={iconsOnly}
            onClick={item.href === "/companion" ? onShowChat : undefined}
          />
          {index === 0 ? (
            <AgentItem
              active={agentsActive}
              onShow={onShowAgents}
              iconsOnly={iconsOnly}
            />
          ) : null}
        </Fragment>
      ))}
    </nav>
  );
}
