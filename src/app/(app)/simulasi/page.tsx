import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Gamepad2,
  Package,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
);

const incomingMessage = SCENARIO_CATALOG.flatMap(
  (scenario) => scenario.nodes,
).find((node) => node.type === "message" && node.attachment);

const endingCount = SCENARIO_CATALOG.flatMap(
  (scenario) => scenario.nodes,
).filter((node) => node.type === "ending").length;

export default function SimulasiPage() {
  return (
    <div className="appnext-container min-w-0 py-8 sm:py-10">
      <section
        aria-labelledby="mission-title"
        className="grid gap-9 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center"
      >
        <div className="min-w-0">
          <p className="appnext-caption flex items-center gap-2">
            <Gamepad2 aria-hidden className="size-3.5" />
            Misi interaktif · Level 1
          </p>
          <h1 id="mission-title" className="mt-3">
            Paket sebelum pulang
          </h1>
          <p className="appnext-lead mt-4 max-w-xl">
            <strong>Satu chat. Banyak jebakan.</strong> {MISSION.context}
          </p>
          <p className="mt-3 max-w-xl">
            {MISSION.role}. {MISSION.objective}
          </p>

          <ul
            aria-label="Ringkasan misi"
            className="appnext-caption mt-6 flex flex-wrap gap-x-6 gap-y-2"
          >
            <li className="flex items-center gap-1.5">
              <Clock3 aria-hidden className="size-3.5" />
              Perkiraan {MISSION.duration}
            </li>
            <li className="flex items-center gap-1.5">
              <Package aria-hidden className="size-3.5" />
              {MISSION.chapters.length} babak
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck aria-hidden className="size-3.5" />
              {endingCount} kemungkinan akhir
            </li>
          </ul>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="min-h-11 rounded-full bg-[var(--appnext-accent-deep)] px-5 text-base text-white hover:bg-[var(--appnext-ink-2)]"
              data-pressable
              size="lg"
            >
              <Link href={`/simulasi/${SCENARIO_CATALOG[0].scenario.id}`}>
                Mulai misi
                <ArrowUpRight aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              className="min-h-11 rounded-full px-5 text-base"
              data-pressable
              size="lg"
              variant="outline"
            >
              <Link href="/belajar/10">
                Pelajari pola APK
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Link
              className="appnext-link text-dim text-sm underline-offset-4 hover:text-txt hover:underline"
              href="/darurat"
            >
              Perlu bantuan sekarang?
            </Link>
          </div>
        </div>

        <figure className="m-0 min-w-0">
          <div className="overflow-hidden rounded-[var(--appnext-r-card)] bg-panel-2 shadow-[var(--appnext-shadow-ambient)]">
            <Image
              alt=""
              aria-hidden="true"
              className="h-auto w-full"
              height={1024}
              priority
              sizes="(min-width: 1024px) 46vw, 100vw"
              src="/simulasi/parcel-playground.png"
              width={1024}
            />
          </div>
          <figcaption className="appnext-caption mt-3">
            Ada paket. Ada plot twist.
            {incomingMessage?.type === "message" &&
            incomingMessage.attachment ? (
              <span className="tabular">
                {" "}
                · {incomingMessage.attachment.name}
              </span>
            ) : null}
          </figcaption>
        </figure>
      </section>

      <section aria-labelledby="chapters-heading" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="chapters-heading">Alur misi</h2>
          <p className="appnext-caption tabular">
            Tiga babak · sekitar {MISSION.duration}
          </p>
        </div>
        <ol className="mt-5 grid gap-3">
          {MISSION.chapters.map((chapter, index) => (
            <li
              className="flex min-w-0 items-center gap-4 rounded-[var(--appnext-r-md)] bg-panel-2 px-4 py-4"
              key={chapter}
            >
              <span className="tabular appnext-caption shrink-0">
                0{index + 1}
              </span>
              <span className="min-w-0 flex-1 text-base text-txt">
                {chapter}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="planned-heading" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="planned-heading">Level lain</h2>
          <p className="appnext-caption">
            Masih direncanakan, belum bisa dimainkan.
          </p>
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {PLANNED.map((modus) => (
            <li
              className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--appnext-r-md)] bg-panel-2 px-4 py-4"
              key={modus.id}
            >
              <span className="tabular appnext-caption shrink-0">
                {modus.scenarioPlanned}
              </span>
              <span className="min-w-0 flex-1 text-base text-txt">
                {modus.nama}
              </span>
              <Badge className="shrink-0" variant="outline">
                Rencana
              </Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
