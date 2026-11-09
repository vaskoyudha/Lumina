"use client";

import {
  ArrowLeftRight,
  Briefcase,
  GraduationCap,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useAccountProgress } from "@/components/belajar/account-progress-context";
import { ProfilLoker } from "@/components/profil/profil-loker";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { logout } from "@/lib/auth/actions";
import { useSavedLoker } from "@/lib/loker/use-saved";
import { MODUS } from "@/lib/modus";
import { BADGE_LABEL } from "@/lib/progress";
import { cn } from "@/lib/utils";

export type ProfileSection = "profil" | "kemajuan" | "loker" | "privasi";

const COPY: Record<ProfileSection, { title: string; description: string }> = {
  profil: {
    title: "Profil saya",
    description: "Identitas akun dan sesi yang sedang aktif.",
  },
  kemajuan: {
    title: "Kemajuan belajar",
    description: "Modul dan lencana yang tersimpan di akunmu.",
  },
  loker: {
    title: "Lowongan tersimpan",
    description: "Lowongan yang kamu simpan di perangkat ini.",
  },
  privasi: {
    title: "Privasi & keamanan",
    description: "Apa yang disimpan dan bagaimana sesi bekerja.",
  },
};

function initialsFor(nama: string): string {
  const parts = nama.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function formatCreated(createdAt?: string | null): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

/**
 * Floating profile cards.
 *
 * The sidebar and app nav used to send people to `/profil` for every item in
 * the account menu. This dialog keeps the same information in place: identity,
 * progress, saved jobs and privacy, opened as floating sections over the
 * current page.
 */
export function ProfileDialog({
  session,
  section,
  onOpenChange,
}: {
  session: { nama: string; email: string; createdAt?: string | null };
  section: ProfileSection | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { progress, modules } = useAccountProgress();
  const { saved } = useSavedLoker();
  const copy = COPY[section ?? "profil"];
  const initial = initialsFor(session.nama);
  const createdLabel = formatCreated(session.createdAt);

  const done = progress?.completedModules.length ?? 0;
  const total = modules.length || MODUS.length;
  const pct = Math.min(100, Math.round((done / total) * 100));
  const badges = Object.entries(BADGE_LABEL)
    .filter(([id]) => progress?.badges.includes(id))
    .map(([, label]) => label);

  return (
    <Dialog open={section !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[min(32rem,calc(100vw-2rem))] max-w-lg overflow-x-hidden overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4">
          {section === "profil" || section === "privasi" ? (
            <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
              <CardContent className="flex items-center gap-3 p-4">
                <Avatar className="size-11 shrink-0">
                  <AvatarFallback className="bg-brand-soft font-semibold text-[12px] text-brand-ink">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm text-txt">
                    {session.nama}
                  </p>
                  <p className="truncate text-dim text-xs">{session.email}</p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  Akun Lumina
                </Badge>
              </CardContent>
            </Card>
          ) : null}

          {section === "profil" ? (
            <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
              <CardContent className="p-4">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-dim text-[11px]">Nama</dt>
                    <dd className="truncate text-sm text-txt">
                      {session.nama}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-dim text-[11px]">Email</dt>
                    <dd className="truncate text-sm text-txt">
                      {session.email}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-dim text-[11px]">Jenis akun</dt>
                    <dd className="text-sm text-txt">
                      Sesi akun, berlaku 24 jam
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-dim text-[11px]">Profil dibuat</dt>
                    <dd className="tabular text-sm text-txt">
                      {createdLabel ?? "Tidak tersedia"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ) : null}

          {section === "kemajuan" ? (
            <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <GraduationCap aria-hidden className="size-4 text-brand" />
                  {done} dari {total} modul selesai
                </CardTitle>
                <CardDescription>
                  Progres tersimpan di akunmu, bukan di perangkat ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-3">
                <Progress
                  value={pct}
                  aria-label="Progres belajar"
                  className="h-2 bg-panel-2 [&>[data-slot=progress-indicator]]:bg-brand"
                />
                <p className="mt-3 text-dim text-xs">
                  {badges.length > 0
                    ? `Lencana: ${badges.join(", ")}.`
                    : "Belum ada lencana. Selesaikan satu modul untuk mulai."}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {section === "loker" ? (
            <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Briefcase aria-hidden className="size-4 text-brand" />
                  {saved.length} lowongan tersimpan
                </CardTitle>
                <CardDescription>
                  Daftar ini tersimpan di perangkat ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-3">
                <ProfilLoker />
              </CardContent>
            </Card>
          ) : null}

          {section === "privasi" ? (
            <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
              <CardContent className="p-4">
                <p className="text-dim text-sm leading-relaxed">
                  Nama dan email tersimpan untuk akunmu. Percakapan tidak
                  disimpan dalam database akun; progres belajar dan lowongan
                  tersimpan tetap di sisi akun dan perangkat ini. Sesi berlaku
                  24 jam.
                </p>
                <p className="mt-3 flex items-start gap-1.5 text-dim text-xs leading-relaxed">
                  <ShieldCheck
                    aria-hidden
                    className="mt-px size-3.5 shrink-0 text-brand"
                  />
                  Keluar mencabut sesi ini di server. Verifikasi email dan
                  pemulihan password belum tersedia.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <div
            className={cn(
              "flex flex-wrap gap-2",
              section === "loker" && "pt-1",
            )}
          >
            <Button asChild variant="outline" className="h-10">
              <Link href="/masuk" data-pressable>
                <ArrowLeftRight aria-hidden className="size-4" />
                Ganti akun
              </Link>
            </Button>
            <form action={logout}>
              <Button type="submit" variant="outline" className="h-10">
                <LogOut aria-hidden className="size-4" />
                Keluar
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
