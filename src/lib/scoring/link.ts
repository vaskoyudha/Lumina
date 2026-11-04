import { z } from "zod";
import raw from "@/data/official-domains.json";
import type { Signal } from "@/lib/contracts/score";

/**
 * Link Agent — deterministic, no network call in the demo path.
 *
 * WHOIS age is listed in the plan as "boleh gagal tanpa memblokir UI", so this
 * module never fetches: it decides from the URL shape and the official-domain
 * allowlist. Offline mode must produce the same score.
 */

export const OfficialDomainSchema = z.object({
  domain: z.string(),
  brand: z.string(),
  kind: z.enum([
    "bank",
    "ewallet",
    "marketplace",
    "instansi",
    "logistik",
    "telecom",
  ]),
});

export const OfficialDomainsSchema = z.array(OfficialDomainSchema).min(30);

export type OfficialDomain = z.infer<typeof OfficialDomainSchema>;

export const OFFICIAL: readonly OfficialDomain[] =
  OfficialDomainsSchema.parse(raw);

const OFFICIAL_SET = new Set(OFFICIAL.map((d) => d.domain));

/** Shorteners hide the real destination: the link cannot be judged by eye. */
const SHORTENERS = new Set([
  "bit.ly",
  "s.id",
  "tinyurl.com",
  "goo.gl",
  "t.co",
  "is.gd",
  "cutt.ly",
  "shorturl.at",
  "rb.gy",
  "linktr.ee",
  "bit.do",
  "rebrand.ly",
  "tiny.cc",
  "shorte.st",
]);

const SUSPICIOUS_TLDS = new Set([
  "xyz",
  "top",
  "click",
  "link",
  "shop",
  "live",
  "icu",
  "buzz",
  "cyou",
  "rest",
  "monster",
  "sbs",
  "cfd",
  "gq",
  "tk",
  "ml",
  "ga",
  "cf",
  "zip",
  "mov",
]);

const APK_HOST_HINTS = [
  "apk",
  "download-apk",
  "unduh",
  "install",
  "update-app",
];

export interface ParsedLink {
  raw: string;
  host: string;
  tld: string;
  registrable: string;
}

/** Extract candidate URLs from free text, including scheme-less ones. */
export function extractLinks(text: string): string[] {
  const matches =
    text.match(
      /\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/gi,
    ) ?? [];
  return matches
    .map((m) => m.trim().replace(/[),.;]+$/, ""))
    .filter((m) => m.includes("."));
}

export function parseLink(raw: string): ParsedLink | null {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const parts = host.split(".");
    const tld = parts.at(-1) ?? "";
    const registrable = parts.slice(-2).join(".");
    return { raw, host, tld, registrable };
  } catch {
    return null;
  }
}

/** Levenshtein distance, small-N: used to spot `bcaa`, `brl`, `0vo`. */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (cur[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n] ?? 0;
}

export interface LinkFinding {
  link: ParsedLink;
  kind:
    | "official"
    | "shortener"
    | "typosquat"
    | "risky-tld"
    | "apk-host"
    | "unknown";
  /** Brand being imitated, when `kind === "typosquat"`. */
  imitates?: string;
  weight: number;
}

const WEIGHTS: Record<LinkFinding["kind"], number> = {
  official: 0,
  unknown: 0.1,
  shortener: 0.55,
  "risky-tld": 0.45,
  "apk-host": 0.7,
  typosquat: 0.85,
};

export function classifyLink(raw: string): LinkFinding | null {
  const link = parseLink(raw);
  if (!link) return null;

  if (OFFICIAL_SET.has(link.registrable)) {
    return { link, kind: "official", weight: 0 };
  }
  if (SHORTENERS.has(link.registrable)) {
    return { link, kind: "shortener", weight: WEIGHTS.shortener };
  }
  if (APK_HOST_HINTS.some((h) => link.host.includes(h))) {
    return { link, kind: "apk-host", weight: WEIGHTS["apk-host"] };
  }

  // Typosquat: same TLD family, brand name within distance 2 of the SLD.
  const brandPart = link.registrable.split(".")[0] ?? "";
  for (const official of OFFICIAL) {
    const officialBrand = official.domain.split(".")[0] ?? "";
    if (officialBrand.length < 4) continue;
    const distance = editDistance(brandPart, officialBrand);
    if (distance > 0 && distance <= 2) {
      return {
        link,
        kind: "typosquat",
        imitates: official.brand,
        weight: WEIGHTS.typosquat,
      };
    }
  }

  if (SUSPICIOUS_TLDS.has(link.tld)) {
    return { link, kind: "risky-tld", weight: WEIGHTS["risky-tld"] };
  }

  return { link, kind: "unknown", weight: WEIGHTS.unknown };
}

export function linkSignals(text: string): Signal[] {
  const seen = new Set<string>();
  const signals: Signal[] = [];

  for (const raw of extractLinks(text)) {
    const finding = classifyLink(raw);
    if (!finding) continue;
    if (finding.kind === "official") continue;
    if (seen.has(finding.link.registrable)) continue;
    seen.add(finding.link.registrable);

    const { kind, link, imitates } = finding;
    const label =
      kind === "typosquat"
        ? `Domain meniru ${imitates} — "${link.host}" bukan situs resmi`
        : kind === "shortener"
          ? "Tautan pendek menyembunyikan tujuan sebenarnya"
          : kind === "apk-host"
            ? "Alamat tautan menjual/mengirim APK, bukan aplikasi resmi"
            : kind === "risky-tld"
              ? `Domain berekstensi ".${link.tld}" yang sering dipakai penipuan`
              : `Tautan tidak ada di daftar domain resmi: "${link.host}"`;

    signals.push({
      label,
      weight: finding.weight,
      evidence: raw,
      agent: "link",
    });
  }

  return signals;
}
