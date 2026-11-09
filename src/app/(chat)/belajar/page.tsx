import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BelajarAside } from "@/components/belajar/belajar-aside";
import {
  BelajarDashboard,
  type FeaturedModule,
} from "@/components/belajar/belajar-dashboard";
import { BelajarShell } from "@/components/belajar/belajar-shell";
import {
  ContentLoading,
  ContentUnavailable,
} from "@/components/belajar/content-state";
import type { KatalogItem } from "@/components/belajar/modul-katalog";
import { Card, CardContent } from "@/components/ui/card";
import { listModules, moduleSummaries } from "@/lib/content/store";

import { formattedLaporan } from "@/lib/modus";

export const metadata: Metadata = {
  title: "Belajar",
  description:
    "Dua belas modus penipuan di Indonesia, dengan jumlah laporan IASC dan estimasi kerugiannya.",
};

/** Catalog and publication state come from PostgreSQL at request time. */

export default function BelajarPage() {
  return (
    <Suspense fallback={<ContentLoading />}>
      <BelajarContent />
    </Suspense>
  );
}
export async function BelajarContent() {
  await connection();
  let sorted: ReturnType<typeof moduleSummaries>;
  try {
    sorted = moduleSummaries(await listModules());
  } catch {
    return <ContentUnavailable />;
  }
  if (!sorted.length) return <ContentUnavailable empty />;
  // Feature the module wired to a simulation when one exists, otherwise the
  // first published course. This keeps the demo path (module 10) on the hero.
  const featuredModus =
    sorted.find((m) => m.ready && m.scenarioId) ?? sorted.find((m) => m.ready);
  const complete = sorted.filter((m) => m.ready).length;
  const readyModules = sorted.filter((m) => m.ready).map((m) => m.no);

  const laporanLabel = (m: (typeof sorted)[number]) =>
    m.laporan === null ? formattedLaporan(m) : `${formattedLaporan(m)} laporan`;

  const items: KatalogItem[] = sorted.map((m) => ({
    no: m.no,
    nama: m.nama,
    ciri: m.ciri,
    laporanLabel: laporanLabel(m),
    kerugian: m.kerugian,
    level: m.level,
    ready: m.ready,
  }));

  const featured: FeaturedModule | null = featuredModus
    ? {
        no: featuredModus.no,
        nama: featuredModus.nama,
        ciri: featuredModus.ciri,
        laporanLabel: laporanLabel(featuredModus),
        kerugian: featuredModus.kerugian,
        level: featuredModus.level,
      }
    : null;

  return (
    <BelajarShell
      modules={sorted}
      aside={<BelajarAside readyModules={readyModules} />}
    >
      <BelajarDashboard
        items={items}
        featured={featured}
        complete={complete}
        total={sorted.length}
      />

      <div className="flex flex-col gap-3">
        <CardNote complete={complete} total={sorted.length} />
        <p className="appnext-caption">
          Kemajuan belajar dan hasil simulasi disimpan di akunmu. Masuk agar
          dapat melanjutkan dari perangkat lain.
        </p>
      </div>
    </BelajarShell>
  );
}

function CardNote({ complete, total }: { complete: number; total: number }) {
  return (
    <Card className="gap-0 rounded-card border border-line bg-panel-2 py-0 ring-0 shadow-none">
      <CardContent className="flex items-start gap-3 p-4">
        <span
          aria-hidden
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-panel text-brand-ink shadow-sm"
        >
          <ShieldCheck className="size-4" />
        </span>
        <p className="text-dim text-sm leading-relaxed">
          {complete} dari {total} modul sudah lengkap dan bisa dipelajari
          sekarang. Sisanya bertanda{" "}
          <span className="font-medium text-txt">segera</span> sampai isinya
          benar-benar ditulis — kami tidak menampilkan modul setengah jadi.
        </p>
      </CardContent>
    </Card>
  );
}
