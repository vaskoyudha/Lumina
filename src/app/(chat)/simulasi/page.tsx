import {
  ArrowRight,
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
import { ProfilePopup } from "@/components/profil/profile-popup";
import { WorkspaceShell } from "@/components/shell/workspace-shell";
import {
  type LevelEntry,
  LevelPicker,
} from "@/components/simulasi/level-picker";
import { MissionStatusBar } from "@/components/simulasi/mission-status-bar";
import {
  SURFACE_BADGE,
  SURFACE_FLAME,
  SURFACE_MAIN,
  SURFACE_NOTE,
  SURFACE_PANEL,
  SURFACE_RAIL,
  SURFACE_ROW,
  SURFACE_SUBCARD,
  SURFACE_TIP,
} from "@/components/simulasi/surface";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { LearningSummary } from "@/lib/content/schema";
import {
  listModules,
  listSimulations,
  moduleSummaries,
} from "@/lib/content/store";
import { cn } from "@/lib/utils";

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

const PLANNED_IMAGES = [
  "/simulasi/card-laptop.webp",
  "/simulasi/card-shield.webp",
  "/simulasi/parcel-playground.png",
  "/simulasi/hero-gift.webp",
];

function SimulasiAside({
  planned: PLANNED,
  levels,
}: {
  planned: LearningSummary[];
  levels: { available: LevelEntry[]; planned: LevelEntry[] };
}) {
  return (
    <div className={cn("flex flex-col gap-2", SURFACE_RAIL)}>
      {PLANNED.length > 0 ? (
        <section
          aria-labelledby="planned-heading"
          className={cn(SURFACE_SUBCARD, "p-3.5")}
        >
        <div className="flex items-center justify-between gap-2 border-[#efe5dc] border-b pb-1.5">
          <h2
            id="planned-heading"
            className="font-extrabold text-[10.5px] text-[#1e1c1a]"
          >
            Level lain
          </h2>
          <span className="inline-flex items-center gap-1 font-bold text-[9.5px] text-[#e65c00]">
            Lihat semua
            <ArrowRight aria-hidden className="size-3" />
          </span>
        </div>
        <ul className="mt-1 list-none divide-y divide-[#f0e5dc] p-0">
          {PLANNED.map((modus) => {
            const copy = PLANNED_COPY[modus.id];
            const title = copy?.title ?? modus.nama;
            const note = copy?.note ?? modus.ciri[0];
            return (
              <li key={modus.id} className="flex items-start gap-2.5 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(180deg,#fde8d8_0%,#fbd9c2_100%)] text-[#e65808]">
                  <Lock aria-hidden strokeWidth={1.8} className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="font-bold text-[11px] text-[#1e1c1a] leading-snug"
                      title={title}
                    >
                      {title}
                    </p>
                    <span className="shrink-0 rounded-full bg-[linear-gradient(90deg,#fde6d6_0%,#fbdac4_100%)] px-2 py-[1px] font-bold text-[8.5px] text-[#d4511b]">
                      Rencana
                    </span>
                  </div>
                  <p
                    className="mt-0.5 text-[11.5px] text-[#8a8077] leading-snug"
                    title={note}
                  >
                    {note}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        </section>
      ) : null}

      <section className={cn(SURFACE_TIP, "relative overflow-hidden p-3.5")}>
        <span
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-8 size-36 rounded-full bg-[#f8cca8]/40 blur-2xl"
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <h2 className="max-w-[11.25rem] font-extrabold text-[12px] text-[#1e1c1a] leading-snug">
              Latihan, bukan pemindaian perangkat!
            </h2>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/70 text-[#b45309]">
              <ShieldCheck aria-hidden strokeWidth={1.6} className="size-4" />
            </span>
          </div>
          <p className="mt-1.5 text-[#4a3728] text-[11.5px] leading-relaxed">
            Semua pesan, lampiran, meter, dan alat di simulasi ini fiktif.
            Latihan ini tidak mengubah perangkatmu dan tidak mengirim laporan ke
            mana pun. Penilaian mengikuti aturan skenario, bukan skor model.
            Jika kasus sedang terjadi sungguhan, segera hubungi penyedia akun
            melalui kanal resmi.
          </p>
          <div className="mt-3 flex justify-end">
            <Link
              href="/komunitas"
              aria-label="Buka komunitas"
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-3 font-bold text-[10px]",
                SURFACE_FLAME,
              )}
            >
              Buka komunitas
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <LevelPicker available={levels.available} planned={levels.planned} />
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
  const summaries = moduleSummaries(modules);
  const PLANNED = summaries.filter(
    (m) => m.scenarioPlanned && !simulations.some((s) => s.moduleNo === m.no),
  );
  const endingCount = featured.scenario.nodes.filter(
    (n) => n.type === "ending",
  ).length;
  const levels = {
    available: simulations.map((item) => ({
      id: item.scenario.scenario.id,
      title: item.mission.title,
      note: `Level ${item.scenario.scenario.level} · ${item.mission.duration}`,
      image: "/simulasi/hero-gift.webp",
      href: `/simulasi/${item.scenario.scenario.id}`,
    })),
    planned: PLANNED.map((modus, index) => ({
      id: modus.id,
      title: PLANNED_COPY[modus.id]?.title ?? modus.nama,
      note: PLANNED_COPY[modus.id]?.note ?? modus.ciri[0],
      image: PLANNED_IMAGES[index % PLANNED_IMAGES.length],
    })),
  };
  const TITLE_WORDS = MISSION.title.split(" "),
    TITLE_LEAD = TITLE_WORDS.slice(0, -1).join(" "),
    TITLE_TAIL = TITLE_WORDS.at(-1) ?? "";
  return (
    <WorkspaceShell
      label="Simulasi"
      aside={<SimulasiAside planned={PLANNED} levels={levels} />}
      progressModules={summaries}
    >
        <div className="flex w-full flex-col gap-6">
          <MissionStatusBar />
          <section className={cn("relative overflow-hidden", SURFACE_MAIN)}>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[url('/simulasi/hero-gift.webp')] bg-cover bg-[position:72%_50%] bg-no-repeat opacity-90 [mask-image:linear-gradient(90deg,transparent_0%,black_42%)]"
            />
            <div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
              <ProfilePopup className="size-11" />
            </div>
            <div className="relative">
              <div className="min-w-0 max-w-xl p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="inline-flex items-center gap-1.5 rounded-full border border-[#e5dbd1] bg-[linear-gradient(180deg,#f8f3ee_0%,#f1e8e0_100%)] px-2.5 py-1 font-bold text-[10.5px] text-[#4a433e]">
                    <span className="flex size-4 items-center justify-center rounded-full bg-[#f2600c] text-white">
                      <ShieldCheck aria-hidden className="size-2.5" />
                    </span>
                    Misi · Level {featured.scenario.scenario.level}
                  </p>
                  <span className="rounded-full bg-[linear-gradient(90deg,#fde6d6_0%,#fbdac4_100%)] px-2.5 py-1 font-bold text-[10.5px] text-[#d4511b]">
                    Fiktif
                  </span>
                </div>
                <h1
                  id="mission-title"
                  className="mt-3 font-extrabold text-2xl text-[#1e1c1a] leading-tight tracking-tight sm:text-[34px]"
                >
                  {TITLE_LEAD} <span className="text-brand">{TITLE_TAIL}</span>
                </h1>
                <p className="mt-3 max-w-xl text-[#5c534c] text-sm leading-relaxed">
                  {MISSION.context}
                </p>
                <p
                  className={cn(
                    SURFACE_NOTE,
                    "mt-3 max-w-xl px-3.5 py-2.5 text-sm text-[#4a3728] leading-relaxed",
                  )}
                >
                  <span className="font-bold text-[#c8430e]">Tujuanmu: </span>
                  {MISSION.objective}
                </p>
                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[#7c726a] text-[11.5px]">
                  <Clock aria-hidden className="size-3.5 text-[#f2600c]" />
                  <span>Perkiraan {MISSION.duration}</span>
                  <span aria-hidden>·</span>
                  <span>{MISSION.chapters.length} babak</span>
                  <span aria-hidden>·</span>
                  <span>{endingCount} kemungkinan akhir</span>
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button
                    asChild
                    className={cn(
                      "min-h-11 rounded-full px-5 font-bold",
                      SURFACE_FLAME,
                    )}
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
                    className="min-h-11 rounded-full border-[#ede3da] bg-[linear-gradient(180deg,#ffffff_0%,#fdfaf7_100%)] px-4 font-semibold text-[#221f1d] hover:brightness-99"
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
                className="flex items-center gap-2 font-extrabold text-[18px] text-txt"
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
                    className={cn(
                      "relative flex flex-col gap-3 p-4",
                      SURFACE_PANEL,
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex size-9 items-center justify-center rounded-[12px] bg-[linear-gradient(180deg,#fde8d8_0%,#fbd9c2_100%)] text-[#e65808]">
                        <Icon aria-hidden className="size-4" />
                      </span>
                      <span className="tabular flex size-[22px] items-center justify-center rounded-full bg-[linear-gradient(180deg,#ff7a18_0%,#f25c05_60%,#e04f00_100%)] font-extrabold text-[9.5px] text-white">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-[12.2px] text-[#1a1817]">
                        {chapter}
                      </p>
                      <p className="mt-1 text-[#7c726a] text-[13px] leading-relaxed">
                        {CHAPTER_NOTES[index]}
                      </p>
                    </div>
                    {index < MISSION.chapters.length - 1 ? (
                      <span
                        aria-hidden
                        className="absolute top-1/2 right-[-13px] z-10 hidden size-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#f2600c] text-white shadow md:flex"
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
            <Card
              className={cn(
                "gap-0 overflow-hidden border-0 py-0 ring-0 shadow-none min-[1680px]:relative min-[1680px]:aspect-[2048/869]",
                SURFACE_PANEL,
              )}
            >
              <div
                aria-hidden="true"
                className="aspect-[2048/869] w-full bg-[url('/simulasi/card-laptop.webp')] bg-cover bg-center bg-no-repeat min-[1680px]:absolute min-[1680px]:inset-0 min-[1680px]:aspect-auto"
              />
              <div className="flex flex-col p-5 min-[1680px]:absolute min-[1680px]:inset-y-0 min-[1680px]:right-0 min-[1680px]:ml-auto min-[1680px]:max-w-[58%] min-[1680px]:justify-center">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-extrabold text-[12.2px] text-[#1a1817]">
                    <ListChecks aria-hidden className="size-4 text-[#f2600c]" />
                    Ringkasan Misi
                  </h2>
                  <Link
                    href={`/simulasi/${featured.scenario.scenario.id}`}
                    className="shrink-0 whitespace-nowrap font-bold text-[9.5px] text-[#e65c00] hover:underline"
                  >
                    Lihat detail →
                  </Link>
                </div>
                <ul className="mt-3 flex list-none flex-col gap-1 p-0">
                  {SUMMARY_POINTS.map((point, index) => (
                    <li key={point} className="flex items-start gap-2">
                      <span
                        className={cn(
                          "grid size-[18px] shrink-0 place-items-center rounded-[6px] font-extrabold text-[9.2px]",
                          SURFACE_BADGE,
                        )}
                      >
                        {index + 1}
                      </span>
                      <p
                        className={cn(
                          "flex-1 px-2.5 py-[5px] text-[#24211f] text-[13px] leading-[1.35]",
                          SURFACE_ROW,
                        )}
                      >
                        {point}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card
              className={cn(
                "gap-0 overflow-hidden border-0 py-0 ring-0 shadow-none min-[1680px]:relative min-[1680px]:aspect-[2048/869]",
                SURFACE_PANEL,
              )}
            >
              <div
                aria-hidden="true"
                className="aspect-[2048/869] w-full bg-[url('/simulasi/card-shield.webp')] bg-cover bg-center bg-no-repeat min-[1680px]:absolute min-[1680px]:inset-0 min-[1680px]:aspect-auto"
              />
              <div className="flex flex-col p-5 min-[1680px]:absolute min-[1680px]:inset-y-0 min-[1680px]:left-0 min-[1680px]:max-w-[58%] min-[1680px]:justify-center">
                <h2 className="flex items-center gap-2 font-extrabold text-[12.2px] text-[#1a1817]">
                  <Lightbulb aria-hidden className="size-4 text-[#f2600c]" />
                  Tips Penting
                </h2>
                <ul className="mt-3 flex list-none flex-col gap-1 p-0">
                  {TIPS.map((tip, index) => (
                    <li key={tip} className="flex items-start gap-2">
                      <span
                        className={cn(
                          "grid size-[18px] shrink-0 place-items-center rounded-[6px] font-extrabold text-[9.2px]",
                          SURFACE_BADGE,
                        )}
                      >
                        {index + 1}
                      </span>
                      <p
                        className={cn(
                          "flex-1 px-2.5 py-[5px] text-[#24211f] text-[13px] leading-[1.35]",
                          SURFACE_ROW,
                        )}
                      >
                        {tip}
                      </p>
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
