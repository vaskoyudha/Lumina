import {
  Briefcase,
  CalendarClock,
  Gift,
  HeartHandshake,
  Landmark,
  Link2,
  type LucideIcon,
  MonitorSmartphone,
  PhoneCall,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visual vocabulary shared by the catalog card and the module header. The
 * reference dashboard gives every course a painted thumbnail; most schemes get
 * a token-coloured cover and a topic glyph instead of a fake screenshot, while
 * modules with supplied art use the illustration itself.
 */

const COVER_ART: Record<number, string> = {
  1: "/images/belajar/modul-01.jpg",
  2: "/images/belajar/modul-02.jpg",
  3: "/images/belajar/modul-03.jpg",
  4: "/images/belajar/modul-04.jpg",
  5: "/images/belajar/modul-05.jpg",
  6: "/images/belajar/modul-06.jpg",
  7: "/images/belajar/modul-07.jpg",
  8: "/images/belajar/modul-08.jpg",
  9: "/images/belajar/modul-09.jpg",
  10: "/images/belajar/modul-10.jpg",
  11: "/images/belajar/modul-11.jpg",
  12: "/images/belajar/modul-12.jpg",
};

export function coverArtFor(no: number): string | null {
  return COVER_ART[no] ?? null;
}

const COVER_ICON: Record<number, LucideIcon> = {
  1: ShoppingBag,
  2: PhoneCall,
  3: TrendingUp,
  4: Briefcase,
  5: Gift,
  6: HeartHandshake,
  7: Link2,
  8: MonitorSmartphone,
  9: Landmark,
  10: Smartphone,
  11: QrCode,
  12: CalendarClock,
};

export function CoverIcon({
  no,
  className,
}: {
  no: number;
  className?: string;
}) {
  const Icon = COVER_ICON[no] ?? ShieldCheck;
  return <Icon aria-hidden className={className} />;
}

/** Three-bar difficulty signal, matching the badge in the reference cards. */
export function LevelSignalBadge({
  level,
  className,
}: {
  level: number;
  className?: string;
}) {
  const heights = ["h-1.5", "h-2.5", "h-3"] as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-[var(--appnext-ink-2)]/90 px-2.5 py-1 font-semibold text-[11px] text-bg shadow-md backdrop-blur-md",
        className,
      )}
    >
      <span>Level {level}</span>
      <span aria-hidden className="flex h-3 items-end gap-0.5">
        {heights.map((height, i) => (
          <span
            key={height}
            className={cn(
              "w-[2.5px] rounded-full",
              height,
              level >= i + 1 ? "bg-bg" : "bg-bg/30",
            )}
          />
        ))}
      </span>
    </span>
  );
}
