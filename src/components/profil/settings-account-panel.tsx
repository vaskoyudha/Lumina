"use client";

import { ArrowLeftRight, LogOut } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type AccountView, formatAccountDate } from "@/lib/auth/account-view";
import { logout } from "@/lib/auth/actions";

export interface SettingsSession {
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

export function AccountPanel({
  session,
  account,
}: {
  session: SettingsSession;
  account: AccountView | null;
}) {
  const nama = account?.nama ?? session.nama;
  const email = account?.email ?? session.email;
  const created = formatAccountDate(account?.createdAt ?? session.createdAt);

  return (
    <>
      <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Avatar className="size-11 shrink-0">
            <AvatarFallback className="bg-brand-soft font-semibold text-[12px] text-brand-ink">
              {initialsFor(nama)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm text-txt">{nama}</p>
            <p className="truncate text-dim text-xs">{email}</p>
          </div>
          <Badge variant="outline" className="shrink-0">
            Akun Lumina
          </Badge>
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
        <CardContent className="p-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-dim text-[11px]">Nama</dt>
              <dd className="truncate text-sm text-txt">{nama}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-dim text-[11px]">Email</dt>
              <dd className="truncate text-sm text-txt">{email}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-dim text-[11px]">Jenis akun</dt>
              <dd className="text-sm text-txt">Sesi akun, berlaku 24 jam</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-dim text-[11px]">Profil dibuat</dt>
              <dd className="tabular text-sm text-txt">
                {created ?? "Tidak tersedia"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
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
    </>
  );
}
