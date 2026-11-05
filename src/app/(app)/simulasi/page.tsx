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
const incomingMessage = SCENARIO_CATALOG.flatMap(({ nodes }) => nodes).find(
  (node) => node.type === "message" && node.attachment,
);
const endingCount = SCENARIO_CATALOG.flatMap(({ nodes }) => nodes).filter(
  (node) => node.type === "ending",
).length;

export default function SimulasiPage() {
  return (
    <div className="sim-landing mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <section aria-labelledby="mission-title" className="sim-hero">
        <div className="sim-hero-copy">
          <p className="sim-eyebrow">
            <Gamepad2 aria-hidden="true" /> Misi interaktif · Level 1
          </p>
          <h1 className="sim-hero-title" id="mission-title">
            <span>Paket sebelum</span> <span>pulang</span>
          </h1>
          <p className="sim-hero-description">
            <strong>Satu chat. Banyak jebakan.</strong> {MISSION.context}
          </p>
          <p className="sim-hero-objective">
            {MISSION.role}. {MISSION.objective}
          </p>

          <div className="sim-hero-actions">
            <Button
              asChild
              data-pressable
              className="sim-primary-button min-h-12 text-base"
              size="lg"
            >
              <Link href={`/simulasi/${SCENARIO_CATALOG[0].scenario.id}`}>
                Mulai misi <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              data-pressable
              className="sim-secondary-button min-h-11 text-base"
              variant="outline"
              size="lg"
            >
              <Link href="/belajar/10">
                Pelajari pola APK <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Link className="sim-emergency-link" href="/darurat">
              Perlu bantuan sekarang?
            </Link>
          </div>

          <ul className="sim-mission-meta" aria-label="Ringkasan misi">
            <li>
              <Clock3 aria-hidden="true" /> Perkiraan {MISSION.duration}
            </li>
            <li>
              <Package aria-hidden="true" /> {MISSION.chapters.length} babak
            </li>
            <li>
              <ShieldCheck aria-hidden="true" /> {endingCount} kemungkinan akhir
            </li>
          </ul>
        </div>

        <figure className="sim-hero-art">
          <div className="sim-hero-art-frame">
            <Image
              src="/simulasi/parcel-playground.png"
              alt=""
              aria-hidden="true"
              className="sim-hero-illustration"
              width={1024}
              height={1024}
              priority
              sizes="(min-width: 1024px) 46vw, 100vw"
            />
            <span className="sim-sticker" data-color="mint">
              CERITA FIKTIF
            </span>
            <span className="sim-sticker" data-color="yellow">
              Hadiah buat Ibu!
            </span>
            <span className="sim-sticker" data-color="coral">
              Plot twist ↓
            </span>
          </div>
          <figcaption className="sim-hero-caption">
            Ada paket. Ada plot twist.
            {incomingMessage?.type === "message" &&
              incomingMessage.attachment && (
                <span> · {incomingMessage.attachment.name}</span>
              )}
          </figcaption>
        </figure>
      </section>

      <section
        aria-labelledby="chapters-heading"
        className="sim-stage-road mt-8"
      >
        <div className="sim-stage-header">
          <div>
            <p className="sim-eyebrow">
              Misi singkat, pilihanmu yang menentukan
            </p>
            <h2 id="chapters-heading">Alur misi</h2>
          </div>
          <span className="sim-stage-time">
            Tiga babak · sekitar {MISSION.duration}
          </span>
        </div>
        <ol className="sim-stage-list">
          {MISSION.chapters.map((chapter, index) => (
            <li className="sim-stage-stop" key={chapter}>
              <span className="sim-stage-number">0{index + 1}</span>
              <span className="sim-stage-copy">{chapter}</span>
              <ArrowRight aria-hidden="true" />
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="planned-heading" className="sim-planned mt-9">
        <header className="sim-page-header">
          <h2 id="planned-heading">Level lain</h2>
          <p>Masih direncanakan, belum bisa dimainkan.</p>
        </header>
        <ul className="sim-planned-list">
          {PLANNED.map((modus) => (
            <li key={modus.id}>
              <span className="sim-planned-chip">
                <span>{modus.scenarioPlanned}</span>
                <span>{modus.nama}</span>
                <span>Rencana</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
