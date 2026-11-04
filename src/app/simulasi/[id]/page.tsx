import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Runner } from "@/app/simulasi/[id]/Runner";
import { MODUS } from "@/lib/modus";

export const metadata: Metadata = { title: "Runner simulasi" };

/** One playable scenario today (§12: Level 1 only). */
export function generateStaticParams() {
  return MODUS.filter((m) => m.scenarioId !== null).map((m) => ({
    id: m.scenarioId as string,
  }));
}

export default async function RunnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const modus = MODUS.find((m) => m.scenarioId === id);

  if (!modus) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/simulasi"
        data-pressable
        className="inline-flex items-center gap-1 text-dim text-sm hover:text-txt"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Semua simulasi
      </Link>

      <header className="mt-4 mb-6 max-w-prose">
        <h1 className="font-semibold text-2xl tracking-tight">
          Level {modus.level} · {modus.nama}
        </h1>
        <p className="mt-1 text-dim text-base">
          Skenario <code className="text-txt">{id}</code>
        </p>
      </header>

      <Runner />
    </div>
  );
}
