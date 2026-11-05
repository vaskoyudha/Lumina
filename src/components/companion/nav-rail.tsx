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
 * Navigation rail — the far-left column of the chat shell.
 *
 * Metrics copied from the reference (`StudioNavigationRail.vue`): a 64px
 * column, 12px/8px padding, 44x44 items on a 6px radius, 8px gap, icon in the
 * muted colour and the active item on a 12% tint of the accent. Below 768px
 * the rail collapses and navigation moves into the chat header.
 *
 * What changed, and why: the reference's rail holds product areas for a
 * desktop agent studio (connections, workflows, models, files, terminal). This
 * product has four destinations, so the rail holds those four and nothing else.
 * A rail with invented entries would be decoration pretending to be navigation.
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
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  emergency?: boolean;
}) {
  return (
    <Link
      href={href}
      data-pressable
      aria-label={label}
      aria-current={active ? "page" : undefined}
      title={label}
      className={cn(
        "grid size-11 place-items-center rounded-md transition-[background-color,color] duration-150 ease-out",
        emergency
          ? active
            ? "bg-danger text-white"
            : "text-danger hover:bg-danger/10"
          : active
            ? "bg-txt/12 text-txt"
            : "text-dim hover:bg-txt/6 hover:text-txt",
      )}
    >
      <Icon aria-hidden strokeWidth={1.6} className="size-[18px]" />
    </Link>
  );
}

export function NavRail() {
  // `usePathname()` is null outside a mounted router (and in tests); without a
  // fallback the `.startsWith` below throws and takes the whole shell with it.
  const pathname = usePathname() ?? "";
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const regular = DESTINATIONS.filter((d) => !d.emergency);
  const emergency = DESTINATIONS.find((d) => d.emergency);

  return (
    <nav
      aria-label="Navigasi utama"
      className="flex w-16 shrink-0 flex-col items-center px-2 py-3 max-md:hidden"
    >
      <Link
        href="/"
        data-pressable
        aria-label="Lumina — beranda"
        className="mb-3 grid size-9 place-items-center rounded-md bg-txt font-bold text-bg text-sm"
      >
        L
      </Link>

      <div className="flex w-full flex-1 flex-col items-center gap-2">
        {regular.map((item) => (
          <RailItem key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </div>

      {emergency ? (
        <div className="flex w-full flex-col items-center gap-2 border-line border-t pt-3">
          <RailItem {...emergency} active={isActive(emergency.href)} />
        </div>
      ) : null}
    </nav>
  );
}
