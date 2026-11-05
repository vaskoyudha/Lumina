"use client";

import { Check, ChevronDown, Circle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Explanation, TacticExplained } from "@/lib/companion/explain";
import { cn } from "@/lib/utils";

/**
 * ExplanationCard — the teaching layer.
 *
 * The score card says *what* was found. This says *why it works on people*, and
 * that is the difference between a detector and a tutor.
 *
 * Four sections, in the order a frightened person needs them:
 *
 *   1. Kenapa ini mencurigakan  — the tactics, each expandable
 *   2. Pola: <scheme>           — the script, with the missing steps named
 *   3. Periksa sendiri          — what the reader can check in ten minutes
 *   4. Kalau sudah terlanjur    — where to report, and what reporting achieves
 *
 * Deliberate choices:
 *
 * a. Verification comes BEFORE reporting. Checking is cheaper than reporting
 *    and teaches more; a product that leads with "laporkan" turns a user into a
 *    form-filler instead of someone who can spot the next one.
 * b. Naming the ABSENT step (`○ Meminta kode OTP`) matters as much as the
 *    present ones: it stops someone panicking over a message that is suspicious
 *    but incomplete, and it shows which move would come next.
 * c. No score, no percentage, no "selamat". §5-D of the plan and `lumina-ui`
 *    both forbid celebration on this surface.
 * d. Every colour is a token. Nothing here is decorative: red is a warning,
 *    green is "this step is present", and ink is everything else.
 */

function TacticRow({ tactic }: { tactic: TacticExplained }) {
  return (
    <li>
      <Collapsible>
        <CollapsibleTrigger
          className={cn(
            "group flex w-full items-start gap-2 rounded-[8px] px-2 py-2 text-left",
            "hover:bg-txt/5 focus-visible:bg-txt/5 focus-visible:outline-none",
          )}
        >
          <ChevronDown
            aria-hidden
            strokeWidth={2}
            className="mt-0.5 size-3.5 shrink-0 text-dim transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          />
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-sm text-txt">
              {tactic.nama}
            </span>
            {tactic.evidence ? (
              <span className="mt-0.5 block text-dim text-xs leading-snug">
                Kutipan: “{tactic.evidence}”
              </span>
            ) : null}
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <dl className="mt-1 mb-2 ms-5.5 flex flex-col gap-2 border-line border-s ps-3">
            <div>
              <dt className="font-medium text-[11px] text-dim uppercase tracking-wide">
                Kenapa berhasil
              </dt>
              <dd className="text-sm text-txt leading-snug">{tactic.cara}</dd>
            </div>
            <div>
              <dt className="font-medium text-[11px] text-dim uppercase tracking-wide">
                Yang diincar
              </dt>
              <dd className="text-sm text-txt leading-snug">
                {tactic.sasaran}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[11px] text-dim uppercase tracking-wide">
                Cirinya
              </dt>
              <dd className="text-sm text-txt leading-snug">{tactic.tanda}</dd>
            </div>
            <div>
              <dt className="font-medium text-[11px] text-dim uppercase tracking-wide">
                Bedanya dengan yang asli
              </dt>
              <dd className="text-sm text-txt leading-snug">
                {tactic.pembeda}
              </dd>
            </div>
          </dl>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

export function ExplanationCard({
  explanation,
  schemeName,
  className,
}: {
  explanation: Explanation;
  /** Human name of the matched scheme, e.g. "Phishing tautan & akun". */
  schemeName: string | null;
  className?: string;
}) {
  const { tactics, anatomy, verify, report, unrecognized } = explanation;

  const hasAnything =
    tactics.length > 0 ||
    anatomy.length > 0 ||
    verify.length > 0 ||
    report.length > 0;
  if (!hasAnything) return null;

  return (
    <div className={cn("flex w-full max-w-[92%] flex-col gap-2", className)}>
      {tactics.length > 0 ? (
        <Card className="gap-0 border border-line bg-panel py-0">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center justify-between gap-2 font-medium text-sm text-txt">
              <span>Kenapa ini mencurigakan?</span>
              <Badge variant="secondary" className="tabular text-xs">
                {tactics.length} taktik
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <ul className="flex flex-col">
              {tactics.map((tactic) => (
                <TacticRow key={tactic.id} tactic={tactic} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {anatomy.length > 0 ? (
        <Card className="gap-0 border border-line bg-panel py-0">
          <CardHeader className="py-3">
            <CardTitle className="font-medium text-sm text-txt">
              {schemeName ? `Pola: ${schemeName}` : "Pola yang cocok"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <ul className="flex flex-col gap-1.5">
              {anatomy.map((step) => (
                <li key={step.text} className="flex items-start gap-2">
                  {step.present ? (
                    <Check
                      aria-hidden
                      strokeWidth={2.2}
                      className="mt-0.5 size-3.5 shrink-0 text-safe"
                    />
                  ) : (
                    <Circle
                      aria-hidden
                      strokeWidth={1.8}
                      className="mt-0.5 size-3.5 shrink-0 text-txt/30"
                    />
                  )}
                  <span
                    className={cn(
                      "text-sm leading-snug",
                      step.present ? "text-txt" : "text-dim",
                    )}
                  >
                    {step.text}
                    <span className="sr-only">
                      {step.present
                        ? " — terlihat di pesan ini"
                        : " — tidak terlihat di pesan ini"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {verify.length > 0 ? (
        <Card className="gap-0 border border-line bg-panel py-0">
          <CardHeader className="py-3">
            <CardTitle className="font-medium text-sm text-txt">
              Periksa sendiri
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <ol className="flex flex-col gap-2">
              {verify.map((step, index) => (
                <li key={step.do} className="flex items-start gap-2.5">
                  <span className="tabular mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-panel-2 font-medium text-[11px] text-dim">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-txt leading-snug">
                      {step.do}
                    </span>
                    <span className="block text-dim text-xs leading-snug">
                      {step.why}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      {report.length > 0 ? (
        <Card className="gap-0 border border-line bg-panel py-0">
          <CardHeader className="py-3">
            <CardTitle className="font-medium text-sm text-txt">
              Kalau sudah terlanjur
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <ul className="flex flex-col gap-2">
              {report.map((channel) => (
                <li key={channel.href} className="flex items-start gap-2.5">
                  <ExternalLink
                    aria-hidden
                    strokeWidth={1.8}
                    className="mt-0.5 size-3.5 shrink-0 text-dim"
                  />
                  <span className="min-w-0">
                    <a
                      href={channel.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block text-sm text-txt underline underline-offset-2 hover:text-dim"
                    >
                      {channel.label}
                    </a>
                    <span className="block text-dim text-xs leading-snug">
                      {channel.note}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {unrecognized && verify.length > 0 ? (
        <p className="px-1 text-dim text-xs leading-snug">
          Polanya belum cocok dengan salah satu skema yang dikenal, jadi belum
          ada kanal laporan khusus. Langkah pemeriksaan di atas tetap berlaku.
        </p>
      ) : null}
    </div>
  );
}
