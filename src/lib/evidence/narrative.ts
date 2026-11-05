import type { Artifact } from "@/lib/contracts/evidence";
import { isRisky, type ScoreResult } from "@/lib/contracts/score";
import { MODUS_BY_ID } from "@/lib/modus";

/**
 * Narrative assembly — template grammar, no model.
 *
 * Source: the report-writing pattern in `notes/04-agentic-audit.md` §9.4: every
 * sentence slot is filled from data already on the bundle, so the prose can
 * never claim more than the engine found. Target is 2–4 sentences (the
 * contract in `contracts/evidence.ts`), always Indonesian, always past tense
 * about the message and imperative about the next step.
 */

function phrase(label: string): string {
  const [head] = label.split(" — ");
  return (head ?? label).trim().replace(/[.!?]+$/, "");
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function verdictSentence(result: ScoreResult): string {
  switch (result.risk) {
    case "bersih":
      return "Tidak ada pola penipuan yang dikenali pada pesan ini.";
    case "rendah":
      return `Pesan ini menunjukkan risiko rendah (skor ${result.score}/100).`;
    case "mencurigakan":
      return `Pesan ini mencurigakan (skor ${result.score}/100).`;
    case "tinggi":
      return `Pesan ini berisiko tinggi (skor ${result.score}/100).`;
  }
}

function actionSentence(result: ScoreResult): string {
  if (result.risk === "tinggi") {
    return "Simpan catatan ini dan hubungi bank atau kanal resmi sebelum melakukan transfer.";
  }
  return "Verifikasi lewat kanal resmi yang kamu ketik sendiri sebelum membalas atau membayar.";
}

export function composeNarrative({
  result,
  artifacts,
}: {
  result: ScoreResult;
  artifacts: readonly Artifact[];
}): string {
  const sentences: string[] = [verdictSentence(result)];

  // The modus name is only stated when the engine actually considers the
  // message risky. A keyword hit alone would otherwise label a legitimate
  // Shopee receipt with a fraud family it does not belong to.
  const modus = MODUS_BY_ID.get(result.modus);
  if (isRisky(result.risk) && modus) {
    sentences.push(`Polanya cocok dengan ${modus.nama}.`);
  } else if (isRisky(result.risk)) {
    sentences.push(
      "Pola spesifiknya belum dikenali sistem, jadi perlakukan ini sebagai peringatan umum.",
    );
  }

  const findings = result.signals
    .filter((signal) => signal.weight > 0)
    .slice(0, 2)
    .map((signal) => lowerFirst(phrase(signal.label)));

  // Same discipline as the modus line: "temuan utama" is an accusation, so it
  // is only written down when the engine actually considers the message risky.
  // A user's own bank SMS must not come back described as a set of findings.
  if (isRisky(result.risk) && sentences.length < 4 && findings.length > 0) {
    sentences.push(`Temuan utamanya: ${findings.join(" dan ")}.`);
  }

  if (sentences.length < 4 && artifacts.length > 0) {
    const labels = artifacts
      .slice(0, 3)
      .map((artifact) => lowerFirst(artifact.label));
    const rest = artifacts.length - labels.length;
    const tail = rest > 0 ? `, dan ${rest} bukti lain` : "";
    sentences.push(
      `${artifacts.length} bukti tercatat: ${labels.join(", ")}${tail}.`,
    );
  }

  if (sentences.length < 4 && isRisky(result.risk)) {
    sentences.push(actionSentence(result));
  }

  // Honest floor: the companion only reads text. Saying so keeps a clean
  // result from reading as a guarantee about the sender.
  if (sentences.length < 2) {
    sentences.push(
      "Companion hanya memeriksa teks yang kamu tempel, bukan nomor pengirimnya.",
    );
  }

  return sentences.slice(0, 4).join(" ");
}
