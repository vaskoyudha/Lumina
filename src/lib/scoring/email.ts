import type { Signal } from "@/lib/contracts/score";
import { OFFICIAL } from "@/lib/scoring/link";
export function parseEmailHeaders(text: string): Map<string, string> {
  const headers = new Map<string, string>();
  let key = "";
  for (const line of text.split(/\r?\n/).slice(0, 150)) {
    if (!line.trim()) break;
    const match = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (match) {
      key = match[1].toLowerCase();
      headers.set(key, `${headers.get(key) ?? ""} ${match[2]}`.trim());
    } else if (/^\s/.test(line) && key)
      headers.set(key, `${headers.get(key)} ${line.trim()}`);
    else break;
  }
  return headers;
}
const addressDomain = (value: string) =>
  /@([a-z0-9.-]+\.[a-z]{2,})/i.exec(value)?.[1].toLowerCase() ?? null;
export function emailSignals(text: string): {
  signals: Signal[];
  note?: string;
} {
  const headers = parseEmailHeaders(text);
  if (
    !headers.has("authentication-results") &&
    !(
      headers.has("from") &&
      (headers.has("subject") || headers.has("received"))
    )
  )
    return {
      signals: [],
      note: "Bukan blok header email; autentikasi tidak diperiksa.",
    };
  const signals: Signal[] = [];
  const auth = headers.get("authentication-results") ?? "";
  const add = (id: string, label: string, weight: number, evidence: string) =>
    signals.push({
      ruleId: `email.${id}`,
      label,
      weight,
      evidence,
      agent: "email",
      mechanism:
        id === "display-spoof" ? "authority-claim" : "identity-mismatch",
    });
  for (const [kind, weight] of [
    ["spf", 0.35],
    ["dkim", 0.35],
    ["dmarc", 0.45],
  ] as const) {
    const match = new RegExp(`\\b${kind}=(?:softfail|fail)\\b`, "i").exec(auth);
    if (match)
      add(
        kind,
        `Header menyatakan ${kind.toUpperCase()} gagal — hasil tempelan belum diverifikasi`,
        weight,
        match[0],
      );
  }
  const from = headers.get("from") ?? "";
  const domain = addressDomain(from);
  const reply = headers.get("reply-to");
  const envelope = headers.get("return-path");
  if (
    domain &&
    reply &&
    addressDomain(reply) &&
    addressDomain(reply) !== domain
  )
    add(
      "reply-to",
      "Reply-To mengarahkan balasan ke domain berbeda",
      0.3,
      reply,
    );
  if (
    domain &&
    envelope &&
    addressDomain(envelope) &&
    addressDomain(envelope) !== domain
  )
    add(
      "return-path",
      "Return-Path berbeda dari domain From; dapat juga terjadi pada pengiriman resmi",
      0.2,
      envelope,
    );
  const display = from.replace(/<[^>]*>/g, "");
  for (const official of OFFICIAL) {
    if (
      !domain ||
      !new RegExp(
        `\\b${official.brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i",
      ).test(display)
    )
      continue;
    /*
     * One brand can own several official domains (`bca.co.id`, `klikbca.com`).
     * Compare against every domain of that brand, not against the single entry
     * the loop happens to be on, or a legitimate message from one official
     * domain is flagged because the brand has another.
     */
    const officialForBrand = OFFICIAL.filter(
      (entry) => entry.brand === official.brand,
    );
    const isOfficialDomain = officialForBrand.some(
      (entry) => domain === entry.domain || domain.endsWith(`.${entry.domain}`),
    );
    if (!isOfficialDomain) {
      add(
        "display-spoof",
        "Nama pengirim mengatasnamakan merek dengan domain email berbeda",
        0.5,
        from,
      );
      break;
    }
  }
  const received = headers.get("received") ?? "";
  const origin = /\bfrom\s+([^\s;]+)/i.exec(received)?.[1];
  if (
    origin &&
    domain &&
    !origin.endsWith(domain) &&
    /\b(?:unknown|localhost|\[127\.)/i.test(origin)
  )
    add(
      "origin",
      "Hop awal pada header perlu diverifikasi oleh penyedia email",
      0.2,
      origin,
    );
  return {
    signals,
    note: signals.length
      ? undefined
      : auth
        ? "Header tempelan menyatakan autentikasi lolos; ini bukan verifikasi dari penyedia penerima."
        : "Header autentikasi tidak ada.",
  };
}
