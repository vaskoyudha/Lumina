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
import { getSimulation } from "@/lib/content/store";

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

  if (!scenario) notFound();

  return (
    <WorkspaceShell label="Simulasi">
      <div className="flex w-full flex-col gap-6">
        <BackButton href="/simulasi" label="Kembali ke misi" />
        <Runner key={id} content={scenario} />
      </div>
    </WorkspaceShell>
  );
}
