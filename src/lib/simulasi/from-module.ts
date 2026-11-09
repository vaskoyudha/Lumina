import type { ModuleContent } from "@/data/modul-schema";
import { type SimulationContent, SimulationSchema } from "@/lib/content/schema";
import type { ScenarioNode } from "@/lib/simulasi/types";

type PracticeModule = {
  metadata: { no: number; nama: string; level: number };
  content: ModuleContent | null;
};

function debriefLines(
  content: ModuleContent,
): [string, string, string, string] {
  return [
    content.poinKunci?.[0] ?? content.checklist[0],
    content.poinKunci?.[1] ?? content.checklist[1],
    content.poinKunci?.[2] ?? content.lapor[0],
    content.poinKunci?.[3] ?? content.lapor[1],
  ];
}

/**
 * A short decision drill built from the course itself. Modules without a full
 * branching mission still get a direct practice path: the scam example opens
 * the scene, then the course quiz becomes the decision chain. One risky answer
 * ends the drill so the learner reads the rationale instead of guessing on.
 *
 * This is deliberately not written into `simulation_scenarios`: it is a course
 * exercise, not a Level mission, and its result is not recorded as a mission.
 */
export function buildPracticeSimulation(
  module: PracticeModule,
): SimulationContent {
  const { metadata, content } = module;
  if (!content) throw new Error(`Modul ${metadata.no} belum punya isi`);

  const questions = content.kuis.slice(0, 3);
  const safeEnding = "akhir-aman";
  const riskyEnding = "akhir-berisiko";
  const debrief = debriefLines(content);
  const example = content.contohIsi.map((segment) => segment.text).join("");

  const nodes: ScenarioNode[] = [
    {
      id: "mulai",
      chapter: 1,
      type: "message",
      speaker: content.contohSumber?.trim() || "Pesan latihan",
      text: example,
      next: "tanya-1",
    },
  ];

  questions.forEach((question, index) => {
    const nextSafe =
      index === questions.length - 1 ? safeEnding : `tanya-${index + 2}`;
    nodes.push({
      id: `tanya-${index + 1}`,
      chapter: (index + 1) as 1 | 2 | 3,
      type: "choice",
      prompt: question.prompt,
      choices: question.options.map((option) => {
        const correct = option.id === question.correctId;
        return {
          label: option.label,
          verdict: correct ? ("benar" as const) : ("salah" as const),
          rationale: question.rationale,
          next: correct ? nextSafe : riskyEnding,
        };
      }),
    });
  });

  nodes.push(
    {
      id: safeEnding,
      chapter: 3,
      type: "ending",
      variant: "success",
      title: "Kamu memilih langkah aman",
      text: "Semua keputusanmu mengikuti pola aman dari modul ini.",
      debrief,
    },
    {
      id: riskyEnding,
      chapter: 3,
      type: "ending",
      variant: "recovery",
      title: "Ada langkah berisiko",
      text: "Latihan berhenti karena satu keputusan membuka celah. Baca alasannya, lalu coba lagi.",
      debrief,
    },
  );

  return SimulationSchema.parse({
    moduleNo: metadata.no,
    scenario: {
      scenario: {
        id: `pola-${metadata.no}`,
        level: metadata.level,
        title: `Latihan: ${metadata.nama}`,
        difficulty: "mudah",
      },
      hud: {
        panic: {
          start: 25,
          max: 100,
          fail_at: 100,
          fail_message: "Tekanan membuat keputusan berisiko.",
        },
        intrusion: {
          start: 0,
          max: 100,
          rate_per_second: 0.2,
          fail_message: "Akses asing meningkat.",
        },
      },
      tools: [],
      start: "mulai",
      nodes,
      scoring: { grades: [{ min: 0, label: "Selesai" }] },
    },
    mission: {
      title: `Latihan: ${metadata.nama}`,
      role: "Kamu sedang berlatih mengenali pola ini.",
      context:
        content.ringkasan ??
        content.anatomi[0]?.teks ??
        "Latihan singkat dari modul ini.",
      objective:
        content.tujuan?.[0] ?? "Ambil keputusan aman di setiap langkah.",
      duration: "2–3 menit",
      contact: content.contohSumber?.trim() || "Pesan latihan",
      contactDetail: "Contoh fiktif dari modul ini",
      chapters: content.anatomi.slice(0, 3).map((step) => step.judul),
    },
    tactics: [],
    permissions: [
      {
        id: "akses",
        label: "Izin yang diminta aplikasi",
        detail: "Contoh izin berbahaya; tidak ada perangkat yang diubah.",
      },
    ],
    reportArtifacts: [
      {
        id: "pesan",
        label: "Tangkapan layar percobaan",
        safe: true,
      },
    ],
    chapterNotes: content.anatomi.slice(0, 3).map((step) => step.teks),
    summary: content.poinKunci ?? content.checklist.slice(0, 3),
    tips: content.lapor.slice(0, 3),
  });
}
