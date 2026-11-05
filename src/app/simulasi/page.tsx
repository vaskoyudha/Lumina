import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MODUS } from "@/lib/modus";
import { SCENARIO_CATALOG } from "@/lib/simulasi/catalog";

export const metadata: Metadata = {
  title: "Simulasi Aman",
  description:
    "Latihan fiktif mengenali APK penipuan dan mengambil langkah aman.",
};

const PLANNED = MODUS.filter(
  (modus) => modus.scenarioId === null && modus.scenarioPlanned !== null,
);

export default function SimulasiPage() {
  return (
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="max-w-prose">
        <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
          Latihan mengenali penipuan
        </h1>
        <p className="mt-3 text-base text-dim">
          Coba satu skenario fiktif tentang pesan kurir yang meminta kamu
          memasang APK. Latihan ini aman: tindakan di dalamnya hanya simulasi.
        </p>
      </header>

      <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <section aria-labelledby="playable-heading" className="min-w-0">
          <h2
            className="mb-3 font-medium text-base text-txt"
            id="playable-heading"
          >
            Bisa dimainkan
          </h2>
          <ul className="grid gap-4">
            {SCENARIO_CATALOG.map((entry) => {
              const { scenario } = entry;
              const modus = MODUS.find(
                (item) => item.scenarioId === scenario.id,
              );

              return (
                <li key={scenario.id}>
                  <Card className="border border-line bg-panel text-txt">
                    <CardHeader>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Badge
                          variant="secondary"
                          className="min-h-7 text-base text-safe"
                        >
                          Siap dimainkan
                        </Badge>
                        <span className="text-base text-dim">
                          Level {scenario.level} · Mudah
                        </span>
                      </div>
                      <CardTitle className="pt-2 text-xl">
                        {modus?.nama ?? scenario.title}
                      </CardTitle>
                      <CardDescription className="text-base text-dim">
                        Hadapi pesan WhatsApp fiktif yang menyertakan file APK.
                        Pilih langkah untuk menjaga perangkat dan akun tetap
                        aman.
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="border-line bg-panel-2">
                      <Button
                        asChild
                        data-pressable
                        className="min-h-11 w-full bg-safe text-base text-bg hover:bg-safe/90 sm:w-auto"
                        size="lg"
                      >
                        <Link href={`/simulasi/${scenario.id}`}>
                          Mulai latihan
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="grid min-w-0 content-start gap-6">
          <Card className="border border-line bg-panel text-txt">
            <CardHeader>
              <CardTitle className="text-lg">Yang akan kamu latih</CardTitle>
              <CardDescription className="text-base text-dim">
                Kenali tanda bahaya, lalu pilih respons yang melindungi akun dan
                perangkat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 text-base text-txt">
                <li>
                  <span className="font-medium">Tiga alat:</span> isolasi
                  perangkat, pemeriksaan izin, dan laporan bukti.
                </li>
                <li>
                  <span className="font-medium">Dua meter risiko:</span> panik
                  meningkat setelah pilihan berisiko; intrusi naik saat menunggu
                  di titik keputusan.
                </li>
                <li>Setiap pilihan dijelaskan dan cerita tetap berlanjut.</li>
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-2 border-line bg-panel-2 sm:flex-row sm:flex-wrap">
              <Button
                asChild
                data-pressable
                className="min-h-11 text-base"
                variant="outline"
                size="lg"
              >
                <Link href="/belajar/10">Pelajari pola APK</Link>
              </Button>
              <Button
                asChild
                data-pressable
                className="min-h-11 text-base"
                variant="outline"
                size="lg"
              >
                <Link href="/darurat">Butuh bantuan sekarang?</Link>
              </Button>
            </CardFooter>
          </Card>

          <section aria-labelledby="planned-heading" className="min-w-0">
            <h2
              className="mb-3 font-medium text-base text-txt"
              id="planned-heading"
            >
              Dalam rencana
            </h2>
            <Card className="border border-line bg-panel text-txt">
              <CardContent className="py-2">
                <ul className="divide-y divide-line">
                  {PLANNED.map((modus) => (
                    <li
                      key={modus.id}
                      className="flex min-w-0 items-center gap-3 py-3"
                    >
                      <span className="w-10 shrink-0 font-medium text-base text-dim">
                        {modus.scenarioPlanned}
                      </span>
                      <span className="min-w-0 flex-1 text-base text-txt">
                        {modus.nama}
                      </span>
                      <Badge
                        variant="outline"
                        className="min-h-7 text-base text-dim"
                      >
                        Rencana
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        </aside>
      </div>
    </div>
  );
}
