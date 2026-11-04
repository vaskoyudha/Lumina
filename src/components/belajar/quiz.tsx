"use client";

import { cn } from "cn";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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
  onDone: (score: number, total: number, missed: string[]) => void;
}

/**
 * One question at a time ("apa yang kamu lakukan sekarang?"), rationale the
 * moment an answer lands — the same teaching rule the simulation uses (§5-C).
 * Options are Buttons (44px touch floor), never a radio registry entry.
 */
export function Quiz({ questions, onDone }: QuizProps) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [missed, setMissed] = useState<string[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [retries, setRetries] = useState(0);

  const total = questions.length;
  const question = questions[index];
  const isLast = index === total - 1;

  if (finished) {
    return (
      <div className="flex flex-col gap-3">
        <p className="tabular font-medium text-txt">
          {correctCount} benar dari {total} soal
        </p>
        <p className="text-dim text-sm">
          {correctCount / total >= 0.6
            ? "Lulus ambang 60%. Pola ini sudah kamu kenali di bawah tekanan."
            : "Belum mencapai ambang 60%. Baca ulang anatominya, lalu coba lagi."}
        </p>
        {correctCount / total < 0.6 ? (
          <Button
            type="button"
            className="min-h-11 w-fit"
            onClick={() => {
              setIndex(0);
              setPicked(null);
              setMissed([]);
              setCorrectCount(0);
              setFinished(false);
              setRetries((n) => n + 1);
            }}
          >
            Coba lagi
          </Button>
        ) : null}
      </div>
    );
  }

  const locked = picked !== null;
  const wasCorrect = locked && picked === question.correctId;

  function pick(optionId: string) {
    if (locked) return;
    const correct = optionId === question.correctId;
    const newCorrect = correctCount + (correct ? 1 : 0);
    const newMissed = correct ? missed : [...missed, question.id];
    if (correct) setCorrectCount(newCorrect);
    else setMissed(newMissed);
    setPicked(optionId);
    if (correct && !isLast) {
      // Correct advances immediately — no extra "next" click to stall on.
      setIndex((i) => i + 1);
      setPicked(null);
      return;
    }
    if (isLast) {
      setFinished(true);
      if (newCorrect / total >= 0.6) {
        onDone(newCorrect, total, newMissed);
      }
    }
  }

  function next() {
    setIndex((i) => i + 1);
    setPicked(null);
  }

  return (
    <div key={`${retries}-${index}`} className="flex min-w-0 flex-col gap-3">
      <output className="tabular text-dim text-xs">
        Soal {index + 1} dari {total}
      </output>
      <Progress
        value={((index + 1) / total) * 100}
        aria-label="Kemajuan kuis"
      />
      <h3 className="font-medium text-base text-txt">{question.prompt}</h3>
      <div className="flex flex-col gap-2">
        {question.options.map((option) => {
          const isPicked = picked === option.id;
          const isCorrect = option.id === question.correctId;
          return (
            <Button
              key={option.id}
              type="button"
              variant="outline"
              data-pressable
              aria-pressed={isPicked}
              disabled={locked && !isPicked}
              onClick={() => pick(option.id)}
              className={cn(
                "h-auto min-h-11 justify-start whitespace-normal px-3 py-2.5 text-left",
                locked && isCorrect && "border-safe/50 bg-safe/10 text-safe",
                locked &&
                  isPicked &&
                  !isCorrect &&
                  "border-danger/50 bg-danger/10 text-danger",
              )}
            >
              {option.label}
            </Button>
          );
        })}
      </div>

      {locked && !wasCorrect ? (
        <Alert variant="destructive">
          <AlertTitle>Jawaban berbahaya</AlertTitle>
          <AlertDescription>{question.rationale}</AlertDescription>
        </Alert>
      ) : null}

      {locked && !isLast ? (
        <Button type="button" className="min-h-11 w-fit" onClick={next}>
          Soal berikutnya
        </Button>
      ) : null}
    </div>
  );
}
