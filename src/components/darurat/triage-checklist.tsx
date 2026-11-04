"use client";

import { ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { OFFICIAL_CHANNELS, TRIAGE_CASES } from "@/data/triage";
import { cn } from "@/lib/utils";

/**
 * TriageChecklist — numbered, not bulleted, no score, no celebration (§5-D).
 * Selecting a case is a real state change: it swaps the whole checklist.
 */

export function TriageChecklist({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const active = TRIAGE_CASES.find((c) => c.id === activeId) ?? TRIAGE_CASES[0];

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        aria-label="Pilih situasi"
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      >
        {TRIAGE_CASES.map((item) => {
          const selected = item.id === active?.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(item.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm",
                selected
                  ? "border-danger/60 bg-danger/10 text-txt"
                  : "border-line bg-panel text-dim hover:bg-panel-2 hover:text-txt",
              )}
            >
              {item.trigger}
            </button>
          );
        })}
      </div>

      {active ? (
        <>
          <div>
            <h2 className="font-semibold text-xl tracking-tight">
              {active.title}
            </h2>
            <Alert variant="destructive" className="mt-3 border-danger/40">
              <AlertTitle>Berhenti dulu</AlertTitle>
              <AlertDescription>{active.stop}</AlertDescription>
            </Alert>
          </div>

          <ol className="flex flex-col gap-3">
            {active.steps.map((step, index) => (
              <li
                key={step.do}
                className="flex gap-3 rounded-lg border border-line bg-panel p-4"
              >
                <span className="tabular shrink-0 font-semibold text-danger text-lg leading-none">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-txt">{step.do}</p>
                  <p className="mt-1 text-dim text-xs">{step.why}</p>
                  {step.href ? (
                    <a
                      href={step.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-pressable
                      className="mt-2 inline-flex items-center gap-1 text-safe text-xs underline-offset-4 hover:underline"
                    >
                      {step.hrefLabel}
                      <ExternalLink aria-hidden className="size-3" />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>

          <section className="rounded-lg border border-line bg-panel p-4">
            <h3 className="font-medium text-sm text-txt">Kanal resmi</h3>
            <p className="mt-1 text-dim text-xs">
              Buka alamat ini dengan mengetiknya sendiri. Kami tidak memakai
              formulir tiruan.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {OFFICIAL_CHANNELS.map((channel) => (
                <li key={channel.href}>
                  <a
                    href={channel.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-pressable
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-dim text-xs hover:bg-panel-2 hover:text-txt"
                  >
                    {channel.label}
                    <ExternalLink aria-hidden className="size-3" />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-dim text-xs">
            <Badge variant="outline" className="mr-1.5 text-[0.65rem]">
              Catatan
            </Badge>
            Mode ini tidak memakai skor atau gamifikasi. Halaman ini untuk
            dipakai, bukan dinilai.
          </p>
        </>
      ) : null}
    </div>
  );
}
