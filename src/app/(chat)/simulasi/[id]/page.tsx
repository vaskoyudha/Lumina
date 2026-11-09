import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Runner } from "@/app/(chat)/simulasi/[id]/Runner";
import {
  ContentLoading,
  ContentUnavailable,
} from "@/components/belajar/content-state";
import { BackButton } from "@/components/shell/back-button";
import { WorkspaceShell } from "@/components/shell/workspace-shell";
import { getModule, getSimulation } from "@/lib/content/store";
import { buildPracticeSimulation } from "@/lib/simulasi/from-module";

export const metadata: Metadata = {
  title: "Simulasi",
  description: "Misi simulasi Level 1: Paket sebelum pulang.",
};

export const instant = false;

export default function RunnerPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ContentLoading />}>
      <RunnerContent {...props} />
    </Suspense>
  );
}
export async function RunnerContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  let scenario: Awaited<ReturnType<typeof getSimulation>>;
  try {
    scenario = await getSimulation(id);
  } catch {
    return <ContentUnavailable />;
  }

  if (!scenario) {
    const practice = /^pola-(\d+)$/.exec(id);
    if (!practice) notFound();
    const no = Number(practice[1]);
    let module: Awaited<ReturnType<typeof getModule>>;
    try {
      module = await getModule(no);
    } catch {
      return <ContentUnavailable />;
    }
    if (!module || !module.content) notFound();

    return (
      <WorkspaceShell label="Simulasi">
        <div className="flex w-full flex-col gap-6">
          <BackButton href={`/belajar/${no}`} label="Kembali ke modul" />
          <Runner
            key={id}
            content={buildPracticeSimulation(module)}
            persist={false}
          />
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell label="Simulasi">
      <div className="flex w-full flex-col gap-6">
        <BackButton href="/simulasi" label="Kembali ke misi" />
        <Runner key={id} content={scenario} />
      </div>
    </WorkspaceShell>
  );
}
