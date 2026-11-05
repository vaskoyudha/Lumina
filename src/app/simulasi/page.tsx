import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 max-w-prose">
        <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
          {MISSION.title}
        </h1>
        <p className="mt-3 text-base text-dim">{MISSION.context}</p>
      </header>

      <Card className="min-w-0 overflow-hidden border border-line bg-panel text-txt">
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)]">
          <div className="grid min-w-0 content-start gap-5 p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="min-h-7 text-base text-safe"
              >
                Misi aktif · Level 1
              </Badge>
              <span className="text-base text-dim">
                Perkiraan {MISSION.duration}
              </span>
            </div>
            <section aria-labelledby="objective-heading" className="grid gap-2">
              <h2 id="objective-heading" className="font-semibold text-xl">
                {MISSION.role}
              </h2>
              <p className="text-base text-dim">{MISSION.objective}</p>
            </section>
            <Button
              asChild
              data-pressable
              className="min-h-11 w-full bg-safe text-base text-bg hover:bg-safe/90 sm:w-fit"
              size="lg"
            >
              <Link href={`/simulasi/${SCENARIO_CATALOG[0].scenario.id}`}>
                Mulai misi
              </Link>
            </Button>
            <p className="text-base text-dim">
              Cerita dan ponsel di dalam latihan ini sepenuhnya fiktif.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-base">
              <span>{MISSION.chapters.length} babak</span>
              <span>{endingCount} kemungkinan akhir</span>
            </div>
          </div>

          <aside className="grid min-w-0 content-start gap-4 border-line border-t bg-panel-2 p-5 sm:p-7 lg:border-t-0 lg:border-l">
            <div>
              <p className="font-medium text-base">Pesan masuk</p>
              <p className="text-base text-dim">{MISSION.contact}</p>
            </div>
            {incomingMessage?.type === "message" && (
              <Card className="min-w-0 border border-line bg-panel text-txt">
                <CardHeader>
                  <CardTitle className="text-base">Pesan fiktif</CardTitle>
                  <CardDescription className="text-base text-txt">
                    {incomingMessage.text}
                  </CardDescription>
                </CardHeader>
                {incomingMessage.attachment && (
                  <CardContent className="pt-0">
                    <Badge variant="outline" className="min-h-7 text-base">
                      {incomingMessage.attachment.name}
                    </Badge>
                    <p className="mt-2 text-base text-dim">
                      {incomingMessage.attachment.detail}
                    </p>
                  </CardContent>
                )}
              </Card>
            )}
            <p className="text-base text-dim">
              Apa yang akan kamu lakukan sebelum paket hadiah Ibu dibawa
              kembali?
            </p>
          </aside>
        </div>
      </Card>

      <section aria-labelledby="chapters-heading" className="mt-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="chapters-heading" className="font-semibold text-lg">
            Alur misi
          </h2>
          <span className="text-base text-dim">
            Tiga babak · sekitar {MISSION.duration}
          </span>
        </div>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {MISSION.chapters.map((chapter, index) => (
            <li key={chapter} className="min-w-0">
              <Separator className="mb-3" />
              <p className="tabular text-sm text-dim">0{index + 1}</p>
              <p className="mt-1 font-medium text-base">{chapter}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="planned-heading" className="mt-8">
        <h2 id="planned-heading" className="font-semibold text-base">
          Level lain
        </h2>
        <p className="mt-1 text-base text-dim">
          Level berikutnya masih direncanakan dan belum bisa dimainkan.
        </p>
        <ul className="mt-3 flex min-w-0 flex-wrap gap-2">
          {PLANNED.map((modus) => (
            <li key={modus.id} className="min-w-0 max-w-full">
              <Badge
                variant="outline"
                className="h-auto min-h-8 max-w-full !whitespace-normal break-words text-base text-dim"
              >
                {modus.scenarioPlanned} · {modus.nama} · Rencana
              </Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
