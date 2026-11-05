"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * BackButton — a control, not a bare "← text" link.
 *
 * Measured against the patterns that hold up in review:
 * a. 40px tall hit area (44 on touch), never a bare icon at text size.
 * b. The chevron nudges left on hover; the hit area stays put. Moving the whole
 *    button toward the cursor makes it slide out from under the pointer and
 *    flicker.
 * c. Hover only fires for fine pointers — touch devices otherwise keep the
 *    button looking "stuck on" after a tap.
 * d. Press feedback comes from the global 0.96 scale, not a local copy.
 */
export function BackButton({
  href,
  label = "Kembali",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      data-pressable
      className={cn(
        "group inline-flex h-10 w-fit items-center gap-1.5 rounded-full border border-line bg-panel pr-3.5 pl-2.5",
        "text-dim text-sm hover:border-line hover:bg-panel-2 hover:text-txt",
        className,
      )}
    >
      <span className="grid size-6 place-items-center rounded-full bg-panel-2 transition-colors duration-200 group-hover:bg-line/60">
        <ChevronLeft
          aria-hidden
          className="arrow-nudge arrow-nudge--left size-3.5"
        />
      </span>
      {label}
    </Link>
  );
}
