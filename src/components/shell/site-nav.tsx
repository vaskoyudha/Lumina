"use client";

import { LifeBuoy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shell nav — 4 destinations, reachable at 380px (§5-D).
 *
 * Emergency is visually separate from the three learning destinations: it is
 * the one path used by someone who is being defrauded right now.
 */

const DESTINATIONS = [
  { href: "/companion", label: "Companion" },
  { href: "/belajar", label: "Belajar" },
  { href: "/simulasi", label: "Simulasi" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          data-pressable
          className="font-semibold text-txt text-lg tracking-tight"
        >
          Lumina
        </Link>

        {/* Destination row. On phones it takes its own line instead of being a
            horizontal scroller, so no link is ever hidden off-screen at 380px. */}
        <nav
          aria-label="Navigasi utama"
          className="order-3 flex w-full flex-wrap items-center gap-1 sm:order-none sm:w-auto sm:flex-1"
        >
          {DESTINATIONS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                data-pressable
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-sm",
                  active
                    ? "bg-panel-2 font-medium text-txt"
                    : "text-dim hover:bg-panel-2 hover:text-txt",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <Button
          asChild
          className={cn(
            "ml-auto h-11 shrink-0 rounded-full bg-[var(--appnext-danger)] px-4.5 text-white hover:bg-[var(--appnext-danger-deep)]",
            pathname.startsWith("/darurat") &&
              "ring-2 ring-danger ring-offset-2",
          )}
        >
          <Link href="/darurat" data-pressable>
            <LifeBuoy aria-hidden />
            Darurat
          </Link>
        </Button>
      </div>
    </header>
  );
}
