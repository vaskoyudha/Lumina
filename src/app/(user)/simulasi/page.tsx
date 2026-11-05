import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MODUS } from "@/lib/modus";

export const metadata: Metadata = {
  title: "Simulasi",
  description: "Roleplay krisis: latih keputusan di bawah tekanan waktu.",
};

/**
 * Stream C's list. One playable scenario is the whole plan (§12: "Level 1
 * saja"). Planned levels are shown as "rencana" — never played as if built.
 */

const PLAYABLE = MODUS.filter((m) => m.scenarioId !== null);
const PLANNED = MODUS.filter(
  (m) => m.scenarioId === null && m.scenarioPlanned !== null,
);

export default function SimulasiPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="max-w-prose">
        <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
          Berlatih di bawah tekanan
        </h1>
        <p className="mt-2 text-dim text-sm">
          Satu skenario yang bisa dimainkan sekarang. Meter panik naik saat kamu
          berpikir, dan jawaban salah langsung dijelaskan tanpa memblokir
          cerita.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="font-medium text-dim text-xs uppercase tracking-wide">
          Bisa dimainkan
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {PLAYABLE.map((m) => (
            <li key={m.id}>
              <Link
                href={`/simulasi/${m.scenarioId}`}
                data-pressable
                className="flex items-center gap-3 rounded-lg border border-line bg-panel px-4 py-3 hover:bg-panel-2"
              >
                <span className="flex-1">
                  <span className="block font-medium text-sm text-txt">
                    Level {m.level} · {m.nama}
                  </span>
                  <span className="mt-0.5 block text-dim text-xs">
                    7 menit · tiga tool deck · dua jalur gagal
                  </span>
                </span>
                <Badge variant="secondary" className="text-safe">
                  Siap
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-medium text-dim text-xs uppercase tracking-wide">
          Rencana
        </h2>
        <p className="mt-1 text-dim text-xs">
          Dideklarasikan sebagai rencana, bukan didemokan seolah jadi.
        </p>
        <ul className="mt-3 flex flex-col divide-y divide-line border-line border-y">
          {PLANNED.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 px-1 py-2.5 text-sm"
            >
              <span className="tabular w-8 shrink-0 text-dim/70">
                {m.scenarioPlanned}
              </span>
              <span className="flex-1 text-dim">{m.nama}</span>
              <Badge variant="outline" className="text-dim">
                Rencana
              </Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
