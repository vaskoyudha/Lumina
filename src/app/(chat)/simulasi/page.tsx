import {
  ArrowRight,
  Briefcase,
  Check,
  Clock,
  CreditCard,
  Lightbulb,
  Link2,
  ListChecks,
  Mail,
  PhoneCall,
  Route,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProfilePopup } from "@/components/profil/profile-popup";
import { WorkspaceShell } from "@/components/shell/workspace-shell";
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

const CHAPTER_ICONS = [UserRound, Mail, ShieldCheck];

const PLANNED_ICONS: Record<string, typeof ShieldCheck> = {
  "fake-call": PhoneCall,
  "lowongan-tugas-berbayar": Briefcase,
  "phishing-tautan": Link2,
  "pinjol-fiktif": CreditCard,
};

const TITLE_WORDS = MISSION.title.split(" ");
const TITLE_LEAD = TITLE_WORDS.slice(0, -1).join(" ");
const TITLE_TAIL = TITLE_WORDS.at(-1) ?? "";

const SUMMARY_POINTS = [
  "Analisis pesan dan pola ancaman yang muncul.",
  "Amankan akun dan perangkat sebelum terlambat.",
  "Verifikasi tiap tindakan dengan bukti.",
];

const TIPS = [
  "Jangan pernah membagikan kode verifikasi atau informasi pribadi.",
  "Periksa selalu sumber pesan sebelum mengambil tindakan.",
  "Berkas .apk memasang aplikasi, bukan membuka foto.",
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
            <span className="font-semibold text-[11px] text-brand-strong">
              Lihat semua →
            </span>
          </div>
          <p className="mt-0.5 text-dim text-xs">
            Masih direncanakan, belum bisa dimainkan.
          </p>
          <ul className="mt-3 space-y-1">
            {PLANNED.map((modus) => {
              const Icon = PLANNED_ICONS[modus.id] ?? ShieldCheck;
              return (
                <li key={modus.id} className="flex items-start gap-3 py-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="line-clamp-2 font-semibold text-xs text-txt"
                        title={modus.nama}
                      >
                        {modus.nama}
                      </p>
                      <span className="shrink-0 rounded-full border border-brand-line bg-brand-soft px-2 py-0.5 text-[10px] text-brand-ink">
                        Rencana
                      </span>
                    </div>
                    <p
                      className="mt-0.5 line-clamp-2 text-[10px] text-dim"
                      title={modus.ciri[0]}
                    >
                      {modus.ciri[0]}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Card>

      <Card className="rounded-card border border-line p-4 shadow-[var(--appnext-shadow-ambient)]">
        <h2 className="font-bold text-sm text-txt">
          Latihan, bukan pemindaian perangkat
        </h2>
        <p className="mt-2 text-dim text-xs leading-relaxed">
          Semua pesan, lampiran, meter, dan alat di simulasi ini fiktif. Latihan
          tidak mengubah perangkatmu dan tidak mengirim laporan ke mana pun.
          Penilaian mengikuti aturan skenario, bukan skor model. Kalau ini
          sedang terjadi sungguhan, gunakan mode darurat.
        </p>
        <div className="mt-3 flex justify-end">
          <Link
            href="/darurat"
            aria-label="Buka mode darurat"
            className="flex size-8 items-center justify-center rounded-full border border-brand-line bg-panel text-brand-strong transition-colors hover:bg-brand-soft hover:text-brand-ink"
          >
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function SimulasiPage() {
  return (
    <WorkspaceShell label="Simulasi" aside={<SimulasiAside />}>
      <div className="flex w-full flex-col gap-6">
        <section className="relative overflow-hidden rounded-card border border-brand-line shadow-[var(--appnext-shadow-soft)]">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-brand-tint bg-[url('/simulasi/hero-gift.webp')] bg-cover bg-[position:72%_50%] bg-no-repeat [mask-image:linear-gradient(90deg,transparent_0%,black_40%)]"
          />
          <div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
            <ProfilePopup className="size-11" />
          </div>
          <div className="relative">
            <div className="min-w-0 max-w-xl p-6 sm:p-8">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-panel px-2.5 py-1 font-semibold text-[11px] text-brand-ink shadow-sm">
                <span className="flex size-4 items-center justify-center rounded-full bg-brand text-bg">
                  <ShieldCheck aria-hidden className="size-2.5" />
                </span>
                Misi · Level {SCENARIO_CATALOG[0]?.scenario.level ?? 1}
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
                    href={`/simulasi/${SCENARIO_CATALOG[0].scenario.id}`}
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
                  <Link href="/belajar/10" data-pressable>
                    Pelajari pola APK
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

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
                  href={`/simulasi/${SCENARIO_CATALOG[0].scenario.id}`}
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
