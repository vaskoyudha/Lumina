import {
  ArrowRight,
  FileWarning,
  Gamepad2,
  Package,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceShell } from "@/components/shell/workspace-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MODUS } from "@/lib/modus";
import { SCENARIO_CATALOG } from "@/lib/simulasi/catalog";
import { MISSION, type ScenarioNode } from "@/lib/simulasi/scenario";

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

const incomingMessages = scenarioNodes.filter(
  (node): node is Extract<ScenarioNode, { type: "message" }> =>
    node.type === "message" && node.speaker === MISSION.contact,
);

const endingCount = scenarioNodes.filter(
  (node) => node.type === "ending",
).length;

const CHAPTER_NOTES = [
  "Pesan kurir dan lampiran palsu masuk. Kamu memutuskan apakah memercayainya.",
  "Kalau kendali ponsel mulai lepas, dek perangkat membantu memutus akses.",
  "Tolak kode rahasia, simpan bukti yang aman, lalu lihat apa yang bisa diperbaiki.",
];

const STATS = [
  { label: "Babak", value: String(MISSION.chapters.length) },
  { label: "Akhir", value: String(endingCount) },
  { label: "Menit", value: "3–5" },
];

function SimulasiAside() {
  return (
    <div className="flex flex-col gap-5">
      <Card className="gap-0 rounded-2xl border border-line p-4 py-4 ring-0 shadow-[var(--appnext-shadow-ambient)]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-sm text-txt">Ringkasan misi</h2>
          <span className="rounded-md bg-brand-soft px-2 py-0.5 font-semibold text-[10px] text-brand-ink">
            LEVEL {SCENARIO_CATALOG[0]?.scenario.level ?? 1}
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl border border-line bg-panel-2 p-2.5">
          {STATS.map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center py-1.5">
              <dd className="tabular font-bold text-sm text-txt">{value}</dd>
              <dt className="mt-0.5 text-[9px] text-dim leading-none">
                {label}
              </dt>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-dim text-[11px] leading-relaxed">
          Pilihanmu mengubah meter panik dan intrusi. Tidak ada skor dari model;
          penilaian mengikuti aturan skenario.
        </p>
      </Card>

      <Card
        role="region"
        aria-labelledby="planned-heading"
        className="gap-0 rounded-2xl border border-line py-0 ring-0 shadow-[var(--appnext-shadow-ambient)]"
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
                  <p className="truncate font-semibold text-xs text-txt">
                    {modus.nama}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-dim">
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
          Kalau ini sedang terjadi sungguhan, gunakan mode darurat.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default function SimulasiPage() {
  return (
    <WorkspaceShell label="Simulasi" aside={<SimulasiAside />}>
      <header className="-mx-5 flex flex-col justify-between gap-3 border-field border-b px-5 pb-4 shadow-sm sm:-mx-8 sm:px-8 xl:flex-row xl:items-end">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-medium text-dim text-xs">
            <Gamepad2 aria-hidden className="size-3.5" />
            Simulasi · Level {SCENARIO_CATALOG[0]?.scenario.level ?? 1}
          </p>
          <h1 className="mt-1 font-bold text-[22px] text-txt tracking-tight sm:text-2xl">
            {MISSION.title}
          </h1>
          <p className="mt-0.5 max-w-[62ch] font-medium text-dim text-xs sm:text-[13px]">
            {MISSION.role}. {MISSION.objective}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 font-medium text-[11px] text-dim shadow-sm">
            <Package aria-hidden className="size-3.5" />
            {MISSION.chapters.length} babak
          </span>
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 font-medium text-[11px] text-dim shadow-sm">
            <ShieldCheck aria-hidden className="size-3.5" />
            {endingCount} akhir
          </span>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-brand-line bg-brand-soft px-2.5 py-1.5 font-semibold text-[11px] text-brand-ink shadow-sm sm:flex">
            Perkiraan {MISSION.duration}
          </span>
        </div>
      </header>

      <div className="flex w-full flex-col gap-6">
        <section className="appnext-campaign relative overflow-hidden rounded-[22px] p-6 text-bg shadow-[var(--appnext-shadow-soft)] sm:p-7">
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

          <div className="relative z-10 flex items-center justify-between gap-6">
            <div className="max-w-lg">
              <div className="mb-2.5 inline-flex items-center rounded-full border border-bg/20 bg-bg/15 px-2.5 py-1 font-semibold text-[11px] backdrop-blur-sm">
                <span>MISI INTERAKTIF · LEVEL 1</span>
              </div>
              <h2 className="font-bold text-bg text-xl leading-tight tracking-tight sm:text-[26px]">
                {MISSION.title}
              </h2>
              <p className="mt-2 max-w-md text-bg/85 text-xs leading-relaxed sm:text-sm">
                {MISSION.context}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-bg/75">
                <span>Perkiraan {MISSION.duration}</span>
                <span aria-hidden>·</span>
                <span>{MISSION.chapters.length} babak</span>
                <span aria-hidden>·</span>
                <span>{endingCount} kemungkinan akhir</span>
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  className="min-h-10 rounded-xl border border-ink-line bg-[var(--appnext-ink-2)] px-5 font-semibold text-bg text-xs shadow-lg hover:bg-[var(--appnext-ink-3)]"
                >
                  <Link
                    href={`/simulasi/${SCENARIO_CATALOG[0].scenario.id}`}
                    data-pressable
                  >
                    Mulai misi
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="min-h-10 rounded-xl border-bg/25 bg-bg/15 px-4 font-semibold text-bg text-xs backdrop-blur-md hover:bg-bg/25 hover:text-bg"
                >
                  <Link href="/belajar/10" data-pressable>
                    Pelajari pola APK
                  </Link>
                </Button>
              </div>
            </div>

            <div className="hidden shrink-0 flex-col items-center gap-2 pr-2 sm:flex">
              <span className="flex size-20 flex-col items-center justify-center rounded-[26px] bg-bg text-brand-ink shadow-lg">
                <Package aria-hidden className="size-7" />
                <span className="tabular mt-1 font-black text-xl">
                  {String(SCENARIO_CATALOG[0]?.scenario.level ?? 1).padStart(
                    2,
                    "0",
                  )}
                </span>
              </span>
              <span className="rounded-full border border-bg/20 bg-bg/15 px-2.5 py-0.5 font-semibold text-[10px] text-bg">
                {MISSION.chapters.length} babak
              </span>
            </div>
          </div>
        </section>

        <section aria-labelledby="chapters-heading" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="chapters-heading"
              className="font-bold text-[18px] text-txt"
            >
              Alur misi
            </h2>
            <p className="tabular font-semibold text-dim text-xs">
              {MISSION.chapters.length} babak
            </p>
          </div>
          <ol className="grid list-none gap-3 p-0 sm:grid-cols-3">
            {MISSION.chapters.map((chapter, index) => (
              <li
                key={chapter}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-4 shadow-[var(--appnext-shadow-ambient)]"
              >
                <span className="tabular flex size-8 items-center justify-center rounded-xl bg-brand-soft font-black text-[11px] text-brand-ink">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="font-bold text-sm text-txt">{chapter}</p>
                <p className="text-dim text-xs leading-relaxed">
                  {CHAPTER_NOTES[index]}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="preview-heading"
          className="overflow-hidden rounded-2xl border border-line bg-panel shadow-[var(--appnext-shadow-ambient)]"
        >
          <header className="flex items-start justify-between gap-3 border-line border-b px-5 py-4">
            <div className="min-w-0">
              <h2 id="preview-heading" className="font-bold text-sm text-txt">
                Pratinjau pesan
              </h2>
              <p className="mt-0.5 text-dim text-xs">
                {MISSION.contact} · {MISSION.contactDetail}
              </p>
            </div>
            <Badge className="shrink-0" variant="outline">
              Fiktif
            </Badge>
          </header>
          <div className="flex flex-col gap-3 px-5 py-5">
            {incomingMessages.slice(0, 2).map((node) => (
              <div key={node.id} className="appnext-chat max-w-[34rem]">
                <p className="appnext-chat-meta">{node.speaker}</p>
                <p className="mt-1.5 text-sm text-txt">{node.text}</p>
                {node.attachment ? (
                  <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-panel-2 px-3 py-2.5">
                    <FileWarning
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-danger"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-txt">
                        {node.attachment.name}
                      </p>
                      <p className="text-dim text-xs">
                        {node.attachment.detail}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
            <p aria-hidden="true" className="text-dim text-sm">
              Pengirim sedang mengetik…
            </p>
          </div>
          <p className="flex items-start gap-2 border-line border-t px-5 py-3 text-dim text-xs">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
            Semua pesan dan lampiran di atas fiktif. Tidak ada berkas yang bisa
            diunduh atau dipasang.
          </p>
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
