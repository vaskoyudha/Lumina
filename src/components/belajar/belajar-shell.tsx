import type { ReactNode } from "react";
import { BelajarRail } from "@/components/belajar/belajar-rail";
import { cn } from "@/lib/utils";

/**
 * Shared three-column frame for the learning surface: icon rail, the readable
 * column, and an optional aside (progress, badges, next module). Below `lg`
 * the three stack in source order — rail, article, aside — and nothing is
 * clipped at 380px.
 *
 * The rail is a real navigation landmark; the aside is not a landmark, so a
 * page that omits it simply gives the article the full width.
 */

export function BelajarShell({
  children,
  aside,
  className,
}: {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className="appnext-container py-8 sm:py-10">
      <div
        className={cn(
          "grid items-start gap-6 lg:grid-cols-[3.5rem_minmax(0,1fr)] lg:gap-8",
          aside && "xl:grid-cols-[3.5rem_minmax(0,1fr)_20rem]",
          className,
        )}
      >
        <BelajarRail />
        {/* The `(app)` layout already owns the page's `<main>` landmark. */}
        <div className="min-w-0">{children}</div>
        {aside ? <aside className="min-w-0">{aside}</aside> : null}
      </div>
    </div>
  );
}
