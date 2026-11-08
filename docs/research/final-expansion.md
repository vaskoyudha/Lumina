# Final expansion research — what to merge, what to build (8 Nov 2026)

Four deep passes (Indonesian typology, GitHub repos, data sources, Indonesian NLP)
plus a direct GitHub survey. This supersedes the earlier shortlist in
`expansion-options.md`.

## Verdict

The product is strong on **text + links + sender**. The remaining value is not a
sixth detector. It is:

a. **Object coverage** — the same engine, pointed at an authority letter, a loan
   offer, a job ad, a QRIS payload, an account-takeover link.
b. **Explainability** — every fired rule returns a span, a reason code, and one
   concrete next action. Local competitors are verdict-first; this is the gap.
c. **Rescue flows** — the moment after "this is a scam" (OTP already shared,
   account already linked, loan already disbursed).

## What the 2025–2026 Indonesian waves look like

| Wave | Signal visible in the message | Offline verification |
|---|---|---|
| Pinjol ilegal + DC terror | "cair 10 menit, cukup KTP", threats to contacts | OJK licensed list (96 LPBBTI, Oct 2025), OJK 157 |
| Coretax / Bansos / BPJS / court | `.apk`, "update data", "tungaskan", fake summons | `pajak.go.id`, `.go.id`, call-center numbers |
| Account takeover ("vote for my child") | vote link + "enter the 6-digit code" | Linked Devices removal, never share code |
| Deepfake vishing | caller ID shows "Mama"/police, urgency, transfer | family safe-word + callback |
| Mule / judol recruitment | "buka rekening, upah Rp500rb", overseas no-diploma | `cekrekening.id`, `aduankonten.id` |
| Ponzi / auto-trading 2026 | "3%/hari", withdrawal blocked by "tax/fee" | OJK licensed list, DAK list |
| QRIS sticker swap / refund | QR in chat "for a refund", personal payee name | merchant name match, pay-vs-transfer confusion |

