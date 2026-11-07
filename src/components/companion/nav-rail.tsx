"use client";

import {
  GraduationCap,
  LifeBuoy,
  type LucideIcon,
  MessageSquare,
  Swords,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
 * What did not change: this product has four destinations, so the block holds
 * those four and nothing else. Invented entries would be decoration pretending
 * to be navigation. `< 768px` the sidebar is a drawer and this block rides
 * inside it.
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
  { href: "/darurat", label: "Darurat", icon: LifeBuoy, emergency: true },
];

function RailItem({
  href,
  label,
  icon: Icon,
  active,
  emergency = false,
  iconsOnly = false,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  emergency?: boolean;
  iconsOnly?: boolean;
}) {
  return (
    <Link
      href={href}
      data-pressable
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 items-center rounded-[7px] transition-[background-color,color] duration-150 ease-out",
        iconsOnly ? "size-9 justify-center" : "gap-2.5 px-2 py-[7px]",
        emergency
          ? active
            ? "bg-danger text-bg"
            : "text-danger hover:bg-danger/10"
          : active
            ? "bg-chip font-medium text-ink"
            : "text-ink-soft hover:bg-txt/6 hover:text-ink",
      )}
    >
      <Icon aria-hidden strokeWidth={1.75} className="size-[15px] shrink-0" />
      <span
        className={cn(
          "truncate font-medium text-[12.5px] leading-[1.5]",
          iconsOnly && "sr-only",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export function NavRail({
  className,
  iconsOnly = false,
}: {
  className?: string;
  iconsOnly?: boolean;
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
      {DESTINATIONS.map((item) => (
        <RailItem
          key={item.href}
          {...item}
          active={isActive(item.href)}
          iconsOnly={iconsOnly}
        />
      ))}
    </nav>
  );
}
