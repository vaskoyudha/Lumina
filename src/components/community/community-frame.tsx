"use client";

// Layout ported from ccrsxx/twitter-clone (MIT), revision 62a9588.
// See docs/licenses/twitter-clone-MIT.txt and docs/community-ui-research.md.
import {
  BookOpen,
  Feather,
  Home,
  MessagesSquare,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Swords,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LuminaLogo } from "@/components/brand/lumina-logo";
import { EXPLORE_EVENT } from "@/components/community/community-explore";
import { CommunityRules } from "@/components/community/community-view";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

export function CommunityFrame({
  children,
  session,
  moderator = false,
}: {
  children: ReactNode;
  session: { nama: string; email: string } | null;
  moderator?: boolean;
}) {
  const pathname = usePathname();
  const links = [
    {
      href: "/komunitas",
      label: "Beranda",
      icon: Home,
      mobile: true,
      active: pathname === "/komunitas",
    },
    {
      href: "/komunitas#jelajahi",
      label: "Jelajahi",
      icon: Search,
      mobile: true,
    },
    {
      href: "/companion",
      label: "Companion",
      icon: MessagesSquare,
      mobile: true,
    },
    { href: "/belajar", label: "Belajar", icon: BookOpen },
    { href: "/simulasi", label: "Simulasi", icon: Swords },
    {
      href: session ? "/profil" : "/masuk",
      label: "Profil",
      icon: UserRound,
      mobile: true,
    },
  ];
  return (
    <div className="community-twitter flex h-dvh w-full justify-center overflow-y-auto bg-bg text-txt lg:gap-4">
      <a
        href="#community-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-panel focus:p-3"
      >
        Langsung ke konten
      </a>
      <header className="flex w-0 shrink-0 min-[500px]:w-20 md:w-24 xl:-mr-4 xl:w-full xl:max-w-xs xl:justify-end">
        <div className="fixed bottom-0 z-20 flex w-full flex-col justify-between border-t border-line bg-bg min-[500px]:top-0 min-[500px]:h-dvh min-[500px]:w-auto min-[500px]:border-0 min-[500px]:px-2 min-[500px]:py-3 md:px-4 xl:w-72">
          <div className="flex flex-col gap-2 min-[500px]:items-center xl:items-stretch">
            <Link
              href="/"
              aria-label="Lumina — beranda"
              className="hidden size-14 items-center justify-center rounded-full hover:bg-panel-2 min-[500px]:flex"
            >
              <LuminaLogo variant="mark" className="!size-8" />
            </Link>
            <nav
              aria-label="Navigasi komunitas"
              className="flex items-center justify-around min-[500px]:flex-col xl:items-start"
            >
              {links.map(({ href, label, icon: Icon, mobile, active }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  onClick={
                    href.endsWith("#jelajahi")
                      ? () => window.dispatchEvent(new Event(EXPLORE_EVENT))
                      : undefined
                  }
                  className={cn(
                    "group py-1 outline-none",
                    mobile ? "flex" : "hidden min-[500px]:flex",
                  )}
                >
                  <span
                    className={cn(
                      "flex min-h-12 items-center justify-center gap-4 rounded-full p-3 text-xl transition-colors group-hover:bg-panel-2 group-focus-visible:ring-2 group-focus-visible:ring-brand xl:pr-5",
                      active && "font-bold",
                    )}
                  >
                    <Icon
                      aria-hidden
                      className="size-7"
                      strokeWidth={active ? 2.5 : 1.8}
                    />
                    <span className="hidden xl:block">{label}</span>
                  </span>
                </Link>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Menu komunitas"
                    className="size-12 rounded-full min-[500px]:hidden"
                  >
                    <MoreHorizontal aria-hidden className="!size-7" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="end"
                  className="community-twitter min-w-48"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/belajar">
                        <BookOpen aria-hidden />
                        Belajar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/simulasi">
                        <Swords aria-hidden />
                        Simulasi
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/">
                        <Home aria-hidden />
                        Tentang Lumina
                      </Link>
                    </DropdownMenuItem>
                    {moderator && (
                      <DropdownMenuItem asChild>
                        <Link href="/komunitas/moderasi">
                          <ShieldCheck aria-hidden />
                          Moderasi
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {moderator && (
                <Link
                  href="/komunitas/moderasi"
                  aria-label="Moderasi"
                  className="hidden items-center gap-4 rounded-full p-3 text-xl hover:bg-panel-2 min-[500px]:flex"
                >
                  <ShieldCheck aria-hidden className="size-7" />
                  <span className="hidden xl:block">Moderasi</span>
                </Link>
              )}
            </nav>
            <Button
              asChild
              className="absolute right-4 bottom-20 size-14 rounded-full bg-brand text-white shadow-md hover:bg-brand-strong min-[500px]:static min-[500px]:mt-2 min-[500px]:shadow-none xl:h-14 xl:w-11/12"
            >
              <Link
                href={session ? "/komunitas/baru" : "/masuk"}
                aria-label={
                  session ? "Tulis diskusi" : "Masuk untuk berdiskusi"
                }
              >
                <Feather aria-hidden className="!size-6 xl:hidden" />
                <span className="hidden text-lg font-bold xl:block">
                  Tulis diskusi
                </span>
              </Link>
            </Button>
          </div>
          <div className="hidden min-[500px]:block">
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    aria-label={`Akun ${session.nama}`}
                    className="h-auto min-h-16 w-full justify-between gap-3 rounded-full p-2 xl:p-3"
                  >
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-panel-2 text-txt">
                        {session.nama.trim().charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden min-w-0 flex-1 text-left xl:block">
                      <span className="block truncate text-sm font-bold">
                        {session.nama}
                      </span>
                      <span className="block text-sm font-normal text-dim">
                        Akun Lumina
                      </span>
                    </span>
                    <MoreHorizontal
                      aria-hidden
                      className="hidden size-5 xl:block"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="start"
                  className="community-twitter w-64"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>
                      <span className="block truncate">{session.nama}</span>
                      <span className="block truncate font-normal text-dim">
                        {session.email}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profil">Profil</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/masuk">Ganti akun</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <form action={logout}>
                        <button type="submit" className="w-full text-left">
                          Keluar
                        </button>
                      </form>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                variant="outline"
                className="min-h-12 rounded-full xl:w-full"
              >
                <Link href="/masuk" aria-label="Masuk">
                  <UserRound aria-hidden />
                  <span className="hidden xl:inline">Masuk</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main
        id="community-content"
        tabIndex={-1}
        className="min-h-full w-full max-w-xl min-w-0 shrink-0 border-x-0 border-line pb-28 outline-none min-[500px]:w-auto min-[500px]:flex-1 min-[500px]:border-x"
      >
        {children}
      </main>
      <aside
        aria-label="Jelajahi komunitas"
        className="hidden w-96 shrink-0 flex-col gap-4 px-4 pt-1 pb-8 lg:flex"
      >
        <form method="get" action="/komunitas" className="relative py-1">
          <label htmlFor="community-rail-search" className="sr-only">
            Cari di komunitas
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-4 left-5 size-5 text-dim"
          />
          <input
            id="community-rail-search"
            name="q"
            placeholder="Cari di komunitas"
            maxLength={120}
            className="h-11 w-full rounded-full bg-panel-2 pr-4 pl-14 text-sm outline-none focus:ring-1 focus:ring-brand"
          />
        </form>
        <CommunityRules moderator={moderator} />
        <footer className="flex flex-wrap gap-x-3 gap-y-1 px-4 text-xs text-dim">
          <Link href="/" className="hover:underline">
            Tentang Lumina
          </Link>
          <Link href="/belajar" className="hover:underline">
            Belajar
          </Link>
          <Link href="/companion" className="hover:underline">
            Companion
          </Link>
          <span>© Lumina</span>
        </footer>
      </aside>
    </div>
  );
}
