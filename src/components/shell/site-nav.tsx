"use client";

import { LifeBuoy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
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

export function SiteNav({
  session,
}: {
  session?: { nama: string; email: string } | null;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-panel">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          data-pressable
          className="font-semibold text-txt text-lg tracking-tight"
        >
          Lumina
        </Link>

        <nav
          aria-label="Navigasi utama"
          /*
            On phones the three destinations get their own row and wrap. The
            previous `overflow-x-auto` row scrolled them out of sight: at 380px
            the nav held 261px of content in a 123px box, so "Belajar" and
            "Simulasi" were clipped behind a scroller and the Darurat button
            overlapped them. A destination you cannot see is not reachable.
          */
          className="order-3 -mx-1 flex w-full basis-full flex-wrap items-center gap-1 px-1 sm:order-none sm:mx-0 sm:w-auto sm:min-w-0 sm:flex-1 sm:basis-auto sm:px-0"
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
                  "shrink-0 rounded-md px-3 py-1.5 text-sm",
                  active
                    ? "bg-panel-2 text-txt"
                    : "text-dim hover:bg-panel-2 hover:text-txt",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/darurat"
          data-pressable
          className={cn(
            "ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium text-sm",
            pathname.startsWith("/darurat")
              ? "border-danger bg-danger text-bg"
              : "border-danger/60 bg-danger/10 text-danger hover:bg-danger/20",
          )}
        >
          <LifeBuoy aria-hidden className="size-4" />
          Darurat
        </Link>

        {session ? (
          <UserMenu nama={session.nama} email={session.email} />
        ) : (
          <Link
            href="/masuk"
            data-pressable
            className="shrink-0 rounded-md px-3 py-1.5 text-dim text-sm hover:bg-panel-2 hover:text-txt"
          >
            Masuk
          </Link>
        )}
      </div>
    </header>
  );
}
