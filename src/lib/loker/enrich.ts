import "server-only";

/**
 * Enrichment the audit wants, not demands.
 *
 * `company_email` and `domain_age_days` are nullable in the schema: job boards
 * publish neither, so a missing value is stored as `null` and the audit treats
 * it as "not checked". The one hard requirement is a fetched description — a
 * row without one is dropped rather than inserted with invented material.
 */

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

/** First address found across the supplied texts, lowercased. */
export function extractEmail(
  ...texts: (string | null | undefined)[]
): string | null {
  for (const text of texts) {
    if (!text) continue;
    const match = EMAIL.exec(text);
    if (match) return match[0].toLowerCase();
  }
  return null;
}

/**
 * Two-part TLDs that are registrable units. A full public-suffix list would be
 * a dependency; this covers the Indonesian and common regional suffixes the
 * boards in `scanner/portals.yml` actually use.
 */
const DUA_BAGIAN = new Set([
  "co.id",
  "ac.id",
  "or.id",
  "web.id",
  "go.id",
  "my.id",
  "biz.id",
  "sch.id",
  "co.uk",
  "org.uk",
  "ac.uk",
  "com.au",
  "net.au",
  "org.au",
  "co.nz",
  "com.sg",
  "com.my",
  "co.jp",
]);

/**
 * The domain RDAP should be asked about.
 *
 * Returns "" for hosts RDAP cannot answer for: a bare label ("localhost"), or
 * an IPv4/IPv6 literal.
 */
export function registrableDomain(hostname: string): string {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host || !host.includes(".")) return "";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return "";
  if (host.includes(":")) return "";
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const lastTwo = parts.slice(-2).join(".");
  if (DUA_BAGIAN.has(lastTwo)) return parts.slice(-3).join(".");
  return lastTwo;
}

export type DomainAgeStatus = "ok" | "unknown" | "error";

export interface DomainAge {
  status: DomainAgeStatus;
  ageDays: number | null;
}

export interface DomainIo {
  fetchJson(url: string): Promise<unknown>;
}

interface RdapEvent {
  eventAction?: string;
  eventDate?: string;
}

const RDAP = "https://rdap.org/domain/";

/**
 * Registration age in whole days.
 *
 * `unknown` means RDAP answered but named no registration event; `error` means
 * the request failed. Both are distinct from a real age, and the caller drops
 * the row rather than guess.
 */
export async function lookupDomainAge(
  hostname: string,
  io: DomainIo,
  now: number = Date.now(),
): Promise<DomainAge> {
  const domain = registrableDomain(hostname);
  if (!domain) return { status: "unknown", ageDays: null };

  let payload: unknown;
  try {
    payload = await io.fetchJson(`${RDAP}${encodeURIComponent(domain)}`);
  } catch {
    return { status: "error", ageDays: null };
  }

  const events = (payload as { events?: RdapEvent[] } | null)?.events;
  const registration = Array.isArray(events)
    ? events.find((event) => event.eventAction === "registration")
    : undefined;
  const registeredAt = registration?.eventDate
    ? Date.parse(registration.eventDate)
    : Number.NaN;
  if (!Number.isFinite(registeredAt)) {
    return { status: "unknown", ageDays: null };
  }

  const days = Math.floor((now - registeredAt) / 86_400_000);
  return { status: "ok", ageDays: Math.max(0, days) };
}
