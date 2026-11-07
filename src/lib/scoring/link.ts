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
    "universitas",
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

/**
 * Public-suffix-lite (§11.7: no new dependencies, no network). The handful of
 * multi-part suffixes an Indonesian user actually meets; the full PSL is
 * thousands of rows and a fetched resource, which the offline promise
 * forbids. Anything outside this set falls back to "last two parts", the
 * same rule the broken version used for everything.
 */
const PUBLIC_SUFFIXES = new Set([
  // Indonesia
  "co.id",
  "ac.id",
  "or.id",
  "go.id",
  "sch.id",
  "web.id",
  "my.id",
  "biz.id",
  "mil.id",
  // common international two-part suffixes
  "co.uk",
  "org.uk",
  "com.au",
  "co.jp",
  "com.br",
]);

const SUFFIX_SZ = 2;

function splitRegistrable(host: string): { registrable: string; sld: string } {
  const parts = host.split(".");
  const lastTwo = parts.slice(-SUFFIX_SZ).join(".");
  if (parts.length > SUFFIX_SZ && PUBLIC_SUFFIXES.has(lastTwo)) {
    // eTLD+1 for multi-part suffixes: bca.co.id -> registrable "bca.co.id",
    // sld "bca" (NOT "co" — that one slice was what broke the allowlist).
    return {
      registrable: parts.slice(-3).join("."),
      sld: parts.at(-3) ?? "",
    };
  }
  return { registrable: lastTwo, sld: parts.at(-2) ?? "" };
}

export interface ParsedLink {
  raw: string;
  host: string;
  tld: string;
  registrable: string;
  /** SLD: the registrable domain minus its suffix. */
  sld: string;
}

