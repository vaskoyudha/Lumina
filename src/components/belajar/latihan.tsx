"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccountProgress } from "@/components/belajar/belajar-progress";
import { Quiz } from "@/components/belajar/quiz";
import { Button } from "@/components/ui/button";
import type { ModuleContent } from "@/data/modul-schema";
import { submitReview } from "@/lib/learning/actions";
import { type PracticeQuestion, selectPractice } from "@/lib/learning/practice";
export function Latihan({
  modules,
  patternId,
}: {
  modules: ModuleContent[];
  patternId?: string;
}) {
  const { progress, authenticated, update } = useAccountProgress();
  const [round, setRound] = useState<PracticeQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<unknown>(null);
  useEffect(() => {
    if (progress)
      setRound(
        (previous) =>
          previous ?? selectPractice(progress, modules, new Date(), patternId),
      );
  }, [progress, modules, patternId]);
  const question = round?.[index];
  async function save(input: unknown) {
    setPending(true);
    setError(null);
    try {
      const result = await submitReview(input);
      if (result.ok) {
        update(result.progress);
        setResults((prev) => [...prev.slice(0, index), result.correct]);
      } else setError(result.error);
    } catch {
      setError("Latihan belum tersimpan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }
  if (!round) return <output>Memuat latihan…</output>;
  if (!authenticated)
    return (
      <div>
        <p>Masuk untuk membuka latihan dan menyimpan jadwal review di akun.</p>
        <Button asChild className="mt-3 min-h-11">
          <Link href="/masuk">Masuk</Link>
        </Button>
      </div>
    );
  if (!round.length)
    return (
      <div>
        <p>Tidak ada latihan yang tertunda untuk pilihan ini.</p>
        <Button asChild variant="outline" className="mt-3 min-h-11">
          <Link href="/belajar">Buka materi Belajar</Link>
        </Button>
      </div>
    );
  if (!question)
    return (
      <output>
        <p>
          {results.filter(Boolean).length} benar,{" "}
          {results.filter((r) => !r).length} perlu diulang.
        </p>
        <p className="mt-2">
          Progres dan jadwal berikutnya sudah tersimpan di akun.
        </p>
        <Button asChild className="mt-3 min-h-11">
          <Link href="/belajar">Lihat langkah berikutnya</Link>
        </Button>
      </output>
    );
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <p>
        Latihan {index + 1} dari {round.length}
      </p>
      <Quiz
        key={`${question.id}-${index}`}
        questions={[question]}
        onDone={() => {}}
        onAttempt={(answers) => {
          const input = {
            attemptId: crypto.randomUUID(),
            moduleNo: question.moduleNo,
            questionId: question.id,
            answer: answers[question.id],
          };
          setSubmission(input);
          void save(input);
        }}
      />
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Button
            className="min-h-11"
            variant="outline"
            disabled={pending}
            onClick={() => void save(submission)}
          >
            Coba simpan lagi
          </Button>
        </div>
      )}
      <Button
        className="min-h-11 w-fit"
        disabled={pending || results.length <= index}
        onClick={() => {
          setIndex((i) => i + 1);
          setSubmission(null);
        }}
      >
        {pending
          ? "Menyimpan…"
          : index === round.length - 1
            ? "Lihat hasil latihan"
            : "Soal berikutnya"}
      </Button>
      <Link
        className="appnext-link inline-flex min-h-11 items-center"
        href="/belajar"
      >
        Kembali ke Belajar
      </Link>
    </section>
  );
}
