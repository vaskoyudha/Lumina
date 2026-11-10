import type { Risk } from "@/lib/contracts/score";
import { labelSinyal } from "@/lib/loker/audit/sentinel";
import type { LokerSentinelStatus, LokerView } from "@/lib/loker/types";

/**
 * Lumina's own recommendation, computed from the two verdicts.
 *
 * This is deliberately not a model output and not a new score: it is a readable
 * summary of what the Sentinel audit and `scoreText()` already found. The
 * companion may repeat it, never change it.
 */
export type Rekomendasi = "aman" | "waspada" | "hindari";

export const REKOMENDASI_LABEL: Record<Rekomendasi, string> = {
  aman: "Aman dilamar",
  waspada: "Periksa dulu",
  hindari: "Sebaiknya hindari",
};

/** Only these two risk levels are a caution; `rendah` is not a flag. */
function waspada(risk: Risk): boolean {
  return risk === "mencurigakan" || risk === "tinggi";
}

/**
 * The caution wins, the same rule the "hide flagged" filter uses.
 *
 * `hindari` needs an explicit rejection or the highest risk; a single
 * suspicion is enough for `waspada`.
 */
export function rekomendasiDari(
  sentinel: LokerSentinelStatus,
  risk: Risk,
): Rekomendasi {
  if (sentinel === "rejected" || risk === "tinggi") return "hindari";
  if (sentinel === "suspicious" || waspada(risk)) return "waspada";
  return "aman";
}

export function rekomendasiUntuk(
  posting: Pick<LokerView, "sentinelStatus" | "luminaRisk">,
): Rekomendasi {
  return rekomendasiDari(posting.sentinelStatus, posting.luminaRisk);
}

/**
 * Why this recommendation, using only stored evidence.
 *
 * Never a quote from the posting: Sentinel flags and Lumina signal labels are
 * labels the engines produced, and domain age / missing email are facts the
 * scan recorded. An empty list becomes one honest sentence instead of a blank
 * badge.
 */
export function alasanRekomendasi(
  posting: Pick<
    LokerView,
    | "sentinelStatus"
    | "sentinelFlags"
    | "luminaRisk"
    | "luminaSignals"
    | "domainAgeDays"
    | "companyEmail"
  >,
): string[] {
  const level = rekomendasiUntuk(posting);

  /*
   * A signal with a positive weight can still be informational — the score
   * engine records "the apply link is not on the official-domain list" without
   * raising the risk level. Listing it under "Aman dilamar" reads like a
   * contradiction, so the safe verdict gets one positive sentence and no
   * evidence list.
   */
  if (level === "aman") {
    return ["Kedua penilaian tidak menemukan tanda penipuan."];
  }

  const alasan: string[] = [];

  for (const flag of posting.sentinelFlags.slice(0, 2)) {
    alasan.push(labelSinyal(flag));
  }
  for (const signal of posting.luminaSignals) {
    if (alasan.length >= 3) break;
    if (signal.weight > 0) alasan.push(signal.label);
  }
  if (posting.domainAgeDays !== null && posting.domainAgeDays < 90) {
    alasan.push(`Domain lamaran baru berumur ${posting.domainAgeDays} hari`);
  }

  if (alasan.length > 0) return alasan.slice(0, 3);

  if (level === "hindari")
    return ["Salah satu penilaian menolak lowongan ini."];
  return ["Salah satu penilaian meminta kehati-hatian."];
}

/** One sentence from the evidence list, with exactly one trailing period. */
export function kalimatAlasan(alasan: readonly string[]): string {
  const body = alasan
    .map((item) => item.trim().replace(/[.!?]+$/, ""))
    .join("; ");
  return `${body}.`;
}

export interface RingkasanRekomendasi {
  jumlah: number;
  aman: number;
  waspada: number;
  hindari: number;
}

/** Counts for the tool header, the summary payload, and the offline copy. */
export function ringkasRekomendasi(
  postings: readonly Pick<LokerView, "sentinelStatus" | "luminaRisk">[],
): RingkasanRekomendasi {
  const ringkasan: RingkasanRekomendasi = {
    jumlah: postings.length,
    aman: 0,
    waspada: 0,
    hindari: 0,
  };
  for (const posting of postings) {
    ringkasan[rekomendasiUntuk(posting)] += 1;
  }
  return ringkasan;
}

/**
 * The sentence used when the model is offline or unconfigured.
 *
 * The recommendation must survive an unavailable model, so this copy states
 * the counts the engine actually produced.
 */
export function kalimatRekomendasi(ringkasan: RingkasanRekomendasi): string {
  if (ringkasan.jumlah === 0) {
    return "Tidak ada lowongan yang cocok dengan saringan itu.";
  }
  if (ringkasan.waspada === 0 && ringkasan.hindari === 0) {
    return `${ringkasan.jumlah} lowongan cocok dengan saringan itu dan semuanya aman dilamar.`;
  }
  return `${ringkasan.jumlah} lowongan cocok: ${ringkasan.aman} aman dilamar, ${ringkasan.waspada} perlu diperiksa, ${ringkasan.hindari} sebaiknya dihindari. Buka kartu untuk melihat alasannya.`;
}
