"use client";

import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Mail,
  Phone,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { REPORT_CONTACTS, type ReportContact } from "@/data/report-contacts";
import type { ReportChannel } from "@/data/tactics";
import { requestReportPolish } from "@/lib/companion/report-client";
import {
  buildReportDraft,
  type ReportInputs,
} from "@/lib/companion/report-template";
import type { ScoreResult } from "@/lib/contracts/score";
import { cn } from "@/lib/utils";

/**
 * ReportTemplate — from verdict to a sendable report.
 *
 * The draft is deterministic and built on the device. "Rapikan" is the only
 * action that touches the network, and a polish that drops a blank is thrown
 * away inside `requestReportPolish`.
 *
 * Nothing here is persisted: the fields live in component state and die with
 * the card.
 */
export function ReportTemplate({
  result,
  channels,
}: {
  result: ScoreResult;
  channels: readonly ReportChannel[];
}) {
  const [open, setOpen] = React.useState(false);
  const [inputs, setInputs] = React.useState<ReportInputs>({});
  const [channelId, setChannelId] = React.useState(channels[0]?.id ?? "iasc");
  const [polished, setPolished] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [copyFailed, setCopyFailed] = React.useState(false);

  const draft = React.useMemo(
    () => buildReportDraft({ result, inputs, channel: channelId }),
    [result, inputs, channelId],
  );
  const body = polished ?? draft.body;
  const contacts = REPORT_CONTACTS[channelId] ?? [];

  function field(key: keyof ReportInputs, label: string) {
    return (
      <label className="flex flex-col gap-1 text-xs text-dim">
        <span>{label}</span>
        <input
          className="min-h-11 rounded-[8px] border border-line bg-panel-2/40 px-3 text-sm text-txt outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          value={inputs[key] ?? ""}
          onChange={(event) => {
            setPolished(null);
            setInputs((prev) => ({ ...prev, [key]: event.target.value }));
          }}
        />
      </label>
    );
  }

  async function polish() {
    setBusy(true);
    const text = await requestReportPolish({
      channelId,
      draft,
      facts: { modus: result.modus, tactics: [] },
    });
    setBusy(false);
    if (text) setPolished(text);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopyFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-line border-t pt-3">
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="min-h-11 justify-between"
      >
        Buat template laporan
        <ChevronDown
          aria-hidden
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </Button>

      {open ? (
        <div className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {field("name", "Nama pelapor")}
            {field("perpetrator", "Nomor atau rekening pelaku")}
            {field("loss", "Jumlah kerugian")}
          </div>
          <label className="flex flex-col gap-1 text-xs text-dim">
            <span>Kronologi singkat (opsional)</span>
            <textarea
              className="min-h-20 rounded-[8px] border border-line bg-panel-2/40 px-3 py-2 text-sm text-txt outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              spellCheck={false}
              value={inputs.narrative ?? ""}
              onChange={(event) => {
                setPolished(null);
                setInputs((prev) => ({
                  ...prev,
                  narrative: event.target.value,
                }));
              }}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {channels.map((channel) => (
              <Button
                key={channel.id}
                type="button"
                size="sm"
                variant={channel.id === channelId ? "default" : "outline"}
                className="min-h-11"
                onClick={() => {
                  setChannelId(channel.id);
                  setPolished(null);
                }}
              >
                {channel.label}
              </Button>
            ))}
          </div>

          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-[8px] bg-panel-2/40 p-3 text-xs text-txt leading-relaxed">
            {body}
          </pre>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11"
              onClick={copy}
            >
              {copied ? (
                <Check aria-hidden className="size-4" />
              ) : (
                <Copy aria-hidden className="size-4" />
              )}
              {copied ? "Tersalin" : "Salin"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11"
              disabled={busy}
              onClick={polish}
            >
              {busy ? "Merapikan…" : "Rapikan"}
            </Button>
            {contacts.map((contact) => (
              <ContactAction
                key={`${contact.kind}-${contact.value}`}
                contact={contact}
                draft={draft}
                body={body}
              />
            ))}
          </div>

          {copyFailed ? (
            <p className="text-dim text-xs leading-snug">
              Peramban menolak papan klip. Pilih teks di kotak di atas lalu
              salin manual.
            </p>
          ) : null}

          <p className="text-dim text-xs leading-snug">
            Bank tetap langkah pertama: telepon nomor di belakang kartu atau di
            aplikasi resmi bank, lalu minta pembekuan akses.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ContactAction({
  contact,
  draft,
  body,
}: {
  contact: ReportContact;
  draft: { subject: string; body: string };
  body: string;
}) {
  if (contact.kind === "tel") {
    return (
      <Button
        asChild
        type="button"
        size="sm"
        variant="outline"
        className="min-h-11"
      >
        <a href={`tel:${contact.value}`}>
          <Phone aria-hidden className="size-4" />
          {contact.label}
          <span className="tabular text-dim">{contact.value}</span>
        </a>
      </Button>
    );
  }

  if (contact.kind === "wa") {
    return (
      <Button
        asChild
        type="button"
        size="sm"
        variant="outline"
        className="min-h-11"
      >
        <a
          href={`https://wa.me/${contact.value}?text=${encodeURIComponent(body)}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          {contact.label}
        </a>
      </Button>
    );
  }

  if (contact.kind === "email") {
    const subject = encodeURIComponent(draft.subject);
    const text = encodeURIComponent(body);
    return (
      <Button
        asChild
        type="button"
        size="sm"
        variant="outline"
        className="min-h-11"
      >
        <a href={`mailto:${contact.value}?subject=${subject}&body=${text}`}>
          <Mail aria-hidden className="size-4" />
          {contact.label}
        </a>
      </Button>
    );
  }

  return (
    <Button
      asChild
      type="button"
      size="sm"
      variant="outline"
      className="min-h-11"
    >
      <a href={contact.value} target="_blank" rel="noreferrer noopener">
        <ExternalLink aria-hidden className="size-4" />
        {contact.label}
      </a>
    </Button>
  );
}
