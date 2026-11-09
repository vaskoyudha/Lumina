import {
  ArrowRight,
  Check,
  Clock,
  Lightbulb,
  ListChecks,
  Lock,
  Mail,
  Route,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ContentLoading,
  ContentUnavailable,
} from "@/components/belajar/content-state";
import { WorkspaceShell } from "@/components/shell/workspace-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { LearningSummary } from "@/lib/content/schema";
import {
  listModules,
  listSimulations,
  moduleSummaries,
} from "@/lib/content/store";

export const metadata: Metadata = {
  title: "Simulasi",
  description:
    "Latihan fiktif 3–5 menit tentang pesan kurir, APK, dan cara menjaga kendali ponsel.",
};

const CHAPTER_ICONS = [UserRound, Mail, ShieldCheck];

const PLANNED_COPY: Record<string, { title?: string; note: string }> = {
  "phishing-tautan": {
    title: "Pengintipan tautan & akun",
    note: "Mencari tautan mencurigakan",
  },
  "lowongan-tugas-berbayar": { note: "Waspadai jebakan kerja palsu" },
  "pinjol-fiktif": { note: "Pinjaman cepat berisiko tinggi" },
  "fake-call": { note: "Kenali identitas dengan cermat" },
};

function SimulasiAside({ planned: PLANNED }: { planned: LearningSummary[] }) {
  return (
    <div className="flex flex-col gap-5">
      <Card
        role="region"
        aria-labelledby="planned-heading"
        className="gap-0 rounded-card border border-line py-0 ring-0 shadow-[var(--appnext-shadow-ambient)]"
      >
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id="planned-heading" className="font-bold text-[15px] text-txt">
              Level lain
            </h2>
            <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-ink-soft">
              Lihat semua
              <ArrowRight aria-hidden className="size-3" />
            </span>
          </div>
          <ul className="mt-2.5 divide-y divide-line">
            {PLANNED.map((modus) => {
              const copy = PLANNED_COPY[modus.id];
              const title = copy?.title ?? modus.nama;
              const note = copy?.note ?? modus.ciri[0];
              return (
                <li key={modus.id} className="flex items-start gap-3 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Lock aria-hidden strokeWidth={1.8} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="font-bold text-[12px] text-txt leading-snug"
                        title={title}
                      >
                        {title}
                      </p>
                      <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 font-semibold text-[9.5px] text-brand-chip-ink">
                        Rencana
                      </span>
                    </div>
                    <p
                      className="mt-1 text-[10.5px] text-dim leading-snug"
                      title={note}
                    >
                      {note}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Card>

      <Card className="relative gap-0 overflow-hidden rounded-card border border-brand-line/60 bg-gradient-to-br from-brand-tint via-brand-soft-2 to-brand-soft py-0 ring-0 shadow-[var(--appnext-shadow-ambient)]">
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 size-36 translate-x-8 translate-y-8 rounded-full bg-brand-glow/25 blur-2xl"
        />
        <div className="relative p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="max-w-[11.25rem] font-bold text-[15px] text-txt leading-snug">
              Latihan, bukan pemindaian perangkat!
            </h2>
            <ShieldCheck
              aria-hidden
              strokeWidth={1.6}
              className="size-10 shrink-0 text-brand"
            />
          </div>
          <p className="mt-2 text-[11.5px] text-dim leading-relaxed">
            Semua pesan, lampiran, meter, dan alat di simulasi ini fiktif.
            Latihan ini tidak mengubah perangkatmu dan tidak mengirim laporan ke
            mana pun. Penilaian mengikuti aturan skenario, bukan skor model.
            Jika kasus sedang terjadi sungguhan, segera hubungi penyedia akun
            melalui kanal resmi.
          </p>
          <div className="mt-4 flex justify-end">
            <Link
              href="/komunitas"
              aria-label="Buka komunitas"
              className="flex size-8 items-center justify-center rounded-full border border-brand-line bg-panel/80 text-brand shadow-sm transition-colors hover:bg-panel hover:text-brand-strong"
            >
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function SimulasiPage() {
  return (
    <Suspense fallback={<ContentLoading />}>
      <SimulasiContent />
    </Suspense>
  );
}
export async function SimulasiContent() {
  await connection();
  let modules: Awaited<ReturnType<typeof listModules>>;
  let simulations: Awaited<ReturnType<typeof listSimulations>>;
  try {
    [modules, simulations] = await Promise.all([
      listModules(),
      listSimulations(),
    ]);
  } catch {
    return <ContentUnavailable />;
  }
  const featured = simulations[0];
  if (!featured) return <ContentUnavailable empty />;
  const {
    mission: MISSION,
    chapterNotes: CHAPTER_NOTES,
    summary: SUMMARY_POINTS,
    tips: TIPS,
  } = featured;
  const PLANNED = moduleSummaries(modules).filter(
    (m) => m.scenarioPlanned && !simulations.some((s) => s.moduleNo === m.no),
  );
  const endingCount = featured.scenario.nodes.filter(
    (n) => n.type === "ending",
  ).length;
  const TITLE_WORDS = MISSION.title.split(" "),
    TITLE_LEAD = TITLE_WORDS.slice(0, -1).join(" "),
    TITLE_TAIL = TITLE_WORDS.at(-1) ?? "";
  return (
    <WorkspaceShell
      label="Simulasi"
      aside={<SimulasiAside planned={PLANNED} />}
    >
      <div className="flex w-full flex-col gap-6">
        <section className="relative overflow-hidden rounded-card border border-brand-line shadow-[var(--appnext-shadow-soft)]">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-brand-tint bg-[url('/simulasi/hero-gift.webp')] bg-cover bg-[position:72%_50%] bg-no-repeat [mask-image:linear-gradient(90deg,transparent_0%,black_40%)]"
          />
          <div className="relative">
            <div className="min-w-0 max-w-xl p-6 sm:p-8">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-panel px-2.5 py-1 font-semibold text-[11px] text-brand-ink shadow-sm">
                <span className="flex size-4 items-center justify-center rounded-full bg-brand text-bg">
                  <ShieldCheck aria-hidden className="size-2.5" />
                </span>
                Misi · Level {featured.scenario.scenario.level}
              </p>
              <h1
                id="mission-title"
                className="mt-3 font-bold text-2xl text-txt leading-tight tracking-tight sm:text-[32px]"
              >
                {TITLE_LEAD} <span className="text-brand">{TITLE_TAIL}</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm text-txt leading-relaxed">
                {MISSION.context}
              </p>
              <p className="mt-3 max-w-xl rounded-xl border border-brand-line bg-panel/80 px-3 py-2 text-sm text-txt leading-relaxed">
                <span className="font-semibold">Tujuanmu: </span>
                {MISSION.objective}
              </p>
              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-dim">
                <Clock aria-hidden className="size-3.5 text-brand" />
                <span>Perkiraan {MISSION.duration}</span>
                <span aria-hidden>·</span>
                <span>{MISSION.chapters.length} babak</span>
                <span aria-hidden>·</span>
                <span>{endingCount} kemungkinan akhir</span>
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  className="min-h-11 rounded-xl bg-brand px-5 font-semibold text-bg text-xs shadow-lg hover:bg-brand-strong"
                >
                  <Link
                    href={`/simulasi/${featured.scenario.scenario.id}`}
                    data-pressable
                  >
                    Mulai briefing
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="min-h-11 rounded-xl border-brand-line bg-panel px-4 font-semibold text-txt text-xs hover:bg-brand-soft hover:text-brand-ink"
                >
                  <Link
                    href={
                      featured.moduleNo
                        ? `/belajar/${featured.moduleNo}`
                        : "/belajar"
                    }
                    data-pressable
                  >
                    Pelajari pola ini
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {simulations.length > 1 && (
          <section aria-label="Misi lainnya">
            <h2 className="text-lg">Misi lainnya</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {simulations.slice(1).map((s) => (
                <Button
                  asChild
                  variant="outline"
                  className="min-h-11"
                  key={s.scenario.scenario.id}
                >
                  <Link href={`/simulasi/${s.scenario.scenario.id}`}>
                    {s.mission.title}
                  </Link>
                </Button>
              ))}
            </div>
          </section>
        )}
        <section aria-labelledby="chapters-heading" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="chapters-heading"
              className="flex items-center gap-2 font-bold text-[18px] text-txt"
            >
              <Route aria-hidden className="size-4 text-brand" />
              Alur misi
            </h2>
            <p className="text-dim text-xs">Satu keputusan per babak.</p>
          </div>
          <ol className="grid list-none gap-3 p-0 md:grid-cols-3">
            {MISSION.chapters.map((chapter, index) => {
              const Icon = CHAPTER_ICONS[index] ?? ShieldCheck;
              return (
                <li
                  key={chapter}
                  className="relative flex flex-col gap-3 rounded-card border border-line bg-panel p-4 shadow-[var(--appnext-shadow-ambient)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-ink ring-1 ring-brand-line">
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <span className="tabular flex size-5 items-center justify-center rounded-full bg-brand font-bold text-[9px] text-bg">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-txt">{chapter}</p>
                    <p className="mt-1 text-dim text-xs leading-relaxed">
                      {CHAPTER_NOTES[index]}
                    </p>
                  </div>
                  {index < MISSION.chapters.length - 1 ? (
                    <span
                      aria-hidden
                      className="absolute top-1/2 right-[-13px] z-10 hidden size-5 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-bg shadow md:flex"
                    >
                      <ArrowRight className="size-3" />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="gap-0 overflow-hidden rounded-card border border-line py-0 ring-0 shadow-[var(--appnext-shadow-ambient)] min-[1680px]:relative min-[1680px]:aspect-[2048/869]">
            <div
              aria-hidden="true"
              className="aspect-[2048/869] w-full bg-[url('/simulasi/card-laptop.webp')] bg-cover bg-center bg-no-repeat min-[1680px]:absolute min-[1680px]:inset-0 min-[1680px]:aspect-auto"
            />
            <div className="flex flex-col p-5 min-[1680px]:absolute min-[1680px]:inset-y-0 min-[1680px]:right-0 min-[1680px]:ml-auto min-[1680px]:max-w-[58%] min-[1680px]:justify-center">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-bold text-[15px] text-txt">
                  <ListChecks aria-hidden className="size-4 text-brand" />
                  Ringkasan Misi
                </h2>
                <Link
                  href={`/simulasi/${featured.scenario.scenario.id}`}
                  className="shrink-0 whitespace-nowrap font-semibold text-[11px] text-brand-strong hover:underline"
                >
                  Lihat detail →
                </Link>
              </div>
              <ul className="mt-3 list-none space-y-2.5 p-0">
                {SUMMARY_POINTS.map((point) => (
                  <li key={point} className="flex gap-2.5">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand text-bg">
                      <Check aria-hidden className="size-2.5" />
                    </span>
                    <p className="text-dim text-xs leading-relaxed">{point}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="gap-0 overflow-hidden rounded-card border border-line py-0 ring-0 shadow-[var(--appnext-shadow-ambient)] min-[1680px]:relative min-[1680px]:aspect-[2048/869]">
            <div
              aria-hidden="true"
              className="aspect-[2048/869] w-full bg-[url('/simulasi/card-shield.webp')] bg-cover bg-center bg-no-repeat min-[1680px]:absolute min-[1680px]:inset-0 min-[1680px]:aspect-auto"
            />
            <div className="flex flex-col p-5 min-[1680px]:absolute min-[1680px]:inset-y-0 min-[1680px]:left-0 min-[1680px]:max-w-[58%] min-[1680px]:justify-center">
              <h2 className="flex items-center gap-2 font-bold text-[15px] text-txt">
                <Lightbulb aria-hidden className="size-4 text-brand" />
                Tips Penting
              </h2>
              <ul className="mt-3 list-none space-y-2.5 p-0">
                {TIPS.map((tip) => (
                  <li key={tip} className="flex gap-2.5">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand text-bg">
                      <Check aria-hidden className="size-2.5" />
                    </span>
                    <p className="text-dim text-xs leading-relaxed">{tip}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </WorkspaceShell>
  );
}
