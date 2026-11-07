"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { MODUS } from "@/lib/modus";
import {
  BADGE_LABEL,
  loadProgress,
  PROGRESS_EVENT,
  type Progress as StoredProgress,
} from "@/lib/progress";

export { BADGE_LABEL };

/**
 * Progress is per-device localStorage, so every read happens after mount.
 * `saveProgress` fires PROGRESS_EVENT; listening for it keeps the header,
 * the catalog marks and the completion card in sync without a provider.
 */
function subscribe(onChange: () => void) {
  window.addEventListener(PROGRESS_EVENT, onChange);
  // Another tab finishing a module should update this one too.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PROGRESS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Current progress, loaded once after mount (null until then). */
export function useStoredProgress(): StoredProgress | null {
  const [progress, setProgress] = useState<StoredProgress | null>(null);

  useEffect(() => {
    const read = () => setProgress(loadProgress());
    read();
    return subscribe(read);
  }, []);

  return progress;
}

/** Module numbers finished on this device — read by the list page rows. */
export function useCompletedModules(): Set<number> {
  const progress = useStoredProgress();
  return new Set(progress?.completedModules ?? []);
}

/**
 * Client island for the list header. Renders nothing until mounted so the
 * static list never flashes a "0 selesai" claim before local data exists
 * (and never mismatches the server HTML).
 */
export function BelajarProgress() {
  const progress = useStoredProgress();

  if (!progress) return null;

  const done = progress.completedModules.length;
  const total = MODUS.length;
  const pct = Math.min(100, Math.round((done / total) * 100));
  const badgeNames = Object.entries(BADGE_LABEL)
    .filter(([id]) => progress.badges.includes(id))
    .map(([, label]) => label);

  return (
    <output className="mt-5 block max-w-xl">
      <span className="flex items-center gap-3">
        <ProgressRing pct={pct} />
        <span className="min-w-0">
          <span className="tabular block font-medium text-txt">
            {done} dari {total} modul selesai
            <span className="text-dim"> · {pct}%</span>
          </span>
          <span className="appnext-caption block">
            {done === 0
              ? "Mulai dari modul yang sudah lengkap di bawah — progresmu tersimpan di perangkat ini."
              : "Bagus, lanjutkan. Progresmu tersimpan di perangkat ini, tanpa akun."}
            {badgeNames.length > 0 ? ` Lencana: ${badgeNames.join(", ")}.` : ""}
          </span>
        </span>
        {done > 0 ? (
          <CheckCircle2
            aria-hidden
            className="size-5 shrink-0 text-[color:var(--appnext-accent-deep)]"
          />
        ) : null}
      </span>
      <Progress
        value={pct}
        aria-label="Progres belajar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="mt-3 h-2.5 bg-panel-2 [&>[data-slot=progress-indicator]]:bg-[var(--appnext-accent)]"
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
        className="tabular rotate-90 fill-[var(--appnext-ink)] font-medium"
        fontSize={size * 0.26}
        transform={`rotate(90 ${size / 2} ${size / 2})`}
      >
        {pct}%
      </text>
    </svg>
  );
}
