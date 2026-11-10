"use client";

import { GraduationCap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function ProgressPanel({
  done,
  total,
  pct,
  badges,
}: {
  done: number;
  total: number;
  pct: number;
  badges: string[];
}) {
  return (
    <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <GraduationCap aria-hidden className="size-4 text-brand" />
          {done} dari {total} modul selesai
        </CardTitle>
        <CardDescription>
          Progres tersimpan di akunmu, bukan di perangkat ini.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        <Progress
          value={pct}
          aria-label="Progres belajar"
          className="h-2 bg-panel-2 [&>[data-slot=progress-indicator]]:bg-brand"
        />
        <p className="mt-3 text-dim text-xs">
          {badges.length > 0
            ? `Lencana: ${badges.join(", ")}.`
            : "Belum ada lencana. Selesaikan satu modul untuk mulai."}
        </p>
      </CardContent>
    </Card>
  );
}
