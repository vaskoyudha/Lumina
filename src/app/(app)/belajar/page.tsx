import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BelajarProgress } from "@/components/belajar/belajar-progress";
import { ModuleDoneMark } from "@/components/belajar/module-done-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isPublished } from "@/data/kurikulum";
import { formattedLaporan, MODUS, type Modus } from "@/lib/modus";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Belajar",
  description:
    "Dua belas modus penipuan di Indonesia, diurutkan menurut laporan IASC.",
};

/**
 * Stream B's catalog — generated from `modus.json` (§4: B must not re-type
 * the list). Reference blend: Coursera/Udemy course grid (tile, meta, status),
 * Duolingo "start here" featured module, Khan-style always-visible progress.
 * Modules that are not written yet still say "Segera" honestly.
 */

function ModuleCard({ m }: { m: Modus }) {
  const ready = isPublished(m.no);
  return (
    <Card className="h-full gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
      <Link
        href={`/belajar/${m.no}`}
        data-pressable
        className="group flex h-full flex-col rounded-[24px] p-5 transition-transform duration-200 ease-out hover:-translate-y-0.5"
      >
        <span className="flex items-start justify-between gap-3">
          <span
            aria-hidden
            className={cn(
              "tabular inline-flex size-11 shrink-0 items-center justify-center rounded-2xl font-medium text-[15px]",
              ready
                ? "bg-[var(--appnext-accent-wash)] text-[color:var(--appnext-accent-deep)]"
                : "bg-panel-2 text-txt",
            )}
          >
            {String(m.no).padStart(2, "0")}
          </span>
          <span className="flex items-center gap-2">
            <ModuleDoneMark no={m.no} />
            <ArrowUpRight
              aria-hidden
              className="size-4 text-dim transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </span>
        </span>

        <span className="mt-4 block font-medium text-lg text-txt leading-snug">
          {m.nama}
        </span>
        <span className="mt-1.5 line-clamp-2 block text-dim text-sm leading-relaxed">
          {m.ciri.join(" · ")}
        </span>

        <span className="tabular mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-5 text-xs">
          <span className="text-dim">
            {m.laporan === null
              ? formattedLaporan(m)
              : `${formattedLaporan(m)} laporan`}
          </span>
          <span aria-hidden className="text-dim">
            ·
          </span>
          <span className="text-dim">{m.kerugian}</span>
          <span aria-hidden className="text-dim">
            ·
          </span>
          <span className="text-dim">Level {m.level}</span>
          <span
            className={
              ready
                ? "ml-auto font-medium text-[color:var(--appnext-accent-deep)]"
                : "ml-auto text-dim"
            }
          >
            {ready ? "Mulai belajar" : "Segera"}
          </span>
        </span>
      </Link>
    </Card>
  );
}

export default function BelajarPage() {
  const sorted = [...MODUS].sort((a, b) => a.no - b.no);
  const featured = sorted.find((m) => isPublished(m.no));
  const complete = sorted.filter((m) => isPublished(m.no)).length;

  return (
    <div className="appnext-container py-10 sm:py-14">
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

        <ul className="mt-5 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((m) => (
            <li key={m.id} className="min-w-0">
              <ModuleCard m={m} />
            </li>
          ))}
        </ul>
      </section>

      <p className="appnext-caption mt-8">
        Kemajuan belajar disimpan di perangkat ini saja. Tanpa akun, tanpa
        unggahan.
      </p>
    </div>
  );
}
