"use client";

import { ArrowUpRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuminaLogo } from "@/components/brand/lumina-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Admin chrome — same visual language as the learner nav (white sticky bar,
 * 6xl container, pill destinations, one solid action on the right), but the
 * destinations stay inside the admin area.
 *
 * That split is intentional: `/admin` is a different area, not a page in the
 * learner app, so its nav must not offer Companion/Belajar/Simulasi/Darurat.
 * Shared layout classes are duplicated from `site-nav.tsx` rather than
 * refactored there, because `components/shell/` belongs to Stream D.
 */

const DESTINATIONS = [{ href: "/admin", label: "Kurikulum" }] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-panel">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/admin" data-pressable className="flex items-center gap-2">
          <LuminaLogo className="h-[28px] w-auto" />
          <Badge variant="secondary" className="gap-1">
            <LayoutDashboard aria-hidden />
            Admin
          </Badge>
        </Link>

        {/* Same responsive rule as the learner nav: on phones the destination
            row takes its own line instead of becoming a horizontal scroller. */}
        <nav
          aria-label="Navigasi admin"
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
          className="ml-auto h-11 shrink-0 rounded-full border border-ink-line bg-[var(--appnext-ink-2)] px-4.5 text-bg hover:bg-[var(--appnext-accent-deep)]"
        >
          <Link href="/" data-pressable>
            <ArrowUpRight aria-hidden />
            Lihat aplikasi murid
          </Link>
        </Button>
      </div>
    </header>
  );
}
