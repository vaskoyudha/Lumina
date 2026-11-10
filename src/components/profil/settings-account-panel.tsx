"use client";

import { ArrowLeftRight, Loader2, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AccountView, formatAccountDate } from "@/lib/auth/account-view";
import { changePasswordAction, logout, updateNama } from "@/lib/auth/actions";

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
  hasPassword,
  onAccountSaved,
  onPasswordChanged,
}: {
  session: SettingsSession;
  account: AccountView | null;
  hasPassword: boolean | null;
  onAccountSaved: (next: { nama: string; email: string }) => void;
  onPasswordChanged: () => void;
}) {
  const router = useRouter();
  const [nameState, nameAction, namePending] = useActionState(
    updateNama,
    undefined,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    changePasswordAction,
    undefined,
  );
  const passwordForm = useRef<HTMLFormElement>(null);
  const appliedName = useRef<typeof nameState>(undefined);
  const appliedPassword = useRef<typeof passwordState>(undefined);

  const nama = nameState?.account?.nama ?? account?.nama ?? session.nama;
  const email = nameState?.account?.email ?? account?.email ?? session.email;
  const created = formatAccountDate(account?.createdAt ?? session.createdAt);

  useEffect(() => {
    if (!nameState?.ok || !nameState.account) return;
    if (appliedName.current === nameState) return;
    appliedName.current = nameState;
    onAccountSaved(nameState.account);
    router.refresh();
  }, [nameState, onAccountSaved, router]);

  useEffect(() => {
    if (!passwordState?.ok) return;
    if (appliedPassword.current === passwordState) return;
    appliedPassword.current = passwordState;
    passwordForm.current?.reset();
    onPasswordChanged();
  }, [passwordState, onPasswordChanged]);

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

      <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-sm">Nama tampilan</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-3">
          <form action={nameAction} className="flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1">
              <Label htmlFor="settings-nama" className="sr-only">
                Nama tampilan
              </Label>
              <Input
                id="settings-nama"
                name="nama"
                defaultValue={nama}
                maxLength={80}
                autoComplete="name"
                className="h-10 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={namePending}
              className="h-10 rounded-xl"
            >
              {namePending ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : null}
              Simpan nama
            </Button>
          </form>
          {nameState?.ok ? (
            <output className="mt-2 block text-brand-ink text-xs">
              Nama diperbarui.
            </output>
          ) : null}
          {nameState?.error ? (
            <p role="alert" className="mt-2 text-danger text-xs">
              {nameState.error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-sm">Password</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-3">
          {hasPassword === null ? (
            <p className="text-dim text-xs">Memeriksa pengaturan akun…</p>
          ) : hasPassword ? (
            <form
              ref={passwordForm}
              action={passwordAction}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="settings-current">Password saat ini</Label>
                <Input
                  id="settings-current"
                  name="current"
                  type="password"
                  autoComplete="current-password"
                  className="h-10 rounded-xl"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="settings-new">Password baru</Label>
                  <Input
                    id="settings-new"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="settings-confirm">Ulangi password baru</Label>
                  <Input
                    id="settings-confirm"
                    name="konfirmasi"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="submit"
                  disabled={passwordPending}
                  className="h-10 rounded-xl"
                >
                  {passwordPending ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : null}
                  Ubah password
                </Button>
                <p className="text-dim text-[11px]">
                  Sesi lain dikeluarkan setelah password berubah.
                </p>
              </div>
              {passwordState?.ok ? (
                <output className="block text-brand-ink text-xs">
                  Password diperbarui. Sesi lain sudah dikeluarkan.
                </output>
              ) : null}
              {passwordState?.error ? (
                <p role="alert" className="text-danger text-xs">
                  {passwordState.error}
                </p>
              ) : null}
            </form>
          ) : (
            <p className="flex items-start gap-1.5 text-dim text-xs leading-relaxed">
              <ShieldCheck
                aria-hidden
                className="mt-px size-3.5 shrink-0 text-brand"
              />
              Akun ini masuk lewat Google, jadi belum punya password Lumina.
              Perubahan password belum tersedia di sini.
            </p>
          )}
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
