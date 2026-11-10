"use client";

import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function SecurityPanel() {
  return (
    <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
      <CardContent className="p-4">
        <p className="text-dim text-sm leading-relaxed">
          Nama, email, dan metadata sesi (perangkat, IP bila tersedia, waktu
          masuk dan aktivitas terakhir) tersimpan untuk akunmu. Percakapan tidak
          disimpan dalam database akun; progres belajar dan lowongan tersimpan
          tetap di sisi akun dan perangkat ini. Sesi berlaku 24 jam.
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
  );
}
