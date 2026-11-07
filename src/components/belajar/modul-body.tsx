"use client";

import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  Flag,
  Globe,
  Link2,
  type LucideIcon,
  MessageSquareWarning,
  Phone,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
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
import type { ContohJenis, ModuleContent } from "@/data/modul-schema";
import { loadProgress, recordMissed, saveProgress } from "@/lib/progress";

/**
 * One frame per example shape. The segments are identical in all four — only
 * the chrome changes, because a scam is not always a message: a link, a fake
 * site and a call each hide the danger in a different place.
 */
type ContohShape = {
  label: string;
  Icon: LucideIcon;
  /** Advice under the example, shaped to the medium. */
  saran: string;
  /** Source line for courses that did not write one. */
  sumber: string;
};

const CONTOH_SHAPE: Record<ContohJenis, ContohShape> = {
  pesan: {
    label: "Contoh pesan asli",
    Icon: MessageSquareWarning,
    saran: "Jangan dibalas. Jangan ketuk file-nya.",
    sumber: "Nomor tak dikenal · baru saja",
  },
  tautan: {
    label: "Contoh tautan asli",
    Icon: Link2,
    saran: "Jangan ketuk tautannya. Buka situs resmi lewat aplikasimu sendiri.",
    sumber: "Tautan dari sumber tak dikenal",
  },
  situs: {
    label: "Contoh situs asli",
    Icon: Globe,
    saran: "Jangan masukkan nama, PIN, atau kode apa pun di halaman ini.",
    sumber: "https://",
  },
  panggilan: {
    label: "Contoh panggilan asli",
    Icon: Phone,
    saran: "Tutup, lalu telepon nomor resmi dari kartu atau situsnya.",
    sumber: "Panggilan masuk · nomor tak dikenal",
  },
};

/**
 * One lesson block. Every section of the module is the same shape — heading,
 * one line of framing, content — so the player reads as a course, not a pile
 * of unrelated panels.
 */
function LessonSection({
  id,
  title,
  lede,
  children,
}: {
  id: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <Card
      aria-labelledby={id}
      className="gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]"
    >
      <CardHeader className="gap-1 py-5 pb-0">
        <CardTitle id={id} className="font-normal text-2xl text-txt">
          {title}
        </CardTitle>
        <CardDescription className="text-dim">{lede}</CardDescription>
      </CardHeader>
      <CardContent className="py-5">{children}</CardContent>
    </Card>
  );
}

/**
 * The example itself, in whichever frame the course declares. The segments
 * and their red marks are identical in all four — only the chrome changes,
 * because the same danger reads differently in a bubble, a URL bar and a
 * call transcript.
 */
