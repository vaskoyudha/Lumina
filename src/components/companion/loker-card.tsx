"use client";

import {
  Bookmark,
  BookmarkCheck,
  Building2,
  ChevronDown,
  ExternalLink,
  MapPin,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Risk } from "@/lib/contracts/score";
import { labelSinyal } from "@/lib/loker/audit/sentinel";
import type { LokerView } from "@/lib/loker/types";
import { cn } from "@/lib/utils";

const SENTINEL_LABEL = {
  clean: "bersih",
  suspicious: "mencurigakan",
  rejected: "ditolak",
} as const;

const RISK_LABEL: Record<Risk, string> = {
  bersih: "bersih",
  rendah: "rendah",
  mencurigakan: "mencurigakan",
  tinggi: "tinggi",
};

function disagreement(posting: LokerView): boolean {
  const sentinelCaution = posting.sentinelStatus !== "clean";
  const luminaCaution =
    posting.luminaRisk === "mencurigakan" || posting.luminaRisk === "tinggi";
  return sentinelCaution !== luminaCaution;
}

/** Caution = amber wash, danger = red wash, clean = quiet neutral. */
function sentinelTone(posting: LokerView): string {
  if (posting.sentinelStatus === "rejected") {
    return "border-danger/25 bg-danger/10 text-danger";
  }
  if (posting.sentinelStatus === "suspicious") {
    return "border-warn/25 bg-warn/10 text-warn";
  }
  return "border-line bg-panel-2 text-txt";
}

function luminaTone(posting: LokerView): string {
  if (posting.luminaRisk === "tinggi") {
    return "border-danger/25 bg-danger/10 text-danger";
  }
  if (posting.luminaRisk === "mencurigakan") {
    return "border-warn/25 bg-warn/10 text-warn";
  }
  return "border-line bg-panel-2 text-dim";
}

/**
 * One posting with both verdicts, never one standing in for the other.
 *
 * The card layout follows the Lumina dashboard reference: title + source pill,
 * a bookmark on the right, then a compact meta row, tag pills and the two
 * verdict chips. Trust detail stays behind "Lihat detail" so a five-result list
 * reads as five cards, not five essays. When the two verdicts disagree the card
 * says so and the caution wins: the posting is already flagged for the "hide
 * flagged" filter, and the sentence explains why it is still on screen when
 * that filter is off.
 */
export function LokerCard({
  posting,
  saved,
  onToggleSave,
}: {
  posting: LokerView;
  saved: boolean;
  onToggleSave: (posting: LokerView) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <li className="min-w-0 rounded-2xl border border-line bg-panel p-4 shadow-rest">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <h3 className="text-[16px] font-bold text-txt leading-tight tracking-tight">
              {posting.title}
            </h3>
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[10.5px] font-semibold text-brand-ink">
              {posting.source}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onToggleSave(posting)}
            aria-label={
              saved
                ? `Hapus ${posting.title} dari simpanan`
                : `Simpan ${posting.title}`
            }
            aria-pressed={saved}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
              saved
                ? "bg-brand-soft text-brand-ink"
                : "bg-panel-2 text-dim hover:bg-brand-soft hover:text-brand-ink",
            )}
          >
            {saved ? (
              <BookmarkCheck aria-hidden className="size-3.5" />
            ) : (
              <Bookmark aria-hidden className="size-3.5" />
            )}
          </button>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[11.5px] text-dim">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Building2 aria-hidden className="size-3.5 shrink-0 text-dim" />
            <span className="truncate">{posting.company}</span>
          </span>
          {posting.location ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin aria-hidden className="size-3.5 shrink-0 text-dim" />
              <span className="truncate">{posting.location}</span>
            </span>
          ) : null}
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Wallet aria-hidden className="size-3.5 shrink-0 text-dim" />
            <span className="truncate">
              {posting.salaryText ?? "Gaji tidak dicantumkan"}
            </span>
          </span>
        </div>

        {posting.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {posting.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-panel-2 px-3 py-1 text-[10.5px] font-semibold text-dim"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "h-6 rounded-full px-2.5 text-[10.5px] font-semibold",
              sentinelTone(posting),
            )}
          >
            Sentinel: {SENTINEL_LABEL[posting.sentinelStatus]}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "h-6 rounded-full px-2.5 text-[10.5px] font-semibold",
              luminaTone(posting),
            )}
          >
            Lumina: {RISK_LABEL[posting.luminaRisk]}
          </Badge>
        </div>

        {disagreement(posting) ? (
          <p className="mt-2.5 flex items-start gap-1.5 rounded-[8px] bg-warn/5 px-2.5 py-2 text-[11px] text-warn leading-snug">
            <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
            <span>
              Penilaian berbeda: Sentinel{" "}
              {SENTINEL_LABEL[posting.sentinelStatus]}, Lumina{" "}
              {RISK_LABEL[posting.luminaRisk]}. Anggap perlu kehati-hatian.
            </span>
          </p>
        ) : null}

        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-bold text-brand-ink transition-colors hover:text-brand-strong"
          >
            <span>{open ? "Tutup detail" : "Lihat detail"}</span>
            <ChevronDown
              aria-hidden
              className={cn(
                "size-3.5 transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 flex flex-col gap-2.5 rounded-xl border border-line bg-panel-2/40 p-3.5">
            <p className="whitespace-pre-wrap text-[12px] text-txt leading-relaxed">
              {posting.description}
            </p>

            {posting.sentinelFlags.length > 0 ? (
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-semibold text-dim uppercase tracking-[0.12em]">
                  Catatan Sentinel
                </p>
                <ul className="flex flex-col gap-1">
                  {posting.sentinelFlags.map((flag) => (
                    <li
                      key={flag}
                      className="flex items-start gap-1.5 text-[11px] text-txt leading-snug"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 size-1 shrink-0 rounded-full bg-warn"
                      />
                      {labelSinyal(flag)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {posting.luminaSignals.length > 0 ? (
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-semibold text-dim uppercase tracking-[0.12em]">
                  Sinyal Lumina
                </p>
                <ul className="flex flex-col gap-1">
                  {posting.luminaSignals.map((signal) => (
                    <li
                      key={signal.label}
                      className="flex items-start gap-1.5 text-[11px] text-txt leading-snug"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 size-1 shrink-0 rounded-full bg-danger"
                      />
                      {signal.label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-line bg-panel px-2.5 py-2 text-[10px]">
              <div className="min-w-0">
                <dt className="text-dim">Email perusahaan</dt>
                <dd className="truncate text-[11px] text-txt">
                  {posting.companyEmail || "Tidak ditemukan"}
                </dd>
              </div>
              <div>
                <dt className="text-dim">Umur domain</dt>
                <dd className="tabular text-[11px] text-txt">
                  {posting.domainAgeDays} hari
                </dd>
              </div>
              <div>
                <dt className="text-dim">Dipindai</dt>
                <dd className="tabular text-[11px] text-txt">
                  {posting.fetchedAt.slice(0, 10)}
                </dd>
              </div>
              <div>
                <dt className="text-dim">Diposting</dt>
                <dd className="tabular text-[11px] text-txt">
                  {posting.postedAt ?? "Tidak diketahui"}
                </dd>
              </div>
            </dl>

            {posting.applyUrl ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 w-fit rounded-full border-line bg-panel px-3 text-[11px] font-medium text-txt hover:bg-panel-2"
              >
                <a
                  href={posting.applyUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Buka lamaran <ExternalLink aria-hidden />
                </a>
              </Button>
            ) : (
              <p className="text-[11px] text-dim">
                Tautan lamaran tidak tersedia.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
