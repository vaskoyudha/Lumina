"use client";
import Link from "next/link";
import { useStoredProgress } from "@/components/belajar/belajar-progress";
import { Card, CardContent } from "@/components/ui/card";
import { PATTERN_BY_ID } from "@/data/patterns";
export function Remediation({ moduleNo }: { moduleNo: number }) {
  const progress = useStoredProgress();
  const patterns = (progress?.missedPatterns ?? [])
    .map((id) => PATTERN_BY_ID.get(id))
    .filter((p) => p?.moduleNo === moduleNo);
  if (!patterns.length) return null;
  return (
    <Card id="tinjau" className="scroll-mt-24 gap-0 py-0">
      <CardContent className="py-5">
        <h2 className="text-xl font-medium">Tinjau pola yang kamu lewatkan</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {patterns.slice(0, 3).map(
            (p) =>
              p && (
                <li key={p.id}>
                  <p className="font-medium">{p.label}</p>
                  <p className="text-dim text-sm">{p.sign}</p>
                  <Link
                    className="appnext-link inline-flex min-h-11 items-center"
                    href={p.tactic === "tautan" ? "#contoh" : "#checklist"}
                  >
                    Tinjau bagian materi
                  </Link>
                </li>
              ),
          )}
        </ul>
        <Link
          className="appnext-link inline-flex min-h-11 items-center"
          href={`/belajar/latihan?pola=${patterns[0]?.id}`}
        >
          Latih kembali pola ini
        </Link>
      </CardContent>
    </Card>
  );
}
