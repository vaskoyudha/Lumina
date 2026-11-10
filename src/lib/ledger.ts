import type { ScoreResult, Signal } from "@/lib/contracts/score";
import { isRisky } from "@/lib/contracts/score";
import { extractEntities } from "@/lib/scoring/extract";
import { extractLinks, parseLink } from "@/lib/scoring/link";
export const LEDGER_KEY = "lumina-entity-ledger-v1";
export const LEDGER_EVENT = "lumina:ledger";
export interface Entity {
  kind: "account" | "phone" | "domain" | "wallet";
  value: string;
  quote: string;
}
interface LedgerState {
  enabled: boolean;
  salt: string;
  entries: { hash: string; at: number; hits: number }[];
}
export interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export function entitiesIn(text: string): Entity[] {
  const out: Entity[] = [];
  const e = extractEntities(text);
  if (e.account)
    out.push({
      kind: "account",
      value: e.account.replace(/\D/g, ""),
      quote: e.account,
    });
  if (e.phone)
    out.push({
      kind: "phone",
      value: e.phone.replace(/\D/g, "").replace(/^62/, "0"),
      quote: e.phone,
    });
  for (const raw of extractLinks(text)) {
    const parsed = parseLink(raw);
    if (parsed)
      out.push({ kind: "domain", value: parsed.registrable, quote: raw });
  }
  for (const m of text.matchAll(
    /\b(?:0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|T[a-km-zA-HJ-NP-Z1-9]{33}|bc1[ac-hj-np-z02-9]{11,71})\b/g,
  ))
    out.push({
      kind: "wallet",
      value: m[0].startsWith("0x") ? m[0].toLowerCase() : m[0],
      quote: m[0],
    });
  return out.slice(0, 20);
}
const empty = (): LedgerState => ({ enabled: false, salt: "", entries: [] });
function read(storage: LocalStorageLike): LedgerState {
  try {
    const value = JSON.parse(
      storage.getItem(LEDGER_KEY) ?? "null",
    ) as LedgerState | null;
    if (
      value &&
      typeof value.enabled === "boolean" &&
      /^[a-f0-9]{32}$/.test(value.salt) &&
      Array.isArray(value.entries) &&
      value.entries.length <= 200 &&
      value.entries.every(
        (e) =>
          /^[a-f0-9]{64}$/.test(e.hash) &&
          Number.isFinite(e.at) &&
          Number.isSafeInteger(e.hits) &&
          e.hits > 0,
      )
    )
      return value;
  } catch {}
  return empty();
}
const randomSalt = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
async function hash(value: string): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export function ledgerStatus(storage: LocalStorageLike) {
  const state = read(storage);
  return { enabled: state.enabled, count: state.entries.length };
}
export function configureLedger(storage: LocalStorageLike, enabled: boolean) {
  storage.setItem(
    LEDGER_KEY,
    JSON.stringify({ enabled, salt: randomSalt(), entries: [] }),
  );
}
export function clearLedger(storage: LocalStorageLike) {
  configureLedger(storage, read(storage).enabled);
}
export async function lookupLedger(
  storage: LocalStorageLike,
  text: string,
): Promise<Signal[]> {
  const state = read(storage);
  if (!state.enabled || !crypto.subtle) return [];
  const matches = await Promise.all(
    entitiesIn(text).map(async (e) => ({
      e,
      hash: await hash(`${state.salt}:${e.kind}:${e.value.normalize("NFKC")}`),
    })),
  );
  return matches
    .filter((m) => state.entries.some((e) => e.hash === m.hash))
    .slice(0, 1)
    .map(({ e }) => ({
      label:
        "Entitas ini pernah muncul di pemeriksaan berisiko pada perangkat ini",
      weight: 0.25,
      evidence: e.quote,
      agent: "evidence",
      mechanism: "identity-mismatch",
      ruleId: "ledger.previous-risk",
    }));
}
export async function recordLedger(
  storage: LocalStorageLike,
  text: string,
  result: ScoreResult,
  now = Date.now(),
) {
  const state = read(storage);
  if (
    !state.enabled ||
    !isRisky(result.risk) ||
    !result.signals.some((s) => s.weight > 0) ||
    !crypto.subtle
  )
    return;
  const hashes = await Promise.all(
    entitiesIn(text).map((e) =>
      hash(`${state.salt}:${e.kind}:${e.value.normalize("NFKC")}`),
    ),
  );
  const latest = read(storage);
  if (!latest.enabled || latest.salt !== state.salt) return;
  for (const digest of new Set(hashes)) {
    const previous = latest.entries.find((e) => e.hash === digest);
    latest.entries = latest.entries.filter((e) => e.hash !== digest);
    latest.entries.push({
      hash: digest,
      at: now,
      hits: (previous?.hits ?? 0) + 1,
    });
  }
  latest.entries = latest.entries.sort((a, b) => a.at - b.at).slice(-200);
  storage.setItem(LEDGER_KEY, JSON.stringify(latest));
}
