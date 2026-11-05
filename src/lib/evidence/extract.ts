import type { Artifact } from "@/lib/contracts/evidence";
import { classifyLink, extractLinks } from "@/lib/scoring/link";

/**
 * Artifact extraction — the part of the EvidenceBundle that outlives the chat.
 *
 * Design source: the IOC-extraction discipline surveyed in
 * `lumina-references/notes/04-agentic-audit.md` (§9.2): extract what a bank
 * clerk can act on (an account number, a phone number, an amount, a link),
 * keep the value exactly as the victim saw it, and never *infer* a value the
 * message did not contain.
 *
 * Deliberate omissions, with reasons:
 *   a. OTP codes are NOT extracted. A live OTP is a credential, and this
 *      bundle is meant to leave the device (PDF → bank). The timeline still
 *      records that an OTP was requested; the code itself is not evidence a
 *      bank can use, and copying it is the one artifact that can hurt the
 *      victim twice.
 *   b. No e-wallet handle guessing: Indonesian e-wallets are keyed by phone
 *      number, which the phone extractor already covers.
 */

export interface ExtractedText {
  /** One user message. */
  text: string;
  /** ISO 8601; when absent the caller's clock is used once, upstream. */
  at: string;
}

const REKENING = /\b\d{10,16}\b/g;
const PHONE = /(?:\+62|62|0)8[1-9](?:[\s-]?\d){7,11}\b/g;
const AMOUNT = /\bRp\s?\d[\d.]{2,}(?:,\d{2,3})?\b/gi;
const APK_FILE = /[\w-]+\.apk\b/gi;

/**
 * Recipient name. A QRIS sticker has no link, no rekening, and often no
 * amount — the *name on the sticker* is the only thing a bank can check, so
 * it is the one artifact that report cannot do without.
 */
const RECIPIENT =
  /\b(?:a\.n\.?|atas\s+nama)\s*:?\s*([A-Za-z][A-Za-z'’.-]*(?:\s+[A-Za-z][A-Za-z'’.-]*){0,2})/g;

/** Words that follow a recipient name but are not part of it. */
const NAME_STOP = new Set([
  "rekening",
  "rek",
  "transfer",
  "bank",
  "nomor",
  "no",
  "hp",
  "wa",
  "qris",
  "dan",
  "di",
  "ke",
  "untuk",
  "sebagai",
  "pada",
  "dengan",
  "melalui",
  "saya",
  "aku",
  "anda",
  "kamu",
  "dia",
  "mereka",
  "kami",
  "kita",
]);

/**
 * A bare 10–16 digit run is ambiguous: it can be an account number, a
 * tracking number, or an epoch timestamp. Only call it a rekening when the
 * text around it says so — context-gated, same discipline as the authority
 * rule in `scoring/message.ts`.
 */
const REKENING_CONTEXT =
  /\b(?:rekening|rek\.?|no\.?\s*rek|transfer|setor|dp|bayar|a\.n\.?|atas\s+nama)\b/i;

/** Cheap stable id: same kind + same value → same artifact across turns. */
function artifactId(kind: string, value: string): string {
  let hash = 5381;
  const seed = `${kind}:${value.toLowerCase()}`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  return `${kind}-${Math.abs(hash).toString(36)}`;
}

function labelForLink(raw: string): { label: string; value: string } {
  const finding = classifyLink(raw);
  if (!finding) return { label: "Tautan dalam pesan", value: raw };
  switch (finding.kind) {
    case "typosquat":
      return {
        label: `Tautan yang meniru ${finding.imitates ?? "situs resmi"}`,
        value: finding.link.host,
      };
    case "shortener":
      return { label: "Tautan pendek yang menyembunyikan tujuan", value: raw };
    case "apk-host":
      return { label: "Tautan pengirim berkas APK", value: finding.link.host };
    case "risky-tld":
      return {
        label: `Tautan berekstensi .${finding.link.tld}`,
        value: finding.link.host,
      };
    case "official":
      return { label: "Tautan resmi", value: finding.link.host };
    default:
      return {
        label: "Tautan di luar daftar domain resmi",
        value: finding.link.host,
      };
  }
}

/**
 * Extract artifacts from one message. Deterministic: same text in, same
 * artifacts out (the clock only stamps `capturedAt`).
 */
export function extractArtifacts({ text, at }: ExtractedText): Artifact[] {
  const artifacts: Artifact[] = [];
  const seen = new Set<string>();

  const push = (kind: Artifact["kind"], label: string, value: string): void => {
    const id = artifactId(kind + label, value);
    if (seen.has(id)) return;
    seen.add(id);
    artifacts.push({ id, label, kind, value, capturedAt: at });
  };

  // Phones first: their digit runs must not also be reported as rekening.
  const phoneSpans: Array<[number, number]> = [];
  for (const match of text.matchAll(PHONE)) {
    const start = match.index ?? 0;
    phoneSpans.push([start, start + match[0].length]);
    push("number", "Nomor telepon yang disebut", match[0].trim());
  }

  for (const match of text.matchAll(REKENING)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (phoneSpans.some(([s, e]) => start >= s && end <= e)) continue;

    const context = text.slice(Math.max(0, start - 60), start);
    if (!REKENING_CONTEXT.test(context)) continue;

    push("number", "Nomor rekening yang disebut", match[0]);
  }

  for (const match of text.matchAll(AMOUNT)) {
    push("number", "Nominal uang yang disebut", match[0].trim());
  }

  for (const match of text.matchAll(APK_FILE)) {
    push("file", "Berkas APK yang dikirim atau diminta dibuka", match[0]);
  }

  for (const match of text.matchAll(RECIPIENT)) {
    const words = (match[1] ?? "").split(/\s+/).filter(Boolean);
    const name: string[] = [];
    for (const word of words) {
      const bare = word.replace(/[.,;:]+$/, "");
      if (NAME_STOP.has(bare.toLowerCase().replace(/[.'’-]+$/, ""))) break;
      name.push(bare);
    }
    const value = name.join(" ").trim();
    // "a.n. B" is a single letter, not a name worth reporting.
    if (value.length < 3) continue;
    push("text", "Nama penerima yang disebut", value);
  }

  for (const raw of extractLinks(text)) {
    const { label, value } = labelForLink(raw);
    // An official link is not evidence of anything; leaving it out keeps the
    // bundle honest about what is *not* a finding.
    if (label === "Tautan resmi") continue;
    push("link", label, value);
  }

  return artifacts;
}
