"use client";

import {
  ArrowLeftRight,
  Briefcase,
  GraduationCap,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccountProgress } from "@/components/belajar/account-progress-context";
import {
  ProfileDialog,
  type ProfileSection,
} from "@/components/profil/profile-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { logout } from "@/lib/auth/actions";
import { useSavedLoker } from "@/lib/loker/use-saved";
import { MODUS } from "@/lib/modus";
import { BADGE_LABEL } from "@/lib/progress";
import { cn } from "@/lib/utils";

interface Account {
  nama: string;
  email: string;
  createdAt?: string | null;
}

function initialsFor(nama: string): string {
  const parts = nama.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

/**
 * Dashboard account popup.
 *
 * Replaces a trip to `/profil` with the parts that matter at a glance:
 * identity, learning progress, saved jobs and the account actions. Progress
 * comes from the account context; saved jobs stay on this device.
 */
export function ProfilePopup({ className }: { className?: string }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [section, setSection] = useState<ProfileSection | null>(null);
  const { progress, modules } = useAccountProgress();
  const { saved } = useSavedLoker();

  useEffect(() => {
    if (typeof fetch !== "function") {
      setLoaded(true);
      return;
    }
    let alive = true;
    fetch("/api/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!alive) return;
        setAccount(data?.session ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!loaded || !account) return null;

  const initial = initialsFor(account.nama);
  const done = progress?.completedModules.length ?? 0;
  const total = modules.length || MODUS.length;
  const pct = Math.min(100, Math.round((done / total) * 100));
  const badges = Object.entries(BADGE_LABEL)
    .filter(([id]) => progress?.badges.includes(id))
    .map(([, label]) => label);
  const latest = saved.at(0);

  const created = account.createdAt ? new Date(account.createdAt) : null;
  const createdLabel =
    created && !Number.isNaN(created.getTime())
      ? new Intl.DateTimeFormat("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Jakarta",
        }).format(created)
      : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-pressable
          aria-label={`Akun ${account.nama}`}
          title={`Akun ${account.nama}`}
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-[11.5px] text-brand-ink transition-[background-color,color] duration-150 ease-out hover:bg-brand-soft-2",
            className,
          )}
        >
          {initial}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="max-h-[min(28rem,calc(100dvh-5rem))] w-[300px] overflow-y-auto p-0"
      >
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-brand-soft font-semibold text-[12px] text-brand-ink">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[13px] text-txt">
              {account.nama}
            </p>
            <p className="truncate text-[11px] text-dim">{account.email}</p>
          </div>
          <Badge variant="outline" className="shrink-0">
            Akun
          </Badge>
        </div>

        <DropdownMenuSeparator />

        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-medium text-[11px] text-txt">
              <GraduationCap aria-hidden className="size-3.5 text-brand" />
              Kemajuan belajar
            </span>
            <span className="tabular text-[11px] text-dim">
              {done}/{total} modul
            </span>
          </div>
          <Progress
            value={pct}
            aria-label="Progres belajar"
            className="mt-2 h-1.5 bg-panel-2 [&>[data-slot=progress-indicator]]:bg-brand"
          />
          <p className="mt-1.5 text-[10.5px] text-dim">
            {badges.length > 0
              ? `Lencana: ${badges.join(", ")}.`
              : "Belum ada lencana. Selesaikan satu modul untuk mulai."}
          </p>
        </div>

        <DropdownMenuSeparator />

        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-medium text-[11px] text-txt">
              <Briefcase aria-hidden className="size-3.5 text-brand" />
              Lowongan tersimpan
            </span>
            <span className="tabular text-[11px] text-dim">{saved.length}</span>
          </div>
          {latest ? (
            <p className="mt-1.5 truncate text-[10.5px] text-dim">
              {latest.title}
              {latest.company ? ` · ${latest.company}` : ""}
            </p>
          ) : (
            <p className="mt-1.5 text-[10.5px] text-dim">
              Belum ada lowongan tersimpan di perangkat ini.
            </p>
          )}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem onSelect={() => setSection("profil")}>
            <UserRound aria-hidden className="size-4" />
            Profil saya
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSection("kemajuan")}>
            <GraduationCap aria-hidden className="size-4" />
            Kemajuan belajar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSection("loker")}>
            <Briefcase aria-hidden className="size-4" />
            Lowongan tersimpan
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSection("privasi")}>
            <ShieldCheck aria-hidden className="size-4" />
            Privasi & keamanan
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/masuk" className="flex items-center gap-2">
              <ArrowLeftRight aria-hidden className="size-4" />
              Ganti akun
            </Link>
          </DropdownMenuItem>
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
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <p className="flex items-start gap-1.5 px-3 py-2.5 text-[10px] text-dim leading-relaxed">
          <ShieldCheck
            aria-hidden
            className="mt-px size-3 shrink-0 text-brand"
          />
          <span>
            Progres tersimpan di akunmu; lowongan tersimpan di perangkat ini.
            Sesi berlaku 24 jam
            {createdLabel ? ` · dibuat ${createdLabel}` : ""}.
          </span>
        </p>
      </DropdownMenuContent>

      <ProfileDialog
        session={{
          nama: account.nama,
          email: account.email,
          createdAt: account.createdAt,
        }}
        section={section}
        onOpenChange={(open) => {
          if (!open) setSection(null);
        }}
      />
    </DropdownMenu>
  );
}
