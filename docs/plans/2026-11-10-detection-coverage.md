# Detection Coverage — Implementation Plan

**Status:** Draft · 10 November 2026
**Owner:** Stream A (engine) with Stream C for simulation hand-off
**Goal:** Grow Lumina from a 57-case text benchmark into a measured, channel-aware detector: text, links, email headers, files, QRIS, screenshots and cross-case history — without moving the instant verdict onto the network.

**Architecture:** Three rings, in this order.

1. **Ring 0 — local and pure.** Normalisation, the seven existing detectors, injection detection, email-header parsing, QRIS and the local entity ledger. Always runs. No `fetch`, no clock, no `Math.random`. This is what produces the verdict in the demo.
2. **Ring 1 — optional enrichment.** A server route checks a URL, a file hash or another external reputation source *after* the local verdict. It returns `Signal[]`; the client re-scores through the same `scoreText({ text, extraSignals })`. A timeout or an unavailable key changes nothing and says so in the trace.
3. **Ring 2 — offline measurement.** A 120-case bench stratified by channel, modus and false-positive trap. `runEval()` remains the only source of accuracy numbers.

**Rule that cannot bend:** `src/lib/scoring/score.ts` never performs I/O. Network verification is an additive stage, never a hidden dependency of the deterministic judge.

**Tech stack:** Next 16.4.5 App Router, React 19.3, TypeScript strict, zod 4, Jest 30, Biome 2.x. No new runtime dependency in Phases 1–3. Pi packages only in the agent-architecture plan.

**Spec:** `docs/plan.md` §3 (engine), §5-A (companion), §11.1 (scoring), §11.6 (privacy).
**Related:** `docs/plans/2026-11-10-agent-architecture.md` (validator and trace), `docs/plans/2026-11-10-learning-companion.md` (hand-off).

---

## 1. Baseline, measured today

| Item | Current state | File |
|---|---|---|
| Detectors | 7: message, link, identity, conversation, job, marketplace, qris | `src/lib/scoring/score.ts:210-260` |
| Bench | 57 cases: 29 scam + 28 legit | `src/lib/scoring/bench-cases.ts` |
| Eval metrics | caught, nailed, false positives, classification, per-modus, slowest CPU | `src/lib/scoring/eval.ts` |
| Link | offline by design; shape + official-domain allowlist only | `src/lib/scoring/link.ts:5-10` |
| Identity | offline by design; sender number and institutional claim only | `src/lib/scoring/identity.ts:5-12` |
| Normalisation | none | — |
| Injection detection | none | — |
| Email headers | none | — |
| Network verification | none | — |

**First action of any implementation session:** run `npm test -- src/lib/scoring/eval.test.ts` and record the current report. Do not quote a recall number that was not printed by `runEval()`.

---

## 2. Coverage matrix

The list below is the full scope. “Today” is honest; “Plan” says where the work lands.

