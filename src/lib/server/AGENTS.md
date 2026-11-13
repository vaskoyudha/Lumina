# src/lib/server — request limits, LLM egress, SSRF guard

## OVERVIEW
The shared server boundary used by every AI/verify route: body-size limits, client keys, rate limits, abort deadlines, the single chat-completions caller, and a DNS-pinned public-URL fetcher.

## STRUCTURE
| File | Exports |
|---|---|
| `request.ts` | `readJson`, `limitAI`, `clientKey`, `requestMeta`, `upstreamAbort`, `BodyTooLarge` |
| `llm.ts` | `fetchChat` + `ChatFetchInput` |
| `url-guard.ts` | `guardUrl`, `pinnedRequest`, `publicJson`, `parsePublicUrl`, `isPublicAddress`, `UnsafeUrl` |

## WHERE TO LOOK
| Task | File | Notes |
|---|---|---|
| Proxy trust | `request.ts:5,16` | `TRUST_PROXY === "true"` + valid `x-lumina-client-ip` only; ignores `x-forwarded-for` |
| Body caps | `request.ts` | `readJson` returns `null` on malformed JSON; callers must Zod-reject |
| Rate limit | `request.ts:24` `limitAI` | Fails closed on non-`AuthError` (503) |
| Provider fallback | `llm.ts:43` `fetchChat` | Appends `/chat/completions`; retry fallback only on 429/≥500 |
| SSRF defence | `url-guard.ts` | Scheme/port/host checks, DNS pinning, redirect limit, TLS metadata |

## CONVENTIONS (different from root)
- All model calls go through `fetchChat`; do not `fetch` a provider directly.
- `reasoning_effort` passes only for the primary attempt; fallback uses its own env.
- `guardUrl` resolves A/AAAA and pins; tests inject an `AddressResolver` to prove rebinding without a nameserver.
- Verification calls cap bodies at 65,536 bytes and use `cache:"no-store"`.

## ANTI-PATTERNS (THIS DIRECTORY)
- Never trust `x-forwarded-for`; only the proxy-overwritten client-IP header.
- Never swallow rate-limit DB failures into allow.
- Never bypass the SSRF guard for user-supplied URLs, or follow a redirect to a private address.
- Never add a second LLM client; keep one egress boundary for auditing.
- Never print secrets/env in error text.
