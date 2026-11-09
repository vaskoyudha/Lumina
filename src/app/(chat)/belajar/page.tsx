import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { BelajarAside } from "@/components/belajar/belajar-aside";
import {
  BelajarDashboard,
  type FeaturedModule,
} from "@/components/belajar/belajar-dashboard";
import { BelajarShell } from "@/components/belajar/belajar-shell";
import type { KatalogItem } from "@/components/belajar/modul-katalog";
import { Card, CardContent } from "@/components/ui/card";
import { isPublished } from "@/data/kurikulum";
import { formattedLaporan, MODUS } from "@/lib/modus";

export const metadata: Metadata = {
  title: "Belajar",
  description:
    "Dua belas modus penipuan di Indonesia, dengan jumlah laporan IASC dan estimasi kerugiannya.",
};

/**
 * Stream B's catalog — generated from `modus.json` (§4: B must not re-type
 * the list). The visual language follows the supplied course dashboard:
 * a raised white frame, an icon rail, painted cards, a campaign banner and a
 * right rail. Its economy does not come with it: no coins, no streaks, no
 * invented percentages. The only numbers on this page are IASC report counts
 * from `modus.json` and this device's finished modules from `lib/progress.ts`.
 */

export default function BelajarPage() {
  const sorted = [...MODUS].sort((a, b) => a.no - b.no);
  // Feature the module wired to a simulation when one exists, otherwise the
  // first published course. This keeps the demo path (module 10) on the hero.
  const featuredModus =
    sorted.find((m) => isPublished(m.no) && m.scenarioId) ??
    sorted.find((m) => isPublished(m.no));
  const complete = sorted.filter((m) => isPublished(m.no)).length;
  const readyModules = sorted.filter((m) => isPublished(m.no)).map((m) => m.no);

  const laporanLabel = (m: (typeof sorted)[number]) =>
    m.laporan === null ? formattedLaporan(m) : `${formattedLaporan(m)} laporan`;

  const items: KatalogItem[] = sorted.map((m) => ({
    no: m.no,
    nama: m.nama,
    ciri: m.ciri,
    laporanLabel: laporanLabel(m),
    kerugian: m.kerugian,
    level: m.level,
    ready: isPublished(m.no),
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
    <BelajarShell aside={<BelajarAside readyModules={readyModules} />}>
      <BelajarDashboard
        items={items}
        featured={featured}
        total={sorted.length}
      />

      <div className="flex flex-col gap-3">
        <CardNote complete={complete} total={sorted.length} />
        <p className="appnext-caption">
          Kemajuan belajar disimpan di perangkat ini saja. Tanpa akun, tanpa
          unggahan.
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