| Capability | Today | Plan | Phase | Honest limit |
|---|---|---|---|---|
| Live URL verification (RDAP/WHOIS age, DNS, TLS issuer/age, redirect chain) | none | `verifyUrl()` behind `/api/verify-link` | 3 | Only runs after the local verdict; 2.5 s budget; failure is neutral |
| Threat blocklists (URLhaus, OpenPhish, Google Safe Browsing, PhishTank) | none | cached providers, one interface | 3 | Some need API keys; absence is reported as “tidak tersedia”, never as “aman” |
| Homoglyph / IDN / punycode / zero-width | partial (link SLD normalisation) | Unicode skeleton + hostname checks | 1 | Visual similarity is evidence, not proof |
| APK analysis (hash, package, permissions, signature) | filename only | hash lookup first; static parse later | 4 | Never execute or install; no upload without explicit consent |
| File analysis (PDF/HTML/macro) | filename only | hash + structural flags | 4 | No sandboxed execution in the demo |
| Email header analysis (SPF/DKIM/DMARC, From/Reply-To/Return-Path, Received) | none | pure parser, new `email` agent | 2 | Only the receiving provider’s `Authentication-Results` is trustworthy; pasted headers can be forged |
| Phone enrichment (carrier, WhatsApp/Telegram, report history) | carrier prefix not used | offline prefix + local report ledger | 4 | No unofficial WhatsApp/Telegram probing; no claim an account is fake |
| Structured OCR (sender, amount, account, URL, timestamp, confidence) | image text extraction exists | typed `ExtractedEntities` | 2 | Confidence is reported, not hidden |
| Screenshot tampering | none | exploratory heuristics | 4 | High false-positive risk; shown as “indikasi”, never a score by itself |
| QRIS / QR | EMVCo TLV, CRC, merchant mismatch | decode from image input too | 1 | A valid QRIS can still belong to a scammer |
| Crypto wallet reputation | none | optional public-label lookup + local ledger | 4 | “Pernah dilaporkan”, never “aman” |
| Payment-account reputation | local reports only | local ledger; partner feed only if lawful | 4 | CekRekening.id has no open API; do not claim account safety |
| Cross-turn escalation state machine | `conversation.ts` exists | deepen stages and thresholds | 1 | Aggregator, not a second detector |
| Cross-case entity tracking | none | local ledger of hashed entities | 2 | Local to the device; opt-in; clearable |
| Scam-template fingerprinting | none | local shingle similarity | 3 | Paraphrases evade it; it is a supporting signal |
| Obfuscation normalisation (leetspeak, spaced letters, emoji, code-mix) | none | `normalizeWithMap()` | 1 | Must preserve evidence quotes via span map |
| Negation / warning / news / education context | partial warning guard | shared context guard | 1 | The bench owns the false-positive contract |
| Deepen Job, Marketplace, Investment, Love-scam packs | present | more rules + near-miss legit cases | 1–2 | One mechanism per signal; no rule without its own trap case |
| Link reputation without direct fetch | none | cached blocklist/verdict lookup | 3 | Never scrape a search engine; only official APIs or cached feeds |

---

## 3. Bench v2: the contract every phase is measured against

**Files:** `src/lib/scoring/bench-cases.ts`, `src/lib/scoring/eval.ts`, `src/lib/scoring/eval.test.ts`.

Target corpus: **120 cases**.

- **60 scam cases.** Five per modus family (12 × 5), plus cross-cutting cases that belong to no single modus.
- **60 legitimate cases.** At least one near-miss per detector: an OTP from the user’s own bank, a real flash sale, a security warning that *quotes* a scam, a news article about fraud, a legitimate `.apk` install instruction from an official store page, a real investment product disclosure, a courier notification with a tracking link, a bank promo with a short link, a family member asking for a transfer.
- **Strata, recorded in `tag`:** `text-obfuscated`, `code-mixed`, `typo`, `ocr-noise`, `screenshot`, `email-header`, `link-only`, `attachment`, `conversation`, `injection`, `legit-near-miss`, `news-warning`.
- **Rules:** no case may be reverse-designed from a regex; every scam case names at most its modus family; every legit case is abbreviated from a real-world shape.

New eval fields (additive, no scoring change):

```ts
interface EvalStratum {
  tag: string;
  total: number;
  caught: number;
}
interface EvalReport {
  // existing fields...
  byStratum: EvalStratum[];
  falsePositiveCases: string[]; // ids, for review
  missedCases: string[];       // ids, for review
}
```

**Gates for every phase:**

| Gate | Target | Where enforced |
|---|---|---|
| Scam recall (`mencurigakan+`) | ≥ 90% | `eval.test.ts` |
| False positives | ≤ 5% of legit cases | `eval.test.ts` |
| Modus classification | ≥ 85% where `wantModus` exists | `eval.test.ts` |
| Local verdict cost | slowest CPU < 50 ms | existing test |
| Network-free unit suite | zero `fetch` calls in `src/lib/scoring/**` | spy test |
| Enrichment latency | p95 ≤ 1.5 s, hard abort 2.5 s | route tests with fake timers |

If a phase cannot meet a gate, it ships behind a flag and the gate stays red. Do not lower the gate to make the phase green.

---

## 4. Phase 1 — local hardening (no network, no new dependency)

### D1. Bench v2 and baseline report

