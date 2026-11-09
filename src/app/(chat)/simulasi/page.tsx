import { ArrowRight, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceShell } from "@/components/shell/workspace-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MODUS } from "@/lib/modus";
import { SCENARIO_CATALOG } from "@/lib/simulasi/catalog";
import { MISSION } from "@/lib/simulasi/scenario";

export const metadata: Metadata = {
  title: MISSION.title,
  description:
    "Latihan fiktif 3–5 menit tentang pesan kurir, APK, dan cara menjaga kendali ponsel.",
};

const PLANNED = MODUS.filter(
  (modus) => modus.scenarioId === null && modus.scenarioPlanned !== null,
).sort((a, b) =>
  (a.scenarioPlanned ?? "").localeCompare(b.scenarioPlanned ?? ""),
);

const scenarioNodes = SCENARIO_CATALOG[0]?.nodes ?? [];

const endingCount = scenarioNodes.filter(
  (node) => node.type === "ending",
).length;

const CHAPTER_NOTES = [
  "Pesan kurir dan lampiran palsu masuk. Kamu memutuskan apakah memercayainya.",
  "Kalau kendali ponsel mulai lepas, dek perangkat membantu memutus akses.",
  "Tolak kode rahasia, simpan bukti yang aman, lalu lihat apa yang bisa diperbaiki.",
];

function SimulasiAside() {
  return (
    <div className="flex flex-col gap-5">
      <Card
        role="region"
        aria-labelledby="planned-heading"
        className="gap-0 rounded-card border border-line py-0 ring-0 shadow-[var(--appnext-shadow-ambient)]"
      >
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id="planned-heading" className="font-bold text-sm text-txt">
              Level lain
            </h2>
            <span className="tabular font-semibold text-[11px] text-dim">
              {PLANNED.length} rencana
            </span>
          </div>
          <p className="mt-0.5 text-dim text-xs">
            Masih direncanakan, belum bisa dimainkan.
          </p>
          <ul className="mt-2 divide-y divide-line">
            {PLANNED.map((modus) => (
              <li key={modus.id} className="flex items-center gap-3 py-2.5">
                <span className="tabular w-6 shrink-0 font-semibold text-dim text-[11px]">
                  {modus.scenarioPlanned}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="line-clamp-2 font-semibold text-xs text-txt"
                    title={modus.nama}
                  >
                    {modus.nama}
                  </p>
                  <p
                    className="mt-0.5 truncate text-[10px] text-dim"
                    title={modus.ciri[0]}
                  >
                    {modus.ciri[0]}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-panel-2 px-1.5 py-0.5 text-[10px] text-dim">
                  Rencana
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Alert className="rounded-2xl border-line">
        <ShieldCheck aria-hidden />
        <AlertTitle>Latihan, bukan pemindaian perangkat</AlertTitle>
        <AlertDescription>
          Semua pesan, lampiran, meter, dan alat di simulasi ini fiktif. Latihan
          tidak mengubah perangkatmu dan tidak mengirim laporan ke mana pun.
          Penilaian mengikuti aturan skenario, bukan skor model. Kalau ini
          sedang terjadi sungguhan, gunakan mode darurat.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default function SimulasiPage() {
  return (
    <WorkspaceShell label="Simulasi" aside={<SimulasiAside />}>
      <div className="flex w-full flex-col gap-6">
        <section className="appnext-campaign relative overflow-hidden rounded-card p-6 text-bg shadow-[var(--appnext-shadow-soft)] sm:p-7">
          {/* Keeps white copy at AA over the lighter campaign gradient. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-ink/25"
          />
          <svg
            aria-hidden
            role="presentation"
            viewBox="0 0 800 220"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full opacity-45"
          >
            <path
              d="M-40 180 C 140 90, 290 230, 480 140 C 640 65, 720 150, 840 95 L 840 240 L -40 240 Z"
              className="fill-bg/10"
            />
            <path
              d="M-20 205 C 180 120, 340 215, 530 145 C 670 95, 760 165, 850 130"
              fill="none"
              strokeWidth="2.5"
              className="stroke-bg/25"
            />
            <path
              d="M40 220 C 240 135, 390 200, 590 125 C 700 85, 770 120, 850 90"
              fill="none"
              strokeWidth="1.75"
              className="stroke-bg/20"
            />
          </svg>

          <div className="relative z-10 max-w-2xl">
            <p className="inline-flex items-center rounded-full border border-bg/25 bg-ink/30 px-2.5 py-1 font-semibold text-[11px] backdrop-blur-sm">
              Misi · Level {SCENARIO_CATALOG[0]?.scenario.level ?? 1}
            </p>
            <h1
              id="mission-title"
              className="mt-3 font-bold text-2xl text-bg leading-tight tracking-tight sm:text-[30px]"
            >
              {MISSION.title}
            </h1>
            <p className="mt-2 max-w-xl text-bg text-sm leading-relaxed">
              {MISSION.context}
            </p>
            <p className="mt-3 max-w-xl text-bg text-sm leading-relaxed">
              <span className="font-semibold">Tujuanmu: </span>
              {MISSION.objective}
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-bg">
              <span>Perkiraan {MISSION.duration}</span>
              <span aria-hidden>·</span>
              <span>{MISSION.chapters.length} babak</span>
              <span aria-hidden>·</span>
              <span>{endingCount} kemungkinan akhir</span>
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                asChild
                className="min-h-11 rounded-xl border border-ink-line bg-[var(--appnext-ink-2)] px-5 font-semibold text-bg text-xs shadow-lg hover:bg-[var(--appnext-ink-3)]"
              >
                <Link
                  href={`/simulasi/${SCENARIO_CATALOG[0].scenario.id}`}
                  data-pressable
                >
                  Buka briefing
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="min-h-11 rounded-xl border-bg/40 bg-bg px-4 font-semibold text-brand-ink text-xs hover:bg-bg/90 hover:text-brand-ink"
              >
                <Link href="/belajar/10" data-pressable>
                  Pelajari pola APK
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section aria-labelledby="chapters-heading" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="chapters-heading"
              className="font-bold text-[18px] text-txt"
            >
              Alur misi
            </h2>
            <p className="text-dim text-xs">Satu keputusan per babak.</p>
          </div>
          <ol className="list-none divide-y divide-line overflow-hidden rounded-card border border-line bg-panel p-0 shadow-[var(--appnext-shadow-ambient)]">
            {MISSION.chapters.map((chapter, index) => (
              <li key={chapter} className="flex gap-4 p-4 sm:p-5">
                <span className="tabular flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft font-black text-[11px] text-brand-ink">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-txt">{chapter}</p>
                  <p className="mt-0.5 text-dim text-xs leading-relaxed">
                    {CHAPTER_NOTES[index]}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <p className="text-dim text-xs">
          Sedang kena sekarang?{" "}
          <Link
            className="font-semibold text-brand-strong underline-offset-4 hover:underline"
            href="/darurat"
          >
            Buka mode darurat
          </Link>
          . Halaman itu tidak memakai skor atau gamifikasi.
        </p>
      </div>
    </WorkspaceShell>
  );
}
