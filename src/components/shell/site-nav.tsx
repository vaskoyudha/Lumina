"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuminaLogo } from "@/components/brand/lumina-logo";
import { AuthNav } from "@/components/shell/auth-nav";
import { cn } from "@/lib/utils";

/** Four destinations wrap at mobile widths. */

const DESTINATIONS = [
  { href: "/companion", label: "Companion" },
  { href: "/belajar", label: "Belajar" },
  { href: "/simulasi", label: "Simulasi" },
  { href: "/komunitas", label: "Komunitas" },
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
          aria-label="Lumina — beranda"
          className="inline-flex min-h-11 items-center"
        >
          <LuminaLogo className="h-[30px] w-auto" />
        </Link>

        <nav
          aria-label="Navigasi utama"
          /*
            On phones the three destinations get their own row and wrap. The
            previous `overflow-x-auto` row scrolled them out of sight: at 380px
            the nav held 261px of content in a 123px box, so "Belajar" and
            "Simulasi" were clipped behind a scroller and the old action button
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
                  "inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-1.5 text-sm",
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

        <AuthNav session={session ?? null} />
      </div>
    </header>
  );
}
