"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Repeatable editors for the linear parts of a course (plan Task 2.2). Every
 * list is editable, reorderable and removable — a course is content, not a
 * form with fixed holes.
 */

function RowControls({
  onUp,
  onDown,
  onRemove,
  removeLabel,
  disableUp,
  disableDown,
}: {
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  removeLabel: string;
  disableUp: boolean;
  disableDown: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onUp}
        disabled={disableUp}
        aria-label="Naikkan"
      >
        <ArrowUp aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onDown}
        disabled={disableDown}
        aria-label="Turunkan"
      >
        <ArrowDown aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        aria-label={removeLabel}
      >
        <Trash2 aria-hidden />
      </Button>
    </div>
  );
}

export function StringListEditor({
  id,
  label,
  description,
  items,
  onChange,
  addLabel,
  max = 8,
}: {
  id: string;
  label: string;
  description: string;
  items: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  max?: number;
}) {
  function replace(index: number, value: string) {
    const next = [...items];
    next[index] = value;
    onChange(next);
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      <ul className="mt-2 flex list-none flex-col gap-2 p-0">
        {items.map((item, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: items are positional strings
          <li key={`${id}-${index}`} className="flex items-start gap-2">
            <Textarea
              id={index === 0 ? id : `${id}-${index}`}
              value={item}
              onChange={(e) => replace(index, e.target.value)}
              rows={1}
              className="min-h-9"
              aria-label={`${label} ${index + 1}`}
            />
            <RowControls
              onUp={() => move(index, -1)}
              onDown={() => move(index, 1)}
              onRemove={() => onChange(items.filter((_, i) => i !== index))}
              removeLabel={`Hapus ${label} ${index + 1}`}
              disableUp={index === 0}
              disableDown={index === items.length - 1}
            />
          </li>
        ))}
      </ul>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={items.length >= max}
          onClick={() => onChange([...items, ""])}
        >
          <Plus aria-hidden />
          {addLabel}
        </Button>
      </div>
    </Field>
  );
}

export function AnatomyEditor({
  items,
  onChange,
}: {
  items: { judul: string; teks: string }[];
  onChange: (next: { judul: string; teks: string }[]) => void;
}) {
  function replace(
    index: number,
    patch: Partial<{ judul: string; teks: string }>,
  ) {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((step, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: steps carry no id of their own
          key={`anatomi-${index}`}
          className="rounded-[18px] border border-line p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="appnext-caption">Langkah {index + 1}</p>
            <RowControls
              onUp={() => move(index, -1)}
              onDown={() => move(index, 1)}
              onRemove={() => onChange(items.filter((_, i) => i !== index))}
              removeLabel={`Hapus langkah ${index + 1}`}
              disableUp={index === 0}
              disableDown={index === items.length - 1}
            />
          </div>
          <Field className="mt-2">
            <FieldLabel htmlFor={`anatomi-judul-${index}`}>Judul</FieldLabel>
            <Input
              id={`anatomi-judul-${index}`}
              value={step.judul}
              onChange={(e) => replace(index, { judul: e.target.value })}
            />
          </Field>
          <Field className="mt-3">
            <FieldLabel htmlFor={`anatomi-teks-${index}`}>
              Penjelasan
            </FieldLabel>
            <Textarea
              id={`anatomi-teks-${index}`}
              value={step.teks}
              onChange={(e) => replace(index, { teks: e.target.value })}
              rows={3}
            />
          </Field>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={items.length >= 8}
          onClick={() => onChange([...items, { judul: "", teks: "" }])}
        >
          <Plus aria-hidden />
          Tambah langkah
        </Button>
      </div>
    </div>
  );
}

export function SegmentEditor({
  items,
  onChange,
}: {
  items: { text: string; berbahaya: boolean }[];
  onChange: (next: { text: string; berbahaya: boolean }[]) => void;
}) {
  function replace(
    index: number,
    patch: Partial<{ text: string; berbahaya: boolean }>,
  ) {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((segment, index) => (
        <div
          // Segments carry no id — a position in the example *is* their
          // identity, and reordering is an explicit edit.
          // biome-ignore lint/suspicious/noArrayIndexKey: position is identity
          key={`segmen-${index}`}
          className="flex flex-col gap-2 rounded-[18px] border border-line p-3 sm:flex-row sm:items-start"
        >
          <Textarea
            value={segment.text}
            onChange={(e) => replace(index, { text: e.target.value })}
            rows={2}
            className="min-w-0 flex-1"
            aria-label={`Segmen contoh ${index + 1}`}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={segment.berbahaya ? "default" : "outline"}
              aria-pressed={segment.berbahaya}
              onClick={() => replace(index, { berbahaya: !segment.berbahaya })}
            >
              {segment.berbahaya ? "Ditandai" : "Tandai bahaya"}
            </Button>
            <RowControls
              onUp={() => move(index, -1)}
              onDown={() => move(index, 1)}
              onRemove={() => onChange(items.filter((_, i) => i !== index))}
              removeLabel={`Hapus segmen ${index + 1}`}
              disableUp={index === 0}
              disableDown={index === items.length - 1}
            />
          </div>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, { text: "", berbahaya: false }])}
        >
          <Plus aria-hidden />
          Tambah segmen
        </Button>
      </div>
    </div>
  );
}
