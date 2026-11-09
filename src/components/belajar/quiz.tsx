"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctId: string;
  /** Why the chosen answer was wrong — shown instantly, never blocks the flow. */
  rationale: string;
}

interface QuizProps {
  questions: QuizQuestion[];
  /** Called once, only when the learner reaches the pass bar (≥60%). */
  onDone: (
    score: number,
    total: number,
    missed: string[],
    answers: Record<string, string>,
  ) => void;
  onAttempt?: (answers: Record<string, string>) => void;
}

const LETTERS = ["A", "B", "C", "D", "E"] as const;
const PASS_MARK = 0.6;

/**
 * One question at a time ("apa yang kamu lakukan sekarang?"). Picking locks
 * the answer and shows the rationale immediately — the same teaching rule
 * the simulation uses (§5-C) — then the learner advances with an explicit
 * button. AppNext styling: white option rows, green/red state from tokens.
 */
export function Quiz({ questions, onDone, onAttempt }: QuizProps) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<
    { questionId: string; optionId: string; correct: boolean }[]
  >([]);
  const [finished, setFinished] = useState(false);
  const [retries, setRetries] = useState(0);
  // True while the learner re-opens one question from the review list. The
  // answer must return to the summary, not advance through the quiz again.
  const [reviewing, setReviewing] = useState(false);
  const promptRef = useRef<HTMLHeadingElement>(null);

  // Advancing (buttons or review retry) swaps the whole question; keep
  // keyboard/screen-reader users oriented by moving focus to the new prompt.
  // `index` and `finished` are triggers, not reads: the effect must re-run
  // when the question or the screen changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate re-focus
  useEffect(() => {
    promptRef.current?.focus({ preventScroll: true });
  }, [index, finished]);

  const total = questions.length;
  const question = questions[index];
  const isLast = index === total - 1;
  const locked = picked !== null;
  const wasCorrect = locked && picked === question.correctId;
  // Score and misses are derived from attempts, so re-answering a question
  // from the review replaces its record instead of double-counting.
  const correctCount = attempts.filter((a) => a.correct).length;
  const passed = correctCount / total >= PASS_MARK;

  function finish(
    score: number,
    missedList: string[],
    latest: typeof attempts,
  ) {
    const answers = Object.fromEntries(
      latest.map((a) => [a.questionId, a.optionId]),
    );
    onAttempt?.(answers);
    setFinished(true);
    if (score / total >= PASS_MARK) {
      onDone(score, total, missedList, answers);
    }
  }

  function pick(optionId: string) {
    if (locked) return;
    const correct = optionId === question.correctId;
    const newAttempts = [
      ...attempts.filter((a) => a.questionId !== question.id),
      { questionId: question.id, optionId, correct },
    ];
    const newCorrect = newAttempts.filter((a) => a.correct).length;
    const newMissed = newAttempts
      .filter((a) => !a.correct)
      .map((a) => a.questionId);
    setAttempts(newAttempts);
    setPicked(optionId);
    // Last question, or a question re-opened from the review: either way the
    // answer closes the round and returns to the score screen.
    if (isLast || reviewing) finish(newCorrect, newMissed, newAttempts);
  }

  function next() {
    if (isLast) return;
    setIndex((i) => i + 1);
    setPicked(null);
  }

  function retryQuestion(questionId: string) {
    const target = questions.findIndex((q) => q.id === questionId);
    if (target === -1) return;
    // Keep the old attempt until the learner picks again: `pick` replaces
    // it, so leaving without answering does not erase the review entry.
    setFinished(false);
    setReviewing(true);
    setIndex(target);
    setPicked(null);
  }

  function retry() {
    setIndex(0);
    setPicked(null);
    setAttempts([]);
    setFinished(false);
    setReviewing(false);
    setRetries((n) => n + 1);
  }

  if (finished) {
    const wrongAttempts = attempts.filter((a) => !a.correct);
    return (
      <div className="flex flex-col gap-3">
        <p className="tabular font-medium text-lg text-txt">
          {correctCount} benar dari {total} soal
        </p>
        <p>
          {passed
            ? "Lulus ambang 60%. Pola ini sudah kamu kenali. Tandai modul selesai di bawah untuk menyimpan lencana."
            : "Belum mencapai ambang 60%. Baca ulang anatominya di atas, lalu coba lagi."}
        </p>
        {wrongAttempts.length > 0 ? (
          <section aria-labelledby="tinjau-salah">
            <h4
              id="tinjau-salah"
              className="font-medium text-dim text-xs uppercase tracking-wide"
            >
              Tinjau yang kamu lewatkan
            </h4>
            <ul className="mt-2 flex flex-col gap-2.5">
              {wrongAttempts.map((attempt) => {
                const q = questions.find(
                  (item) => item.id === attempt.questionId,
                );
                if (!q) return null;
                const chosen = q.options.find((o) => o.id === attempt.optionId);
                const correct = q.options.find((o) => o.id === q.correctId);
                return (
                  <li key={attempt.questionId}>
                    <Card className="gap-0 rounded-card py-0 shadow-[var(--appnext-shadow-soft)]">
                      <CardContent className="flex flex-col gap-1.5 py-4">
                        <p className="font-medium text-txt">{q.prompt}</p>
                        <p className="text-dim text-sm">
                          Jawabanmu:{" "}
                          <span className="text-[color:var(--appnext-danger-deep)]">
                            {chosen?.label}
                          </span>
                        </p>
                        <p className="text-dim text-sm">
                          Yang aman:{" "}
                          <span className="text-brand-ink">
                            {correct?.label}
                          </span>
                        </p>
                        <p className="mt-1 text-sm">{q.rationale}</p>
                        <Button
                          type="button"
                          size="sm"
                          className="mt-2 min-h-11 w-fit rounded-full border border-ink-line bg-[var(--appnext-ink-2)] text-bg hover:bg-brand-strong"
                          onClick={() => retryQuestion(q.id)}
                        >
                          Coba soal ini lagi
                        </Button>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
        {!passed ? (
          <Button
            type="button"
            className="min-h-11 w-fit rounded-full border border-ink-line bg-[var(--appnext-ink-2)] text-bg hover:bg-brand-strong"
            onClick={retry}
          >
            Coba lagi
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div key={`${retries}-${index}`} className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center gap-3">
        <output className="tabular shrink-0 text-dim text-sm">
          Soal {index + 1} dari {total}
        </output>
        <Progress
          value={((index + 1) / total) * 100}
          aria-label="Kemajuan kuis"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={index + 1}
          className="h-2.5 flex-1 bg-panel-2 [&>[data-slot=progress-indicator]]:bg-brand"
        />
      </div>

      <h3 ref={promptRef} tabIndex={-1} className="outline-none">
        {question.prompt}
      </h3>

      <div className="flex flex-col gap-2.5">
        {question.options.map((option, i) => {
          const isPicked = picked === option.id;
          const isCorrect = option.id === question.correctId;
          const state = !locked
            ? undefined
            : isCorrect
              ? "correct"
              : isPicked
                ? "wrong"
                : undefined;
          // Options are a single-answer choice, not toggles: once the answer is
          // locked, every option is aria-disabled (not natively disabled) so
          // the correct/your-answer states stay at full contrast, and `pick()`
          // ignores later clicks. State is announced by `data-state` and the
          // Alert below, never by `aria-pressed`.
          return (
            <Button
              key={option.id}
              type="button"
              variant="outline"
              aria-disabled={locked}
              onClick={() => pick(option.id)}
              data-state={state}
              className={cn(
                "h-auto min-h-[52px] w-full justify-start gap-3 rounded-2xl px-4 py-3 text-left text-base font-normal whitespace-normal text-[color:var(--appnext-ink-2)]",
                "aria-disabled:cursor-default",
                "data-[state=correct]:border-brand data-[state=correct]:bg-brand-soft data-[state=correct]:text-brand-ink",
                "data-[state=wrong]:border-[color:var(--appnext-danger)] data-[state=wrong]:bg-[var(--appnext-danger-wash)] data-[state=wrong]:text-[color:var(--appnext-danger-deep)]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-line font-medium text-[13px]",
                  state === "correct" && "border-brand text-brand-ink",
                  state === "wrong" &&
                    "border-[color:var(--appnext-danger)] text-[color:var(--appnext-danger-deep)]",
                )}
              >
                {LETTERS[i]}
              </span>
              <span>{option.label}</span>
            </Button>
          );
        })}
      </div>

      {locked && !wasCorrect ? (
        <Alert
          variant="destructive"
          className="border-danger/40 bg-danger/5 text-[color:var(--appnext-danger-deep)] [&>[data-slot=alert-description]]:text-current/90"
        >
          <TriangleAlert aria-hidden />
          <AlertTitle>Itu langkah yang berbahaya</AlertTitle>
          <AlertDescription>{question.rationale}</AlertDescription>
        </Alert>
      ) : null}

      {locked && wasCorrect && !isLast ? (
        <p className="font-medium text-brand-ink">
          Betul — itu yang menghentikan penipuan sebelum uang bergerak.
        </p>
      ) : null}

      {locked && !isLast ? (
        <Button
          type="button"
          className="min-h-11 w-fit rounded-full bg-brand-strong text-bg hover:bg-[var(--appnext-ink-2)]"
          onClick={next}
        >
          Soal berikutnya
        </Button>
      ) : null}

      {locked && isLast && !finished ? (
        <p className="appnext-caption">
          {wasCorrect
            ? "Soal terakhir selesai."
            : "Soal terakhir selesai — baca alasannya di atas."}
        </p>
      ) : null}
    </div>
  );
}
