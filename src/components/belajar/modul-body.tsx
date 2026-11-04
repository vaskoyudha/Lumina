"use client";

import Link from "next/link";
import { useState } from "react";
import { CompleteButton } from "@/components/belajar/complete-button";
import { Quiz } from "@/components/belajar/quiz";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ModuleContent } from "@/data/modul-10";

/**
 * The full module body (§5): anatomy 1–5, an anonymised example with the
 * dangerous parts marked, a 5-item red-flag checklist, a 3–5 question quiz,
 * then ordered reporting steps. The quiz gates completion — the button only
 * unlocks after a pass, it is not a self-declared checkbox.
 */
export function ModulBody({ modul }: { modul: ModuleContent }) {
  const [passed, setPassed] = useState(false);

  function handleDone() {
    setPassed(true);
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Bagaimana penipuan ini bekerja</CardTitle>
          <CardDescription>
            Lima langkah, selalu dengan urutan yang sama.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-4">
            {modul.anatomi.map((step, i) => (
              <li key={step.judul} className="flex gap-3">
                <span
                  aria-hidden
                  className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-panel-2 text-dim text-xs"
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-medium text-sm text-txt">{step.judul}</h3>
                  <p className="mt-1 text-dim text-sm">{step.teks}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{modul.contohJudul}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg bg-panel-2 p-4 text-sm leading-relaxed">
            {modul.contohPesan.map((seg, i) =>
              seg.berbahaya ? (
                <mark
                  key={`${modul.no}-seg-${i}`}
                  className="bg-danger/20 text-danger"
                >
                  {seg.text}
                </mark>
              ) : (
                <span key={`${modul.no}-seg-${i}`}>{seg.text}</span>
              ),
            )}
          </p>
          <p className="mt-3 text-dim text-xs">
            Tiga hal yang ditandai: janji palsu, nama file <code>.apk</code>,
            dan perintah untuk menginstal.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist 5 tanda bahaya</CardTitle>
          <CardDescription>
            Satu saja muncul, berhenti. Jangan lanjutkan chat-nya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2.5">
            {modul.checklist.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm">
                <span
                  aria-hidden
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uji pemahamanmu</CardTitle>
          <CardDescription>
            Empat situasi. Pilih apa yang kamu lakukan sekarang — bukan
            definisi. Lulus di 60% untuk menyelesaikan modul.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Quiz questions={modul.kuis} onDone={handleDone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kalau ini sudah terlanjur terjadi</CardTitle>
          <CardDescription>
            Urutan ini penting — jangan dibalik.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3">
            {modul.lapor.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="tabular shrink-0 font-medium text-safe">
                  {i + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Separator />

      {passed ? (
        <CompleteButton moduleNo={modul.no} />
      ) : (
        <p className="text-dim text-sm">
          Selesaikan kuis dengan skor minimal 60% untuk menandai modul ini
          selesai dan membuka lencana.
        </p>
      )}

      {/* TODO(stream-C): route exists; runner content is C's until Gate 2. */}
      {modul.scenarioId ? (
        <Button asChild variant="outline" className="min-h-11 w-fit">
          <Link href={`/simulasi/${modul.scenarioId}`}>
            Latih pola ini di simulasi
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
