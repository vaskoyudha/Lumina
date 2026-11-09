"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AccountProgressContext,
  type AccountProgressState,
  useAccountProgress,
  useStoredProgress,
} from "@/components/belajar/account-progress-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { LearningSummary } from "@/lib/content/schema";
import { getAccountProgress } from "@/lib/learning/actions";
import {
  BADGE_LABEL,
  EMPTY_PROGRESS,
  type Progress as StoredProgress,
} from "@/lib/progress";

export { BADGE_LABEL };
export { useAccountProgress, useStoredProgress };
export function AccountProgressProvider({
  children,
  modules,
}: {
  children: ReactNode;
  modules: LearningSummary[];
}) {
  const pathname = usePathname();
  const [progress, setProgress] = useState<StoredProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [simulations, setSimulations] = useState<
    AccountProgressState["simulations"]
  >([]);
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++requestId.current;
    try {
      const result = await getAccountProgress();
      if (current !== requestId.current) return;
      if (result.ok) {
        setProgress(result.progress);
        setSimulations(result.simulations);
        setError(null);
        setAuthenticated(true);
      } else {
        setProgress(EMPTY_PROGRESS);
        setSimulations([]);
        setError(result.error);
        setAuthenticated(false);
      }
    } catch {
      if (current !== requestId.current) return;
      setProgress(EMPTY_PROGRESS);
      setSimulations([]);
      setAuthenticated(false);
      setError("Progres belum bisa dimuat. Coba lagi.");
    }
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: route changes must discard the previous account snapshot
  useEffect(() => {
    setProgress(null);
    setSimulations([]);
    setAuthenticated(false);
    void refresh();
    const read = () => {
      void refresh();
    };
    window.addEventListener("focus", read);
    return () => window.removeEventListener("focus", read);
  }, [refresh, pathname]);
  return (
    <AccountProgressContext.Provider
      value={{
        modules,
        progress,
        error,
        authenticated,
        simulations,
        refresh,
        update: setProgress,
      }}
    >
      {children}
    </AccountProgressContext.Provider>
  );
}
export function ProgressNotice() {
  const { error, refresh, authenticated } = useAccountProgress();
  if (!error) return null;
  return (
    <Alert>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{error}</span>
        <span className="flex flex-wrap gap-2">
          {!authenticated && (
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/masuk">Masuk</Link>
            </Button>
          )}
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => void refresh()}
          >
            Muat ulang progres
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}
/** Progress is loaded from the authenticated account after mount. */
export function useCompletedModules(): Set<number> {
  const progress = useStoredProgress();
  return new Set(progress?.completedModules ?? []);
}

/** Progress is loaded from the authenticated account after mount. */
export function BelajarProgress() {
  const progress = useStoredProgress();
  const { modules } = useAccountProgress();

  if (!progress) return null;

  const done = progress.completedModules.length;
  const total = modules.length;
  const pct = Math.min(100, Math.round((done / total) * 100));
  const badgeNames = Object.entries(BADGE_LABEL)
    .filter(([id]) => progress.badges.includes(id))
    .map(([, label]) => label);

  return (
    <output className="mt-5 block max-w-xl rounded-card border border-line bg-panel p-3 shadow-[var(--appnext-shadow-ambient)]">
      <span className="flex items-center gap-3">
        <ProgressRing pct={pct} />
        <span className="min-w-0">
          <span className="tabular block font-medium text-txt">
            {done} dari {total} modul selesai
            <span className="text-dim"> · {pct}%</span>
          </span>
          <span className="appnext-caption block">
            {done === 0
              ? "Mulai dari modul yang sudah lengkap di bawah — progresmu tersimpan di akun."
              : "Bagus, lanjutkan. Progresmu tersimpan di akun."}
            {badgeNames.length > 0 ? ` Lencana: ${badgeNames.join(", ")}.` : ""}
          </span>
        </span>
        {done > 0 ? (
          <CheckCircle2
            aria-hidden
            className="size-5 shrink-0 text-brand-ink"
          />
        ) : null}
      </span>
      <Progress
        value={pct}
        aria-label="Progres belajar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="mt-3 h-2.5 bg-panel-2 [&>[data-slot=progress-indicator]]:bg-brand"
      />
    </output>
  );
}

/** Circular momentum cue (Khan/Coursera style), drawn from AppNext tokens. */
export function ProgressRing({
  pct,
  size = 52,
}: {
  pct: number;
  size?: number;
}) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Progres ${pct}%`}
      className="shrink-0 -rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className="appnext-ring-track"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * pct) / 100}
        className="appnext-ring-fill"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="tabular fill-[var(--appnext-ink)] font-medium"
        fontSize={size * 0.26}
        transform={`rotate(90 ${size / 2} ${size / 2})`}
      >
        {pct}%
      </text>
    </svg>
  );
}
