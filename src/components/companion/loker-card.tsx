"use client";

import {
  Bookmark,
  BookmarkCheck,
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
 * When they disagree the card says so and the caution wins: the posting is
 * already flagged for the "hide flagged" filter, and the sentence explains why
 * it is still on screen when that filter is off.
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
    <li className="min-w-0 bg-panel transition-colors hover:bg-panel-2/40">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex flex-col gap-2 px-3.5 py-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-txt leading-snug">
                {posting.title}
              </p>
              <p className="truncate text-[11px] text-dim">{posting.company}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={
                saved
                  ? `Hapus ${posting.title} dari simpanan`
                  : `Simpan ${posting.title}`
              }
              aria-pressed={saved}
              onClick={() => onToggleSave(posting)}
              className="-mt-1 -mr-1 text-dim hover:bg-brand-soft hover:text-brand-ink"
            >
              {saved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-dim">
            {posting.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden className="size-3" />
                {posting.location}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Wallet aria-hidden className="size-3" />
              {posting.salaryText ?? "Gaji tidak dicantumkan"}
            </span>
            <span className="text-dim/80">{posting.source}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "h-6 rounded-full px-2.5 text-[11px] font-medium",
                sentinelTone(posting),
              )}
            >
              Sentinel: {SENTINEL_LABEL[posting.sentinelStatus]}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "h-6 rounded-full px-2.5 text-[11px] font-medium",
                luminaTone(posting),
              )}
            >
              Lumina: {RISK_LABEL[posting.luminaRisk]}
            </Badge>
            {posting.tags.slice(0, 4).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="h-5 rounded-full border-transparent bg-panel-2/70 px-2 text-[10px] font-normal text-dim"
              >
                {tag}
              </Badge>
            ))}
          </div>

          {disagreement(posting) ? (
            <p className="flex items-start gap-1.5 rounded-[8px] bg-warn/5 px-2.5 py-2 text-[11px] text-warn leading-snug">
              <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
              <span>
                Penilaian berbeda: Sentinel{" "}
                {SENTINEL_LABEL[posting.sentinelStatus]}, Lumina{" "}
                {RISK_LABEL[posting.luminaRisk]}. Anggap perlu kehati-hatian.
              </span>
            </p>
          ) : null}

          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-fit rounded-[8px] px-1.5 text-[11px] font-medium text-brand-ink hover:bg-brand-soft hover:text-brand-strong"
            >
              {open ? "Tutup detail" : "Lihat detail"}
              <ChevronDown
                aria-hidden
                className={cn(
                  "transition-transform duration-200 ease-out motion-reduce:transition-none",
                  open && "rotate-180",
                )}
              />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="flex flex-col gap-2.5 border-t border-line bg-panel-2/30 px-3.5 py-3">
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

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[8px] border border-line bg-panel px-2.5 py-2 text-[10px]">
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