function ContohFrame({ modul }: { modul: ModuleContent }) {
  const jenis: ContohJenis = modul.contohJenis ?? "pesan";
  const shape = CONTOH_SHAPE[jenis];
  const Icon = shape.Icon;
  const sumber = modul.contohSumber?.trim() || shape.sumber;

  const segmen = modul.contohIsi.map((seg, i) =>
    seg.berbahaya ? (
      <mark key={`${modul.no}-seg-${i}`} className="appnext-mark">
        {seg.text}
      </mark>
    ) : (
      <span key={`${modul.no}-seg-${i}`}>{seg.text}</span>
    ),
  );

  if (jenis === "situs") {
    // Browser chrome, not a chat: the danger sits in the address bar, so the
    // address bar is what the frame puts in front of the learner.
    return (
      <div className="appnext-band rounded-3xl p-4 sm:p-5">
        <Card className="max-w-xl gap-0 overflow-hidden rounded-[18px] py-0 shadow-[var(--appnext-shadow-soft)]">
          <div className="flex items-center gap-2 border-b border-line bg-panel-2 px-3 py-2">
            <span className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-txt text-xs">
              <Icon aria-hidden className="size-3.5 shrink-0 text-dim" />
              <span className="truncate">{sumber}</span>
            </span>
          </div>
          <CardContent className="py-4">
            <p className="leading-relaxed text-[color:var(--appnext-ink-2)]">
              {segmen}
            </p>
            <p className="appnext-caption mt-3">{shape.saran}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (jenis === "pesan") {
    return (
      <div className="appnext-band rounded-3xl p-4 sm:p-5">
        <div className="appnext-chat max-w-xl">
          <p className="appnext-chat-meta">
            <span
              aria-hidden
              className="inline-flex size-7 items-center justify-center rounded-full bg-(--appnext-surface) font-semibold text-[color:var(--appnext-ink-2)] text-xs"
            >
              +62
            </span>
            <span>{sumber}</span>
          </p>
          <p className="mt-3 leading-relaxed text-[color:var(--appnext-ink-2)]">
            {segmen}
          </p>
          <p className="appnext-caption mt-3 text-right text-xs">
            {shape.saran}
          </p>
        </div>
      </div>
    );
  }

  // tautan & panggilan: the same card, told apart by icon, source line and
  // the advice underneath — a link and a call do not need different chrome,
  // they need different words.
  return (
    <div className="appnext-band rounded-3xl p-4 sm:p-5">
      <Card className="max-w-xl gap-0 rounded-[18px] py-0 shadow-[var(--appnext-shadow-soft)]">
        <CardContent className="py-4">
          <p className="appnext-chat-meta">
            <span
              aria-hidden
              className="inline-flex size-7 items-center justify-center rounded-full bg-(--appnext-surface) text-[color:var(--appnext-ink-2)]"
            >
              <Icon className="size-4" />
            </span>
            <span>{sumber}</span>
          </p>
          <p className="mt-3 leading-relaxed text-[color:var(--appnext-ink-2)]">
            {segmen}
          </p>
          <p className="appnext-caption mt-3">{shape.saran}</p>
        </CardContent>
      </Card>
    </div>
  );
}

/** Sidebar contents. The example entry follows the course's declared shape. */
function tocFor(jenis: ContohJenis) {
  const contoh = CONTOH_SHAPE[jenis];
  return [
    { id: "anatomi", label: "Cara kerja penipuan", Icon: BookOpen },
    { id: "contoh", label: contoh.label, Icon: contoh.Icon },
    { id: "checklist", label: "Checklist tanda bahaya", Icon: ClipboardCheck },
    { id: "kuis", label: "Uji pemahaman", Icon: FileWarning },
    { id: "lapor", label: "Kalau sudah terjadi", Icon: Flag },
  ];
}

/**
 * The full module body (§5): anatomy 1–5, an anonymised example with the
 * dangerous parts marked, a red-flag checklist, a 3–5 question quiz, then
 * ordered reporting steps. The example renders in the frame its course
 * declares (`contohJenis`) — message, link, site or call — because not every
 * scam arrives as a message. Layout follows course-player references: main
 * column + sticky curriculum sidebar, vertical learning path for the anatomy.
 * The quiz gates completion — the button only unlocks after a pass.
 */
export function ModulBody({ modul }: { modul: ModuleContent }) {
  const [passed, setPassed] = useState(false);
  const toc = tocFor(modul.contohJenis ?? "pesan");

  // A pass unlocks completion; the questions that were missed are recorded
  // honestly so the review surface (and Stream C later, §11.4) has real data
  // instead of a fabricated "adaptive" claim.
  function handleQuizDone(_score: number, _total: number, missed: string[]) {
    setPassed(true);
    if (missed.length > 0) {
      saveProgress(recordMissed(loadProgress(), missed));
    }
  }

  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="flex min-w-0 flex-col gap-5">
        <LessonSection
          id="anatomi"
          title="Bagaimana penipuan ini bekerja"
          lede={`${modul.anatomi.length} langkah, selalu dengan urutan yang sama. Kenali langkah awalnya, dan rantai berikutnya tidak akan pernah terjadi.`}
        >
          <ol className="appnext-path flex list-none flex-col gap-6 p-0">
            {modul.anatomi.map((step, i) => (
              <li key={step.judul} className="flex gap-4 pl-0">
                <span aria-hidden className="appnext-step-dot relative z-10">
                  {i + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-xl">{step.judul}</h3>
                  <p className="mt-1 max-w-prose">{step.teks}</p>
                </div>
              </li>
            ))}
          </ol>
        </LessonSection>

        <LessonSection
          id="contoh"
          title={modul.contohJudul}
          lede="Contoh di bawah sengaja dibuat mirip kejadian aslinya. Bagian yang disorot merah adalah yang harus membuatmu berhenti."
        >
          <ContohFrame modul={modul} />

          <p className="appnext-caption mt-4">
            {modul.contohIsi.filter((s) => s.berbahaya).length} bagian yang
            ditandai merah adalah tanda bahaya — bukan sekadar tampilan.
          </p>
        </LessonSection>

        <LessonSection
          id="checklist"
          title="Checklist tanda bahaya"
          lede="Satu saja muncul, berhenti. Jangan dilanjutkan."
        >
          <ul className="flex list-none flex-col gap-3 p-0">
            {modul.checklist.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden className="appnext-danger-dot" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </LessonSection>

        <LessonSection
          id="kuis"
          title="Uji pemahamanmu"
          lede="Pilih apa yang kamu lakukan sekarang — bukan definisi. Lulus di 60% untuk menyelesaikan modul."
        >
          <Quiz questions={modul.kuis} onDone={handleQuizDone} />
        </LessonSection>

        <LessonSection
          id="lapor"
          title="Kalau ini sudah terlanjur terjadi"
          lede="Urutan ini penting — jangan dibalik."
        >
          <ol className="flex list-none flex-col gap-3.5 p-0">
            {modul.lapor.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="appnext-step-dot tabular">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </LessonSection>

        {passed ? (
          <CompleteButton moduleNo={modul.no} />
        ) : (
          <Card className="gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-soft)]">
            <CardContent className="py-4 text-dim">
              Selesaikan kuis dengan skor minimal 60% untuk menandai modul ini
              selesai dan membuka lencana.
            </CardContent>
          </Card>
        )}

        {/* TODO(stream-C): route exists; runner content is C's until Gate 2. */}
        {modul.scenarioId ? (
          <Button
            asChild
            className="min-h-11 w-fit rounded-full border border-ink-line bg-[var(--appnext-ink-2)] text-bg hover:bg-[var(--appnext-accent-deep)]"
          >
            <Link href={`/simulasi/${modul.scenarioId}`} data-pressable>
              Latih pola ini di simulasi
            </Link>
          </Button>
        ) : null}
      </div>

      <aside className="appnext-toc hidden lg:block" aria-label="Isi modul">
        <Card className="gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
          <CardContent className="py-3">
            <p className="appnext-caption px-2 pt-1 font-medium tracking-wide uppercase">
              Isi modul
            </p>
            <ul className="mt-2 flex list-none flex-col p-0">
              {toc.map(({ id, label, Icon }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    data-pressable
                    className="appnext-toc-link"
                  >
                    <Icon aria-hidden className="size-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {id === "kuis" && passed ? (
                      <CheckCircle2
                        aria-hidden
                        className="size-4 shrink-0 text-[color:var(--appnext-accent-deep)]"
                      />
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
            <p className="appnext-caption border-line border-t px-2 pt-3 pb-1">
              {passed
                ? "Kuis lulus. Kamu bisa menandai modul selesai."
                : "Kerjakan dari atas ke bawah. Kuis ada di bagian keempat."}
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
