"use client";

import {
  Briefcase,
  Loader2,
  RefreshCw,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { LokerCard } from "@/components/companion/loker-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { pollScan, triggerScan } from "@/lib/loker/scan-client";
import { filterPostings } from "@/lib/loker/search";
import type {
  LokerCorpus,
  LokerSearchArgs,
  LokerView,
  SavedLoker,
  ScanRunStatus,
} from "@/lib/loker/types";

type ScanState = "idle" | "starting" | "running" | "done" | "failed";

function parseRupiah(value: string): number | undefined {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : undefined;
}

/**
 * The inline job-search surface.
 *
 * It receives the whole capped corpus and filters locally, so changing a filter
 * is not a network call and clearing it restores postings the first filter
 * removed. The scan button only refills the corpus for the next search; it
 * never blocks the results already on screen.
 *
 * One surface, not a card inside a card: the shell carries the border and every
 * posting is a row separated by a hairline. That keeps a five-posting result
 * reading as one list instead of five competing panels.
 */
export function LokerTool({
  corpus,
  initialArgs,
  summaryState,
  canRefresh,
  saved,
  onToggleSave,
}: {
  corpus: LokerCorpus;
  initialArgs: LokerSearchArgs;
  summaryState: "idle" | "running" | "done" | "failed";
  canRefresh: boolean;
  saved: readonly SavedLoker[];
  onToggleSave: (posting: LokerView) => void;
}) {
  const router = useRouter();
  const [args, setArgs] = React.useState<LokerSearchArgs>(initialArgs);
  const [scan, setScan] = React.useState<ScanState>("idle");
  const [lastRun, setLastRun] = React.useState<ScanRunStatus | null>(null);

  React.useEffect(() => {
    if (!canRefresh) return;
    let cancelled = false;
    fetch("/api/loker/scan/status", { cache: "no-store" })
      .then((response) =>
        response.status === 204
          ? null
          : (response.json() as Promise<ScanRunStatus>),
      )
      .then((status) => {
        if (!cancelled) setLastRun(status);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canRefresh]);

  const results = React.useMemo(
    () => filterPostings(corpus.postings, args),
    [corpus.postings, args],
  );
  const savedIds = React.useMemo(
    () => new Set(saved.map((item) => item.id)),
    [saved],
  );

  const scanning = scan === "starting" || scan === "running";
  const lastScan = lastRun?.finishedAt ?? corpus.postings[0]?.fetchedAt ?? null;
  const hasNotice =
    scan === "failed" ||
    scan === "running" ||
    corpus.capped ||
    Boolean(lastRun) ||
    summaryState === "running";

  const refresh = async () => {
    if (!canRefresh || scanning) return;
    setScan("starting");
    const started = await triggerScan();
    if (started === "unauthorized" || started === "failed") {
      setScan("failed");
      return;
    }
    setScan("running");
    const result = await pollScan((status) => setLastRun(status), {
      intervalMs: 3000,
    });
    if (result?.status === "ok") {
      setScan("done");
      router.refresh();
      return;
    }
    setScan("failed");
  };

  return (
    <section
      aria-label="Pencari lowongan"
      className="flex min-w-0 flex-col overflow-hidden rounded-[16px] border border-line bg-panel"
    >
      <header className="flex items-start gap-2.5 p-3.5">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand-ink"
        >
          <Briefcase className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-semibold text-txt leading-tight">
            Lowongan kerja
          </h3>
          <p className="tabular mt-0.5 text-[11px] text-dim leading-snug">
            {results.length} dari {corpus.postings.length} lowongan
            {lastScan
              ? ` · dipindai ${lastScan.slice(0, 10)}`
              : " · belum dipindai"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={!canRefresh || scanning}
          aria-label={
            canRefresh ? "Pindai ulang lowongan" : "Masuk untuk memindai"
          }
          className="h-8 shrink-0 rounded-full border-line bg-panel px-3 text-[11px] font-medium text-txt hover:bg-panel-2"
        >
          {scanning ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <RefreshCw aria-hidden />
          )}
          {!canRefresh
            ? "Masuk untuk memindai"
            : scanning
              ? "Memindai…"
              : "Pindai ulang"}
        </Button>
      </header>

      <div className="flex flex-col gap-2 px-3.5 pb-3">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-dim"
          />
          <Input
            id="loker-kata-kunci"
            value={args.query}
            onChange={(event) =>
              setArgs((prev) => ({ ...prev, query: event.target.value }))
            }
            placeholder="React, data analyst…"
            aria-label="Kata kunci lowongan"
            className="h-10 rounded-[11px] border-field bg-panel pl-9 text-[13px] placeholder:text-dim/70 focus-visible:border-brand-edge focus-visible:ring-brand-soft"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label
            htmlFor="loker-lokasi"
            className="col-span-2 flex flex-col gap-1 sm:col-span-1"
          >
            <span className="text-[11px] font-medium text-dim">Lokasi</span>
            <Input
              id="loker-lokasi"
              value={args.location ?? ""}
              onChange={(event) =>
                setArgs((prev) => ({
                  ...prev,
                  location: event.target.value || undefined,
                }))
              }
              placeholder="Jakarta"
              aria-label="Lokasi lowongan"
              className="h-9 rounded-[10px] border-field bg-panel text-[13px] placeholder:text-dim/70 focus-visible:border-brand-edge focus-visible:ring-brand-soft"
            />
          </label>
          <label htmlFor="loker-gaji-min" className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-dim">
              Gaji min (Rp)
            </span>
            <Input
              id="loker-gaji-min"
              inputMode="numeric"
              value={args.salaryMin ?? ""}
              onChange={(event) =>
                setArgs((prev) => ({
                  ...prev,
                  salaryMin: parseRupiah(event.target.value),
                }))
              }
              placeholder="8000000"
              aria-label="Gaji minimum"
              className="tabular h-9 rounded-[10px] border-field bg-panel text-[13px] placeholder:text-dim/70 focus-visible:border-brand-edge focus-visible:ring-brand-soft"
            />
          </label>
          <label htmlFor="loker-gaji-max" className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-dim">
              Gaji maks (Rp)
            </span>
            <Input
              id="loker-gaji-max"
              inputMode="numeric"
              value={args.salaryMax ?? ""}
              onChange={(event) =>
                setArgs((prev) => ({
                  ...prev,
                  salaryMax: parseRupiah(event.target.value),
                }))
              }
              placeholder="15000000"
              aria-label="Gaji maksimum"
              className="tabular h-9 rounded-[10px] border-field bg-panel text-[13px] placeholder:text-dim/70 focus-visible:border-brand-edge focus-visible:ring-brand-soft"
            />
          </label>
        </div>

        <label
          htmlFor="loker-sembunyikan-ditandai"
          className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[10px] bg-panel-2/70 px-3 text-[12px] text-txt"
        >
          <Checkbox
            id="loker-sembunyikan-ditandai"
            checked={args.hideFlagged ?? false}
            onCheckedChange={(checked) =>
              setArgs((prev) => ({ ...prev, hideFlagged: checked === true }))
            }
            className="data-checked:border-brand-strong data-checked:bg-brand-strong"
          />
          Sembunyikan yang ditandai salah satu penilaian
        </label>
      </div>

      {hasNotice ? (
        <div className="flex flex-col gap-1.5 px-3.5 pb-3">
          {scan === "failed" ? (
            <p className="flex items-start gap-1.5 rounded-[8px] bg-danger/5 px-2.5 py-2 text-[11px] text-danger leading-snug">
              <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
              Pindai gagal dimulai. Hasil lama tetap ditampilkan.
            </p>
          ) : null}
          {scan === "running" ? (
            <p className="flex items-center gap-1.5 text-[11px] text-dim">
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
              Pindai berjalan di latar belakang; hasil lama tetap ditampilkan.
            </p>
          ) : null}
          {summaryState === "running" ? (
            <p className="flex items-center gap-1.5 text-[11px] text-dim">
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
              Menyusun ringkasan…
            </p>
          ) : null}
          {corpus.capped ? (
            <p className="text-[11px] text-dim leading-snug">
              Menampilkan {corpus.postings.length} lowongan terbaru dari{" "}
              {corpus.total} hasil pindai.
            </p>
          ) : null}
          {lastRun ? (
            <p className="tabular text-[11px] text-dim leading-snug">
              Pindai terakhir: {lastRun.added} ditambahkan, {lastRun.dropped}{" "}
              dibuang karena data audit tidak lengkap.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border-t border-line">
        {results.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-8 text-center">
            <span
              aria-hidden
              className="flex size-9 items-center justify-center rounded-full bg-panel-2 text-dim"
            >
              <Search className="size-4" />
            </span>
            <p className="mt-2.5 text-[13px] font-medium text-txt">
              {corpus.total === 0
                ? "Belum ada hasil pindai"
                : "Tidak ada lowongan yang cocok"}
            </p>
            <p className="mt-1 max-w-[30ch] text-[11px] text-dim leading-snug">
              {corpus.total === 0
                ? canRefresh
                  ? "Tekan Pindai ulang untuk mengambil lowongan terbaru."
                  : "Masuk untuk memindai lowongan."
                : "Longgarkan kata kunci, lokasi, atau saringan gaji."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {results.map((posting) => (
              <LokerCard
                key={posting.urlKey}
                posting={posting}
                saved={savedIds.has(posting.urlKey)}
                onToggleSave={onToggleSave}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
