"use client";

import { Loader2, RefreshCw } from "lucide-react";
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
      className="flex min-w-0 flex-col gap-3 rounded-[14px] border border-line bg-panel-2/40 p-3"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-medium text-[12px] text-txt">Pencari Lowongan</h3>
          <p className="tabular text-[10px] text-dim">
            {results.length} dari {corpus.postings.length} lowongan di perangkat
            ini
          </p>
          <p className="tabular text-[10px] text-dim">
            {lastScan
              ? `Terakhir dipindai ${lastScan.slice(0, 10)}`
              : "Belum pernah dipindai"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={!canRefresh || scanning}
          aria-label="Pindai ulang lowongan"
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

      <div className="grid gap-2 sm:grid-cols-2">
        <label
          htmlFor="loker-kata-kunci"
          className="flex flex-col gap-1 text-[10px] text-dim"
        >
          Kata kunci
          <Input
            id="loker-kata-kunci"
            value={args.query}
            onChange={(event) =>
              setArgs((prev) => ({ ...prev, query: event.target.value }))
            }
            placeholder="React, data analyst…"
            aria-label="Kata kunci lowongan"
          />
        </label>
        <label
          htmlFor="loker-lokasi"
          className="flex flex-col gap-1 text-[10px] text-dim"
        >
          Lokasi
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
          />
        </label>
        <label
          htmlFor="loker-gaji-min"
          className="flex flex-col gap-1 text-[10px] text-dim"
        >
          Gaji minimum (Rp)
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
          />
        </label>
        <label
          htmlFor="loker-gaji-max"
          className="flex flex-col gap-1 text-[10px] text-dim"
        >
          Gaji maksimum (Rp)
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
          />
        </label>
      </div>

      <label
        htmlFor="loker-sembunyikan-ditandai"
        className="flex min-h-[44px] items-center gap-2 text-[11px] text-txt"
      >
        <Checkbox
          id="loker-sembunyikan-ditandai"
          checked={args.hideFlagged ?? false}
          onCheckedChange={(checked) =>
            setArgs((prev) => ({ ...prev, hideFlagged: checked === true }))
          }
        />
        Sembunyikan yang ditandai salah satu penilaian
      </label>

      {scan === "failed" ? (
        <p className="text-[11px] text-danger">
          Pindai gagal dimulai. Hasil lama tetap ditampilkan.
        </p>
      ) : null}
      {scan === "running" ? (
        <p className="text-[11px] text-dim">
          Pindai berjalan di latar belakang; hasil lama tetap ditampilkan.
        </p>
      ) : null}
      {corpus.capped ? (
        <p className="text-[11px] text-dim">
          Menampilkan {corpus.postings.length} lowongan terbaru dari{" "}
          {corpus.total} hasil pindai.
        </p>
      ) : null}
      {lastRun ? (
        <p className="text-[11px] text-dim">
          Pindai terakhir: {lastRun.added} ditambahkan, {lastRun.dropped}{" "}
          dibuang karena data audit tidak lengkap.
        </p>
      ) : null}
      {summaryState === "running" ? (
        <p className="text-[11px] text-dim">Menyusun ringkasan…</p>
      ) : null}

      {results.length === 0 ? (
        <div className="rounded-[10px] border border-line border-dashed px-3 py-6 text-center">
          <p className="font-medium text-[12px] text-txt">
            {corpus.total === 0
              ? "Belum ada hasil pindai"
              : "Tidak ada lowongan yang cocok"}
          </p>
          <p className="mt-1 text-[11px] text-dim">
            {corpus.total === 0
              ? canRefresh
                ? "Tekan Pindai ulang untuk mengambil lowongan terbaru."
                : "Masuk untuk memindai lowongan."
              : "Longgarkan kata kunci, lokasi, atau saringan gaji."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
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
    </section>
  );
}
