import { z } from "zod";
import type { ScoreResult, Signal } from "@/lib/contracts/score";
import { verifyLink } from "@/lib/link-verify/urlvet";
import { DETECTOR_IDS, type DetectorId } from "@/lib/scoring/detector-ids";
import { extractEntities } from "@/lib/scoring/extract";
import { extractLinks } from "@/lib/scoring/link";
import type { scoreWithTrace } from "@/lib/scoring/score";

/**
 * Tools are the specialists' only way to touch the deterministic engine.
 * The orchestrator never lets a model write a score; it can only read the
 * engine's output and add its own cited findings.
 */

export interface ToolContext {
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

export const TOOL_DEFS: Record<string, ToolDef> = {
  score_message: {
    name: "score_message",
    description:
      "Run Lumina's deterministic scorer over the message and prior turns. Returns the authoritative score, risk band, modus, and the strongest signals. Use this before forming an opinion; never invent a score.",
    schema: NoArgs,
    execute: async (_args, context) => {
      const { result, trace } = context.score();
      return {
        score: result.score,
        risk: result.risk,
        modus: result.modus,
        relatedModule: result.relatedModule,
        advice: result.advice,
        signals: stageView(result),
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
      const links = extractLinks(context.message).slice(0, 10);
      return {
        count: links.length,
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
      if (!extractLinks(context.message).includes(url)) {
        throw new Error("url-not-in-message");
      }
      const verdict = await verifyLink(url, context.signal);
      return verdict;
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
