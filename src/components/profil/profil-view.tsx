"use client";

import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import {
  AccountProgressProvider,
  ProgressNotice,
  useAccountProgress,
} from "@/components/belajar/belajar-progress";
import { ProfilKemajuan } from "@/components/profil/profil-kemajuan";
import { ProfilLoker } from "@/components/profil/profil-loker";
import { BackButton } from "@/components/shell/back-button";
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
import { logout } from "@/lib/auth/actions";
import type { LearningSummary } from "@/lib/content/schema";

/** Identity comes from the server session; learning progress belongs to the signed-in account. */
export function ProfilView({
  nama,
  email,
  createdAt,
  modules,
}: {
  nama: string;
  email: string;
  createdAt?: string;
  modules: LearningSummary[];
}) {
  const initial = nama.trim().charAt(0).toUpperCase() || "?";

  const date = createdAt ? new Date(createdAt) : null;
  const createdLabel =
    date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Jakarta",
        }).format(date)
      : "Tidak tersedia";

  return (
    <AccountProgressProvider modules={modules}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <div>
          <BackButton href="/" />
        </div>

        <ProgressNotice />
        <header className="flex flex-wrap items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-panel-2 font-medium text-lg text-txt">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-semibold text-2xl tracking-tight">
                {nama}
              </h1>
              <Badge variant="outline">Akun Lumina</Badge>
            </div>
            <p className="truncate text-dim text-sm">{email}</p>
          </div>
        </header>

        <section id="kemajuan" className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle>Kemajuan belajar</CardTitle>
              <CardDescription>
                Yang sudah selesai di akunmu, dari {modules.length} modul yang
                tersedia.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfilKemajuan modules={modules} />
              <SimulationHistory />
            </CardContent>
          </Card>
        </section>

        <section id="loker" className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle>Lowongan tersimpan</CardTitle>
              <CardDescription>
                Lowongan yang kamu simpan di perangkat ini, bukan di akun.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfilLoker />
            </CardContent>
          </Card>
        </section>

        <section
          aria-labelledby="akun-privasi"
          className="flex scroll-mt-24 flex-col gap-5 border-line border-t pt-8"
        >
          <div>
            <h2
              id="akun-privasi"
              className="font-heading font-medium text-lg tracking-tight"
            >
              Akun dan privasi
            </h2>
            <p className="mt-1 text-dim text-sm">
              Nama dan email tersimpan untuk akunmu. Isi percakapan tidak
              disimpan; hanya judul, waktu, dan skor terakhir yang tercatat di
              riwayat akunmu. Progres belajar dan hasil simulasi tersimpan per
              akun.
            </p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-dim text-xs">Nama</dt>
              <dd className="mt-0.5 truncate text-sm text-txt">{nama}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-dim text-xs">Email</dt>
              <dd className="mt-0.5 truncate text-sm text-txt">{email}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-dim text-xs">Jenis akun</dt>
              <dd className="mt-0.5 text-sm text-txt">
                Sesi akun, berlaku 24 jam
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-dim text-xs">Profil dibuat</dt>
              <dd className="tabular mt-0.5 text-sm text-txt">
                {createdLabel}
              </dd>
            </div>
          </dl>

          <p className="flex items-start gap-1.5 text-dim text-xs leading-relaxed">
            <ShieldCheck
              aria-hidden
              className="mt-0.5 size-3.5 shrink-0 text-brand"
            />
            Keluar mencabut sesi ini di server. Verifikasi email dan pemulihan
            password belum tersedia.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-11">
              <Link href="/masuk" data-pressable>
                <UserRound aria-hidden />
                Ganti akun
              </Link>
            </Button>
            <form action={logout}>
              <Button type="submit" variant="outline" className="h-11">
                <LogOut aria-hidden />
                Keluar
              </Button>
            </form>
          </div>
        </section>
      </div>
    </AccountProgressProvider>
  );
}

function SimulationHistory() {
  const { simulations } = useAccountProgress();
  return (
    <section className="mt-6 border-t border-line pt-5">
      <h3 className="text-lg font-medium">Hasil simulasi</h3>
      {simulations.length ? (
        <ul className="mt-3 flex flex-col gap-3">
          {simulations.map((s) => (
            <li key={`${s.scenarioId}-${s.finishedAt}`} className="text-sm">
              <Link
                href={`/simulasi/${s.scenarioId}`}
                className="text-brand-ink underline-offset-4 hover:underline"
              >
                {s.scenarioId}
              </Link>{" "}
              · {s.mode} ·{" "}
              {{
                success: "Berhasil",
                recovery: "Pulih",
                compromised: "Akun terpapar",
                failed: "Perlu latihan lagi",
              }[s.outcome] ?? s.outcome}
              <span className="block text-xs text-dim">
                {new Date(s.finishedAt).toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta",
                })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-dim">
          Belum ada hasil simulasi tersimpan.
        </p>
      )}
    </section>
  );
}
