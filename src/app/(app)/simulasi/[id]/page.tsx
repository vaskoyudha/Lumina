import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackButton } from "@/components/shell/back-button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { MODUS } from "@/lib/modus";

export const metadata: Metadata = { title: "Runner simulasi" };

/** One playable scenario today (§12: Level 1 only). */
export function generateStaticParams() {
  return MODUS.filter((m) => m.scenarioId !== null).map((m) => ({
    id: m.scenarioId as string,
  }));
}

/**
 * Stream C's runner route. The React state-machine port is C's day-1 task
 * (§5-C: port the vanilla runner, do not rebuild it).
 *
 * This shell exists so Gate 0 passes and the companion's "Coba simulasi" link
 * resolves. It does not fake a playable scene.
 */

/** Same reason as /belajar/[modul]: URL data behind a Suspense boundary. */
async function RunnerBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const modus = MODUS.find((m) => m.scenarioId === id);

  if (!modus) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <BackButton href="/simulasi" label="Semua simulasi" />

      <header className="mt-4 max-w-prose">
        <h1 className="font-semibold text-2xl tracking-tight">
          Level {modus.level} · {modus.nama}
        </h1>
        <p className="mt-1 text-dim text-xs">
          Skenario <code className="text-txt">{id}</code> · 12 node · 3 tool
          task
        </p>
      </header>

      <div className="mt-6 rounded-lg border border-line bg-panel p-6">
        <Empty>
          <EmptyTitle>Runner belum diport (Stream C)</EmptyTitle>
          <EmptyDescription>
            Skenario dan perilakunya sudah ada di runner vanilla. Yang belum
            selesai adalah port ke state machine React: node chat, panel tool
            deck, dua meter, dan layar akhir.
          </EmptyDescription>
        </Empty>
      </div>

      <p className="mt-4 text-dim text-xs">
        Kontrak untuk stream lain: skenario adalah sumber kebenaran, bukan
        komponennya. Setiap <code>setTimeout</code> butuh cleanup saat unmount.
      </p>
    </div>
  );
}

export default function RunnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <p className="mx-auto max-w-3xl px-4 py-10 text-dim text-sm sm:px-6">
          Memuat skenario…
        </p>
      }
    >
      <RunnerBody params={params} />
    </Suspense>
  );
}
