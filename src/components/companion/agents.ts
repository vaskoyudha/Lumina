import type { AgentId } from "@/lib/contracts/score";

/**
 * The detectors that actually run; `scoring` aggregates them, it is not one.
 *
 * Typing this subset keeps the distinction checkable — the sidebar can map
 * every detector to an icon without inventing a row for the orchestrator.
 */
export type DetectorAgent = Exclude<AgentId, "scoring">;

/**
 * The agents the evidence panel walks through, in reading order.
 *
 * Shared by both companion surfaces on purpose: the panel is the product's
 * honesty display, and two copies of this list would eventually disagree
 * between the chat and the single-shot page.
 *
 * Order matches the reference graph — Message, Link, Identity, Conversation,
 * Evidence — so the panel reads the same left-to-right story as the design.
 *
 * Identity Agent sits third because it runs on the name and domain a message
 * carries, and on nothing else — SPF/DKIM/DMARC would need mail headers a
 * pasted message never has. It reports no finding rather than inventing one,
 * which is exactly the gap the panel is supposed to show.
 */
export const AGENT_SEQUENCE: DetectorAgent[] = [
  "message",
  "link",
  "identity",
  "conversation",
  "evidence",
];

/**
 * Short names for the overview diagram.
 *
 * These are aliases, not new identities: the canonical `STAGE_LABEL` is printed
 * beside each one and stays the name the evidence panel reports. A one-word
 * name gives the diagram a readable spine without inventing a second taxonomy.
 */
export const AGENT_DISPLAY_NAME: Record<DetectorAgent, string> = {
  message: "Nada",
  link: "Jejak",
  identity: "Sidik",
  conversation: "Alur",
  evidence: "Bukti",
};

/**
 * What each agent actually looks at, in three chips.
 *
 * Every chip names a rule family that exists in the detector — nothing here is
 * decorative copy. If a family is removed from the engine, this label must go
 * with it; that is the point of keeping the list next to the sequence.
 */
export const AGENT_MECHANISM: Record<DetectorAgent, readonly string[]> = {
  message: ["Kata kunci", "Urgensi · otoritas", "OTP · APK"],
  link: ["Ekstraksi URL", "Domain mirip merek", "Penyingkat · TLD"],
  identity: ["Nomor pengirim", "Klaim institusi", "Nomor asing"],
  conversation: ["Riwayat giliran", "Eskalasi bertahap", "Konteks percakapan"],
  evidence: ["Kutipan temuan", "Garis waktu", "Narasi bukti"],
};

/**
 * One sentence of purpose for the agents detail pane.
 *
 * The center diagram deliberately carries no prose; this is the only place the
 * long description lives, so the two surfaces cannot drift into two versions of
 * the same explanation.
 */
export const AGENT_PURPOSE: Record<DetectorAgent, string> = {
  message:
    "Membaca nada pesan: urgensi palsu, klaim otoritas, iming-iming, serta permintaan OTP atau berkas APK.",
  link: "Membongkar setiap tautan: domain mirip merek resmi, penyingkat, TLD berisiko, dan jalur login palsu.",
  identity:
    "Memeriksa identitas pengirim: nomor kontak, klaim institusi, dan nomor asing yang tidak wajar.",
  conversation:
    "Membandingkan pesan dengan giliran sebelumnya untuk menangkap eskalasi yang muncul bertahap.",
  evidence:
    "Merangkum temuan menjadi kutipan, garis waktu, dan narasi singkat yang bisa diperiksa ulang.",
};

/**
 * The orchestrator's own lane, in the same chip grammar as the detectors.
 *
 * `scoring` is not an agent in the trace — it is the deterministic engine that
 * runs the five detectors and folds their findings into one score. Printing the
 * three steps keeps that distinction visible instead of drawing Lumina as a
 * sixth detector.
 */
export const LUMINA_STEPS = [
  "Jalankan agen",
  "Kumpulkan temuan",
  "Hitung skor",
] as const;
