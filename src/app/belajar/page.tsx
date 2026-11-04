import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BelajarProgress } from "@/components/belajar/belajar-progress";
import { ModuleDoneMark } from "@/components/belajar/module-done-mark";
import { Badge } from "@/components/ui/badge";
import { formattedLaporan, MODUS } from "@/lib/modus";

export const metadata: Metadata = {
  title: "Belajar",
  description:
    "Dua belas modus penipuan di Indonesia, diurutkan menurut laporan IASC.",
};

/**
 * Stream B's page. The list is generated from `modus.json` (§4: B must not
 * re-type the list). Only module 10 is written; the other eleven say
 * "segera" — honest beats a stub that pretends (§5-B).
 */

const STATUS_LABEL = {
  lengkap: "Lengkap",
  segera: "Segera",
} as const;

export default function BelajarPage() {
  const sorted = [...MODUS].sort((a, b) => a.no - b.no);
  const complete = sorted.filter((m) => m.modulStatus === "lengkap").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="max-w-prose">
        <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
          Pola penipuan yang paling banyak merugikan
        </h1>
        <p className="mt-2 text-dim text-sm">
          Urutan mengikuti jumlah laporan IASC. Satu modul lengkap mengalahkan
          dua belas halaman kosong — saat ini {complete} dari 12 modul selesai
          ditulis.
        </p>
        <BelajarProgress />
      </header>

      <ul className="mt-8 flex flex-col divide-y divide-line border-line border-y">
        {sorted.map((m) => {
          const ready = m.modulStatus === "lengkap";
          return (
            <li key={m.id}>
              <Link
                href={`/belajar/${m.no}`}
                data-pressable
                className="flex flex-col gap-1.5 px-1 py-4 hover:bg-panel sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="tabular w-6 shrink-0 text-dim text-sm">
                  {String(m.no).padStart(2, "0")}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-sm text-txt">
                    {m.nama}
                  </span>
                  <span className="mt-0.5 block truncate text-dim text-xs">
                    {m.ciri.join(" · ")}
                  </span>
                </span>

                <span className="tabular flex shrink-0 items-center gap-3 text-xs">
                  <span className="text-dim">
                    {m.laporan === null
                      ? formattedLaporan(m)
                      : `${formattedLaporan(m)} laporan`}
                  </span>
                  <span className="text-dim/70">{m.kerugian}</span>
                  <ModuleDoneMark no={m.no} />
                  <Badge
                    variant={ready ? "secondary" : "outline"}
                    className={ready ? "text-safe" : "text-dim"}
                  >
                    {STATUS_LABEL[m.modulStatus]}
                  </Badge>
                  <ArrowRight aria-hidden className="size-3.5 text-dim/60" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-dim text-xs">
        Kemajuan belajar disimpan di perangkat ini saja. Tanpa akun, tanpa
        unggahan.
      </p>
    </div>
  );
}
