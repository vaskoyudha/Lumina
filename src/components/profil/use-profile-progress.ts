"use client";

import { useContext, useEffect, useState } from "react";
import { AccountProgressContext } from "@/components/belajar/account-progress-context";
import { MODUS } from "@/lib/modus";
import { type Progress, ProgressSchema } from "@/lib/progress";

/** Profile controls also live on routes without the learning provider. */
export function useProfileProgress(open: boolean) {
  const context = useContext(AccountProgressContext);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(MODUS.length);

  useEffect(() => {
    if (!open || context) return;
    if (typeof fetch !== "function") {
      setError("Progres belum bisa dimuat. Tutup lalu buka lagi.");
      return;
    }
    let alive = true;
    const control = new AbortController();
    setProgress(null);
    setError(null);
    void fetch("/api/account/progress", {
      cache: "no-store",
      signal: control.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("progress");
        return response.json();
      })
      .then((result) => {
        if (!alive) return;
        const parsed = ProgressSchema.safeParse(result?.progress);
        if (!parsed.success) throw new Error("progress");
        setProgress(parsed.data);
        if (Number.isInteger(result.moduleCount) && result.moduleCount > 0)
          setTotal(result.moduleCount);
      })
      .catch(() => {
        if (alive) setError("Progres belum bisa dimuat. Tutup lalu buka lagi.");
      });
    return () => {
      alive = false;
      control.abort();
    };
  }, [open, context]);

  return {
    progress: context?.progress ?? progress,
    error: context?.error ?? error,
    total: context?.modules.length || total,
  };
}
