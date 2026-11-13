import { z } from "zod";
import type { SpecialistId } from "@/lib/contracts/orchestrator";
import type { ScoreResult, Signal } from "@/lib/contracts/score";
import { verifyLink } from "@/lib/link-verify/urlvet";
import { DETECTOR_IDS, type DetectorId } from "@/lib/scoring/detector-ids";
import { extractEntities } from "@/lib/scoring/extract";
import { extractLinks, parseLink } from "@/lib/scoring/link";
import type { scoreWithTrace } from "@/lib/scoring/score";

/**
 * Tools are the specialists' only way to touch the deterministic engine.
 * The orchestrator never lets a model write a score; it can only read the
 * engine's output and add its own cited findings.
 */

export interface ToolContext {
  /** The specialist calling the tool; used to scope shared engine output. */
  agent: SpecialistId;
  message: string;
  priorTurns: string[];
  signal: AbortSignal;
  score: () => ReturnType<typeof scoreWithTrace>;
}

export interface ToolDef {
  name: string;
  description: string;
  schema: z.ZodType;
  execute: (args: unknown, context: ToolContext) => Promise<unknown>;
}

const NoArgs = z.object({}).strict();
const DetectorArgs = z.object({ detector: z.enum(DETECTOR_IDS) }).strict();
const UrlArgs = z
  .object({
    url: z
      .string()
      .min(1)
      .max(2048)
      .refine((value) => /^https?:\/\//i.test(value), "invalid-url"),
  })
  .strict();
const DomainArgs = z
  .object({
    domain: z.string().min(1).max(2048),
  })
  .strict();

function signalView(signal: Signal) {
  return {
    label: signal.label,
    weight: signal.weight,
    agent: signal.agent ?? null,
    mechanism: signal.mechanism ?? null,
    evidence: signal.evidence ?? null,
  };
}

function stageView(result: ScoreResult) {
  return result.signals.slice(0, 12).map(signalView);
}

interface RdapEntity {
  roles?: string[];
  vcardArray?: unknown[];
}

interface RdapResponse {
  status?: string[];
  events?: { eventAction?: string; eventDate?: string }[];
  entities?: RdapEntity[];
}

interface DomainLookup {
  ok: boolean;
  host: string;
  registrar?: string | null;
  registeredAt?: string | null;
  ageDays?: number | null;
  statuses?: string[];
  error?: string;
  cached?: boolean;
}

const domainCache = new Map<string, { at: number; value: DomainLookup }>();
const DOMAIN_CACHE_MS = 60 * 60 * 1000;
const DOMAIN_CACHE_MAX = 200;

function normalizeHost(host: string): string {
  return host
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "");
}

function urlKey(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    return `${url.protocol}//${normalizeHost(url.hostname)}${pathname}${url.search}`.toLowerCase();
  } catch {
    return null;
  }
}

function registrarOf(data: RdapResponse): string | null {
  const entity = data.entities?.find((item) =>
    item.roles?.includes("registrar"),
  );
  const vcard = entity?.vcardArray;
  if (!Array.isArray(vcard) || !Array.isArray(vcard[1])) return null;
  const fn = (vcard[1] as unknown[]).find(
    (item) => Array.isArray(item) && item[0] === "fn",
  );
  return Array.isArray(fn) && typeof fn[3] === "string" ? fn[3] : null;
}