**Files:** `src/lib/scoring/bench-cases.ts`, `src/lib/scoring/eval.ts`, `src/lib/scoring/eval.test.ts`.

- [ ] Add the 63 missing cases in the strata above; keep the existing 57 untouched unless a case itself is wrong.
- [ ] Add `byStratum`, `missedCases`, `falsePositiveCases` to `EvalReport`.
- [ ] Test: each of the 12 modus families has ≥ 4 scam cases; each detector has ≥ 1 legit near-miss; totals are 60/60.
- [ ] Record the baseline report in the plan footer (date, caught, FP, classification, slowest CPU).

**Acceptance:** `npm test -- src/lib/scoring/eval.test.ts` prints the new totals, and no existing case changes expected modus.

### D2. `normalizeWithMap()` — resistance without losing the quote

**Files:** create `src/lib/scoring/normalize.ts`, `src/lib/scoring/normalize.test.ts`; modify `src/lib/scoring/message.ts`, `src/lib/scoring/job.ts`, `src/lib/scoring/marketplace.ts`.

Scope: text detectors only in this task. Link hostnames are normalised separately in `link.ts`; QRIS payloads must never be normalised.

Normalisation steps, in order:

1. Unicode NFKC.
2. Remove zero-width characters (`U+200B–U+200D`, `U+2060`, `U+FEFF`).
3. Collapse runs of separator characters **between letters** (`t.r.a.n.s.f.e.r` → `transfer`, `t r a n s f e r` → same) while keeping a `map[i] = originalIndex` for every output character.
4. Fold common leetspeak only inside sensitive tokens (`0→o`, `1→i/l`, `3→e`, `4→a`, `5→s`, `7→t`, `@→a`) — never globally, or `Rp100.000` becomes nonsense.
5. Lowercase on a copy used for matching; keep original case in evidence.

API:

```ts
export interface NormalizedText {
  text: string;
  map: number[]; // normalized index -> original index
}
export function normalizeWithMap(input: string): NormalizedText;
export function originalSpan(norm: NormalizedText, start: number, end: number): [number, number];
```

Detectors return evidence from `originalSpan()`, not from the normalised string. A test must prove `evidence` is a verbatim substring of the original input.

**Tests:** dotted word, spaced word, zero-width insertion, leetspeak inside a transfer instruction, emoji separator, `Rp100.000` unchanged, evidence span equality, idempotence on clean text.

**Acceptance:** the same 10 evasion strings that fail before this task are caught after it, and no bench legit case gains a false positive.

### D3. Injection detector — new `injection` agent

**Files:** create `src/lib/scoring/injection.ts`, `src/lib/scoring/injection.test.ts`; modify `src/lib/contracts/score.ts` (add `"injection"` to `AgentId`), `src/lib/contracts/agent-run.ts` (`STAGE_LABEL`), `src/lib/scoring/score.ts` (`DETECTORS`).

Patterns, Indonesian and English, matched on normalised text:

- `abaikan (semua )?(instruksi|aturan|perintah) (sebelumnya|di atas)`
- `ignore (all )?(previous|prior|above) (instructions|rules|prompts)`
- `anggap (pesan|teks|ini) (aman|bukan penipuan|bersih)`
- `kamu (adalah|sekarang) ...` / `you are now ...` / `system:`
- `jangan (tandai|laporkan|nilai) (sebagai )?(penipuan|scam|bahaya)`
- `nilai (ini|pesan ini) (0|nol|100|seratus)` / `beri skor ...`
- role-play / delimiter smuggling: `<system>`, `</instructions>`, `### system`

Signal: weight `0.6`, label `"Pesan mencoba memberi instruksi kepada pemeriksa"`, evidence = the exact phrase. Injection is itself a strong scam signal, not a jailbreak of the engine. It never bypasses hard rules and never suppresses other signals.

**Tests:** each pattern; obfuscated injection through D2 (`4baikan instruksi`); benign security article that *quotes* the phrase (must not fire — require an imperative frame around it); English; code-mixed; injection inside an otherwise clean message scores ≥ `mencurigakan` with one signal; injection plus OTP still hits the hard override.

