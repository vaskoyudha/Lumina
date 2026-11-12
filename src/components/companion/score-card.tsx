"use client";

import { ArrowRight, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { AGENT_SEQUENCE } from "@/components/companion/agents";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  type AgentTrace,
  STAGE_LABEL,
  type StageStatus,
} from "@/lib/contracts/agent-run";
import { RISK_LABEL, type Risk, type ScoreResult } from "@/lib/contracts/score";
import { modusFor } from "@/lib/modus";

/**
 * The card shown inline in the conversation (§3 "kartu hasil"): score, why,
 * next step. Colour comes from the risk band only — never from the score
 * number directly, so the bands stay consistent with `riskFor()`.
 *
 * Two honesty rules live here:
 *
 * a. A verdict with no weighted finding says nothing matched. Printing the
 *    advice block for `tidak-dikenali` (or, before the classification gate,
 *    a named scheme) under a 0/100 "Bersih" score contradicts the number.
 * b. Coverage is read from the trace, never assumed. "3 dari 8 agen" is a
 *    measurement; a card without a trace claims nothing.
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

const STAGE_NOTE: Record<StageStatus, string> = {
  menunggu: "belum",
  berjalan: "berjalan",
  selesai: "diperiksa",
  temuan: "diperiksa",
  dilewati: "dilewati",
  gagal: "gagal",
};

export function ScoreCard({
  result,
  trace,
  showEscalation = true,
  showLinks = true,
}: {
  result: ScoreResult;
  /** What the pipeline actually did; the coverage line is read from it. */
  trace?: AgentTrace | null;
  /** Off in the chat: the conversation already includes immediate next steps. */
  showEscalation?: boolean;
  /** Off in the chat: ActionRow below the card is the single source of links. */
  showLinks?: boolean;
}) {
  const style = RISK_CLASS[result.risk];
  const modus = modusFor(result.relatedModule);
  const findings = result.signals.filter((signal) => signal.weight > 0);
  const clean = findings.length === 0;

  const stageById = new Map(
    (trace?.stages ?? []).map((stage) => [stage.id, stage]),
  );
  const inspected = AGENT_SEQUENCE.filter((agent) => {
    const status = stageById.get(agent)?.status;
    return status === "selesai" || status === "temuan";
  }).length;

  return (
    <Card
      data-testid="score-card"
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

        {modus && !clean ? (
          <p className="font-medium text-sm text-txt leading-snug">
            {modus.nama}
          </p>
        ) : null}

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
            Indikator keras — permintaan OTP/PIN/password otomatis berisiko
            tinggi, apa pun skornya.
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-4 py-4">
        {clean ? (
          <section>
            <h3 className="font-medium text-dim text-xs uppercase tracking-wide">
              Hasil
            </h3>
            <p className="mt-2 text-sm text-txt">
              Tidak ada pola penipuan yang cocok pada pesan ini.
            </p>
          </section>
        ) : (
          <>
            <section>
              <h3 className="font-medium text-dim text-xs uppercase tracking-wide">
                Kenapa
              </h3>
              <ul className="mt-2 flex flex-col gap-2">
                {findings.map((signal) => (
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
                    <span className="tabular shrink-0 text-dim">
                      {index + 1}.
                    </span>
                    <span className="text-txt">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}

        {trace ? (
          <section>
            <h3 className="font-medium text-dim text-xs uppercase tracking-wide">
              Yang diperiksa
            </h3>
            <ul className="mt-2 flex flex-col gap-1">
              {AGENT_SEQUENCE.map((agent) => {
                const stage = stageById.get(agent);
                const status = stage?.status ?? "menunggu";
                return (
                  <li
                    key={agent}
                    className="flex items-baseline justify-between gap-3 text-xs"
                  >
                    <span className="text-txt">{STAGE_LABEL[agent].label}</span>
                    <span className="shrink-0 text-dim">
                      {STAGE_NOTE[status]}
                      {stage?.note ? ` — ${stage.note}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="tabular mt-2 text-dim text-xs">
              {inspected} dari {AGENT_SEQUENCE.length} agen benar-benar
              memeriksa pesan ini
            </p>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[0.65rem] text-dim">
            Deterministik
          </Badge>
          <Badge variant="outline" className="text-[0.65rem] text-dim">
            Skor dihitung di perangkat
          </Badge>
        </div>

        {modus && !clean && showLinks ? (
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
              Kalau uang sudah terkirim atau OTP sudah diberikan, hentikan
              komunikasi dan segera hubungi bank atau penyedia akun melalui
              kanal resmi dari perangkat lain yang aman.
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
