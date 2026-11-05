"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ReportBuilder } from "@/components/darurat/report-builder";
import { TriageChecklist } from "@/components/darurat/triage-checklist";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TRIAGE_CASES } from "@/data/triage";

export function DaruratClient() {
  const [activeId, setActiveId] = useState(TRIAGE_CASES[0]?.id ?? "");
  const active =
    TRIAGE_CASES.find((item) => item.id === activeId) ?? TRIAGE_CASES[0];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <TriageChecklist activeId={activeId} onSelect={setActiveId} />

        <div className="flex flex-wrap items-center gap-3 border-line border-t pt-5">
          <Button
            variant="outline"
            className="h-10"
            onClick={() => window.print()}
          >
            <Printer data-icon="inline-start" aria-hidden />
            Cetak checklist ini
          </Button>
          <Button asChild variant="ghost" className="h-10 text-dim">
            <Link href="/companion">Periksa pesannya dulu</Link>
          </Button>
        </div>
      </div>

      <Separator />

      <ReportBuilder modus={active?.title ?? "Dugaan penipuan"} />
    </div>
  );
}