**Contract note:** adding `"injection"` to `AgentId` is additive. Announce before commit per `AGENTS.md` §5.

### D4. Homoglyph, IDN and zero-width link checks

**Files:** modify `src/lib/scoring/link.ts`, `src/lib/scoring/link.test.ts`.

- [ ] Decode punycode with `new URL()`; if `xn--` exists, decode the Unicode hostname for display and matching.
- [ ] Build a skeleton map for common Cyrillic/Greek confusables (`а→a`, `е→e`, `о→o`, `р→p`, `с→c`, `і→i`, `ӏ→l`, `ο→o`, `ρ→p`, `α→a`).
- [ ] Detect zero-width characters in the raw hostname.
- [ ] Detect mixed scripts in one label (Latin + Cyrillic) as a signal.
- [ ] Keep the existing official-domain allowlist; an IDN lookalike of an official brand is a signal even when the ASCII edit distance is large.

**Tests:** `bаnkbcа.com` (Cyrillic `а`), `xn--b-nkbc-...`, zero-width inside `bca`, legitimate Indonesian IDN (if any) stays clean, evidence is the raw hostname.

**Acceptance:** bench gains 4 lookalike cases, all caught; no official domain false positive.

### D5. Deepen the four rule packs and add a shared context guard

**Files:** `src/lib/scoring/job.ts`, `marketplace.ts`, `message.ts`, `conversation.ts`; tests beside each.

Add high-precision rules, each with its own near-miss legit case:

- **Job:** “biaya administrasi”, “deposit”, “saldo tugas”, “top up untuk penarikan”, “penempatan luar negeri” with upfront fee, recruiter using personal account.
- **Marketplace:** payment outside the platform, overpayment/refund reversal, fake courier receipt, “rekening penjual berubah”, deposit before inspection.
- **Investment:** withdrawal tax/fee, “profit pasti”, “robot trading”, referral pyramid, licensed-brand impersonation.
- **Love scam:** refusal to video call, emergency transfer, gift/customs fee, money mule request.
- **Conversation:** escalation stages `lure → trust → pressure → payment → loss`, with a threshold per stage; a stage signal is generated only when the turn history contains the previous stage.

Shared context guard: a quoted warning (“waspada penipuan”, “jangan pernah berikan OTP”), a news headline, or an educational post must suppress the *matching* rule unless another independent mechanism fires. Implement as a pure `isQuotedWarning(text, match)` helper in `normalize.ts` or a new `context.ts`; do not add a scoring exception in `finalize`.

**Acceptance:** at least 8 new scam cases caught; at least 8 new legit near-miss cases remain clean; no rule ships without both.

### D6. QRIS and escalation extensions

**Files:** `src/lib/scoring/qris.ts`, `src/lib/scoring/conversation.ts`; tests.

- [ ] Decode QRIS from image OCR text when the vision route provides a payload; keep `parseQris()` as the only parser.
- [ ] Merchant-name mismatch: compare the QRIS merchant name against the claimed merchant in the surrounding text; mismatch is a signal.
- [ ] Static QRIS used for a variable amount at a merchant that should generate dynamic QRIS: supporting signal.
- [ ] Conversation: add explicit stage thresholds and a “stage jumped straight to payment” signal.

**Acceptance:** QRIS tests cover CRC fail, malformed TLV, merchant mismatch, valid official QRIS (clean), and a screenshot OCR path.

---

## 5. Phase 2 — new local channels

### D7. Email-header agent

**Files:** create `src/lib/scoring/email.ts`, `src/lib/scoring/email.test.ts`, `src/lib/scoring/email-fixtures.ts`; modify `AgentId`, `STAGE_LABEL`, `DETECTORS`.

Input detection: the pasted text looks like a header block (`Authentication-Results:`, `Received:`, `DKIM-Signature:`, `From:` plus `Subject:`). Body-only text stays with the existing detectors.

Signals:

