import { cn } from "@/lib/utils";

/**
 * Learning-curve level (§11.4), 1..5, drawn as five rising bars. The number is
 * always printed next to the bars: hue alone is not a label, and the demo has
 * to survive colour-blindness and a projector.
 */

const BAR_HEIGHT = ["h-1.5", "h-2", "h-2.5", "h-3", "h-3.5"] as const;

export function LevelMeter({
  level,
  className,
}: {
  level: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span aria-hidden className="flex items-end gap-0.5">
        {BAR_HEIGHT.map((height, i) => (
          <span
            key={height}
            className={cn(
              "w-1 rounded-full",
              height,
              i < level ? "bg-[var(--appnext-accent-deep)]" : "bg-line",
            )}
          />
        ))}
      </span>
      <span className="tabular text-dim text-xs">Level {level}</span>
    </span>
  );
}
