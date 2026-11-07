import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BelajarAside } from "@/components/belajar/belajar-aside";
import { BelajarLencana } from "@/components/belajar/belajar-lencana";
import { BelajarProgress } from "@/components/belajar/belajar-progress";
import { BelajarShell } from "@/components/belajar/belajar-shell";
import {
  type KatalogItem,
  ModulKatalog,
} from "@/components/belajar/modul-katalog";
import { Button } from "@/components/ui/button";
import { isPublished } from "@/data/kurikulum";
import { formattedLaporan, MODUS } from "@/lib/modus";

export const metadata: Metadata = {
  title: "Belajar",
  description:
    "Dua belas modus penipuan di Indonesia, dengan jumlah laporan IASC dan estimasi kerugiannya.",
};

/**
 * Stream B's catalog — generated from `modus.json` (§4: B must not re-type
 * the list). Reference blend: a learning dashboard (icon rail, always-visible
 * progress, right rail) without its economy. No coins, no streaks, no invented
 * percentages: the only numbers on this page are IASC report counts from
 * `modus.json` and this device's finished modules from `lib/progress.ts`.
 */

export default function BelajarPage() {
  const sorted = [...MODUS].sort((a, b) => a.no - b.no);
  const featured = sorted.find((m) => isPublished(m.no));
  const complete = sorted.filter((m) => isPublished(m.no)).length;

  const items: KatalogItem[] = sorted.map((m) => ({
    no: m.no,
    nama: m.nama,
    ciri: m.ciri,
    laporanLabel:
      m.laporan === null
        ? formattedLaporan(m)
        : `${formattedLaporan(m)} laporan`,
    kerugian: m.kerugian,
    level: m.level,
    ready: isPublished(m.no),
  }));

  return (
    <BelajarShell aside={<BelajarAside />}>
      <header className="max-w-2xl">
        <h1>Pola penipuan yang paling banyak merugikan</h1>
        <p className="mt-3">
          Urutan mengikuti jumlah laporan IASC. Satu modul lengkap mengalahkan
          dua belas halaman kosong — saat ini {complete} dari {sorted.length}{" "}
          modul selesai ditulis.
        </p>
        <BelajarProgress />
      </header>

      {featured ? (
        <section aria-labelledby="mulai-dari-sini" className="mt-10">
          <div className="appnext-featured">
            <p className="appnext-caption font-medium tracking-wide text-[color:var(--appnext-veil-80)] uppercase">
              Mulai dari sini
            </p>
            <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <h2 id="mulai-dari-sini">{featured.nama}</h2>
                <p className="mt-2">{featured.ciri.join(" · ")}</p>
                <p className="tabular appnext-caption mt-3 text-[color:var(--appnext-veil-80)]">
                  Modul {String(featured.no).padStart(2, "0")} ·{" "}
                  {formattedLaporan(featured)} laporan · {featured.kerugian} ·
                  Level {featured.level}
                </p>
              </div>
              <Button
                asChild
                className="min-h-11 w-fit shrink-0 rounded-full bg-[var(--appnext-accent-deep)] px-5 text-bg hover:bg-[var(--appnext-ink-2)]"
              >
                <Link href={`/belajar/${featured.no}`} data-pressable>
                  Buka modul lengkap
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="semua-modul" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="semua-modul">Semua modul</h2>
          <p className="appnext-caption tabular">
            {complete} lengkap · {sorted.length - complete} segera
          </p>
        </div>

        <ModulKatalog items={items} />
      </section>

      <BelajarLencana />

      <p className="appnext-caption mt-8">
        Kemajuan belajar disimpan di perangkat ini saja. Tanpa akun, tanpa
        unggahan.
      </p>
    </BelajarShell>
  );
}