/** Extract candidate URLs from free text, including scheme-less ones. */
export function extractLinks(text: string): string[] {
  const matches =
    text.match(
      // The label class includes non-ASCII letters on purpose. A homoglyph
      // host (`bсa.xyz`, with a Cyrillic "с") is the disguise this agent
      // exists to catch, and an ASCII-only class silently reduced it to
      // "a.xyz" — matching a fragment of the URL instead of the URL.
      /\b(?:https?:\/\/)?(?:[a-z0-9\u00a1-\uffff-]+\.)+[a-z\u00a1-\uffff]{2,}(?:\/[^\s<>"']*)?/gi,
    ) ?? [];
  return (
    matches
      .map((m) => m.trim().replace(/[),.;]+$/, ""))
      .filter((m) => m.includes("."))
      // A filename is not a URL: `undangan-nikah.apk` parses as a host named
      // "undangan-nikah" with TLD "apk", and would then be judged for brand
      // impersonation. Skip anything whose last label is a document/media
      // extension — the APK agent already has its own rule for those.
      .filter(
        (m) => !FILE_EXTENSIONS.has((m.split(".").at(-1) ?? "").toLowerCase()),
      )
  );
}

const FILE_EXTENSIONS = new Set([
  "apk",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "mp3",
  "mp4",
  "zip",
  "rar",
  "txt",
  "csv",
]);

export function parseLink(raw: string): ParsedLink | null {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const parts = host.split(".");
    const tld = parts.at(-1) ?? "";
    const { registrable, sld } = splitRegistrable(host);
    return { raw, host, tld, registrable, sld };
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
    | "punycode"
    | "credential-path"
    | "brand-subdomain"
    | "unknown";
  /** Brand being imitated, when `kind` is "typosquat" or "brand-subdomain". */
  imitates?: string;
  weight: number;
}

const WEIGHTS: Record<LinkFinding["kind"], number> = {
  official: 0,
  unknown: 0.1,
  "credential-path": 0.5,
  "risky-tld": 0.45,
  shortener: 0.55,
  "brand-subdomain": 0.6,
  punycode: 0.6,
  "apk-host": 0.7,
  typosquat: 0.85,
};

export function classifyLink(raw: string): LinkFinding | null {
  const link = parseLink(raw);
  if (!link) return null;

  if (OFFICIAL_SET.has(link.registrable)) {
    return { link, kind: "official", weight: 0 };
  }

  /*
   * Structural hints that do not depend on the SLD tell us *what kind* of
   * deception this is, so they run before the spelling rules.
   *
   * Order matters and is not arbitrary: punycode first (a non-Latin or
   * `xn--` host cannot be a Latin-brand misspelling), then a brand used as a
   * subdomain label, then the SLD typosquat, then the credential path.
   *
   * The credential path sits AFTER typosquat deliberately, which is the one
   * place this differs from the design note: `shopeeverif.com/login` is a
   * lookalike domain *and* a credential page, and the correct finding is the
   * strong one. Running the path check first would downgrade it from 0.85 to
   * 0.50.
   */
  if (link.host.includes("xn--") || /[\u0400-\u04FF]/.test(link.host)) {
    return { link, kind: "punycode", weight: WEIGHTS.punycode };
  }

  const subdomainHit = brandInSubdomain(link);
  if (subdomainHit) {
    return {
      link,
      kind: "brand-subdomain",
      imitates: subdomainHit,
      weight: WEIGHTS["brand-subdomain"],
    };
  }

  // Brand impersonation FIRST — before shortener, apk-host, or TLD styling.
  // Rationale (multi-hint resolution): a link can trigger several kinds
  // (`bit.ly/bca-verif` is both a shortener and a brand claim, and its real
  // destination is hidden either way), and the most specific truth about a
  // host is "who is it imitating". A shortener can never be judged for
  // brand, so leaving it first would shadow the finding below.
  //
  // Two imitation resolvers, both on a *normalized* SLD — lowercase,
  // leetspeak mapped back to letters (0→o, 1→i, 3→e, 4→a, 5→s, 7→t, 8→b),
  // hyphens and dots removed — so `sh0pee-verif.com`, `shopee-verif` and
  // "shopeeverif" all reduce to the token "shopeeverif" that contains the
  // brand:
  //
  //   1. edit distance on the FULL normalized SLD catches the classic
  //      typosquat (`bcaa.co.id` → "bcaa", distance 1 from "bca");
  //   2. brand-as-substring catches appended/infixed fakes whose distance
  //      from the brand is already >2 (`sh0pee-verif.com`).
  //
  // Brands shorter than 4 letters only use rule 2 — as substring "bca"/"brl"
  // appears in innocent words ("kambing"), so for them we keep distance and
  // prefix rules instead (`bcamobile` → distance>2, prefix "bca" exact).
  const normalized = normalizeSld(link.sld);
  for (const official of OFFICIAL) {
    const brandSld = normalizeSld(official.domain.split(".")[0]);
    if (brandSld.length < 3) continue;
    const hit =
      brandSld.length >= 4
        ? imitatesBrand(normalized, brandSld)
        : prefixedBy(normalized, brandSld);
    if (hit) {
      return {
        link,
        kind: "typosquat",
        imitates: official.brand,
        weight: WEIGHTS.typosquat,
      };
    }
  }

  if (CREDENTIAL_PATH.test(pathOf(link.raw))) {
    return {
      link,
      kind: "credential-path",
      weight: WEIGHTS["credential-path"],
    };
  }

  if (APK_HOST_HINTS.some((h) => link.host.includes(h))) {
    return { link, kind: "apk-host", weight: WEIGHTS["apk-host"] };
  }

  if (SHORTENERS.has(link.registrable)) {
    return { link, kind: "shortener", weight: WEIGHTS.shortener };
  }

  if (SUSPICIOUS_TLDS.has(link.tld)) {
    return { link, kind: "risky-tld", weight: WEIGHTS["risky-tld"] };
  }

  return { link, kind: "unknown", weight: WEIGHTS.unknown };
}

/** Path plus query, without scheme or host. */
function pathOf(raw: string): string {
  const withoutScheme = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const slash = withoutScheme.indexOf("/");
  return slash === -1 ? "" : withoutScheme.slice(slash);
}

/**
 * "login" on a host that is not official is where a credential gets stolen.
 * A plain marketing URL (`/produk`) never matches.
 */
const CREDENTIAL_PATH =
  /(?:^|[/?&#=])(?:login|masuk|verifikasi|verify|validasi|otp|pin|password|sandi|token|aktivasi|aktifkan|pulihkan|reset|konfirmasi)\b/i;

/**
 * A brand used as a *label* of a host that is not the brand's own domain.
 *
 * Matching is on label boundaries, not substrings: `undangan-nikah.apk` must
 * never look like an imitation, so each label is split on hyphens and compared
 * whole. `bca.klik-verifikasi.xyz` fails here; `klikbca.com` passes as official
 * long before this runs.
 */
function brandInSubdomain(link: ParsedLink): string | null {
  const labels = link.host.split(".");
  const registrableLabels = link.registrable.split(".").length;
  const subdomain = labels.slice(
    0,
    Math.max(0, labels.length - registrableLabels),
  );
  if (subdomain.length === 0) return null;

  for (const official of OFFICIAL) {
    const brand = normalizeSld(official.brand);
    // Two letters ("XL") collide with ordinary words; whole-token matching is
    // only trustworthy from three characters up.
    if (brand.length < 3) continue;
    for (const label of subdomain) {
      for (const token of label.split("-")) {
        if (token === brand) return official.brand;
      }
    }
  }
  return null;
}

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
};

/** Lowercase, de-leet, strip hyphens: "sh0pee-verif" -> "shopeeverif". */
function normalizeSld(raw: string): string {
  const lowered = raw.toLowerCase();
  let out = "";
  for (const ch of lowered) {
    out += LEET[ch] ?? ch;
  }
  return out.replace(/[-.]/g, "");
}

/**
 * Distance on the whole SLD (typosquat range ≤2 — the "one or two keys
 * mistyped" fiction a lookalike buys), or the brand embedded as substring
 * (appended-confirmation fakes like `shopeeverif`).
 */
function imitatesBrand(normalizedSld: string, brand?: string): boolean {
  if (!brand) return false;
  // The official registrable was resolved before this runs, so an exact SLD
  // match here can only mean the brand's name bought on a suffix the brand
  // does not own (`bca.com`). It is a typosquat, not an official path.
  if (editDistance(normalizedSld, brand) <= 2) return true;
  return normalizedSld.includes(brand);
}

/**
 * For 3-letter brands: the SLD must START with the brand. No fuzzy matching —
 * at three letters, edit distance 1 matches ordinary words ("und" is one edit
 * from "uny"), which is how `undangan-nikah.apk` got labelled an imitation of
 * UMY/UNY. Appended fakes (`bcaverifikasi`) are still caught; infixed ones are
 * a documented limitation.
 */
function prefixedBy(normalizedSld: string, brand: string): boolean {
  // Same reasoning as `imitatesBrand`: reaching this point with an exact SLD
  // means the registrable is not official (`bca.com`), so it imitates.
  return normalizedSld.startsWith(brand);
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
    /*
     * Labels describe the class of problem; the host lives in `evidence`.
     *
     * This is a privacy boundary, not a style choice. `label` is part of the
     * payload sent to the language layer (`VoiceDigest`), while `evidence` is
     * not — so a hostname inside a label would smuggle the user's URL out
     * through the one field that is allowed to leave. Keeping the host out of
     * the label makes "no message substring leaves the device" a property of
     * the whole digest rather than of one dropped field.
     *
     * Nothing is lost on screen: `score-card.tsx` renders the label and the
     * evidence quote together, so the reader still sees the URL.
     */
    const label =
      kind === "typosquat"
        ? `Domain meniru ${imitates} — bukan situs resmi`
        : kind === "brand-subdomain"
          ? `Merek ${imitates} dipakai di subdomain — bukan situs resmi`
          : kind === "punycode"
            ? "Alamat memakai aksara atau punycode untuk menyamarkan nama"
            : kind === "credential-path"
              ? "Tautan membuka halaman login/verifikasi di domain yang bukan milik layanan resmi"
              : kind === "shortener"
                ? "Tautan pendek menyembunyikan tujuan sebenarnya"
                : kind === "apk-host"
                  ? "Alamat tautan menjual/mengirim APK, bukan aplikasi resmi"
                  : kind === "risky-tld"
                    ? `Domain berekstensi ".${link.tld}" yang sering dipakai penipuan`
                    : "Tautan tidak ada di daftar domain resmi";

    signals.push({
      label,
      weight: finding.weight,
      evidence: raw,
      agent: "link",
    });
  }

  return signals;
}