async function lookupDomain(
  host: string,
  signal: AbortSignal,
): Promise<DomainLookup> {
  const cached = domainCache.get(host);
  if (cached && Date.now() - cached.at < DOMAIN_CACHE_MS) {
    return { ...cached.value, cached: true };
  }

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://rdap.org/domain/${host}`, {
      signal: controller.signal,
      headers: {
        accept: "application/rdap+json",
        "user-agent": "Lumina/1.0 (domain safety check)",
      },
    });
    if (!response.ok) {
      return { ok: false, host, error: `rdap-${response.status}` };
    }
    const data = (await response.json()) as RdapResponse;
    const registeredAt =
      data.events?.find((event) => event.eventAction === "registration")
        ?.eventDate ?? null;
    const parsedAt = registeredAt ? Date.parse(registeredAt) : Number.NaN;
    const value: DomainLookup = {
      ok: true,
      host,
      registrar: registrarOf(data),
      registeredAt,
      ageDays: Number.isFinite(parsedAt)
        ? Math.max(0, Math.floor((Date.now() - parsedAt) / 86_400_000))
        : null,
      statuses: data.status ?? [],
    };
    if (domainCache.size >= DOMAIN_CACHE_MAX) {
      const oldest = domainCache.keys().next().value;
      if (oldest !== undefined) domainCache.delete(oldest);
    }
    domainCache.set(host, { at: Date.now(), value });
    return value;
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      host,
      error: aborted ? "rdap-timeout" : "rdap-unavailable",
    };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

