"use client";

import { Loader2, LogOut, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatSessionMoment,
  relativeActivity,
  type SessionView,
} from "@/lib/auth/account-view";
import { logoutEverywhere, revokeSessionAction } from "@/lib/auth/actions";

export function SecurityPanel({
  sessions,
}: {
  sessions: SessionView[] | null;
}) {
  const [items, setItems] = useState<SessionView[]>(sessions ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(sessions ?? []);
  }, [sessions]);

  function revoke(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await revokeSessionAction(id);
        if (result.ok)
          setItems((current) => current.filter((s) => s.id !== id));
        else setError(result.error ?? "Sesi tidak dapat dikeluarkan.");
      } catch {
        setError("Sesi tidak dapat dikeluarkan.");
      }
    });
  }

  return (
    <>
      <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
        <CardContent className="p-4">
          <p className="text-dim text-sm leading-relaxed">
            Nama, email, dan metadata sesi (perangkat, IP bila tersedia, waktu
            masuk dan aktivitas terakhir) tersimpan untuk akunmu. Percakapan
            tidak disimpan dalam database akun; progres belajar dan lowongan
            tersimpan tetap di sisi akun dan perangkat ini. Sesi berlaku 24 jam.
          </p>
          <p className="mt-3 flex items-start gap-1.5 text-dim text-xs leading-relaxed">
            <ShieldCheck
              aria-hidden
              className="mt-px size-3.5 shrink-0 text-brand"
            />
            Keluar mencabut sesi ini di server. Verifikasi email dan pemulihan
            password belum tersedia.
          </p>
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MonitorSmartphone aria-hidden className="size-4 text-brand" />
            Sesi & perangkat
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-3">
          {sessions === null ? (
            <p className="flex items-center gap-2 text-dim text-xs">
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
              Memuat sesi…
            </p>
          ) : items.length === 0 ? (
            <p className="text-dim text-xs">Tidak ada sesi aktif lain.</p>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-txt">
                      {item.device}
                      {item.current ? (
                        <Badge variant="secondary" className="shrink-0">
                          Sesi ini
                        </Badge>
                      ) : null}
                    </p>
                    <p className="mt-1 text-dim text-[11px]">
                      {item.ip ?? "IP tidak tercatat"} · Masuk{" "}
                      {formatSessionMoment(item.signedIn)} · Aktif{" "}
                      {relativeActivity(item.lastActive)}
                    </p>
                  </div>
                  {item.current ? null : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => revoke(item.id)}
                      aria-label={`Keluarkan ${item.device}`}
                    >
                      Keluarkan
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {error ? (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-4 rounded-lg border border-destructive/30 p-3">
            <p className="text-destructive text-xs leading-relaxed">
              Tindakan ini mengakhiri semua sesi, termasuk sesi ini. Kamu akan
              keluar dan diarahkan ke beranda.
            </p>
            <form action={logoutEverywhere} className="mt-2">
              <Button type="submit" variant="destructive" className="h-10">
                <LogOut aria-hidden className="size-4" />
                Keluar dari semua perangkat
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
