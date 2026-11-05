import { z } from "zod";
import type { AgentId, ScoreResult, Signal } from "@/lib/contracts/score";

/**
 * AgentTrace — what the pipeline actually did, measured (new contract).
 *
 * This file is additive. `ScoreResult` is frozen (§5); nothing here changes an
 * existing field, so no other stream is broken by importing it.
 *
 * The trace exists to make one claim checkable in the interface: the verdict is
 * deterministic and instant, and only the words wait for a model. Every `ms`
 * below is a real `performance.now()` difference, never a designed delay.
 */

export type StageStatus =
  | "menunggu"
  | "berjalan"
  | "selesai"
  | "temuan"
  | "dilewati"
  | "gagal";

/** `voice` is not a detector, so it does not belong in `AgentId`. */
export type StageId = AgentId | "voice";

export interface AgentStage {
  id: StageId;
  /** "Identity Agent" — printed in the trace row. */
  label: string;
  /** One line: what this stage looks for. Printed as the row's subtitle. */
  task: string;
  status: StageStatus;
  /** Signals this stage owns in the final, de-duplicated result. */
  findings: number;
  /** Measured duration. May legitimately be a fraction of a millisecond. */
  ms: number;
  /** The honest reason when `status` is "dilewati" or "gagal". */
  note?: string;
}

export interface AgentTrace {
  stages: AgentStage[];
  totalMs: number;
}

export const STAGE_LABEL: Record<StageId, { label: string; task: string }> = {
  message: {
    label: "Message Agent",
    task: "Urgensi palsu, otoritas, iming-iming, permintaan OTP",
  },
  link: {
    label: "Link Agent",
    task: "Domain mirip merek resmi, tautan pendek, jalur login palsu",
  },
  identity: {
    label: "Identity Agent",
    task: "Nomor pengirim, klaim institusi, nomor asing",
  },
  conversation: {
    label: "Conversation Agent",
    task: "Vektor yang menumpuk dan tahapan eskalasi",
  },
  evidence: {
    label: "Evidence Agent",
    task: "Menyusun kutipan, nominal, dan kontak untuk laporan",
  },
  scoring: {
    label: "Scoring Orchestrator",
    task: "Menggabungkan temuan jadi 0–100",
  },
  voice: {
    label: "Penyusun bahasa",
    task: "Menulis jawaban dari temuan, tanpa membaca pesanmu",
  },
};

/**
 * The exact payload that leaves the device for the language layer.
 *
 * `Signal.evidence` is a verbatim quote from the user's message, so it has no
 * field here — plan §11.6a ("kirim hanya hasil sinyal") becomes a property of
 * the schema rather than a promise in prose. `.strict()` makes an extra key a
 * rejected request, which is what the route validates against.
 */
export const VoiceDigestSchema = z
  .object({
    risk: z.enum(["bersih", "rendah", "mencurigakan", "tinggi"]),
    score: z.number().int().min(0).max(100),
    modusName: z.string(),
    findings: z.array(
      z
        .object({
          label: z.string(),
          weight: z.number().min(0).max(1),
        })
        .strict(),
    ),
    advice: z.array(z.string()),
    moduleNo: z.number().int().min(1).max(12).nullable(),
    locale: z.literal("id"),
  })
  .strict();

export type VoiceDigest = z.infer<typeof VoiceDigestSchema>;

/** Build the outbound payload. Deliberately lossy: `evidence` is dropped. */
export function voiceDigest(
  result: ScoreResult,
  modusName: string,
): VoiceDigest {
  return {
    risk: result.risk,
    score: result.score,
    modusName,
    findings: result.signals
      .filter((signal: Signal) => signal.weight > 0)
      .map((signal) => ({ label: signal.label, weight: signal.weight })),
    advice: result.advice,
    moduleNo: result.relatedModule,
    locale: "id",
  };
}
