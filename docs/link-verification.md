# Link verification

Lumina's Link Agent (`Bubu`) is deterministic and offline: it judges the
**shape** of a URL (official-domain allowlist, typosquat, punycode, shortener,
risky TLD, APK host). It never opens the link, so it can say "not the official
domain" but not "this page is a live phishing kit".

Link verification adds the missing half. The reader presses **Periksa tautan**
on a link signal in the expanded Link Agent row, and the app asks a
[url.vet](https://github.com/urlvet/urlvet) scanner to crawl that URL:

- DNS, TLS certificate, RDAP/WHOIS age, popularity rank
- redirect chain and short-link expansion
- page content: login/payment forms, where they post, hidden iframes, brand
  claims (`brand_check`), script/meta redirects
- typosquat detection and threat feeds (PhishTank by default; URLhaus, Google
  Safe Browsing / Web Risk when keys are configured)

The engine is open source (AGPL-3.0) and self-hostable. Lumina only speaks HTTP
to it, so the scanner stays a separate process.

## Privacy: what leaves the device

Only the URL. The request body is `{ "url": "https://…" }`; the message, the
score, and the conversation are never sent. Verification is opt-in per link:
nothing is sent until the reader presses the button. The result is shown beside
the signal and is not written back into the deterministic score.

This is the one place where a checked artifact leaves the device. If that is not
acceptable for a deployment, set `URLVET_API_URL=off`; the offline Link Agent
keeps working unchanged.

## Configuration

| Variable | Meaning |
|---|---|
| `URLVET_API_URL` | Base URL of the scanner. Unset → `https://api.url.vet`. `off` → route returns `503 not-configured`. |

The public instance is rate-limited to 20 requests/minute per IP and is meant
for trying things out. For a real deployment, self-host.

## Self-hosting url.vet

The backend needs Valkey and a headless Chrome for content analysis. Minimal
Compose (add a network and volumes; this is not part of Lumina's default stack):

```yaml
services:
  urlvet:
    build:
      context: ./urlvet/server
      dockerfile: ../docker/prod/go.Dockerfile
    environment:
      CACHE_ADDR: "urlvet-valkey:6379"
      CACHE_PASSWORD: "${URLVET_CACHE_PASSWORD}"
      CHROME_URL: "ws://urlvet-chrome:9222"
      PORT: "8080"
      FEED_PHISHTANK: ""          # on by default; 0 disables
      URLHAUS_AUTH_KEY: ""
      WEBRISK_API_KEY: ""
    depends_on:
      - urlvet-valkey
      - urlvet-chrome
    restart: unless-stopped

  urlvet-chrome:
    image: chromedp/headless-shell:latest
    restart: unless-stopped

  urlvet-valkey:
    image: valkey/valkey:8.0
    command: ["valkey-server", "--requirepass", "${URLVET_CACHE_PASSWORD}"]
    restart: unless-stopped
```

Point Lumina at it with `URLVET_API_URL=http://urlvet:8080`. Keep the scanner on
a private network; do not publish port 8080.

The upstream repository documents a full Docker stack and a non-Docker path
(`cd server && go build -o urlvet ./cmd/urlvet`). See
`https://github.com/urlvet/urlvet`.

Feed licences matter: PhishTank is free for commercial use; Google Safe Browsing
is non-commercial only; URLhaus is not-for-profit; OpenPhish's community feed is
for personal/academic research. The scanner's own docs list each term.

## API

`POST /api/link/verify`

```json
{ "url": "https://example.com" }
```

Success:

```json
{
  "ok": true,
  "verdict": {
    "verdict": "Suspicious",
    "score": 37,
    "badReasons": ["High-risk domain extension detected"],
    "goodReasons": ["Operational for 1 year."],
    "incomplete": true,
    "domain": "xxeee.top"
  }
}
```

`verdict` is `Safe` (≥ 65), `Suspicious` (30–64), or `Risky` (< 30); `score` is
0–100 and higher is safer. `incomplete` means a check that could change the
verdict did not finish.

Failure codes: `400 invalid-request`, `413 payload-too-large`,
`429 rate-limited` (6/minute per client), `503 not-configured`,
`503 upstream-failed`, `503 upstream-invalid`, `504 upstream-timeout`.

The route is server-only, so API keys never reach the browser. It is
rate-limited through the same PostgreSQL counter as the AI routes and honours
request cancellation.

## Attribution

If the Google verdict is shown, Google's terms require the attribution
"Advisory provided by Google". The current UI shows only url.vet's own verdict
and attributes the scan to url.vet. Keep that attribution, and keep this
component separate from `lib/scoring/`: the model still never scores, and the
verified verdict never silently adds or removes signals (AGENTS §3b).

## Tests

- `src/lib/link-verify/urlvet.test.ts` — mapping, URL encoding, disabled mode,
  malformed report, upstream failure, timeout.
- `src/app/api/link/verify/route.test.ts` — body validation, URL-only request,
  rate limit, error codes.
- `src/components/companion/link-verify.test.tsx` — no request before the
  click, verdict rendering, timeout copy.
- `src/components/companion/agent-run.test.tsx` — the Link Agent row exposes
  the button.
