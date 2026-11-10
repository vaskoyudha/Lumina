"use client";

import { MoreHorizontal, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CATEGORIES,
  type Category,
  type CommunityPost,
} from "@/lib/community/schema";

type RailPost = Pick<
  CommunityPost,
  "id" | "title" | "author" | "category" | "createdAt" | "replies"
>;

const HOUR = 60 * 60 * 1000;

function timeAgo(value: string): string {
  const hours = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(value)) / HOUR),
  );
  if (hours < 1) return "baru saja";
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function CategoryLabel({ category }: { category: Category }) {
  return CATEGORIES[category].label;
}

/**
 * Right rail for `/komunitas`, shaped like the X sidebar cards: search, a
 * dismissible "Kabar komunitas" list built from the newest real posts, and a
 * "Yang sedang dibahas" list built from the busiest posts. Nothing here is
 * invented; when the database is unavailable the lists stay empty.
 */
export function CommunityAside({
  moderator = false,
  latest = [],
  trending = [],
}: {
  moderator?: boolean;
  latest?: RailPost[];
  trending?: RailPost[];
}) {
  const [newsOpen, setNewsOpen] = useState(true);
  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-0 rounded-card border border-line py-0 ring-0 shadow-[var(--appnext-shadow-ambient)]">
        <form method="get" action="/komunitas" className="relative p-3">
          <label htmlFor="community-rail-search" className="sr-only">
            Cari di komunitas
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-6 left-6 size-4 text-dim"
          />
          <input
            id="community-rail-search"
            name="q"
            placeholder="Cari di komunitas"
            maxLength={120}
            className="h-11 w-full rounded-full border border-line bg-panel-2 pr-4 pl-10 text-sm text-txt outline-none placeholder:text-dim focus-visible:border-brand-line focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </form>
      </Card>

      {newsOpen && (
        <Card
          data-testid="community-news"
          className="gap-0 overflow-hidden rounded-card border border-line py-0 ring-0 shadow-[var(--appnext-shadow-ambient)]"
        >
          <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1">
            <h2 className="text-lg font-bold text-txt">Kabar komunitas</h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Tutup kabar komunitas"
              className="size-8 rounded-full text-dim"
              onClick={() => setNewsOpen(false)}
            >
              <X aria-hidden />
            </Button>
          </div>
          {latest.length ? (
            <ul className="divide-y divide-line">
              {latest.slice(0, 3).map((post) => (
                <li key={post.id} className="px-4 py-3">
                  <Link
                    href={`/komunitas/${post.id}`}
                    className="text-sm font-semibold leading-snug text-txt hover:underline [overflow-wrap:anywhere]"
                  >
                    {post.title}
                  </Link>
                  <div className="mt-2 flex min-w-0 items-center gap-2">
                    <Avatar className="size-6 shrink-0">
                      <AvatarFallback className="bg-brand-soft text-[10px] text-brand-ink">
                        {post.author.trim().charAt(0).toUpperCase() || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="truncate text-xs text-dim">
                      {timeAgo(post.createdAt)} ·{" "}
                      <CategoryLabel category={post.category} /> ·{" "}
                      {post.replies} balasan
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 pb-4 text-xs text-dim">
              Belum ada kabar dari komunitas.
            </p>
          )}
        </Card>
      )}

      <Card className="gap-0 overflow-hidden rounded-card border border-line py-0 ring-0 shadow-[var(--appnext-shadow-ambient)]">
        <div className="px-4 pt-3 pb-1">
          <h2 className="text-lg font-bold text-txt">Yang sedang dibahas</h2>
        </div>
        {trending.length ? (
          <ul className="divide-y divide-line">
            {trending.slice(0, 4).map((post) => (
              <li
                key={post.id}
                className="flex items-start justify-between gap-2 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-xs text-dim">
                    <CategoryLabel category={post.category} /> · Trending
                  </p>
                  <Link
                    href={`/komunitas/${post.id}`}
                    className="mt-0.5 block text-sm font-semibold leading-snug text-txt hover:underline [overflow-wrap:anywhere]"
                  >
                    {post.title}
                  </Link>
                </div>
                <Link
                  href={`/komunitas/${post.id}`}
                  aria-label={`Buka diskusi ${post.title}`}
                  className="shrink-0 rounded-full p-1 text-dim hover:bg-panel-2 hover:text-txt"
                >
                  <MoreHorizontal aria-hidden className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 pb-3 text-xs text-dim">
            Belum ada diskusi yang ramai.
          </p>
        )}
        <Link
          href="/komunitas?sort=ramai"
          className="block border-t border-line px-4 py-3 text-sm text-brand-ink hover:bg-panel-2"
        >
          Lihat semua
        </Link>
      </Card>

      {moderator && (
        <Button asChild variant="outline" className="min-h-11 justify-start">
          <Link href="/komunitas/moderasi">Tinjau laporan komunitas</Link>
        </Button>
      )}
    </div>
  );
}
