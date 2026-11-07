import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BelajarShell } from "@/components/belajar/belajar-shell";
import { ModulBody } from "@/components/belajar/modul-body";
import { LevelSignalBadge } from "@/components/belajar/modul-visual";
import { ModuleProgressBox } from "@/components/belajar/module-progress-box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { courseFor, isPublished } from "@/data/kurikulum";
import { formattedLaporan, MODUS, MODUS_BY_NO } from "@/lib/modus";
import { cn } from "@/lib/utils";

/**
 * Stream B's module detail route. Module 10 is fully written (anatomy,
 * example, checklist, quiz, reporting steps); the other eleven say "segera"
 * honestly instead of rendering fake lesson text (§5, §9d).
 *
 * The header is the reference dashboard's course modal promoted to a page:
 * a painted cover with the title overlaid, a difficulty signal, the real IASC
 * figure and a live completion box. `ModulBody` brings its own table of
 * contents at `lg`, so this page passes no aside.
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
    <BelajarShell>
      <Link
        href="/belajar"
        data-pressable
        className="appnext-link w-fit text-dim text-sm hover:text-txt"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Semua modul
      </Link>

      <section
        aria-labelledby="modul-judul"
        className={cn(
          "relative min-h-[224px] overflow-hidden rounded-[26px] shadow-[var(--appnext-shadow-soft)] sm:min-h-[256px]",
          ready ? "appnext-campaign" : "appnext-cover--muted",
        )}
      >
        {ready ? (
          <span aria-hidden className="appnext-cover-scrim absolute inset-0" />
        ) : null}
        <span
          aria-hidden
          className={cn(
            "tabular pointer-events-none absolute -right-4 -bottom-12 select-none font-semibold text-[190px] leading-none",
            ready ? "text-bg/10" : "text-txt/5",
          )}
        >
          {String(entry.no).padStart(2, "0")}
        </span>

        <div className="relative flex min-h-[224px] flex-col justify-between gap-8 p-5 sm:min-h-[256px] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <LevelSignalBadge level={entry.level} />
              <span
                className={cn(
                  "rounded-full px-3 py-1 font-extrabold text-xs shadow",
                  ready
                    ? "bg-brand-soft text-brand-ink"
                    : "bg-panel/90 text-dim",
                )}
              >
                {formattedLaporan(entry)}
                {entry.laporan !== null ? " laporan" : ""}
              </span>
            </div>

            <Badge
              variant="secondary"
              className={cn(
                "h-auto px-2.5 py-1 font-medium",
                ready
                  ? "bg-bg/20 text-bg backdrop-blur-md"
                  : "bg-panel/90 text-dim",
              )}
            >
              {ready ? "Lengkap" : "Segera"}
            </Badge>
          </div>

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0">
              <span
                className={cn(
                  "block font-black text-[11px] uppercase tracking-widest",
                  ready ? "text-bg/80" : "text-dim",
                )}
              >
                Modul {String(entry.no).padStart(2, "0")} · Level {entry.level}
              </span>
              <h1
                id="modul-judul"
                className={cn(
                  "mt-0.5 font-bold text-2xl sm:text-3xl",
                  ready ? "text-bg" : "text-txt",
                )}
              >
                {entry.nama}
              </h1>
              <p
                className={cn(
                  "mt-0.5 text-xs leading-relaxed",
                  ready ? "text-bg/80" : "text-dim",
                )}
              >
                {entry.ciri.join(" · ")}
              </p>
            </div>

            <ModuleProgressBox no={entry.no} ready={ready} />
          </div>
        </div>
      </section>

      <dl className="grid gap-2 sm:grid-cols-3">
        <Card className="gap-0 rounded-2xl border border-line py-0 ring-0 shadow-none">
          <CardContent className="py-3.5">
            <dt className="appnext-caption text-[10px] uppercase tracking-wide">
              Laporan IASC
            </dt>
            <dd className="tabular mt-1 font-medium text-lg text-txt">
              {formattedLaporan(entry)}
              {entry.laporan !== null ? " laporan" : ""}
            </dd>
          </CardContent>
        </Card>
        <Card className="gap-0 rounded-2xl border border-line py-0 ring-0 shadow-none">
          <CardContent className="py-3.5">
            <dt className="appnext-caption text-[10px] uppercase tracking-wide">
              Estimasi kerugian
            </dt>
            <dd className="tabular mt-1 font-medium text-lg text-txt">
              {entry.kerugian}
            </dd>
          </CardContent>
        </Card>
        <Card className="gap-0 rounded-2xl border border-line py-0 ring-0 shadow-none">
          <CardContent className="py-3.5">
            <dt className="appnext-caption text-[10px] uppercase tracking-wide">
              Status modul
            </dt>
            <dd className="mt-1 font-medium text-lg text-txt">
              {ready ? "Bisa dipelajari" : "Belum ditulis"}
            </dd>
          </CardContent>
        </Card>
      </dl>

      {isi ? (
        <ModulBody modul={isi} />
      ) : (
        <Card className="gap-0 rounded-[24px] border border-line py-0 ring-0 shadow-[var(--appnext-shadow-ambient)]">
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
          className="min-h-11 w-fit rounded-xl border border-ink-line bg-[var(--appnext-ink-2)] px-5 text-bg hover:bg-brand-strong"
        >
          <Link href={`/simulasi/${entry.scenarioId}`} data-pressable>
            Latih pola ini di simulasi
          </Link>
        </Button>
      ) : null}

      {next && next.no !== entry.no ? (
        <nav aria-label="Modul berikutnya">
          <Card className="gap-0 rounded-2xl border border-line py-0 ring-0 shadow-[var(--appnext-shadow-ambient)]">
            <Link
              href={`/belajar/${next.no}`}
              data-pressable
              className="group flex items-center justify-between gap-3 rounded-2xl p-3 transition-all hover:border-brand-line"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className="tabular inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft font-semibold text-brand-ink text-sm"
                >
                  {String(next.no).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-xs text-txt">
                    Modul berikutnya
                  </span>
                  <span className="mt-0.5 block truncate font-medium text-sm text-txt">
                    {next.nama}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-dim">
                    {isPublished(next.no)
                      ? "Sudah lengkap — lanjutkan belajarmu."
                      : "Belum ditulis (segera). Kamu tetap bisa melihat ringkasannya."}
                  </span>
                </span>
              </span>
              <ArrowRight
                aria-hidden
                className="size-4 shrink-0 text-dim transition-transform duration-150 ease-out group-hover:translate-x-0.5"
              />
            </Link>
          </Card>
        </nav>
      ) : null}
    </BelajarShell>
  );
}
