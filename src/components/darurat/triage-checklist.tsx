"use client";

import { ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OFFICIAL_CHANNELS, TRIAGE_CASES } from "@/data/triage";

/**
 * TriageChecklist — numbered, not bulleted, no score, no celebration (§5-D).
 * Selecting a case is a real state change: it swaps the whole checklist.
 *
 * The case picker is the shadcn `Tabs` primitive, so arrow-key navigation,
 * `aria-controls`, and the tab panel relationship come from Radix instead of a
 * hand-rolled `role="tablist"` that announced panels it never pointed at.
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
    <Tabs value={active?.id} onValueChange={onSelect} className="gap-5">
      <TabsList className="h-auto w-full flex-wrap items-stretch justify-start gap-2 rounded-none bg-transparent p-0">
        {TRIAGE_CASES.map((item) => (
          <TabsTrigger
            key={item.id}
            value={item.id}
            className="h-auto min-h-11 flex-none justify-start whitespace-normal rounded-lg border border-line bg-panel px-3 py-2 text-left text-dim text-sm hover:bg-panel-2 hover:text-txt data-[state=active]:border-danger/60 data-[state=active]:bg-danger/10 data-[state=active]:text-txt"
          >
            {item.trigger}
          </TabsTrigger>
        ))}
      </TabsList>

      {TRIAGE_CASES.map((item) => (
        <TabsContent
          key={item.id}
          value={item.id}
          className="flex flex-col gap-5"
        >
          <div>
            <h2 className="font-semibold text-xl tracking-tight">
              {item.title}
            </h2>
            <Alert variant="destructive" className="mt-3 border-danger/40">
              <AlertTitle>Berhenti dulu</AlertTitle>
              <AlertDescription>{item.stop}</AlertDescription>
            </Alert>
          </div>

          <ol className="flex flex-col gap-3">
            {item.steps.map((step, index) => (
              <li
                key={step.do}
                className="flex gap-3 rounded-lg border border-line bg-panel p-4"
              >
                <span className="tabular shrink-0 font-semibold text-danger text-lg leading-none">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-txt">{step.do}</p>
                  <p className="mt-1 text-dim">{step.why}</p>
                  {step.href ? (
                    <a
                      href={step.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-pressable
                      className="mt-2 inline-flex min-h-11 items-center gap-1 text-safe underline-offset-4 hover:underline"
                    >
                      {step.hrefLabel}
                      <ExternalLink aria-hidden className="size-4" />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>

          <section className="rounded-lg border border-line bg-panel p-4">
            <h3 className="font-medium text-txt">Kanal resmi</h3>
            <p className="mt-1 text-dim">
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
                    className="inline-flex min-h-11 items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-dim hover:bg-panel-2 hover:text-txt"
                  >
                    {channel.label}
                    <ExternalLink aria-hidden className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-dim text-sm">
            <span className="mr-1.5 font-medium text-txt">Catatan:</span>
            Mode ini tidak memakai skor atau gamifikasi. Halaman ini untuk
            dipakai, bukan dinilai.
          </p>
        </TabsContent>
      ))}
    </Tabs>
  );
}