| Check | Signal | Weight |
|---|---|---|
| `spf=fail` / `spf=softfail` | SPF failed | 0.35 |
| `dkim=fail` | DKIM failed | 0.35 |
| `dmarc=fail` | DMARC failed | 0.45 |
| `From` domain ≠ `Reply-To` domain | Reply-To redirects the reply | 0.30 |
| Display name claims a brand, address domain is not official | Display-name spoof | 0.50 |
| `Return-Path` domain differs from `From` | Envelope mismatch | 0.20 |
| `Received` chain contains a suspicious first hop | Originating host mismatch | 0.20 |

Rules: parse only; never fetch; never claim an email is forged from the body alone. If the header block contains no `Authentication-Results`, say `"Header autentikasi tidak ada"` as a *note*, not a signal.

**Tests:** SPF fail only, DKIM fail only, DMARC fail only, all pass (clean), Gmail-style `Authentication-Results`, Outlook-style, display-name spoof, reply-to mismatch, malformed headers, body-only input (detector skipped with an honest note).

**Acceptance:** the detector is `dilewati` with a note on body-only input, and no legit transactional-email fixture is flagged.

### D8. Structured OCR entities

**Files:** create `src/lib/scoring/extract.ts`, `src/lib/scoring/extract.test.ts`; modify `src/lib/companion/vision-client.ts` and its route only if the output shape needs a typed adapter.

`ExtractedEntities` (pure, no model call):

```ts
interface ExtractedEntities {
  sender?: string;
  amount?: { value: number; currency: "IDR" };
  account?: string;
  phone?: string;
  url?: string;
  timestamp?: string;
  confidence: number; // 0..1, from field completeness
}
```

The extraction runs over OCR text and produces `extraSignals` such as `"Nominal dan rekening muncul bersamaan"` only when both are present with reasonable confidence. It never replaces the detectors; it gives them cleaner input. Low confidence is surfaced, not hidden.

**Tests:** receipt screenshot, bank-transfer screenshot, chat screenshot, OCR noise (`Rp1OO.OOO`), missing fields, confidence floor.

### D9. Local entity ledger (cross-case memory)

**Files:** create `src/lib/ledger.ts`, `src/lib/ledger.test.ts`; modify `src/lib/companion/companion-chat.tsx` to feed `extraSignals`.

- Store hashed entities only: `sha256(normalized account|phone|domain|wallet)` with a device-local salt.
- Record when the user completes a check with a finding; never record clean messages.
- On a later check, matching entity produces `"Entitas ini pernah muncul di pemeriksaan berisiko"` (weight 0.25) — supporting evidence, never the sole reason for `tinggi`.
- UI: “Riwayat perangkat ini” with a clear/delete button. No server sync.
- Cap: 200 entries, LRU.

**Tests:** same account twice, different account, salt not exported, clear works, hashed value is not reversible in storage, no record for a clean message.

### D10. Scam-template similarity (local)

**Files:** create `src/lib/scoring/fingerprint.ts`, `fingerprint.test.ts`, `src/data/scam-templates.ts`.

- Normalise via D2, shingle into 5-grams, compare Jaccard similarity against 20–30 curated campaign templates.
- Similarity ≥ 0.55 → `"Polanya mirip kampanye penipuan yang pernah dilaporkan"` (weight 0.30).
- Templates are paraphrases, not exact bench cases; a template must not be generated from a bench case.
- No network.

**Tests:** paraphrase of a template fires; unrelated text does not; a legitimate bank promo with the same words but a different structure stays below threshold; a template never appears verbatim in the bench.

---

## 6. Phase 3 — network enrichment (additive, never blocking)

### D11. SSRF-safe URL verifier

**Files:** create `src/lib/server/url-guard.ts`, `src/lib/verify/link.ts`, `src/lib/contracts/verify.ts`, `src/app/api/verify-link/route.ts`; tests for each.

`url-guard.ts` must enforce, in order:

1. Scheme is `http` or `https`; no credentials in the URL.
2. Hostname is not an IP literal in a private, loopback, link-local, multicast or metadata range.
3. Resolve all `A`/`AAAA` records; reject if any resolved address is private/link-local/loopback/metadata (`169.254.169.254`).
4. Re-validate after every redirect; maximum 3 redirects.
5. `HEAD` first; optional `GET` with `Range: bytes=0-0`; no cookies, no auth, no JS, no browser.
6. Abort at 2.5 s; response body max 64 KB; custom user agent.
7. Return a typed result; never throw into the UI.

