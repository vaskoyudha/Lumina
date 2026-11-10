"use client";

import { Bell, Bookmark, History, Home, Search } from "lucide-react";
import Link from "next/link";
import { EXPLORE_EVENT } from "@/components/community/community-explore";
import { cn } from "@/lib/utils";

export type CommunityNavKey =
  | "beranda"
  | "cari"
  | "kabar"
  | "disimpan"
  | "riwayat";

const ITEMS: {
  key: CommunityNavKey;
  href: string;
  label: string;
  icon: typeof Home;
}[] = [
  { key: "beranda", href: "/komunitas", label: "Beranda", icon: Home },
  { key: "cari", href: "/komunitas#jelajahi", label: "Cari", icon: Search },
  { key: "kabar", href: "/komunitas?sort=ramai", label: "Kabar", icon: Bell },
  {
    key: "disimpan",
    href: "/komunitas?saved=1",
    label: "Disimpan",
    icon: Bookmark,
  },
  {
    key: "riwayat",
    href: "/komunitas?mine=1",
    label: "Riwayat",
    icon: History,
  },
];

/**
 * Bottom navigation for `/komunitas`.
 *
 * It carries the shortcuts the X reference keeps in its left rail — home,
 * search, activity, saved posts, and the viewer's own history — but docks them
 * at the bottom of the timeline instead of adding a second navigation tree to
 * the shared workspace sidebar. "Kabar" opens the busiest discussions;
 * "Disimpan" lists this account's saved posts; "Riwayat" filters the feed to
 * posts owned by the signed-in account.
 */
export function CommunityBottomNav({ active }: { active: CommunityNavKey }) {
  const activeIndex = ITEMS.findIndex((item) => item.key === active);
  return (
    <nav
      aria-label="Navigasi komunitas"
      className="sticky bottom-3 z-20 grid grid-cols-5 gap-1 rounded-[20px] border border-white/80 bg-panel/95 p-1.5 shadow-panel backdrop-blur-md"
    >
      {ITEMS.map(({ key, href, label, icon: Icon }) => {
        const current = key === active;
        return (
          <Link
            key={key}
            href={href}
            aria-current={current ? "page" : undefined}
            onClick={
              key === "cari"
                ? () => window.dispatchEvent(new Event(EXPLORE_EVENT))
                : undefined
            }
            className={cn(
              "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 text-[11px] transition-[background-color,color] duration-150 ease-out",
              current
                ? "bg-gradient-to-r from-nav-active-from to-nav-active-to font-bold text-nav-active-ink"
                : "text-dim hover:bg-brand-soft/60 hover:text-ink",
            )}
          >
            <Icon
              aria-hidden
              className={cn("size-5", current && "text-nav-active-icon")}
              strokeWidth={1.8}
              fill={current ? "currentColor" : "none"}
            />
            {label}
          </Link>
        );
      })}
      {activeIndex >= 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-1.5 bottom-0 grid grid-cols-5 gap-1"
        >
          <span
            className="h-1 w-12 justify-self-center rounded-full bg-nav-active-icon"
            style={{ gridColumnStart: activeIndex + 1 }}
          />
        </div>
      )}
    </nav>
  );
}
