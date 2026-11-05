import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Runner } from "@/app/simulasi/[id]/Runner";
import { Button } from "@/components/ui/button";
import { SCENARIO_CATALOG } from "@/lib/simulasi/catalog";

export const metadata: Metadata = {
  title: "Latihan simulasi",
  description:
    "Latihan fiktif untuk mengenali dan merespons pesan penipuan dengan aman.",
};

export function generateStaticParams() {
  return SCENARIO_CATALOG.map(({ scenario }) => ({
    id: scenario.id,
  }));
}

export default async function RunnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scenario = SCENARIO_CATALOG.find((item) => item.scenario.id === id);

  if (!scenario) notFound();

  return (
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Button
        asChild
        data-pressable
        className="min-h-11 text-base"
        variant="outline"
        size="lg"
      >
        <Link href="/simulasi">Kembali ke simulasi</Link>
      </Button>

      <header className="mt-5 mb-6 max-w-prose">
        <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
          Level {scenario.scenario.level} · {scenario.scenario.title}
        </h1>
        <p className="mt-2 text-base text-dim">
          Ini latihan fiktif yang aman. Alat dan pilihan hanya simulasi; tidak
          ada berkas yang dipasang atau laporan yang dikirim.
        </p>
      </header>

      <div className="min-w-0">
        <Runner />
      </div>
    </div>
  );
}
