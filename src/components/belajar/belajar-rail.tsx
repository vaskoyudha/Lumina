"use client";

import { Award, BookOpen, PlayCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * The dashboard's left rail. Three destinations, all real: the catalog, the
 * simulation list, and the badge list further down the catalog page. Icon-only
 * on desktop, so every item keeps its name in the accessible tree; on phones
 * the rail becomes a wrapping row of pills.
 *
 * No invented destination is added just to fill the rail.
 */

const ITEMS = [
  { href: "/belajar", label: "Katalog", Icon: BookOpen, anchored: false },
  { href: "/simulasi", label: "Latihan", Icon: PlayCircle, anchored: false },
  { href: "/belajar#lencana", label: "Lencana", Icon: Award, anchored: true },
] as const;

export function BelajarRail() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi belajar"
      className="flex flex-wrap items-center gap-1 lg:sticky lg:top-24 lg:flex-col lg:gap-2"
    >
      {ITEMS.map(({ href, label, Icon, anchored }) => {
        const active =
          !anchored && (pathname === href || pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            title={label}
            data-pressable
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm lg:size-11 lg:justify-center lg:px-0",
              active
                ? "bg-panel-2 font-medium text-txt"
                : "text-dim hover:bg-panel-2 hover:text-txt",
            )}
          >
            <Icon aria-hidden className="size-5 shrink-0" />
            <span className="lg:sr-only">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
