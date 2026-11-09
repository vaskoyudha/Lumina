"use client";

import {
  ArrowLeftRight,
  BookOpen,
  Briefcase,
  ChevronsUpDown,
  GraduationCap,
  LifeBuoy,
  LogIn,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthDialog, type AuthTab } from "@/components/auth/auth-dialog";
import { DaftarButton } from "@/components/auth/daftar-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

export interface CompanionSession {
  nama: string;
  email: string;
}

function initialsFor(nama: string): string {
  const parts = nama.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

/**
 * The signed-in profile row. It is the bottom anchor of the sidebar, so it
 * carries the person's identity and folds the account actions into one menu
 * instead of making the whole card a single link. Clicking the name opens the
 * menu; the compact rail opens the same menu from the avatar.
 */
function ProfileMenu({
  session,
  iconsOnly = false,
}: {
  session: CompanionSession;
  iconsOnly?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {iconsOnly ? (
          <button
            type="button"
            data-pressable
            aria-label={`Akun ${session.nama}`}
            title={`Akun ${session.nama}`}
            className="grid size-10 place-items-center rounded-full bg-brand-soft font-semibold text-[11.5px] text-brand-ink transition-[background-color,color] duration-150 ease-out hover:bg-brand-soft-2"
          >
            {initialsFor(session.nama)}
          </button>
        ) : (
          <button
            type="button"
            data-pressable
            aria-label={`Akun ${session.nama}`}
            className="group flex w-full items-center gap-2.5 rounded-[12px] border border-hairline bg-panel p-2 text-left shadow-rest transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-edge hover:bg-chip"
          >
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-brand-soft font-semibold text-[11.5px] text-brand-ink">
                {initialsFor(session.nama)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-[13px] leading-5 text-txt">
                {session.nama}
              </span>
              <span className="block truncate text-[11px] leading-4 text-ink-faint">
                {session.email}
              </span>
            </span>
            <ChevronsUpDown
              aria-hidden
              strokeWidth={1.8}
              className="size-3.5 shrink-0 text-ink-faint transition-[color,rotate] duration-150 group-hover:text-ink-mute group-data-[state=open]:rotate-180"
            />
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={iconsOnly ? "start" : "end"}
        side={iconsOnly ? "right" : "top"}
        sideOffset={8}
        className="max-h-[min(26rem,calc(100dvh-5rem))] w-[228px] overflow-y-auto"
      >
        <DropdownMenuLabel className="flex items-center gap-2.5 px-1.5 py-2">
          <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-brand-soft font-semibold text-[12px] text-brand-ink">
              {initialsFor(session.nama)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate font-medium text-[13px] text-txt">
              {session.nama}
            </span>
            <span className="block truncate text-[11px] text-dim">
              {session.email}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-1.5 pt-1 pb-0.5 font-medium text-[10px] text-ink-faint uppercase tracking-[0.1em]">
            Akun
          </DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href="/profil" className="flex items-center gap-2">
              <UserRound aria-hidden className="size-4" />
              Profil saya
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profil#kemajuan" className="flex items-center gap-2">
              <GraduationCap aria-hidden className="size-4" />
              Kemajuan belajar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profil#loker" className="flex items-center gap-2">
              <Briefcase aria-hidden className="size-4" />
              Lowongan tersimpan
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/masuk" className="flex items-center gap-2">
              <ArrowLeftRight aria-hidden className="size-4" />
              Ganti akun
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-1.5 pt-1 pb-0.5 font-medium text-[10px] text-ink-faint uppercase tracking-[0.1em]">
            Bantuan
          </DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link
              href="/profil#akun-privasi"
              className="flex items-center gap-2"
            >
              <ShieldCheck aria-hidden className="size-4" />
              Privasi &amp; keamanan
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/belajar" className="flex items-center gap-2">
              <BookOpen aria-hidden className="size-4" />
              Panduan anti-penipuan
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/darurat" className="flex items-center gap-2">
              <LifeBuoy aria-hidden className="size-4 text-danger" />
              Mode darurat
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <div className="flex items-center gap-1.5 px-1.5 py-1.5 text-[10.5px] text-ink-faint">
          <span aria-hidden className="size-1.5 rounded-full bg-brand" />
          Sesi aktif · berlaku 24 jam
        </div>

        <DropdownMenuItem variant="destructive">
          <form action={logout} className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-2 text-left"
            >
              <LogOut aria-hidden className="size-4" />
              Keluar
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Account entry for the chat sidebar.
 *
 * Signed in, it is the profile menu above. Signed out it offers the two
 * actions as a card above the privacy promise, matching the footer card's
 * weight instead of adding a second navigation block. Collapsed to the rail it
 * becomes one square button, because a two-action card cannot fit in a stripe.
 */
export function CompanionAuth({
  session,
  iconsOnly = false,
}: {
  session: CompanionSession | null;
  iconsOnly?: boolean;
}) {
  const [tab, setTab] = useState<AuthTab | null>(null);

  const dialog = (
    <AuthDialog
      open={tab !== null}
      onOpenChange={(open) => {
        if (!open) setTab(null);
      }}
      defaultTab={tab ?? "masuk"}
    />
  );

  if (session) {
    return (
      <>
        <ProfileMenu session={session} iconsOnly={iconsOnly} />
        {dialog}
      </>
    );
  }

  if (iconsOnly) {
    return (
      <>
        <button
          type="button"
          data-pressable
          aria-haspopup="dialog"
          aria-label="Masuk atau daftar"
          title="Masuk atau daftar"
          onClick={() => setTab("masuk")}
          className="grid size-10 place-items-center rounded-[9px] text-ink-soft transition-[background-color,color] duration-150 ease-out hover:bg-txt/6 hover:text-ink"
        >
          <LogIn aria-hidden strokeWidth={1.75} className="size-4" />
        </button>
        {dialog}
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          data-pressable
          aria-haspopup="dialog"
          onClick={() => setTab("masuk")}
          className={cn(
            "flex min-h-10 items-center justify-center gap-1.5 rounded-[9px] border border-hairline bg-panel font-medium text-[12.5px] text-ink-soft",
            "transition-[background-color,border-color,color] duration-150 ease-out",
            "hover:border-edge hover:bg-chip hover:text-ink",
          )}
        >
          <LogIn aria-hidden strokeWidth={1.8} className="size-4" />
          Masuk
        </button>
        <DaftarButton size="xs" onClick={() => setTab("daftar")} />
      </div>
      {dialog}
    </>
  );
}
