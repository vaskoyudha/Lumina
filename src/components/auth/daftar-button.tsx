"use client";

import { cn } from "@/lib/utils";

type DaftarButtonSize = "md" | "sm" | "xs";

const OUTER: Record<DaftarButtonSize, string> = {
  md: "min-h-11 text-xs sm:text-sm",
  sm: "h-8 min-h-0 text-[12px]",
  xs: "min-h-9 w-full text-[11.5px]",
};

const INNER: Record<DaftarButtonSize, string> = {
  md: "gap-3 rounded-[10px] px-4 py-2",
  sm: "h-full gap-2 rounded-[8px] px-3 py-0",
  xs: "h-full gap-1.5 rounded-[7px] px-3 py-0",
};

const ICON: Record<DaftarButtonSize, string> = {
  md: "size-[15px]",
  sm: "size-3",
  xs: "size-3",
};

/**
 * Register trigger using the Uiverse layered-dark treatment: a 2px gradient
 * ring, charcoal radial-gradient fill, conic noise overlay, and a play glyph.
 * Colours come from the dedicated `charcoal` ramp, kept separate from the
 * `obsidian` surface tokens so the button can be tuned without shifting the
 * rest of the dark UI. It reads the same on the landing cream surface and on
 * the app chrome.
 *
 * The dialog wiring stays with the caller; this only owns the look and the
 * click. `size` adapts the box without changing the visual recipe:
 * `md` for a navbar, `sm` for a compact 32px slot, `xs` for the sidebar grid.
 */
export function DaftarButton({
  onClick,
  size = "md",
  className,
  contentClassName,
}: {
  onClick: () => void;
  size?: DaftarButtonSize;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <button
      type="button"
      data-pressable
      aria-haspopup="dialog"
      onClick={onClick}
      className={cn(
        "group/daftar relative inline-flex shrink-0 items-center overflow-hidden rounded-xl",
        "bg-charcoal-ring",
        "p-[2px] font-semibold text-charcoal-50 shadow-md",
        "transition-transform duration-200 ease-out active:scale-[0.97]",
        OUTER[size],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[repeating-conic-gradient(var(--color-charcoal-400)_0.0000001%,var(--color-charcoal-300)_0.000104%)] opacity-10 contrast-[1.05] [background-position:60%_60%] [background-size:600%_600%]"
      />
      <span
        className={cn(
          "flex w-full items-center justify-center bg-charcoal-700",
          "transition-colors duration-300 ease-out",
          "[background-image:radial-gradient(at_95%_89%,var(--color-charcoal-950)_0px,transparent_50%),radial-gradient(at_0%_100%,var(--color-charcoal-900)_0px,transparent_50%),radial-gradient(at_0%_0%,var(--color-charcoal-700)_0px,transparent_50%)]",
          "[text-shadow:0_0_20px_var(--color-charcoal-100)] group-hover/daftar:bg-charcoal-800",
          INNER[size],
          contentClassName,
        )}
      >
        Daftar
        <svg
          aria-hidden="true"
          className={cn("shrink-0", ICON[size])}
          viewBox="0 0 53 58"
          fill="none"
        >
          <path
            strokeWidth="9"
            stroke="currentColor"
            d="M44.25 36.3612L17.25 51.9497C11.5833 55.2213 4.5 51.1318 4.50001 44.5885L4.50001 13.4115C4.50001 6.86824 11.5833 2.77868 17.25 6.05033L44.25 21.6388C49.9167 24.9104 49.9167 33.0896 44.25 36.3612Z"
          />
        </svg>
      </span>
    </button>
  );
}