Sources: [OJK LPBBTI directory](https://ojk.go.id/id/kanal/iknb/data-dan-statistik/direktori/fintech/Pages/Direktori-LPBBTI-31-Oktober-2025.aspx) ·
[Satgas PASTI Appeninc/VID](https://www.ojk.go.id/id/berita-dan-kegiatan/info-terkini/Pages/Satgas-PASTI-Hentikan-Kegiatan-Penipuan-Appeninc,-VID,-dan-Sensenowai.aspx) ·
[DJP Coretax warning](https://www.antaranews.com/berita/4592890/djp-waspadai-modus-penipuan-coretax-atasnamakan-pejabat-djp) ·
[Kaspersky vote scam](https://www.kaspersky.com/blog/whatsapp-phishing-vote/54515/) ·
[PPATK mule accounts](https://nasional.kompas.com/read/2025/08/27/17584951/ppatk-ungkap-modus-operator-judol-kelabui-masyarakat-untuk-buka-rekening) ·
[OJK crypto shift](https://ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/Bappebti-Kemendag-Alihkan-Tugas-Aset-Keuangan-Digital-termasuk-Aset-Kripto-serta-Derivatif-Keuangan-kepada-OJK-dan-BI.aspx)

## GitHub repos worth merging (verified via GitHub API, 8 Nov 2026)

| Repo | Licence | What to take | How |
|---|---|---|---|
| [verssache/qris-dinamis](https://github.com/verssache/qris-dinamis) ~541★ | MIT | TypeScript EMVCo/QRIS TLV parse + CRC + generate | Port the parser into `lib/scoring/qris.ts`; keep the MIT header |
| [cingmen/scamurai](https://github.com/cingmen/scamurai) | MIT | `scamdex.json` + 8 scenario JSONs (bank-otp, pinjol, task, love, mule, marketplace, phishing, overseas job) | Copy data into `src/data/`; feeds learning + simulation |
| [espi0207/phish-lens](https://github.com/espi0207/phish-lens) | MIT | finding objects with severity, weight table, punycode/lookalike, shortener checks | Adapt into the signal shape already in `score.ts` |
| [hfzzd/waspada](https://github.com/hfzzd/waspada) | MIT | `ScamScorer` weighting idea + `scam_taxonomy` keyword data + `PhoneNormalizer` | Port semantics to TS; copy taxonomy |
| [remusao/tldts](https://github.com/remusao/tldts) | MIT | correct eTLD+1 / IDN parsing (`go.id`, `my.id`, `xn--`) | One dependency, or port the small list |
| [navyzuu/phishguard-extension](https://github.com/navyzuu/phishguard-extension) | MIT | on-device phishing + judol rules, TS | Borrow rule tables, not the extension |
| [libphonenumber](https://github.com/google/libphonenumber) metadata | Apache-2.0 | Indonesian number length/prefix rules (~10 KB) | Extract the `ID` block; no runtime dep |
| [Skiddle-ID/blocklist](https://github.com/Skiddle-ID/blocklist) | MIT | Indonesian blocklist snapshot (~10M rows, take a subset) | Curated subset only, with provenance |
| [zeyniaa/sinyara](https://github.com/zeyniaa/sinyara) | MIT | Closest existing product (Indonesian message/link/voice triage) | **Inspect first** — likely a peer entry; compare, don't blindly copy |
| [bopbi/indonesia-sms-spam-dataset](https://github.com/bopbi/indonesia-sms-spam-dataset) | CC0-1.0 | Indonesian SMS by category | Fixtures and lexicon mining |

**Do not copy code/data from:** `urlvet` (AGPL), `abdarafi/isspam` (GPL-3.0),
`lerasid/blocklist` (no licence), `alsyundawy/TrustPositif` (no licence),
OpenPhish (product use forbidden), URLhaus (no bulk copying), `hum4id/Cekdulu`
data (unlicensed), Sastrawi's dictionary (CC-BY-NC-SA).

## The more powerful shape: from checker to case triage

Six intakes, one engine, three outputs:

```
message · link · sender · job ad · seller · QRIS payload
                    │
        normalise → rule packs → evidence spans
                    │
   reason codes + "what would make this safer" + next action
                    │
   /darurat rescue flow · evidence PDF · related module
```

Every intake returns the same `ScoreResult` shape (contract untouched). New
packs only add rules and `extraSignals`; no new `AgentId`.

## Rule packs worth the 48 hours

### 1. Authority pack (S/M) — highest demo value

- `pajak.go.id` / `coretax` + `.apk|update data|tunggakan` outside `pajak.go.id`
- `bansos|pkh|bpnt|blt` + `daftar|klik|https://` outside `.go.id`
- `pengadilan|kejaksaan|polisi` + `transfer|rekening|denda`
- `bpjs` + `hapus tunggakan|kartu hangus` + link
- Every hit prints the real channel (1500200, 157, 1500-200) and "we never ask
  for OTP".

### 2. Pinjol pack (S)

- "cair X menit, cukup KTP, tanpa BI checking" cluster
- DC terror: `sebar|viralkan|foto|seluruh kontak` + `bayar|tagih`
- "uang kaget" flow: money arrived without an application → do not spend, report
- Fuzzy match brand against the 96 licensed LPBBTI names; unknown → "cek di OJK".

### 3. Account-takeover rescue (S)

- `vote|voting|suara` + `kode|OTP|verifikasi|login`
- Output is a 3-step rescue card (Linked Devices → remove → change password),
  not just a score.

### 4. QRIS inspector (S/M)

- Port the MIT TypeScript parser; walk TLV, recompute CRC-16/CCITT
- `http(s)://`/`wa.me` in payload → quishing branch
- tag 59 merchant name vs typed signboard name
- Banner: "CRC valid only means well-formed; match the merchant name."

### 5. Mule / judol recruitment (M)

- `buka|pinjam|sewa rekening` + `Rp500|upah|komisi`
- `tanpa ijazah|tanpa IPK` + `Kamboja|Filipina|luar negeri`
- Routes to `cekrekening.id` / `aduankonten.id`

## Engine upgrades (cheap, lift everything)

1. **Normalisation pre-pass** (S): NFKC → strip default-ignorable characters →
   lowercase → rejoin spaced letters (`O T P`) → digit/letter folding inside
   tokens. One pure function + fixtures. Kills the cheapest evasion.
2. **Evidence spans + reason codes** (S/M): `{ruleId, span:[start,end], label}`
   on every `Signal`; highlight the exact substring in the UI, plus one
   counterfactual sentence. Research says this beats a bare score.
3. **Transactional contradiction rule** (S): OTP-shaped message with no link and
   no credential request → downgrade; OTP + link/credential request → escalate.
   Biggest false-positive win (bank OTP confirmations are the usual casualty).
4. **Length-aware fuzzy matching** (M): exact under 6 chars, ≤1 edit at 6–9,
   ≤2 at ≥10; hand-written ~200-pair slang/abbreviation map. Skip Sastrawi.

## 48-hour plan (pick two, not five)

**Recommended:** normalisation + evidence spans, then the authority pack.
Together they change the story from "we check messages" to "we explain what will
happen next", and they reuse everything already shipped.

If a fourth person is free: QRIS inspector, because `qris-dinamis` gives a
correct MIT parser and the demo is visually unlike anything else in the room.

**Do not start now:** WhatsApp bot (Business API + server), browser extension
(store review), platform reputation API, deepfake audio detection, ML
classifier. Each is a subsystem, and the deadline is 10 Nov.

## Licence and honesty rules for the merge

a. Copy only MIT/Apache/CC0 code or data, and keep the licence header plus a
   note in `ATTRIBUTION.md`.
b. Facts from OJK .gov pages may be bundled as a small JSON with
   `source_url`, `published_at`, `retrieved_at`, `sha256`; never as a PDF dump.
c. A blocklist hit is a signal, not a verdict. TrustPositif also lists gambling
   and blocked content, not only scams.
d. Every snapshot must print "Snapshot 8 Nov 2026 · source published 6 Oct 2026
   · not live".
e. No scraping of WhatsApp/Telegram groups; UU 27/2022 PDP applies.
f. `sinyara` is a near-identical MIT project — check whether it is a peer entry
   before reusing anything, and cite it if we do.
