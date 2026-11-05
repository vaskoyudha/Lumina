import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModulBody } from "@/components/belajar/modul-body";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { courseFor, isPublished } from "@/data/kurikulum";
import { formattedLaporan, MODUS, MODUS_BY_NO } from "@/lib/modus";

/**
 * Stream B's module detail route. Module 10 is fully written (anatomy,
 * example, checklist, quiz, reporting steps); the other eleven say "segera"
 * honestly instead of rendering fake lesson text (§5, §9d). AppNext light:
 * white cards, `#EEEEEE` dividers, pill actions.
 */

export const metadata: Metadata = { title: "Modul" };

/**
 * Prerender the twelve catalog modules. Admin-added courses (13+) are not
 * known at build time, so they render on demand instead of 404-ing.
 */
export function generateStaticParams() {
  return MODUS.map((m) => ({ modul: String(m.no) }));
}

/**
 * Admin-added courses (13+) are not in the catalog at build time. Without this
 * the route would 404 for them; with it, an exported course renders on demand.
 */
export const instant = false;

export default async function ModulPage({
  params,
}: {
  params: Promise<{ modul: string }>;
}) {
  const { modul } = await params;
  const no = Number.parseInt(modul, 10);
  const entry = Number.isNaN(no) ? null : (MODUS_BY_NO.get(no) ?? null);

  if (!entry) notFound();

  const ready = isPublished(entry.no);
  const isi = courseFor(entry.no);
  const sorted = [...MODUS].sort((a, b) => a.no - b.no);
  const idx = sorted.findIndex((m) => m.no === entry.no);
  const next = sorted[(idx + 1) % sorted.length];

  return (
    <div className="appnext-container py-10 sm:py-12">
      <Link
        href="/belajar"
        data-pressable
        className="inline-flex items-center gap-1 text-dim text-sm hover:text-txt"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Semua modul
      </Link>

      <header className="mt-5 max-w-prose">
        <p className="appnext-caption flex flex-wrap items-center gap-2">
          <span className="tabular">
            Modul {String(entry.no).padStart(2, "0")}
          </span>
          <span aria-hidden>·</span>
          <span
            className={
              ready
                ? "font-medium text-[color:var(--appnext-accent-deep)]"
                : undefined
            }
          >
            {ready ? "Lengkap" : "Segera"}
          </span>
        </p>
        <h1 className="mt-2">{entry.nama}</h1>
        <p className="mt-2">{entry.ciri.join(" · ")}</p>
      </header>

      <dl className="mt-7 grid gap-4 sm:grid-cols-2">
        <Card className="gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
          <CardContent className="py-4">
            <dt className="appnext-caption">Laporan IASC</dt>
            <dd className="tabular mt-1 font-medium text-lg text-txt">
              {formattedLaporan(entry)}
              {entry.laporan !== null ? " laporan" : ""}
            </dd>
          </CardContent>
        </Card>
        <Card className="gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
          <CardContent className="py-4">
            <dt className="appnext-caption">Estimasi kerugian</dt>
            <dd className="tabular mt-1 font-medium text-lg text-txt">
              {entry.kerugian}
            </dd>
          </CardContent>
        </Card>
      </dl>

      {isi ? (
        <ModulBody modul={isi} />
      ) : (
        <Card className="mt-8 gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
          <CardContent className="py-5">
            <h2 className="font-normal text-2xl text-txt">
              Modul ini belum ditulis
            </h2>
            <p className="mt-2 text-dim">
              Statusnya “segera”, bukan stub kosong. Kami lebih memilih mengaku
              daripada menampilkan modul setengah jadi.
            </p>
          </CardContent>
        </Card>
      )}

      {entry.scenarioId && isi ? (
        <Button
          asChild
          className="mt-8 w-fit rounded-full bg-[var(--appnext-ink-2)] text-white hover:bg-[var(--appnext-accent-deep)]"
        >
          <Link href={`/simulasi/${entry.scenarioId}`} data-pressable>
            Latih pola ini di simulasi
          </Link>
        </Button>
      ) : null}

      {next && next.no !== entry.no ? (
        <nav aria-label="Modul berikutnya" className="mt-10">
          <Card className="gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
            <Link
              href={`/belajar/${next.no}`}
              data-pressable
              className="group block rounded-[24px] p-5 transition-transform duration-200 ease-out hover:-translate-y-0.5"
            >
              <span className="appnext-caption font-medium tracking-wide uppercase">
                Modul berikutnya
              </span>
              <span className="mt-2 flex items-center justify-between gap-4">
                <span className="font-medium text-lg text-txt leading-snug">
                  {String(next.no).padStart(2, "0")} · {next.nama}
                </span>
                <ArrowRight
                  aria-hidden
                  className="size-5 shrink-0 text-dim transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                />
              </span>
              <span className="mt-1 block text-dim text-sm">
                {isPublished(next.no)
                  ? "Sudah lengkap — lanjutkan belajarmu."
                  : "Belum ditulis (segera). Kamu tetap bisa melihat ringkasannya."}
              </span>
            </Link>
          </Card>
        </nav>
      ) : null}
    </div>
  );
}
