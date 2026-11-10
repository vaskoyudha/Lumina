import { z } from "zod";

/**
 * Client for a url.vet-compatible phishing scanner.
 *
 * url.vet (https://github.com/urlvet/urlvet, AGPL-3.0) is a self-hostable
 * engine that crawls the link: DNS, TLS, RDAP/WHOIS, redirect and short-link
 * chains, page content, credential forms, typosquatting, and threat feeds. This
 * module only speaks HTTP to it, so the engine stays a separate process.
 *
 * The public instance is the fallback because it needs no key. Point
 * `URLVET_API_URL` at a self-hosted instance for production, or set it to
 * `off` to disable link verification entirely.
 */

export const LINK_VERIFY_TIMEOUT_MS = 20000;

const ReportSchema = z.object({
  result: z.object({
    verdict: z.enum(["Safe", "Suspicious", "Risky"]),
    final_score: z.number(),
    reasons: z
      .object({
        bad_reasons: z.array(z.string()).nullish(),
        good_reasons: z.array(z.string()).nullish(),
      })
      .nullish(),
  }),
  incomplete: z.boolean().optional(),
  domain: z.string().nullish(),
});

export type LinkVerdictName = z.infer<typeof ReportSchema>["result"]["verdict"];

export interface LinkVerdict {
  verdict: LinkVerdictName;
  /** 0–100, higher is safer. Below 30 is Risky, below 65 Suspicious. */
  score: number;
  badReasons: string[];
  goodReasons: string[];
  /** A check that could change the verdict did not finish. */
  incomplete: boolean;
  domain: string | null;
}

export type LinkVerifyFailure = "disabled" | "timeout" | "upstream" | "invalid";

export class LinkVerifyError extends Error {
  constructor(readonly code: LinkVerifyFailure) {
    super(code);
    this.name = "LinkVerifyError";
  }
}

/** `URLVET_API_URL=off` disables the feature without removing the route. */
export function urlvetBaseUrl(): string | null {
  const configured = process.env.URLVET_API_URL?.trim();
  if (!configured) return "https://api.url.vet";
  if (/^(off|none|disabled|0)$/i.test(configured)) return null;
  return configured.replace(/\/+$/, "");
}

export async function verifyLink(
  url: string,
  signal?: AbortSignal,
): Promise<LinkVerdict> {
  const base = urlvetBaseUrl();
  if (!base) throw new LinkVerifyError("disabled");

  let response: Response;
  try {
    response = await fetch(
      `${base}/api/v1/analyze?url=${encodeURIComponent(url)}`,
      {
        signal: signal ?? AbortSignal.timeout(LINK_VERIFY_TIMEOUT_MS),
        headers: { accept: "application/json" },
        cache: "no-store",
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      throw new LinkVerifyError("timeout");
    }
    throw new LinkVerifyError("upstream");
  }

  if (!response.ok) throw new LinkVerifyError("upstream");

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new LinkVerifyError("invalid");
  }

  const parsed = ReportSchema.safeParse(json);
  if (!parsed.success) throw new LinkVerifyError("invalid");

  const result = parsed.data.result;
  return {
    verdict: result.verdict,
    score: result.final_score,
    badReasons: result.reasons?.bad_reasons ?? [],
    goodReasons: result.reasons?.good_reasons ?? [],
    incomplete: parsed.data.incomplete ?? false,
    domain: parsed.data.domain ?? null,
  };
}
