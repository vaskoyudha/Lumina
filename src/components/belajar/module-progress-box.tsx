"use client";

import { useStoredProgress } from "@/components/belajar/belajar-progress";
import { cn } from "@/lib/utils";

/**
 * The reference dashboard puts a live completion figure in the course modal's
 * cover. This island supplies the same slot for a module page: real per-device
 * completion, "—" until the local store is read, never a guessed percentage.
 */
export function ModuleProgressBox({
  no,
  ready,
}: {
  no: number;
  ready: boolean;
}) {
  const progress = useStoredProgress();
  const done = progress?.completedModules.includes(no) ?? false;

  return (
    <div
      className={cn(
        "shrink-0 rounded-xl px-3.5 py-2 text-right backdrop-blur-md",
        ready
          ? "border border-bg/20 bg-bg/15"
          : "border border-line bg-panel/90",
      )}
    >
      <span
        className={cn("block text-[10px]", ready ? "text-bg/80" : "text-dim")}
      >
        Progres modul
      </span>
      <span
        className={cn(
          "tabular block font-extrabold text-base",
          ready ? "text-bg" : "text-txt",
        )}
      >
        {progress ? `${done ? 100 : 0}%` : "—"}
      </span>
      <span
        className={cn("block text-[9px]", ready ? "text-bg/70" : "text-dim")}
      >
        {ready ? (done ? "Selesai" : "Belum selesai") : "Belum ditulis"}
      </span>
    </div>
  );
}
