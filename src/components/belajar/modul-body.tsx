"use client";

import {
  CheckCircle2,
  Globe,
  Link2,
  type LucideIcon,
  MessageSquareWarning,
  Phone,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useAccountProgress } from "@/components/belajar/belajar-progress";
import { CompleteButton } from "@/components/belajar/complete-button";
import { CourseSimulationCta } from "@/components/belajar/course-simulation-cta";
import { Quiz } from "@/components/belajar/quiz";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ContohJenis, ModuleContent } from "@/data/modul-schema";
import { submitQuiz } from "@/lib/learning/actions";

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
 * One lesson block. Every section of the module is the same shape — kicker,
 * heading, one line of framing, content — so the player reads as a course, not
 * a pile of unrelated panels. The kicker and hairline replace the numbered
 * tile and decorative icon: the page already has enough chrome, and an
 * editorial rule carries the rhythm without another card inside the card.
 */
function LessonSection({
  id,
  index,
  title,
  lede,
  children,
}: {
  id: string;
  index: number;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0 overflow-hidden rounded-card border border-line py-0 shadow-[var(--appnext-shadow-ambient)]">
      <div className="border-line border-b px-5 py-4">
        <div className="flex items-baseline gap-3">
          <span className="tabular font-medium text-[11px] text-brand-ink">
            Bagian {String(index).padStart(2, "0")}
          </span>
          <span aria-hidden className="h-px flex-1 bg-line" />
        </div>
        <h2
          id={id}
          className="mt-2 font-medium text-xl text-txt leading-snug sm:text-2xl"
        >
          {title}
        </h2>
        <p className="mt-1 max-w-prose text-dim text-sm leading-relaxed">
          {lede}
        </p>
      </div>
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
      <div className="rounded-[20px] bg-panel-2 p-3 sm:p-5">
        <Card className="max-w-xl gap-0 overflow-hidden rounded-[18px] border border-line py-0 shadow-[var(--appnext-shadow-soft)]">
          <div className="flex items-center gap-2 border-line border-b bg-panel-2 px-3 py-2">
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
      <div className="rounded-[20px] bg-panel-2 p-3 sm:p-5">
        <div className="appnext-chat max-w-xl">
          <p className="appnext-chat-meta">
            <span
              aria-hidden
              className="inline-flex size-7 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-ink text-xs"
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
    <div className="rounded-[20px] bg-panel-2 p-3 sm:p-5">
      <Card className="max-w-xl gap-0 rounded-[18px] border border-line py-0 shadow-[var(--appnext-shadow-soft)]">
        <CardContent className="py-4">
          <p className="appnext-chat-meta">
            <span
              aria-hidden
              className="inline-flex size-7 items-center justify-center rounded-full bg-brand-soft text-brand-ink"
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
function tocFor(modul: ModuleContent) {
  const jenis: ContohJenis = modul.contohJenis ?? "pesan";
  const contoh = CONTOH_SHAPE[jenis];
  const hasOrientation = Boolean(modul.ringkasan || modul.tujuan?.length);
  const hasKeyPoints = Boolean(modul.poinKunci?.length);
  return [
    ...(hasOrientation ? [{ id: "tujuan", label: "Tujuan pembelajaran" }] : []),
    { id: "anatomi", label: "Cara kerja penipuan" },
    { id: "contoh", label: contoh.label },
    { id: "checklist", label: "Checklist tanda bahaya" },
    { id: "kuis", label: "Uji pemahaman" },
    { id: "lapor", label: "Kalau sudah terjadi" },
    ...(hasKeyPoints ? [{ id: "poin-kunci", label: "Poin kunci" }] : []),
  ];
}

/**
 * Orientation card. Published courses declare what the learner will be able
 * to do and how long it takes; showing that up front is what separates a
 * course from a wall of text. Rendered only when the course supplies it, so
 * older drafts stay honest instead of showing an empty frame.
 *
 * The brief is set as an editorial spec sheet — kicker, rule, lead paragraph,
 * numbered outcomes — rather than a row of icon pills. Pills made the three
 * facts look like equal buttons; here the paragraph leads and the facts sit
 * on one quiet line.
 */
function ModuleOrientation({ modul }: { modul: ModuleContent }) {
  if (!modul.ringkasan && !modul.tujuan?.length) return null;

  return (
    <Card
      id="tujuan"
      className="scroll-mt-24 gap-0 overflow-hidden rounded-card border-0 bg-panel py-0 shadow-[var(--appnext-shadow-ambient)]"
    >
      <CardContent className="flex flex-col py-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h2 className="font-medium text-sm text-txt">Tujuan pembelajaran</h2>
          <dl className="flex items-center gap-3 text-xs text-dim">
            {modul.estimasiMenit ? (
              <div className="flex items-baseline gap-1.5">
                <dt className="sr-only">Estimasi waktu</dt>
                <dd className="tabular font-medium text-txt">
                  {modul.estimasiMenit} menit
                </dd>
              </div>
            ) : null}
            {modul.estimasiMenit ? (
              <span aria-hidden className="h-3 w-px bg-line" />
            ) : null}
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Jumlah soal kuis</dt>
              <dd className="tabular font-medium text-txt">
                {modul.kuis.length} soal kuis
              </dd>
            </div>
          </dl>
        </div>

        <div aria-hidden className="mt-3 h-px bg-line" />

        {modul.ringkasan ? (
          <p className="mt-4 max-w-prose text-lg text-txt leading-relaxed">
            {modul.ringkasan}
          </p>
        ) : null}

        {modul.tujuan?.length ? (
          <div className="mt-5 border-line border-t pt-4">
            <p className="font-medium text-[11px] text-dim">
              Setelah modul ini
            </p>
            <ol className="mt-2 grid list-none gap-x-8 p-0 sm:grid-cols-2">
              {modul.tujuan.map((item, i) => (
                <li
                  key={item}
                  className="flex gap-3 border-line border-t py-3 first:border-t-0 sm:[&:nth-child(-n+2)]:border-t-0"
                >
                  <span className="tabular pt-0.5 font-medium text-[11px] text-brand-ink">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Recap shown after the reporting steps: the few rules worth memorising. */
function KeyPoints({ modul }: { modul: ModuleContent }) {
  if (!modul.poinKunci?.length) return null;

  return (
    <Card
      id="poin-kunci"
      className="scroll-mt-24 gap-0 rounded-card border border-brand-line bg-brand-soft/40 py-0 shadow-[var(--appnext-shadow-ambient)]"
    >
      <CardContent className="py-5">
        <p className="font-medium text-[11px] text-dim">Ringkasan</p>
        <h2 className="mt-1 font-medium text-xl text-txt">Poin kunci</h2>
        <p className="mt-1 text-dim text-sm">
          Kalau hanya satu bagian yang kamu ingat, ingat ini.
        </p>
        <ul className="mt-3 flex list-none flex-col gap-2.5 p-0">
          {modul.poinKunci.map((item) => (
            <li key={item} className="flex gap-3">
              <span
                aria-hidden
                className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-strong"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * The full module body (§5): anatomy 1–5, an anonymised example with the
 * dangerous parts marked, a red-flag checklist, a 3–5 question quiz, then
 * ordered reporting steps. The example renders in the frame its course
 * declares (`contohJenis`) — message, link, site or call — because not every
 * scam arrives as a message. Layout follows the reference dashboard: a main
 * column of rounded cards plus a sticky curriculum card on the right.
 * The quiz gates completion — the button only unlocks after a pass.
 */
export function ModulBody({ modul }: { modul: ModuleContent }) {
  const [passed, setPassed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const { update, authenticated } = useAccountProgress();
  const toc = tocFor(modul);

  // A pass unlocks completion; the questions that were missed are recorded
  // honestly so the review surface (and Stream C later, §11.4) has real data
  // instead of a fabricated "adaptive" claim.
  function handleQuizDone(
    _score: number,
    _total: number,
    _missed: string[],
    latest: Record<string, string>,
  ) {
    setPassed(true);
    setAnswers(latest);
  }
  async function saveAttempt(latest: Record<string, string>) {
    setAnswers(latest);
    if (!authenticated) return;
    try {
      const result = await submitQuiz({
        moduleNo: modul.no,
        answers: latest,
        complete: false,
      });
      if (result.ok) {
        update(result.progress);
        setSaveError(null);
      } else setSaveError(result.error);
    } catch {
      setSaveError("Progres kuis belum tersimpan. Coba lagi.");
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="flex min-w-0 flex-col gap-5">
        <ModuleOrientation modul={modul} />

        <LessonSection
          id="anatomi"
          index={1}
          title="Bagaimana penipuan ini bekerja"
          lede={`${modul.anatomi.length} langkah, selalu dengan urutan yang sama. Kenali langkah awalnya, dan rantai berikutnya tidak akan pernah terjadi.`}
        >
          <ol className="appnext-path flex list-none flex-col gap-6 p-0">
            {modul.anatomi.map((step, i) => (
              <li key={step.judul} className="flex gap-4 pl-0">
                <span
                  aria-hidden
                  className="appnext-step-dot relative z-10 bg-brand-strong"
                >
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
          index={2}
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
          index={3}
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
          index={4}
          title="Uji pemahamanmu"
          lede="Pilih apa yang kamu lakukan sekarang — bukan definisi. Lulus di 60% untuk menyelesaikan modul."
        >
          <Quiz
            questions={modul.kuis}
            onDone={handleQuizDone}
            onAttempt={(latest) => void saveAttempt(latest)}
          />
          {saveError && (
            <Alert>
              <AlertDescription>
                {saveError}
                <Button
                  variant="outline"
                  className="mt-2 min-h-11"
                  onClick={() => void saveAttempt(answers)}
                >
                  Coba simpan lagi
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </LessonSection>

        <LessonSection
          id="lapor"
          index={5}
          title="Kalau ini sudah terlanjur terjadi"
          lede="Urutan ini penting — jangan dibalik."
        >
          <ol className="flex list-none flex-col gap-3.5 p-0">
            {modul.lapor.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="appnext-step-dot tabular bg-brand-strong">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </LessonSection>

        <KeyPoints modul={modul} />

        {passed ? (
          <CompleteButton moduleNo={modul.no} answers={answers} />
        ) : (
          <Card className="gap-0 rounded-card border border-line py-0 shadow-[var(--appnext-shadow-soft)]">
            <CardContent className="py-4 text-dim">
              Selesaikan kuis dengan skor minimal 60% untuk menandai modul ini
              selesai dan membuka lencana.
            </CardContent>
          </Card>
        )}

        <CourseSimulationCta
          moduleNo={modul.no}
          scenarioId={modul.scenarioId}
        />
      </div>

      <aside className="appnext-toc hidden lg:block" aria-label="Isi modul">
        <Card className="gap-0 rounded-card border border-line py-0 shadow-[var(--appnext-shadow-ambient)]">
          <CardContent className="py-3">
            <p className="px-2 pt-1 font-medium text-[11px] text-dim">
              Isi modul
            </p>
            <ul className="mt-2 flex list-none flex-col p-0">
              {toc.map(({ id, label }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    data-pressable
                    className="appnext-toc-link group"
                  >
                    <span
                      aria-hidden
                      className="h-px w-3 shrink-0 bg-line transition-colors group-hover:bg-brand"
                    />
                    <span className="flex-1">{label}</span>
                    {id === "kuis" && passed ? (
                      <CheckCircle2
                        aria-hidden
                        className="size-4 shrink-0 text-brand-ink"
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
