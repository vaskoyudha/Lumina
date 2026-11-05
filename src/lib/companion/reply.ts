import type { ScoreResult } from "@/lib/contracts/score";
import { modusFor } from "@/lib/modus";

/**
 * Companion replies — template based, no LLM, no network.
 *
 * The plan calls the LLM "the voice, not the judge" (§3). This module is that
 * voice in its cheapest form: sentences chosen from the deterministic
 * `ScoreResult`, never a score invented here.
 *
 * Because nothing leaves the device, the privacy promise in §11.7 holds
 * exactly. Upgrading to a model later means replacing this one function.
 */

const GREETING = /^(halo|hai|hi|hello|selamat\s+(pagi|siang|malam|sore))\b/i;

const SMALL_TALK = /^(apa kabar|terima\s+kasih|makasih|thanks|ok|oke)\b/i;

export interface ReplyContext {
  /** True when this is the first user turn. */
  first: boolean;
  /** Did the message look like it contained something to check? */
  containsContent: boolean;
}

function opening(): string {
  return "Halo. Tempel pesan, tautan, atau ceritakan telepon yang kamu terima. Saya akan tunjukkan kalimat mana yang berbahaya dan apa yang sebaiknya kamu lakukan.";
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/** Does this look like a greeting rather than something to analyse? */
export function isGreeting(text: string): boolean {
  const t = normalize(text);
  return (GREETING.test(t) || SMALL_TALK.test(t)) && t.length < 40;
}

export function composeReply(
  text: string,
  result: ScoreResult | null,
  context: ReplyContext,
): string {
  if (isGreeting(text)) {
    return context.first
      ? opening()
      : "Siap. Kalau ada pesan lain yang mencurigakan, tempel saja.";
  }

  if (!result) {
    return context.first
      ? opening()
      : "Ceritakan atau tempel isinya, lalu saya periksa.";
  }

  if (!context.containsContent) {
    return "Saya belum menemukan apa pun di situ. Coba tempel isi pesannya, atau kirim tautannya.";
  }

  if (result.risk === "bersih" || result.risk === "rendah") {
    return "Sejauh yang bisa saya periksa, tidak ada pola penipuan yang jelas di situ. Tetap hati-hati kalau ada permintaan uang, kode OTP, atau tautan untuk login.";
  }

  const modus = modusFor(result.relatedModule);
  const lead =
    result.risk === "tinggi"
      ? "Ini berbahaya. Jangan bertindak dulu sebelum membaca alasannya."
      : "Ini mencurigakan. Belum tentu penipuan, tapi ada beberapa tanda yang perlu kamu periksa.";

  // Name the strongest finding in plain language: the single most useful
  // sentence for someone deciding what to do next.
  const top = result.signals.find((signal) => signal.weight > 0);
  const finding = top
    ? `Yang paling menonjol: ${top.label.charAt(0).toLowerCase()}${top.label.slice(1)}.`
    : "";

  const modusLine = modus
    ? ` Polanya paling mirip dengan ${modus.nama.toLowerCase()}.`
    : "";

  const next =
    result.risk === "tinggi"
      ? " Kalau uang sudah terkirim atau kode OTP sudah kamu berikan, berhenti di sini dan buka mode darurat."
      : " Kalau mau, saya bisa jelaskan polanya lebih jauh lewat modul yang terkait.";

  return `${lead} ${finding}${modusLine}${next}`.replace(/\s+/g, " ").trim();
}

/** Suggested next actions, rendered as buttons under the reply. */
export function suggestedActions(result: ScoreResult | null) {
  if (!result) return [];
  const actions: { label: string; href: string }[] = [];

  if (result.relatedModule !== null) {
    actions.push({
      label: "Pelajari pola ini",
      href: `/belajar/${result.relatedModule}`,
    });
  }
  if (result.risk === "tinggi") {
    actions.push({ label: "Ini sedang terjadi", href: "/darurat" });
  }
  const modus = modusFor(result.relatedModule);
  if (modus?.scenarioId) {
    actions.push({
      label: "Coba simulasi",
      href: `/simulasi/${modus.scenarioId}`,
    });
  }
  return actions;
}
