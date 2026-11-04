import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/shell/back-button";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { formattedLaporan, MODUS, MODUS_BY_NO } from "@/lib/modus";

/**
 * Stream B's module detail route. The shell is here so Gate 0 passes and the
 * companion's "Pelajari pola ini" link resolves; the lesson body is B's to
 * write. It says so plainly instead of rendering fake lesson text.
 */

export const metadata: Metadata = { title: "Modul" };

/**
 * Only 12 modules exist, so the route is fully static. This also keeps it
 * cacheable under Cache Components instead of prerendering as runtime data.
 */
export function generateStaticParams() {
  return MODUS.map((m) => ({ modul: String(m.no) }));
}

export default async function ModulPage({
  params,
}: {
  params: Promise<{ modul: string }>;
}) {
  const { modul } = await params;
  const no = Number.parseInt(modul, 10);
  const entry = Number.isNaN(no) ? null : (MODUS_BY_NO.get(no) ?? null);

  if (!entry) notFound();

  const ready = entry.modulStatus === "lengkap";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <BackButton href="/belajar" label="Semua modul" />

      <header className="mt-4 max-w-prose">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="tabular text-dim">
            Modul {String(entry.no).padStart(2, "0")}
          </Badge>
          <Badge
            variant={ready ? "secondary" : "outline"}
            className={ready ? "text-safe" : "text-dim"}
          >
            {ready ? "Lengkap" : "Segera"}
          </Badge>
        </div>
        <h1 className="mt-3 font-semibold text-2xl tracking-tight">
          {entry.nama}
        </h1>
        <p className="mt-2 text-dim text-sm">{entry.ciri.join(" · ")}</p>
      </header>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel p-4">
          <dt className="text-dim text-xs">Laporan IASC</dt>
          <dd className="tabular mt-1 font-medium text-txt">
            {formattedLaporan(entry)}
          </dd>
        </div>
        <div className="rounded-lg border border-line bg-panel p-4">
          <dt className="text-dim text-xs">Estimasi kerugian</dt>
          <dd className="tabular mt-1 font-medium text-txt">
            {entry.kerugian}
          </dd>
        </div>
      </dl>

      <div className="mt-8 rounded-lg border border-line bg-panel p-6">
        <Empty>
          <EmptyTitle>
            {ready
              ? "Isi modul sedang ditulis (Stream B)"
              : "Modul ini belum ditulis"}
          </EmptyTitle>
          <EmptyDescription>
            {ready
              ? "Struktur yang disepakati: anatomi langkah 1–5, contoh pesan Indonesia, checklist 5 tanda bahaya, kuis 3–5 soal dengan penjelasan, lalu langkah lapor."
              : 'Statusnya "segera", bukan stub kosong. Kami lebih memilih mengaku daripada menampilkan modul setengah jadi.'}
          </EmptyDescription>
        </Empty>
      </div>

      {entry.scenarioId ? (
        <Link
          href={`/simulasi/${entry.scenarioId}`}
          data-pressable
          className="mt-6 inline-flex items-center gap-1 rounded-md border border-safe/40 bg-safe/10 px-3 py-2 font-medium text-safe text-sm hover:bg-safe/20"
        >
          Latih pola ini di simulasi
        </Link>
      ) : null}
    </div>
  );
}
