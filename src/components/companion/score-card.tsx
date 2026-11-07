"use client";

import { ArrowRight, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RISK_LABEL, type Risk, type ScoreResult } from "@/lib/contracts/score";
import { modusFor } from "@/lib/modus";

/**
 * The card shown inline in the conversation (§3 "kartu hasil"): score, why,
 * next step. Colour comes from the risk band only — never from the score
 * number directly, so the bands stay consistent with `riskFor()`.
 */

const RISK_CLASS: Record<Risk, { text: string; bar: string; border: string }> =
  {
    bersih: {
      text: "text-brand",
      bar: "bg-brand",
      border: "border-line",
    },
    rendah: {
      text: "text-brand",
      bar: "bg-brand",
      border: "border-line",
    },
    mencurigakan: {
      text: "text-warn",
      bar: "bg-warn",
      border: "border-warn/40",
    },
    tinggi: {
      text: "text-danger",
      bar: "bg-danger",
      border: "border-danger/50",
    },
  };

export function ScoreCard({
  result,
  showEscalation = true,
  showLinks = true,
}: {
  result: ScoreResult;
  /** Off in the chat: an action button below already offers mode darurat. */
  showEscalation?: boolean;
  /** Off in the chat: ActionRow below the card is the single source of links. */
  showLinks?: boolean;
}) {
  const style = RISK_CLASS[result.risk];
  const modus = modusFor(result.relatedModule);

  return (
    <Card
      className={`gap-0 overflow-hidden rounded-[12px] border ${style.border} bg-panel py-0 ring-0`}
    >
      <CardHeader className="gap-3 border-line border-b bg-panel-2/60 px-4 py-4">
        <div className="flex items-baseline gap-3">
          <p
            className={`tabular font-semibold text-[2rem] leading-none ${style.text}`}
          >
            {result.score}
            <span className="ml-1 font-normal text-base text-dim">/100</span>
          </p>
          <Badge
            variant="outline"
            className={`${style.text} border-current/30 text-xs`}
          >
            {RISK_LABEL[result.risk]}
          </Badge>
        </div>

        {/* Meter: the one thing that must read from the back of the room. */}
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-panel-2"
          role="presentation"
        >
          <div
            className={`h-full ${style.bar} transition-[width] duration-200 ease-out`}
            style={{ width: `${result.score}%` }}
          />
        </div>

        {result.hardOverride ? (
          <p className="flex items-center gap-1.5 text-danger text-xs">
            <TriangleAlert aria-hidden className="size-3.5" />
            Indikator keras — permintaan OTP/PIN atau file APK — otomatis
            berisiko tinggi, apa pun skornya.
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-4 py-4">
        <section>
          <h3 className="font-medium text-dim text-xs uppercase tracking-wide">
            Kenapa
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {result.signals.map((signal) => (
              <li
                key={`${signal.label}-${signal.evidence}`}
                className="rounded-md border border-line bg-panel-2 px-3 py-2"
              >
                <p className="text-sm text-txt">{signal.label}</p>
                {signal.evidence ? (
                  <p className="mt-1 text-dim text-xs">
                    Kutipan:{" "}
                    <span className="text-txt/90">“{signal.evidence}”</span>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="font-medium text-dim text-xs uppercase tracking-wide">
            Yang perlu dilakukan
          </h3>
          <ol className="mt-2 flex flex-col gap-1.5">
            {result.advice.map((step, index) => (
              <li key={step} className="flex gap-2 text-sm">
                <span className="tabular shrink-0 text-dim">{index + 1}.</span>
                <span className="text-txt">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {modus && showLinks ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/belajar/${modus.no}`}
              data-pressable
              className="group inline-flex items-center gap-1 rounded-md border border-brand/40 bg-brand/10 px-3 py-1.5 font-medium text-brand-strong text-sm hover:bg-brand/20"
            >
              Pelajari pola ini
              <ArrowRight
                aria-hidden
                className="arrow-nudge arrow-nudge--right size-3.5"
              />
            </Link>
            {modus.scenarioId ? (
              <Link
                href={`/simulasi/${modus.scenarioId}`}
                data-pressable
                className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 font-medium text-dim text-sm hover:bg-panel-2 hover:text-txt"
              >
                Coba simulasi
              </Link>
            ) : null}
          </div>
        ) : null}

        {result.risk === "tinggi" && showEscalation ? (
          <Alert variant="destructive" className="border-danger/40">
            <TriangleAlert aria-hidden />
            <AlertTitle>Ini sedang terjadi?</AlertTitle>
            <AlertDescription>
              Kalau uang sudah terkirim atau OTP sudah diberikan, berhenti
              membaca dan buka{" "}
              <Link href="/darurat" className="underline underline-offset-4">
                mode darurat
              </Link>
              .
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
