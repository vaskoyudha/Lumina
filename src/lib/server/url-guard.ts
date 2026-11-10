import { resolve4, resolve6 } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { TLSSocket } from "node:tls";
export class UnsafeUrl extends Error {
  constructor() {
    super("Alamat bukan tujuan web publik yang diizinkan.");
  }
}
export function isPublicAddress(input: string): boolean {
  const ip = input.replace(/^\[|\]$/g, "").toLowerCase();
  if (isIP(ip) === 4) {
    const [a, b, c] = ip.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (isIP(ip) === 6)
    return (
      /^[23][0-9a-f]{3}:/.test(ip) &&
      !/^2001:(?:db8|0|[12]?[0-9a-f]):/i.test(ip) &&
      !/^2002:/i.test(ip)
    );
  return false;
}
export function parsePublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrl();
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    raw.length > 2048 ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port)) ||
    host === "localhost" ||
    /\.(localhost|local|internal|test|invalid)$/.test(host) ||
    (!isIP(host) && !host.includes(".")) ||
    (isIP(host) && !isPublicAddress(host))
  )
    throw new UnsafeUrl();
  url.hash = "";
  return url;
}
export interface PinnedUrl {
  url: URL;
  address: string;
  family: 4 | 6;
  all: string[];
}
export type AddressResolver = (host: string) => Promise<string[]>;

/**
 * Resolves every A/AAAA answer for a host. Tests pass their own resolver so the
 * rebinding cases are proven without touching a real nameserver; production
 * always uses this default.
 */
const resolveAddresses: AddressResolver = async (host) => {
  const settled = await Promise.allSettled([resolve4(host), resolve6(host)]);
  return settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
};

export async function guardUrl(
  raw: string,
  resolve: AddressResolver = resolveAddresses,
): Promise<PinnedUrl> {
  const url = parsePublicUrl(raw);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const literal = isIP(host);
  let resolved: string[];
  if (literal) resolved = [host];
  else
    try {
      resolved = await resolve(host);
    } catch {
      // A name we cannot resolve is not a destination we can confirm is public.
      throw new UnsafeUrl();
    }
  if (!resolved.length || resolved.some((ip) => !isPublicAddress(ip)))
    throw new UnsafeUrl();
  return {
    url,
    address: resolved[0],
    family: isIP(resolved[0]) as 4 | 6,
    all: resolved,
  };
}
export interface PublicResponse {
  status: number;
  location?: string;
  body: string;
  tls: { issuer: string | null; ageDays: number | null } | null;
}
/** The socket connects to the validated IP, not a second DNS lookup. */
export function pinnedRequest(
  target: PinnedUrl,
  signal: AbortSignal,
  method = "HEAD",
  readBody = false,
): Promise<PublicResponse> {
  return new Promise((resolve, reject) => {
    const transport =
      target.url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = transport(
      {
        hostname: target.address,
        family: target.family,
        port: target.url.port || (target.url.protocol === "https:" ? 443 : 80),
        servername: target.url.hostname.replace(/^\[|\]$/g, ""),
        path: target.url.pathname + target.url.search,
        method,
        signal,
        headers: {
          host: target.url.host,
          "user-agent": "Lumina-Verify/1.0",
          ...(method === "GET" && !readBody ? { range: "bytes=0-0" } : {}),
        },
      },
      (response) => {
        let size = 0;
        const chunks: Buffer[] = [];
        const socket = response.socket;
        const cert =
          socket instanceof TLSSocket ? socket.getPeerCertificate() : null;
        const created = cert?.valid_from ? Date.parse(cert.valid_from) : NaN;
        const tls = cert
          ? {
              issuer:
                typeof cert.issuer?.CN === "string" ? cert.issuer.CN : null,
              ageDays: Number.isFinite(created)
                ? Math.max(0, Math.floor((Date.now() - created) / 86400000))
                : null,
            }
          : null;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 65536) {
            req.destroy(new Error("response-too-large"));
            return;
          }
          if (readBody) chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            location: response.headers.location,
            body: readBody ? Buffer.concat(chunks).toString("utf8") : "",
            tls,
          }),
        );
        response.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end();
  });
}
export async function publicJson(
  raw: string,
  signal: AbortSignal,
): Promise<unknown> {
  let next = raw;
  for (let hop = 0; hop <= 3; hop++) {
    const response = await pinnedRequest(
      await guardUrl(next),
      signal,
      "GET",
      true,
    );
    if (response.status >= 300 && response.status < 400 && response.location) {
      if (hop === 3) throw new UnsafeUrl();
      next = new URL(response.location, next).href;
      continue;
    }
    if (response.status < 200 || response.status >= 300)
      throw new Error("public-source-unavailable");
    return JSON.parse(response.body);
  }
  throw new UnsafeUrl();
}
