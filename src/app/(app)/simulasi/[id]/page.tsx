import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Runner } from "@/app/(app)/simulasi/[id]/Runner";
import { Button } from "@/components/ui/button";
import { SCENARIO_CATALOG } from "@/lib/simulasi/catalog";
import { MISSION } from "@/lib/simulasi/scenario";

export const metadata: Metadata = {
  title: MISSION.title,
  description: "Misi simulasi Level 1: Paket sebelum pulang.",
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
    <div className="appnext-container min-w-0 py-6 sm:py-8">
      <Button
        asChild
        className="min-h-11 rounded-full px-4 text-base"
        data-pressable
        size="lg"
        variant="outline"
      >
        <Link href="/simulasi">
          <ArrowLeft aria-hidden="true" /> Kembali ke misi
        </Link>
      </Button>

      <header className="mt-5 mb-6 max-w-prose">
        <p className="appnext-caption">
          Level {scenario.scenario.level} · Misi interaktif
        </p>
        <h1 className="mt-2">{MISSION.title}</h1>
      </header>

      <div className="min-w-0">
        <Runner />
      </div>
    </div>
  );
}