`verify/link.ts` returns, in parallel where possible:

- RDAP/WHOIS creation date → age in days (`https://rdap.org/domain/<host>`, configurable).
- DNS `A`/`AAAA`/`MX`/`TXT` presence (SPF/DMARC for the domain) via `node:dns/promises`.
- TLS certificate issuer and `notBefore` age via a `node:tls` socket using `getPeerCertificate()`; no HTTP body needed.
- Redirect chain (capped, each hop re-validated).
- Blocklist lookup (D12).

Contract:

```ts
interface LinkVerification {
  url: string;
  status: "ok" | "gagal" | "dilewati";
  domainAgeDays: number | null;
  tls: { issuer: string | null; ageDays: number | null } | null;
  redirects: string[];
  blocklists: { source: string; listed: boolean }[];
  signals: Signal[]; // additive only
  note?: string;     // honest reason when something was skipped
}
```

**Tests:** private IP literal, `localhost`, DNS rebinding fixture (mock resolve), redirect to metadata IP, too many redirects, timeout, TLS failure, valid public URL, blocklist hit, no keys configured.

**Acceptance:** the route never fetches a private address; a timeout returns `status: "gagal"` with a note and no signal; unit tests make zero real network calls.

### D12. Blocklists and cache

**Files:** `src/lib/verify/blocklists.ts`, `blocklists.test.ts`, optional key names in `.env.example`.

- **OpenPhish:** public feed, downloaded server-side, cached 15 minutes.
- **URLhaus:** API with `URLHAUS_AUTH_KEY`; if absent, source reports `"tidak tersedia"`.
- **Google Safe Browsing:** `GOOGLE_SAFE_BROWSING_KEY`; if absent, same honest status.
- **PhishTank:** only if a lawful API path exists; otherwise omit rather than scrape.
- Cache verdicts by normalised URL for 6 hours. Never cache a “clean” verdict longer than a “listed” verdict.
- Attribute sources in the UI (“Sumber: URLhaus, OpenPhish”) and in `THIRD_PARTY_NOTICES.md`.

**Tests:** listed URL, clean URL, source unavailable, cache hit/miss, no key leaks in logs.

### D13. Link reputation without direct fetch

**Files:** `src/lib/verify/reputation.ts`, `reputation.test.ts`.

For links that must not be fetched at all (user privacy, hostile host), use only cached public verdicts: blocklist cache, Safe Browsing cache, and an optional URL-reputation API when a key exists. **Do not scrape search engines.** If no cached verdict exists, the result is `"Belum ada reputasi tersimpan"`, not “safe”.

### D14. File and APK analysis

**Files:** create `src/lib/verify/file.ts`, `src/app/api/verify-file/route.ts`, tests; modify the attachment flow in `src/lib/companion/vision-client.ts` only for typed metadata.

Phase 3 scope:

- Local static checks: extension vs claimed type, double extension (`invoice.pdf.apk`), archive masquerade, filename homoglyph, size sanity.
- Hash-only reputation: compute SHA-256 in the browser; send only the hash; `MALWAREBAZAAR_AUTH_KEY` / `VIRUSTOTAL_API_KEY` optional. Never upload the file by default.
- APK metadata parsing is Phase 4 (needs a parser dependency). Do not claim package/signature checks before then.

**Tests:** double extension, MIME mismatch, hash hit, hash miss, API absent, no file bytes leave the client (spy on fetch body).

### D15. Phone and payment-account reputation — only with a lawful source

**Files:** `src/lib/verify/phone.ts` (offline prefix + local ledger), `src/lib/verify/account.ts` (local ledger only); tests.

- Offline: Indonesian mobile prefix, foreign number, shortcode; already partly covered by `identity.ts`.
- Do **not** probe WhatsApp/Telegram presence through unofficial endpoints.
- Do **not** claim an account is safe. Output only `"Pernah dilaporkan di perangkat ini"` or `"Belum ada laporan"`.
- A partner feed (bank/OJK/Komdigi) is a separate integration with legal review; keep the interface `AccountReputationSource` so it can be added without changing the engine.
- CekRekening.id has no open API; state that plainly in docs and UI.

