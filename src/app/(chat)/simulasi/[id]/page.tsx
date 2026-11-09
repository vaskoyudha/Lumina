import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Runner } from "@/app/(chat)/simulasi/[id]/Runner";
import { BackButton } from "@/components/shell/back-button";
import { WorkspaceShell } from "@/components/shell/workspace-shell";
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
    <WorkspaceShell label="Simulasi">
      <div className="flex w-full flex-col gap-6">
        <BackButton href="/simulasi" label="Kembali ke misi" />
        <Runner />
      </div>
    </WorkspaceShell>
  );
}
