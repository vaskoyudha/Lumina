import { connection } from "next/server";
import { Suspense } from "react";
import { BelajarShell } from "@/components/belajar/belajar-shell";
import {
  ContentLoading,
  ContentUnavailable,
} from "@/components/belajar/content-state";
import { Latihan } from "@/components/belajar/latihan";
import { listModules, moduleSummaries } from "@/lib/content/store";
export const metadata = { title: "Latihan singkat" };
export const instant = false;
export default function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ pola?: string }>;
}) {
  return (
    <Suspense fallback={<ContentLoading />}>
      <PracticeContent searchParams={searchParams} />
    </Suspense>
  );
}
async function PracticeContent({
  searchParams,
}: {
  searchParams: Promise<{ pola?: string }>;
}) {
  await connection();
  try {
    const [modules, params] = await Promise.all([listModules(), searchParams]);
    return (
      <BelajarShell modules={moduleSummaries(modules)}>
        <h1 className="text-2xl">Latihan singkat</h1>
        <p>Maksimal lima soal dari materi yang sudah tersedia.</p>
        <Latihan
          modules={modules.flatMap((m) => (m.content ? [m.content] : []))}
          patternId={params.pola}
        />
      </BelajarShell>
    );
  } catch {
    return <ContentUnavailable />;
  }
}