### D16. Crypto wallet reputation

**Files:** `src/lib/verify/crypto.ts`, tests.

- Detect BTC/ETH/TRON address shapes; validate checksums where cheap.
- Optional public-label lookup only when a lawful API is configured; otherwise local ledger.
- Output `"Alamat pernah dilaporkan"`, never `"alamat aman"`.

### D17. Screenshot tampering — exploratory, outside the score

**Files:** `src/lib/verify/image-forensics.ts`, tests with synthetic fixtures.

- ELA (error-level analysis), compression-block consistency, font-height variance, repeated-region detection.
- Output an `"Indikasi edit"` note with a confidence band. It must **not** add score until the false-positive rate is measured on at least 40 real screenshots.
- If the confidence is low, say nothing.

**Acceptance:** no bench case changes score because of this module; the demo may show it only as a separate note.

---

## 7. Phase 4 — deferred, needs a partner or a dependency

These are planned but excluded from the pitch until they are measured:

| Item | Why deferred | Unblock condition |
|---|---|---|
| APK package/permission/signature parsing | needs an APK parser dependency and a safe fixture corpus | dependency review + 20 benign/malicious fixtures |
| PDF/HTML macro analysis | needs a sandbox and a parser | isolated worker, no execution |
| Phone reputation at scale | no lawful public source | data-partner agreement |
| Payment-account reputation at scale | no open CekRekening API | partner feed + legal review |
| Screenshot forensics in score | unknown false-positive rate | 40-image labelled set |
| Crypto wallet labels at scale | API cost and coverage | measured precision on 100 addresses |

---

## 8. Integration order and release slices

1. **Slice A (demo-safe):** D1 + D2 + D3 + D4 + D5 + D6. All local. No contract change except `"injection"`; no network. This is the slice that can ship before a competition demo.
2. **Slice B:** D7 + D8 + D9 + D10. New local channels; `email` agent added. Bench grows to 120.
3. **Slice C:** D11 + D12 + D13. Network enrichment behind `VERIFY_LINK=on`. The demo can run with it off; the trace says `dilewati` honestly.
4. **Slice D:** D14/D15/D16/D17 behind flags. Do not include in the accuracy claim until measured.

**Cross-plan dependency:** D5 and D10 produce more correlated signals. They must land **after or with** the validator in `docs/plans/2026-11-10-agent-architecture.md`; otherwise the OR-combination will over-score one mechanism.

---

## 9. Verification checklist

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test -- src/lib/scoring`
- [ ] `npm run verify`
- [ ] `runEval()` report recorded: scam total, caught, FP, classification, slowest CPU
- [ ] zero `fetch` in `src/lib/scoring/**` unit tests (spy)
- [ ] SSRF test suite: private IP, DNS rebinding, redirect to metadata, timeout
- [ ] every new rule has one scam case and one legit near-miss
- [ ] every new signal quotes a verbatim substring of the original input
- [ ] no accuracy number in UI or proposal that is not produced by `runEval()`
- [ ] keys are read from env, never committed; summaries use `[REDACTED]`

---

## 10. Risks and open questions

- **Network enrichment can become a privacy leak.** Send only the URL or hash; never the message, the sender, or the user’s identity. Cache locally; make the stage optional.
- **Blocklist absence is not safety.** The UI must distinguish “tidak tersedia” from “tidak ditemukan”.
- **Email headers can be forged.** Treat only the receiving provider’s authentication results as evidence; a pasted `Authentication-Results` is a claim.
- **Normalisation can create false positives.** The span map and the legit near-miss corpus are the guard.
- **Template similarity can overfit.** Templates are paraphrases, not bench cases; measure on held-out cases.
- **Screenshot forensics is the highest-risk item.** Keep it out of the score.
- **Open question:** does the competition demo need live verification at all? If the venue network is unreliable, demo Slice A and show Slice C as a recorded trace with an honest “opsional” label.
