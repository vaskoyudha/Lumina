"use client";

import {
  Briefcase,
  ChevronDown,
  Loader2,
  MapPin,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  TriangleAlert,
  Wallet,
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
import { cn } from "@/lib/utils";

type ScanState =
  | "idle"
  | "starting"
  | "running"
  | "done"
  | "unauthorized"
  | "limited"
  | "failed";

function parseRupiah(value: string): number | undefined {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : undefined;
}

/** One cell of the 2×2 criteria grid: soft icon tile, label, inline field. */
function Criterion({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5 p-3.5 transition-colors focus-within:bg-panel hover:bg-panel">
      <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-bold text-txt">{title}</span>
        {children}
      </div>
    </div>
  );
}

/**
 * The inline job-search surface.
 *
 * It receives the whole capped corpus and filters locally, so changing a filter
 * is not a network call and clearing it restores postings the first filter
 * removed. The scan button only refills the corpus for the next search; it
 * never blocks the results already on screen.
 *
 * The layout is ported from the Lumina dashboard reference: a single card whose
 * criteria live in a divided 2×2 grid, with the rarer toggle tucked behind
 * "Opsi Lanjutan" so the surface reads as one calm panel rather than a form.
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
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const latestRun = React.useRef<ScanRunStatus | null>(null);

  const waitForScan = React.useCallback(async () => {
    latestRun.current = null;
    const result = await pollScan(
      (status) => {
        latestRun.current = status;
        setLastRun(status);
      },
      { intervalMs: 3000 },
    );
    if (result?.status === "ok") {
      setScan("done");
      router.refresh();
      return;
    }
    if (result?.status === "failed") {
      setScan("failed");
      return;
    }
    // `null` means a timeout, a network error, or no run yet. A timeout while
    // the run is still `running` is not a failure: keep polling on the next
    // mount instead of claiming the scan failed and hiding its rows.
    const last = latestRun.current as ScanRunStatus | null;
    setScan(last?.status === "running" ? "running" : "failed");
  }, [router]);

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
        if (cancelled) return;
        setLastRun(status);
        if (status?.status === "running") {
          setScan("running");
          void waitForScan();
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canRefresh, waitForScan]);

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
    scan === "unauthorized" ||
    scan === "limited" ||
    scan === "running" ||
    corpus.capped ||
    Boolean(lastRun) ||
    summaryState === "running";

  const refresh = async () => {
    if (!canRefresh || scanning) return;
    setScan("starting");
    const started = await triggerScan();
    if (started === "unauthorized") {
      setScan("unauthorized");
      return;
    }
    if (started === "rate-limited") {
      setScan("limited");
      return;
    }
    if (started === "failed") {
      setScan("failed");
      return;
    }
    setScan("running");
    await waitForScan();
  };

  return (
    <section
      aria-label="Pencari lowongan"
      className="flex min-w-0 flex-col rounded-[24px] border border-line bg-panel p-4 shadow-rest sm:p-5"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft">
            <div className="flex size-6 items-center justify-center rounded-full bg-brand">
              <Play
                aria-hidden
                className="ml-0.5 size-3 fill-white text-white"
              />
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-txt leading-snug">
              Pencari Lowongan
            </h2>
            <p className="text-[11.5px] text-dim">
              Temukan lowongan pekerjaan yang sesuai denganmu
            </p>
            <p className="tabular mt-0.5 text-[11px] text-dim leading-snug">
              {results.length} dari {corpus.postings.length} lowongan
              {lastScan
                ? ` · dipindai ${lastScan.slice(0, 10)}`
                : " · belum dipindai"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setArgs(initialArgs)}
            aria-label="Setel ulang filter"
            className="h-[32px] rounded-full border-line bg-panel px-3 text-[11.5px] font-medium text-txt hover:bg-panel-2"
          >
            <RotateCcw aria-hidden />
            Setel ulang
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={!canRefresh || scanning}
            aria-label={
              canRefresh ? "Pindai ulang lowongan" : "Masuk untuk memindai"
            }
            className="h-[32px] rounded-full border-line bg-panel px-3 text-[11px] font-medium text-txt hover:bg-panel-2"
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
        </div>
      </header>

      <div className="grid grid-cols-1 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel-2/40 md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="divide-y divide-line">
          <Criterion
            title="Pencarian Lowongan"
            icon={<Briefcase aria-hidden className="size-5 text-brand-ink" />}
          >
            <Input
              id="loker-kata-kunci"
              value={args.query}
              onChange={(event) =>
                setArgs((prev) => ({ ...prev, query: event.target.value }))
              }
              placeholder="React, data analyst…"
              aria-label="Kata kunci lowongan"
              className="mt-0.5 h-6 border-0 bg-transparent px-0 py-0 text-[11px] text-dim leading-tight shadow-none placeholder:text-dim/70 focus-visible:border-0 focus-visible:ring-0"
            />
          </Criterion>

          <Criterion
            title="Gaji Minimum"
            icon={
              <span className="flex size-6 items-center justify-center rounded-full bg-brand text-[9.5px] font-bold text-white">
                Rp
              </span>
            }
          >
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
              className="tabular mt-0.5 h-6 border-0 bg-transparent px-0 py-0 text-[11px] text-dim leading-tight shadow-none placeholder:text-dim/70 focus-visible:border-0 focus-visible:ring-0"
            />
          </Criterion>
        </div>

        <div className="divide-y divide-line">
          <Criterion
            title="Posisi & Lokasi"
            icon={<MapPin aria-hidden className="size-5 text-brand-ink" />}
          >
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
              className="mt-0.5 h-6 border-0 bg-transparent px-0 py-0 text-[11px] text-dim leading-tight shadow-none placeholder:text-dim/70 focus-visible:border-0 focus-visible:ring-0"
            />
          </Criterion>

          <Criterion
            title="Gaji Maksimum"
            icon={<Wallet aria-hidden className="size-5 text-brand-ink" />}
          >
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
              className="tabular mt-0.5 h-6 border-0 bg-transparent px-0 py-0 text-[11px] text-dim leading-tight shadow-none placeholder:text-dim/70 focus-visible:border-0 focus-visible:ring-0"
            />
          </Criterion>
        </div>
      </div>

      <div className="my-3 flex justify-center">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          aria-expanded={showAdvanced}
          className="flex h-[30px] items-center gap-1.5 rounded-full border border-line bg-panel px-4 text-[11.5px] font-semibold text-txt shadow-rest transition-colors hover:bg-panel-2"
        >
          <span>Opsi Lanjutan</span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-3.5 text-dim transition-transform",
              showAdvanced && "rotate-180",
            )}
          />
        </button>
      </div>

      {showAdvanced ? (
        <div className="mb-3.5 rounded-2xl border border-line bg-panel-2/40 p-3.5">
          <label
            htmlFor="loker-sembunyikan-ditandai"
            className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl bg-panel px-3 text-[12px] text-txt"
          >
            <Checkbox
              id="loker-sembunyikan-ditandai"
              checked={args.hideFlagged ?? false}
              onCheckedChange={(checked) =>
                setArgs((prev) => ({ ...prev, hideFlagged: checked === true }))
              }
              className="data-checked:border-brand data-checked:bg-brand"
            />
            Sembunyikan yang ditandai salah satu penilaian
          </label>
        </div>
      ) : null}

      {hasNotice ? (
        <div className="flex flex-col gap-1.5">
          {scan === "unauthorized" ? (
            <p className="flex items-start gap-1.5 rounded-[8px] bg-danger/5 px-2.5 py-2 text-[11px] text-danger leading-snug">
              <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
              Sesi berakhir. Masuk lagi untuk memindai. Hasil lama tetap
              ditampilkan.
            </p>
          ) : null}
          {scan === "limited" ? (
            <p className="flex items-start gap-1.5 rounded-[8px] bg-danger/5 px-2.5 py-2 text-[11px] text-danger leading-snug">
              <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
              Batas pindai tercapai. Coba lagi beberapa menit lagi. Hasil lama
              tetap ditampilkan.
            </p>
          ) : null}
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
          {lastRun && lastRun.status !== "running" && lastRun.finishedAt ? (
            <p className="tabular text-[11px] text-dim leading-snug">
              Pindai terakhir: {lastRun.added} ditambahkan, {lastRun.dropped}{" "}
              dibuang karena detail lowongan tidak bisa diambil.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3">
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
          <ul className="flex flex-col gap-3">
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
