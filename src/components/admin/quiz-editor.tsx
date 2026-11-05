"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuizQuestion } from "@/data/modul-schema";

/**
 * Quiz editor — plan Task 2.3, the part that is easy to get silently wrong.
 *
 * `correctId` must point at an option that exists. Deleting the answer option
 * clears the answer and says so, instead of quietly retargeting it at a
 * neighbour; an orphan `correctId` would make the quiz unpassable while still
 * typechecking.
 */

const LETTERS = ["a", "b", "c", "d", "e"] as const;

function relabel(options: QuizQuestion["options"]) {
  return options.map((o, i) => ({ ...o, id: LETTERS[i] ?? `o${i + 1}` }));
}

export function QuizEditor({
  items,
  onChange,
}: {
  items: QuizQuestion[];
  onChange: (next: QuizQuestion[]) => void;
}) {
  function replace(index: number, patch: Partial<QuizQuestion>) {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function addOption(qIndex: number) {
    const q = items[qIndex];
    if (q.options.length >= 5) return;
    replace(qIndex, {
      options: relabel([...q.options, { id: "", label: "" }]),
    });
  }

  function removeOption(qIndex: number, oIndex: number) {
    const q = items[qIndex];
    if (q.options.length <= 2) return;
    const removed = q.options[oIndex];
    const answer = q.options.find((o) => o.id === q.correctId);
    const survivors = q.options.filter((_, i) => i !== oIndex);
    const options = relabel(survivors);
    // Deleting the answer clears it. Otherwise the answer follows its option
    // through the relabel — an id that simply stayed put could end up pointing
    // at a different label.
    const correctId =
      answer && removed?.id !== answer.id
        ? (options[survivors.indexOf(answer)]?.id ?? "")
        : "";
    replace(qIndex, { options, correctId });
  }

  const broken = items.map((q) => q.correctId === "");

  return (
    <div className="flex flex-col gap-5">
      {items.map((q, qIndex) => (
        <div key={q.id} className="rounded-[18px] border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="appnext-caption">Soal {qIndex + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={items.length <= 3}
              onClick={() => onChange(items.filter((_, i) => i !== qIndex))}
            >
              <Trash2 aria-hidden />
              Hapus soal
            </Button>
          </div>

          <Field className="mt-2">
            <FieldLabel htmlFor={`kuis-prompt-${qIndex}`}>
              Pertanyaan
            </FieldLabel>
            <Textarea
              id={`kuis-prompt-${qIndex}`}
              value={q.prompt}
              onChange={(e) => replace(qIndex, { prompt: e.target.value })}
              rows={2}
            />
          </Field>

          <fieldset className="mt-4 rounded-[16px] border border-line p-3">
            <legend className="px-1 text-dim text-sm">Opsi jawaban</legend>
            <ul className="flex list-none flex-col gap-2 p-0">
              {q.options.map((option, oIndex) => {
                const isCorrect = option.id === q.correctId;
                return (
                  <li
                    key={`${q.id}-${option.id}`}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center"
                  >
                    <Input
                      value={option.label}
                      onChange={(e) => {
                        const options = [...q.options];
                        options[oIndex] = { ...option, label: e.target.value };
                        replace(qIndex, { options });
                      }}
                      aria-label={`Opsi ${LETTERS[oIndex] ?? oIndex + 1} untuk soal ${qIndex + 1}`}
                      className="min-w-0 flex-1"
                    />
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        size="xs"
                        variant={isCorrect ? "default" : "outline"}
                        aria-pressed={isCorrect}
                        onClick={() =>
                          replace(qIndex, { correctId: option.id })
                        }
                      >
                        <Check aria-hidden />
                        {isCorrect ? "Jawaban benar" : "Jadikan benar"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={q.options.length <= 2}
                        onClick={() => removeOption(qIndex, oIndex)}
                        aria-label={`Hapus opsi ${LETTERS[oIndex] ?? oIndex + 1} soal ${qIndex + 1}`}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={q.options.length >= 5}
                onClick={() => addOption(qIndex)}
              >
                <Plus aria-hidden />
                Tambah opsi
              </Button>
            </div>
          </fieldset>

          {broken[qIndex] ? (
            <Alert variant="destructive" className="mt-3">
              <AlertTitle>Belum ada jawaban benar</AlertTitle>
              <AlertDescription>
                Pilih satu opsi sebagai jawaban benar sebelum course ini bisa
                diekspor.
              </AlertDescription>
            </Alert>
          ) : null}

          <Field className="mt-4">
            <FieldLabel htmlFor={`kuis-alasan-${qIndex}`}>
              Kenapa jawaban salah itu salah
            </FieldLabel>
            <FieldDescription>
              Muncul langsung setelah menjawab. Kalimat perintah, bukan ceramah.
            </FieldDescription>
            <Textarea
              id={`kuis-alasan-${qIndex}`}
              value={q.rationale}
              onChange={(e) => replace(qIndex, { rationale: e.target.value })}
              rows={2}
            />
          </Field>
        </div>
      ))}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={items.length >= 6}
          onClick={() =>
            onChange([
              ...items,
              {
                id: `q${items.length + 1}`,
                prompt: "",
                options: [
                  { id: "a", label: "" },
                  { id: "b", label: "" },
                ],
                correctId: "",
                rationale: "",
              },
            ])
          }
        >
          <Plus aria-hidden />
          Tambah soal
        </Button>
      </div>
    </div>
  );
}
