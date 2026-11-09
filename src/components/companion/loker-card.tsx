"use client";

import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  MapPin,
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

function flagged(posting: LokerView): boolean {
  return (
    posting.sentinelStatus !== "clean" ||
    posting.luminaRisk === "mencurigakan" ||
    posting.luminaRisk === "tinggi"
  );
}

function disagreement(posting: LokerView): boolean {
  const sentinelCaution = posting.sentinelStatus !== "clean";
  const luminaCaution =
    posting.luminaRisk === "mencurigakan" || posting.luminaRisk === "tinggi";
  return sentinelCaution !== luminaCaution;
}

function tone(posting: LokerView): "default" | "secondary" | "destructive" {
  if (
    posting.sentinelStatus === "rejected" ||
    posting.luminaRisk === "tinggi"
  ) {
    return "destructive";
  }
  return flagged(posting) ? "secondary" : "default";
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
    <li className="min-w-0 rounded-[12px] border border-line bg-panel">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-[13px] text-txt">
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
            >
              {saved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-dim">
            {posting.location ? (
              <span className="flex items-center gap-0.5">
                <MapPin aria-hidden className="size-3" />
                {posting.location}
              </span>
            ) : null}
            <span className="flex items-center gap-0.5">
              <Wallet aria-hidden className="size-3" />
              {posting.salaryText ?? "Gaji tidak dicantumkan"}
            </span>
            <span>{posting.source}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <Badge variant={tone(posting)} className="rounded-md">
              Sentinel: {SENTINEL_LABEL[posting.sentinelStatus]}
            </Badge>
            <Badge
              variant={flagged(posting) ? "secondary" : "outline"}
              className="rounded-md"
            >
              Lumina: {RISK_LABEL[posting.luminaRisk]}
            </Badge>
            {posting.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="rounded-md">
                {tag}
              </Badge>
            ))}
          </div>

          {disagreement(posting) ? (
            <p className="text-[11px] text-warn leading-snug">
              Penilaian berbeda: Sentinel{" "}
              {SENTINEL_LABEL[posting.sentinelStatus]}, Lumina{" "}
              {RISK_LABEL[posting.luminaRisk]}. Anggap perlu kehati-hatian.
            </p>
          ) : null}

          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit px-0 text-[11px] text-brand-ink"
            >
              {open ? "Tutup detail" : "Lihat detail"}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="flex flex-col gap-2 border-line border-t px-3 py-3">
            <p className="whitespace-pre-wrap text-[11px] text-txt leading-relaxed">
              {posting.description}
            </p>

            {posting.sentinelFlags.length > 0 ? (
              <div>
                <p className="text-[11px] font-medium text-txt">
                  Catatan Sentinel
                </p>
                <ul className="list-disc pl-4 text-[11px] text-dim">
                  {posting.sentinelFlags.map((flag) => (
                    <li key={flag}>{labelSinyal(flag)}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {posting.luminaSignals.length > 0 ? (
              <div>
                <p className="text-[11px] font-medium text-txt">
                  Sinyal Lumina
                </p>
                <ul className="list-disc pl-4 text-[11px] text-dim">
                  {posting.luminaSignals.map((signal) => (
                    <li key={signal.label}>{signal.label}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <dl className="grid grid-cols-2 gap-1 text-[10px] text-dim">
              <div className="min-w-0">
                <dt>Email perusahaan</dt>
                <dd className="truncate text-txt">
                  {posting.companyEmail || "Tidak ditemukan"}
                </dd>
              </div>
              <div>
                <dt>Umur domain</dt>
                <dd className="tabular text-txt">
                  {posting.domainAgeDays} hari
                </dd>
              </div>
              <div>
                <dt>Dipindai</dt>
                <dd className="tabular text-txt">
                  {posting.fetchedAt.slice(0, 10)}
                </dd>
              </div>
              <div>
                <dt>Diposting</dt>
                <dd className="tabular text-txt">
                  {posting.postedAt ?? "Tidak diketahui"}
                </dd>
              </div>
            </dl>

            {posting.applyUrl ? (
              <Button asChild variant="outline" size="sm" className="w-fit">
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
