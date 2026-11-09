"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Risk } from "@/lib/contracts/score";
import { useSavedLoker } from "@/lib/loker/use-saved";

const SENTINEL_LABEL = {
  clean: "bersih",
  suspicious: "mencurigakan",
  rejected: "ditolak",
} as const;

const RISK_LABEL: Record<Risk, string> = {
  bersih: "bersih",
  rendah: "rendah",
  mencurigakan: "mencurigakan",
  tinggi: "tinggi",
};

/** The `/profil` section. Saving never requires an account. */
export function ProfilLoker() {
  const { saved, loaded, remove } = useSavedLoker();

  if (!loaded) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  if (saved.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-dim text-sm">
          Belum ada lowongan tersimpan di perangkat ini.
        </p>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/companion">Cari lowongan</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-line">
      {saved.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-start justify-between gap-3 py-3"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-sm text-txt">
              {item.title}
            </p>
            <p className="truncate text-dim text-xs">
              {[item.company, item.location, item.salaryText]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge
                variant={
                  item.sentinelStatus === "clean" ? "outline" : "secondary"
                }
              >
                Sentinel: {SENTINEL_LABEL[item.sentinelStatus]}
              </Badge>
              <Badge
                variant={
                  item.luminaRisk === "mencurigakan" ||
                  item.luminaRisk === "tinggi"
                    ? "secondary"
                    : "outline"
                }
              >
                Lumina: {RISK_LABEL[item.luminaRisk]}
              </Badge>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => remove(item.id)}
            aria-label={`Hapus ${item.title} dari simpanan`}
          >
            <Trash2 aria-hidden /> Hapus
          </Button>
        </li>
      ))}
    </ul>
  );
}
