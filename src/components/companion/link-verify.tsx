"use client";

import {
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import * as React from "react";
import type { LinkVerdict } from "@/lib/link-verify/urlvet";
import { cn } from "@/lib/utils";

const VERDICT_TEXT: Record<LinkVerdict["verdict"], string> = {
  Safe: "Aman",
  Suspicious: "Mencurigakan",
  Risky: "Berisiko",
};

const VERDICT_TONE: Record<LinkVerdict["verdict"], string> = {
  Safe: "text-brand-ink",
  Suspicious: "text-warn",
  Risky: "text-danger",
};

const VERDICT_ICON = {
  Safe: ShieldCheck,
  Suspicious: ShieldAlert,
  Risky: ShieldX,
} as const;

const ERROR_TEXT: Record<string, string> = {
  "rate-limited": "Batas pemeriksaan tercapai. Coba lagi sebentar.",
  "upstream-timeout": "Pemeriksaan melewati batas waktu. Coba lagi.",
  "upstream-invalid": "Pemeriksa mengembalikan jawaban yang tidak dikenali.",
  "not-configured": "Pemeriksa tautan belum dikonfigurasi.",
};

type ApiResponse =
  | { ok: true; verdict: LinkVerdict }
  | { ok: false; error: string };

/**
 * Opt-in link verification for one URL.
 *
 * Nothing is sent until the reader presses the button: the URL is the only
 * field in the request, and the answer is a deterministic report from url.vet
 * (DNS, TLS, redirects, page content, threat feeds). The scanner sees the
 * link, never the message it came from.
 */
export function LinkVerify({ url }: { url: string }) {
  const [state, setState] = React.useState<"idle" | "running" | "done">("idle");
  const [verdict, setVerdict] = React.useState<LinkVerdict | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function run() {
    setState("running");
    setError(null);
    try {
      const response = await fetch("/api/link/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (await response.json()) as ApiResponse;
      if (!json.ok) {
        setError(ERROR_TEXT[json.error] ?? "Pemeriksaan tautan gagal.");
        setState("done");
        return;
      }
      setVerdict(json.verdict);
      setState("done");
    } catch {
      setError("Pemeriksaan tautan gagal.");
      setState("done");
    }
  }

  const Icon = verdict ? VERDICT_ICON[verdict.verdict] : Search;
  const running = state === "running";

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={run}
        disabled={running}
        data-testid="link-verify"
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 text-[10.5px] font-medium text-txt transition-colors hover:border-brand-edge hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-brand-glow focus-visible:outline-offset-2 disabled:opacity-60"
      >
        {running ? (
          <Loader2 aria-hidden className="size-3 animate-spin" />
        ) : (
          <Search aria-hidden className="size-3" />
        )}
        {running ? "Memeriksa…" : verdict ? "Periksa ulang" : "Periksa tautan"}
      </button>

      <div aria-live="polite">
        {error ? <p className="mt-1 text-[10.5px] text-dim">{error}</p> : null}
        {verdict ? (
          <div className="mt-1.5 rounded-[10px] border border-line bg-panel-2 p-2">
            <p className="flex items-center gap-1.5 text-[11px] font-medium">
              <Icon
                aria-hidden
                className={cn("size-3.5", VERDICT_TONE[verdict.verdict])}
              />
              <span className={VERDICT_TONE[verdict.verdict]}>
                {VERDICT_TEXT[verdict.verdict]}
              </span>
              <span className="tabular text-[10px] text-dim">
                {verdict.score}/100
              </span>
            </p>
            {verdict.badReasons.length > 0 ? (
              <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-[10.5px] text-txt/80">
                {verdict.badReasons.slice(0, 3).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
            {verdict.incomplete ? (
              <p className="mt-1 text-[10px] text-warn">
                Sebagian pemeriksaan tidak selesai; ulangi bila perlu.
              </p>
            ) : null}
            <p className="mt-1 text-[9.5px] text-dim">
              Diperiksa langsung oleh url.vet (sumber terbuka) · hanya tautan
              ini yang dikirim
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