export const TOOL_DEFS: Record<string, ToolDef> = {
  score_message: {
    name: "score_message",
    description:
      "Run Lumina's deterministic scorer over the message and prior turns. Returns the authoritative score, risk band, modus, and only the signals owned by your assigned detector. Use this before forming an opinion; never invent a score.",
    schema: NoArgs,
    execute: async (_args, context) => {
      const { result, trace } = context.score();
      const scoped =
        context.agent === "evidence"
          ? stageView(result)
          : stageView(result).filter(
              (signal) => signal.agent === context.agent,
            );
      const otherSignals = stageView(result)
        .filter(
          (signal) =>
            signal.agent !== context.agent && (signal.weight ?? 0) > 0,
        )
        .map((signal) => ({
          label: signal.label,
          agent: signal.agent,
          weight: signal.weight,
        }));
      return {
        score: result.score,
        risk: result.risk,
        modus: result.modus,
        relatedModule: result.relatedModule,
        advice: result.advice,
        signals: scoped,
        otherSignals,
        guidance: scoped.length
          ? "Gunakan sinyal milik detektormu sebagai label laporan. Sinyal agen lain di otherSignals hanya konteks; jangan mengklaimnya sebagai temuan detektormu."
          : "Detektormu tidak menemukan sinyal. Jangan mengarang label; jika ada pola yang terlihat langsung di pesan, gunakan observasi dengan kutipan persis, atau laporkan kosong.",
        stages: trace.stages.map((stage) => ({
          id: stage.id,
          label: stage.label,
          status: stage.status,
          findings: stage.findings,
          ms: stage.ms,
        })),
      };
    },
  },

  scan_detector: {
    name: "scan_detector",
    description:
      "Read one deterministic detector's findings from the current message. Only the detector assigned to you is allowed.",
    schema: DetectorArgs,
    execute: async (args, context) => {
      const { detector } = args as { detector: DetectorId };
      if (context.agent !== "evidence" && detector !== context.agent) {
        throw new Error("detector-not-assigned");
      }
      const { result, trace } = context.score();
      const stage = trace.stages.find((item) => item.id === detector);
      const signals = result.signals
        .filter((signal) => signal.agent === detector)
        .map(signalView);
      return {
        detector,
        stage: stage
          ? {
              label: stage.label,
              status: stage.status,
              findings: stage.findings,
              ms: stage.ms,
              note: stage.note ?? null,
            }
          : null,
        signals,
      };
    },
  },

  extract_links: {
    name: "extract_links",
    description:
      "Extract every URL from the message with its host and lexical risk facts. Does not fetch the page.",
    schema: NoArgs,
    execute: async (_args, context) => {
      const all = extractLinks(context.message);
      const links = all.slice(0, 10);
      return {
        count: links.length,
        total: all.length,
        truncated: all.length > links.length,
        links: links.map((raw) => {
          try {
            const url = new URL(raw);
            return {
              raw,
              host: url.hostname,
              protocol: url.protocol,
              isShortener:
                /^(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|s\.id)$/i.test(
                  url.hostname,
                ),
            };
          } catch {
            return { raw, host: null, protocol: null, isShortener: false };
          }
        }),
      };
    },
  },

  verify_link: {
    name: "verify_link",
    description:
      "Ask url.vet for a live phishing verdict on one URL. Returns Safe, Suspicious, or Risky with a score and reasons. Use only for URLs present in the message.",
    schema: UrlArgs,
    execute: async (args, context) => {
      const { url } = args as { url: string };
      const target = urlKey(url);
      const allowed = new Set(
        extractLinks(context.message)
          .map(urlKey)
          .filter((value): value is string => Boolean(value)),
      );
      if (!target || !allowed.has(target)) {
        throw new Error("url-not-in-message");
      }
      const verdict = await verifyLink(url, context.signal);
      return verdict;
    },
  },

  domain_lookup: {
    name: "domain_lookup",
    description:
      "Look up a domain's public registration data through RDAP: registrar, registration date, domain age, and status flags. Use only for a host that appears in the message. A young domain is supporting evidence, not proof of fraud.",
    schema: DomainArgs,
    execute: async (args, context) => {
      const { domain } = args as { domain: string };
      const parsedHost = parseLink(domain.trim())?.host;
      const host = parsedHost ? normalizeHost(parsedHost) : null;
      if (!host) throw new Error("invalid-domain");
      const allowed = new Set(
        extractLinks(context.message)
          .map((raw) => {
            const host = parseLink(raw)?.host;
            return host ? normalizeHost(host) : null;
          })
          .filter((value): value is string => Boolean(value)),
      );
      if (!allowed.has(host)) throw new Error("domain-not-in-message");
      return lookupDomain(host, context.signal);
    },
  },

  extract_entities: {
    name: "extract_entities",
    description:
      "Extract amounts, account numbers, phone numbers, sender labels, timestamps, and the first URL from the message. Account values are partially masked.",
    schema: NoArgs,
    execute: async (_args, context) => {
      const entities = extractEntities(context.message);
      const account = entities.account
        ? `${entities.account.slice(0, 4)}…${entities.account.slice(-3)}`
        : null;
      return {
        sender: entities.sender ?? null,
        amount: entities.amount ?? null,
        account,
        phone: entities.phone ?? null,
        url: entities.url ?? null,
        timestamp: entities.timestamp ?? null,
        confidence: entities.confidence,
      };
    },
  },

  scrub_secrets: {
    name: "scrub_secrets",
    description:
      "Detect and mask secrets in the message (OTP/PIN/password/card/account). Returns a safe copy and the kinds found, never the secret values.",
    schema: NoArgs,
    execute: async (_args, context) => {
      const patterns: { kind: string; regex: RegExp }[] = [
        {
          kind: "otp",
          regex: /\b(?:otp|kode\s*otp|verifikasi)\D{0,12}(\d{4,8})\b/gi,
        },
        {
          kind: "pin",
          regex: /\b(?:pin|password|sandi|kata\s*sandi)\D{0,12}(\S{4,})/gi,
        },
        { kind: "card", regex: /\b(?:\d[ -]?){13,19}\b/g },
        {
          kind: "account",
          regex:
            /\b(?:rekening|rek\.?|account)\s*[:=-]?\s*(\d[\d -]{5,28}\d)/gi,
        },
      ];
      let safeText = context.message;
      const found: string[] = [];
      for (const pattern of patterns) {
        safeText = safeText.replace(pattern.regex, (_match) => {
          found.push(pattern.kind);
          return `[${pattern.kind.toUpperCase()} REDACTED]`;
        });
      }
      return { found: [...new Set(found)], safeText };
    },
  },
};

export type ToolName = keyof typeof TOOL_DEFS;

export const TOOL_NAMES = Object.keys(TOOL_DEFS) as ToolName[];

export function openAITools(names: readonly string[]) {
  return names
    .map((name) => TOOL_DEFS[name])
    .filter((tool): tool is ToolDef => Boolean(tool))
    .map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: z.toJSONSchema(tool.schema),
      },
    }));
}
