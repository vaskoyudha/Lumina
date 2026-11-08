# Agent orchestration & crew bubbles — implementation plan

**Status:** Implemented 8 November 2026

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the deterministic companion pipeline visible as a crew of specialist
agents in the chat: one orchestrator bubble, one persistent compact bubble per
detector, real status/findings/ms/note, per-agent identity colours, staged arrival,
and three new real detectors (job, marketplace, QRIS) that grow the crew.

**Architecture:** The frozen `AgentTrace` is already the whole contract. Three additive
`AgentId` values (`job`, `marketplace`, `qris`) unlock three pure detector modules. A
registry in `agents.ts` becomes the single source of truth for name, flavour, icon,
portrait, and identity token. A new `AgentRun` component renders the orchestrator plus
one bubble per present stage, with a display-only stagger over already-final statuses;
only the voice stage is ever live. `AgentTraceCard` is removed from the thread because
the bubbles supersede it.

**Tech Stack:** Next 16.4.5 App Router, React 19.3, TypeScript strict, Tailwind v4
(`@theme inline`), shadcn/ui (base **radix**, `asChild`), `motion@14.9.1`,
`lucide-react`, Biome 2.x, Jest 30 + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-08-agent-orchestration-design.md`
**Depends on:** `docs/superpowers/plans/2026-11-08-scam-expansion.md` (Tasks 1–6 land
first; this plan assumes its normalisation/evidence-span helpers exist).
**Execution context:** `main` carries unrelated uncommitted work. Create an isolated
worktree with `superpowers:using-git-worktrees` from `main`; do not commit in the dirty
tree. `npm run verify` is the gate there.

---

## Global Constraints

- **`src/lib/contracts/**` is frozen.** This plan makes one *additive* change
  (`AgentId` + `STAGE_LABEL`). AGENTS.md §5: tell the other three owners **before** the
  commit. No other field changes.
- **Scores, risk, and signals come only from `src/lib/scoring/score.ts`.** No component
  may compute or shift them. The UI prints `AgentStage` values.
- **Detectors are synchronous.** Never render `menunggu` and flip to `selesai`. The
  stagger is display-only; `berjalan` is only the voice stage.
- **No new dependencies.** Use `motion` (already installed), `lucide-react`, Tailwind.
- **No hex, no Tailwind palette literals.** Agent identity comes from
  `--lumina-agent-*`; status uses `brand`/`danger`/`warn`; structure uses `line`/
  `edge`/`panel`.
- **shadcn/ui first.** Compose existing primitives; do not write bespoke card markup
  when `Card`/`Badge`/`Button` fit. `asChild`, never `render`.
- **380 px first, 320 px verified.** No horizontal scroll; no fixed columns.
- **Reduced motion on every animation.** `useReducedMotion()` plus `motion-reduce:*`.
- **Honesty rules.** `dilewati`/`gagal` always show `note`; `selesai` + 0 findings is
  never "berhasil"; no "belum aktif".
- **New agents ship with bench cases in the same commit**, and `runEval()` is the only
  source of accuracy numbers.
- **`npm run verify` must pass before every commit.** Stop `next dev` before
  `next build`.
- **Copy is Indonesian**, calm, never blaming the victim.

---

## File structure

| Path | Responsibility | Task |
|---|---|---|
| `src/lib/contracts/score.ts` | add `job`, `marketplace`, `qris` to `AgentId` | 1 |
| `src/lib/contracts/agent-run.ts` | add three `STAGE_LABEL` entries | 1 |
| `src/lib/scoring/job.ts` | **new** — job-context rules | 2 |
| `src/lib/scoring/job.test.ts` | **new** — positives, gates, negatives | 2 |
| `src/lib/scoring/marketplace.ts` | **new** — commerce-context rules | 3 |
| `src/lib/scoring/marketplace.test.ts` | **new** | 3 |
| `src/lib/scoring/qris.ts` | **new** — TLV + CRC parser and signals | 4 |
| `src/lib/scoring/qris.test.ts` | **new** — vectors, quishing, sticker swap | 4 |
| `ATTRIBUTION.md` | MIT note for `verssache/qris-dinamis` | 4 |
| `src/lib/scoring/score.ts` | import and register the three detectors | 5 |
| `src/lib/scoring/bench-cases.ts` | job/marketplace/qris scams + traps | 5 |
| `src/lib/scoring/eval.test.ts` | measured totals | 5 |
| `src/lib/scoring/score.bench.test.ts` | measured comment | 5 |
| `src/components/companion/agents.ts` | registry, flavours, icons, portraits | 6 |
| `src/components/companion/agents.test.ts` | **new** — registry completeness | 6 |
| `src/components/companion/agents-detail-panel.tsx` | consume registry icon | 6 |
| `src/components/companion/agents-view.tsx` | consume registry portrait | 6 |
| `src/app/globals.css` | 16 agent tokens + `@theme inline` mapping | 7 |
| `AGENTS.md` | §3 agent-identity addendum | 7 |
| `src/components/companion/agent-run.tsx` | **new** — orchestrator + bubbles | 8 |
| `src/components/companion/agent-run.test.tsx` | **new** | 8, 9 |
| `src/components/companion/companion-chat.tsx` | mount `AgentRun`; remove trace card | 10 |
| `src/components/companion/agent-trace.tsx` | **delete** | 10 |
| `src/components/companion/agent-trace.test.tsx` | **delete** | 10 |
| `signal-panel.test.tsx`, `score-card.test.tsx`, `companion-entry.test.tsx`, `companion-chat.test.tsx`, `companion-shell.test.tsx` | derive counts, new labels | 11 |
| `STATUS.md` | measured totals | 12 |

---

## Task 1: Extend the frozen contract (additive) and tell the owners

**Files:**
- Modify: `src/lib/contracts/score.ts:28-34`
- Modify: `src/lib/contracts/agent-run.ts:46-75`
- Test: `src/lib/contracts/trace-contract.test.ts` (new, small)

- [ ] **Step 1: Announce the delta**

Send the other three stream owners the exact diff: three new `AgentId` values and
three `STAGE_LABEL` entries, additive only, no field renamed. Do not commit before
this. Record in the commit body: "additive contract delta for job/marketplace/qris
agents; no existing field changed."

- [ ] **Step 2: Add the ids**

Replace the `AgentId` union with:

```ts
export type AgentId =
  | "message"
  | "link"
  | "identity"
  | "conversation"
  | "job"
  | "marketplace"
  | "qris"
  | "evidence"
  | "scoring";
```

- [ ] **Step 3: Add the labels**

In `STAGE_LABEL`, after `conversation`, add:

```ts
  job: {
    label: "Lowongan Agent",
    task: "Biaya pendaftaran, tugas berbayar, dan penempatan luar negeri",
  },
  marketplace: {
    label: "Marketplace Agent",
    task: "Pembayaran di luar platform, harga tidak wajar, dan resi palsu",
  },
  qris: {
    label: "QRIS Agent",
    task: "Payload EMVCo, CRC, dan nama merchant yang tidak cocok",
  },
```

- [ ] **Step 4: Fill every exhaustive map so the type gate stays green**

`DetectorAgent` is `Exclude<AgentId, "scoring">`, so every `Record<DetectorAgent, …>`
and `Record<AgentId, …>` stops compiling the moment the union grows. The maps are:

| File | Map |
|---|---|
| `src/components/companion/agents.ts` | `AGENT_DISPLAY_NAME`, `AGENT_MECHANISM`, `AGENT_PURPOSE` |
| `src/components/companion/agents-detail-panel.tsx:36` | `AGENT_ICON` |
| `src/components/companion/agents-view.tsx:56` | `AGENT_PORTRAIT` |
| `src/components/companion/signal-panel.tsx:109,132` | `BRANCH_KIND`, `BRANCH_CONDITION` |

Add the three rows now, with the final copy. Task 6 replaces the duplicated rows with
the registry, but the rows must exist here or `npm run typecheck` fails.

**Keep `AGENT_SEQUENCE` at its current five entries in this commit.** The new
detectors do not run until Task 5, so the panel and score-card counts must stay
`… dari 5`; Task 5 flips the sequence and every count in the same commit.

`agents.ts` — add to each record:

```ts
// AGENT_DISPLAY_NAME
job: "Kiko",
marketplace: "Lala",
qris: "Ruru",

// AGENT_MECHANISM
job: ["Biaya pendaftaran", "Tugas berbayar", "Penempatan luar negeri"],
marketplace: ["Bayar di luar platform", "Harga tidak wajar", "Resi palsu"],
qris: ["TLV EMVCo", "CRC-16", "Nama merchant"],

// AGENT_PURPOSE
job: "Memeriksa tawaran kerja: biaya di muka, tugas like/subscribe, dan penempatan luar negeri yang membebani pelamar.",
marketplace: "Mengikuti alur jual-beli: pembayaran ke rekening pribadi, gift card, dan trik refund lewat QRIS.",
qris: "Membaca payload QRIS: struktur TLV, CRC, tautan di dalam QR, dan nama merchant yang tidak cocok.",
```

`agents-detail-panel.tsx` — import `Briefcase, QrCode, Store` from `lucide-react` and
add `job: Briefcase, marketplace: Store, qris: QrCode` to `AGENT_ICON`.

`agents-view.tsx` — widen the map and guard both render sites:

```ts
const AGENT_PORTRAIT: Record<DetectorAgent, string | null> = {
  message: "/brand/agents/message.jpg",
  // …
  job: null,
  marketplace: null,
  qris: null,
};
```

At `:543` and `:930`, replace the bare `<Image src={AGENT_PORTRAIT[agent]} … />` with
a shared `AgentFace` helper in the same file. Add the imports it needs:
`Briefcase, Fingerprint, Link2, type LucideIcon, MessageSquare, MessagesSquare,
QrCode, Quote, Store` from `lucide-react`, and make the wrapper span a flex box:

```tsx
const AGENT_ICON_FALLBACK: Record<DetectorAgent, LucideIcon> = {
  message: MessageSquare,
  link: Link2,
  identity: Fingerprint,
  conversation: MessagesSquare,
  job: Briefcase,
  marketplace: Store,
  qris: QrCode,
  evidence: Quote,
};

function AgentFace({ agent, size }: { agent: DetectorAgent; size: number }) {
  const portrait = AGENT_PORTRAIT[agent];
  if (portrait) {
    return (
      <Image
        src={portrait}
        alt=""
        width={size}
        height={size}
        className="size-full object-cover"
      />
    );
  }
  const Icon = AGENT_ICON_FALLBACK[agent];
  return <Icon aria-hidden className="size-1/2 text-brand-ink" />;
}
```

Change each wrapper span from `relative … overflow-hidden rounded-full` to
`flex items-center justify-center overflow-hidden rounded-full`; `size-full` replaces
the `fill` image. Task 6 deletes `AGENT_PORTRAIT` and `AGENT_ICON_FALLBACK` in favour
of the registry.

`signal-panel.tsx` — add to both records:

```ts
// BRANCH_KIND
job: "Lowongan",
marketplace: "Jual-beli",
qris: "QRIS",

// BRANCH_CONDITION
job: "Ada tawaran kerja atau tugas berbayar",
marketplace: "Ada percakapan jual-beli",
qris: "Ada payload QRIS",
```

- [ ] **Step 5: Add the completeness test**

Create `src/lib/contracts/trace-contract.test.ts`:

```ts
import { STAGE_LABEL } from "@/lib/contracts/agent-run";
import type { AgentId } from "@/lib/contracts/score";

const AGENT_IDS: AgentId[] = [
  "message",
  "link",
  "identity",
  "conversation",
  "job",
  "marketplace",
  "qris",
  "evidence",
  "scoring",
];

describe("trace contract", () => {
  it("labels every AgentId exactly once", () => {
    for (const id of AGENT_IDS) {
      expect(STAGE_LABEL[id]).toEqual({
        label: expect.any(String),
        task: expect.any(String),
      });
    }
  });

  it("keeps scoring and voice out of AgentId", () => {
    expect(STAGE_LABEL.voice.label).toBe("Penyusun bahasa");
    expect(AGENT_IDS).not.toContain("voice");
  });
});
```

- [ ] **Step 6: Verify**

```bash
npm run typecheck
npm test -- src/lib/contracts/trace-contract.test.ts
npm test -- src/components/companion
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/contracts/score.ts src/lib/contracts/agent-run.ts \
  src/lib/contracts/trace-contract.test.ts \
  src/components/companion/agents.ts \
  src/components/companion/agents-detail-panel.tsx \
  src/components/companion/agents-view.tsx \
  src/components/companion/signal-panel.tsx
git commit -m "feat(contracts): add job, marketplace, qris agent ids"
```

---

## Task 2: `job` detector

**Files:**
- Create: `src/lib/scoring/job.ts`
- Create: `src/lib/scoring/job.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/scoring/job.test.ts` with:

```ts
import { jobSignals } from "@/lib/scoring/job";

const has = (text: string, label: RegExp) =>
  jobSignals(text).signals.some((signal) => label.test(signal.label));

describe("jobSignals", () => {
  it("catches a training fee in a job ad", () => {
    const text =
      "Lowongan admin online, gaji Rp4 juta. Biaya pelatihan Rp150.000 ditransfer dulu ya.";
    expect(has(text, /biaya pendaftaran|pelatihan/i)).toBe(true);
  });

  it("catches pay-to-earn plus a deposit", () => {
    const text =
      "Tugas harian: like dan subscribe video. Komisi besar, cukup top up saldo Rp100.000 dulu.";
    expect(has(text, /tugas berbayar|top.?up|deposit/i)).toBe(true);
  });

  it("catches a personal e-wallet rail", () => {
    const text =
      "Lowongan kerja freelance. Pembayaran biaya pelatihan via DANA ke nomor 0812xxxx.";
    expect(has(text, /dompet digital|rekening pribadi|e-wallet/i)).toBe(true);
  });

  it("catches an overseas placement fee", () => {
    const text =
      "Penempatan kerja ke luar negeri, tanpa ijazah. Biaya visa dan tiket pesawat ditanggung pelamar.";
    expect(has(text, /luar negeri|visa|tiket/i)).toBe(true);
  });

  it("does not fire on a generic fee message with no job context", () => {
    expect(jobSignals("Biaya administrasi transfer Rp25.000.").signals).toEqual([]);
  });

  it("does not fire when the employer pays the fee", () => {
    const text =
      "Lowongan kerja resmi. Biaya tes kesehatan dan pelatihan ditanggung perusahaan.";
    expect(jobSignals(text).signals).toEqual([]);
  });

  it("does not score on context traits alone", () => {
    const text =
      "Lowongan staf gudang, langsung diterima tanpa wawancara, gaji Rp18 juta. Kirim CV ke hrd.rekrut@gmail.com.";
    expect(jobSignals(text).signals).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — it must fail**

```bash
npm test -- src/lib/scoring/job.test.ts
```

Expected: module not found.

- [ ] **Step 3: Implement `src/lib/scoring/job.ts`**

```ts
import type { Signal } from "@/lib/contracts/score";

/**
 * Lowongan Agent — fake job ads and pay-to-earn tasks.
 *
 * The job-context gate is the ownership boundary: generic fee language belongs
 * to the Message Agent, so a bank transfer confirmation cannot be re-scored by
 * this module. Every rule quotes the user's own words in `evidence`.
 */

const JOB_CONTEXT =
  /\b(?:lowongan|kerja|karier|recruiter|rekrut|kandidat|pelamar|gaji|upah|honor|interview|wawancara|bergabung|tim|posisi|magang|part\s*time|full\s*time|tugas\s+harian)\b/i;

const EMPLOYER_PAYS =
  /\b(?:ditanggung|gratis|tidak\s+dipungut|tanpa\s+biaya|gaji\s+dibayar)\b[^.!?]{0,30}(?:perusahaan|pemberi\s+kerja|kantor|employer)\b/i;

interface JobRule {
  id: string;
  weight: number;
  label: string;
  pattern: RegExp;
}

const JOB_RULES: readonly JobRule[] = [
  {
    id: "job-fee",
    weight: 0.75,
    label:
      "Meminta biaya pendaftaran/pelatihan sebelum ada surat tawaran kerja",
    pattern:
      /\b(?:biaya|bayar|transfer)\b[^.!?]{0,30}\b(?:pendaftaran|pelatihan|seragam|tes\s+kesehatan|akomodasi)\b/i,
  },
  {
    id: "job-pay-to-earn",
    weight: 0.85,
    label:
      "Tugas berbayar yang meminta top-up/deposit lebih dulu — pola tugas palsu",
    pattern:
      /\b(?:like|subscribe|follow|rating|ulasan|komisi|misi|tugas\s+harian)\b[\s\S]{0,120}\b(?:top\s*up|topup|deposit|tambah\s+saldo|setor)\b/i,
  },
  {
    id: "job-personal-rail",
    weight: 0.7,
    label:
      "Pembayaran ke dompet digital/rekening pribadi, bukan kanal perusahaan",
    pattern:
      /\b(?:dana|ovo|gopay|shopeepay|linkaja)\b[^.!?]{0,40}\b(?:transfer|bayar|kirim|nomor)\b|\brekening\s+pribadi\b|\batas\s+nama\b/i,
  },
  {
    id: "job-early-data",
    weight: 0.6,
    label:
      "Meminta KTP/OTP/data rekening sebelum tawaran kerja resmi diberikan",
    pattern:
      /\b(?:ktp|selfie\s+ktp|pin|otp|nomor\s+rekening|kartu\s+atm)\b[^.!?]{0,60}\b(?:daftar|lamar|sebelum|syarat|kirim)\b/i,
  },
  {
    id: "job-overseas-fee",
    weight: 0.7,
    label:
      "Penempatan luar negeri dengan biaya visa/tiket yang dibebankan ke pelamar",
    pattern:
      /\b(?:luar\s+negeri|visa|tiket\s+pesawat|paspor)\b[^.!?]{0,60}\b(?:biaya|ditanggung\s+pelamar|bayar)\b/i,
  },
  {
    id: "job-brand-lure",
    weight: 0.6,
    label:
      "Mengaku lowongan perusahaan resmi tetapi mengarah ke tautan chat/formulir",
    pattern:
      /\b(?:lowongan|rekrutmen)\b[^.!?]{0,40}\b(?:wa\.me|t\.me|forms\.gle|bit\.ly|blogspot)\b/i,
  },
];

const NOISY: readonly JobRule[] = [
  {
    id: "job-free-mail",
    weight: 0.2,
    label: "Pelamar diminta menghubungi surel gratis, bukan domain perusahaan",
    pattern: /\b[a-z0-9._%+-]+@(?:gmail|yahoo|outlook|hotmail)\.com\b/i,
  },
  {
    id: "job-no-interview",
    weight: 0.25,
    label: "Menjanjikan diterima langsung tanpa wawancara",
    pattern: /\b(?:langsung\s+diterima|tanpa\s+interview|tanpa\s+wawancara)\b/i,
  },
  {
    id: "job-salary-outlier",
    weight: 0.25,
    label: "Gaji jauh di atas wajar untuk posisi yang disebut",
    pattern: /\b(?:gaji|upah)\b[^.!?]{0,20}\b(?:rp\s*)?(?:1[5-9]|[2-9]\d)\s*juta\b/i,
  },
];

function matchRule(text: string, rule: JobRule): Signal | null {
  const match = text.match(rule.pattern);
  if (!match) return null;
  return {
    label: rule.label,
    weight: rule.weight,
    evidence: match[0].trim(),
    agent: "job",
  };
}

export interface JobResult {
  signals: Signal[];
  note?: string;
}

export function jobSignals(text: string): JobResult {
  if (!JOB_CONTEXT.test(text)) {
    return { signals: [], note: "Bukan tawaran kerja." };
  }

  const employerPays = EMPLOYER_PAYS.test(text);
  const strong: Signal[] = [];
  const noisy: Signal[] = [];

  for (const rule of JOB_RULES) {
    // "Biaya ditanggung perusahaan" is the opposite of a fee demand.
    if (employerPays && (rule.id === "job-fee" || rule.id === "job-overseas-fee")) {
      continue;
    }
    const signal = matchRule(text, rule);
    if (signal) strong.push(signal);
  }

  /*
   * Context traits only corroborate a strong rule. On their own they must not
   * push a legitimate ad over a risk band, so a recruiter using Gmail plus an
   * implausible salary is reported as context, never as a verdict.
   */
  if (strong.length > 0) {
    for (const rule of NOISY) {
      const signal = matchRule(text, rule);
      if (signal) noisy.push(signal);
    }
  }

  return { signals: [...strong, ...noisy] };
}
```

- [ ] **Step 4: Run the tests**

```bash
npm test -- src/lib/scoring/job.test.ts
```

All pass. If the overseas test does not fire, tighten `job-overseas-fee` to allow
`ditanggung pelamar` at either side of the fee word; do not loosen the employer gate.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring/job.ts src/lib/scoring/job.test.ts
git commit -m "feat(scoring): job-ad detector with a job-context gate"
```

---

## Task 3: `marketplace` detector

**Files:**
- Create: `src/lib/scoring/marketplace.ts`
- Create: `src/lib/scoring/marketplace.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { marketplaceSignals } from "@/lib/scoring/marketplace";

const has = (text: string, label: RegExp) =>
  marketplaceSignals(text).signals.some((signal) => label.test(signal.label));

describe("marketplaceSignals", () => {
  it("catches payment outside the marketplace", () => {
    const text =
      "Barang masih ada. Jangan lewat Shopee ya, transfer langsung ke rekening pribadi saya.";
    expect(has(text, /di luar marketplace|rekening pribadi/i)).toBe(true);
  });

  it("catches a gift-card/crypto rail", () => {
    const text =
      "Untuk DP barang, bayar pakai voucher Google Play atau USDT saja.";
    expect(has(text, /gift card|voucher|kripto/i)).toBe(true);
  });

  it("catches the QRIS refund trap", () => {
    const text =
      "Refund gagal, scan QRIS ini dulu supaya dana kembali ke rekening kamu.";
    expect(has(text, /refund|qris/i)).toBe(true);
  });

  it("treats an implausible price as context, not a verdict", () => {
    const text = "Dijual cepat, harga 80% di bawah pasaran, transfer dulu.";
    const signals = marketplaceSignals(text).signals;
    expect(signals.some((s) => /harga/i.test(s.label))).toBe(true);
    expect(Math.max(...signals.map((s) => s.weight))).toBeLessThan(0.6);
  });

  it("does not fire on a real marketplace receipt", () => {
    const text =
      "Pesanan Shopee sudah dibayar lewat Shopee. Paket dikirim dengan JNE, resi bisa dilacak di aplikasi.";
    expect(marketplaceSignals(text).signals).toEqual([]);
  });

  it("does not fire outside commerce context", () => {
    expect(marketplaceSignals("Transfer Rp50.000 ke rekening pribadi.").signals).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — it must fail**

```bash
npm test -- src/lib/scoring/marketplace.test.ts
```

- [ ] **Step 3: Implement `src/lib/scoring/marketplace.ts`**

```ts
import type { Signal } from "@/lib/contracts/score";

/**
 * Marketplace Agent — fake sellers and off-platform payment.
 *
 * Domains and typosquats belong to the Link Agent; this module deliberately
 * does not re-run them. "New account / no badge / no address" cannot be seen
 * in a pasted message, so it is not detected here — the gap is stated rather
 * than faked.
 */

const SHOP_CONTEXT =
  /\b(?:jual|dijual|harga|murah|beli|barang|toko|seller|penjual|pembeli|ongkir|paket|kiriman|stok|pre\s*order|dp|cod|marketplace|shopee|tokopedia|lazada|bukalapak|blibli|tiktok\s*shop|refund|pengembalian\s+dana|qris)\b/i;

const PAID_ON_PLATFORM =
  /\b(?:shopee|tokopedia|lazada|bukalapak|blibli|tiktok\s*shop)\b[^.!?]{0,60}\b(?:dibayar|bayar|checkout|pesanan|pesan)\b|\b(?:dibayar|bayar|checkout|pesanan|pesan)\b[^.!?]{0,60}\b(?:shopee|tokopedia|lazada|bukalapak|blibli|tiktok\s*shop)\b/i;

interface ShopRule {
  id: string;
  weight: number;
  label: string;
  pattern: RegExp;
}

const SHOP_RULES: readonly ShopRule[] = [
  {
    id: "mkt-offplatform",
    weight: 0.7,
    label:
      "Mengajak bayar di luar marketplace, ke rekening pribadi penjual",
    pattern:
      /\b(?:jangan|tidak)\s+(?:lewat|via|di)\s+(?:shopee|tokopedia|lazada|bukalapak|blibli|tiktok\s*shop|marketplace|aplikasi)\b|\bayar\s+di\s+luar\s+(?:marketplace|aplikasi)\b|\btransaksi\s+di\s+luar\s+(?:marketplace|aplikasi)\b/i,
  },
  {
    id: "mkt-personal-rail",
    weight: 0.6,
    label:
      "Pembayaran ke dompet digital/nama pribadi, bukan rekening toko resmi",
    pattern:
      /\b(?:dana|ovo|gopay|shopeepay|linkaja)\b[^.!?]{0,40}\b(?:transfer|bayar|kirim)\b|\ba\.n\.?\s+[A-Z][a-z]+\b/i,
  },
  {
    id: "mkt-giftcard-crypto",
    weight: 0.7,
    label:
      "Meminta gift card atau kripto — pembayaran yang tidak bisa ditarik kembali",
    pattern:
      /\b(?:gift\s*card|voucher\s+google\s+play|bitcoin|usdt|crypto|kripto)\b/i,
  },
  {
    id: "mkt-qris-refund",
    weight: 0.7,
    label:
      "Trik 'refund' lewat QRIS — pembayaran keluar, bukan dana yang kembali",
    pattern:
      /\b(?:refund|pengembalian\s+dana|pembatalan)\b[^.!?]{0,60}\b(?:scan|qris|qr)\b|\bqris\b[^.!?]{0,60}\b(?:refund|pengembalian)\b/i,
  },
  {
    id: "mkt-underprice",
    weight: 0.35,
    label: "Harga jauh di bawah pasaran — umpan yang lazim pada toko palsu",
    pattern:
      /\b(?:harga|murah)\b[^.!?]{0,30}\b(?:\d{2}\s*%|di\s+bawah\s+pasaran)\b/i,
  },
  {
    id: "mkt-dp",
    weight: 0.45,
    label: "Meminta DP/uang muka lewat transfer sebelum barang dikirim",
    pattern:
      /\b(?:dp|uang\s+muka|booking\s+fee)\b[^.!?]{0,20}\b(?:\d{1,3}\s*%|rp\s*\d+)\b[^.!?]{0,30}\b(?:transfer|bayar)\b/i,
  },
  {
    id: "mkt-fake-resi",
    weight: 0.35,
    label: "Nomor resi tidak bisa dilacak — bukti kirim yang tidak nyata",
    pattern:
      /\b(?:resi|nomor\s+kirim)\b[^.!?]{0,40}\b(?:belum|tidak\s+bisa\s+dilacak|tidak\s+valid)\b/i,
  },
  {
    id: "mkt-urgency",
    weight: 0.3,
    label: "Menekan dengan sisa stok/waktu agar pembeli segera transfer",
    pattern:
      /\b(?:sisa\s+\d+|terakhir|hari\s+ini)\b[^.!?]{0,40}\b(?:transfer|bayar)\b/i,
  },
];

export interface MarketplaceResult {
  signals: Signal[];
  note?: string;
}

export function marketplaceSignals(text: string): MarketplaceResult {
  if (!SHOP_CONTEXT.test(text)) {
    return { signals: [], note: "Bukan percakapan jual-beli." };
  }
  if (PAID_ON_PLATFORM.test(text)) {
    return { signals: [] };
  }

  const signals: Signal[] = [];
  for (const rule of SHOP_RULES) {
    const match = text.match(rule.pattern);
    if (match) {
      signals.push({
        label: rule.label,
        weight: rule.weight,
        evidence: match[0].trim(),
        agent: "marketplace",
      });
    }
  }
  return { signals };
}
```

- [ ] **Step 4: Run**

```bash
npm test -- src/lib/scoring/marketplace.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring/marketplace.ts src/lib/scoring/marketplace.test.ts
git commit -m "feat(scoring): marketplace detector for off-platform payment"
```

---

## Task 4: `qris` detector

**Files:**
- Create: `src/lib/scoring/qris.ts`
- Create: `src/lib/scoring/qris.test.ts`
- Create/Modify: `ATTRIBUTION.md`

- [ ] **Step 1: Write the failing tests**

Use two literal vectors, both structurally valid EMVCo TLV with a real CRC. Do not
compute the CRC inside the test: a helper that reimplements CRC-16 would only test
itself, and a wrong length prefix would hide the bug.

```ts
import { extractQrisPayload, parseQris, qrisSignals } from "@/lib/scoring/qris";

/** Tag 59 = "TOKO JAYA" (9). CRC-16/CCITT over everything through 6304 = 2908. */
const VALID =
  "00020101021226660014ID.CO.QRIS.WWW01189360001400000000000215ID10240000000000303UMI5204581253033605802ID5909TOKO JAYA6007JAKARTA61051234563042908";

/** Tag 59 = "https://evil.example" (20). CRC recomputed for the longer value = 41C7. */
const URI =
  "00020101021226660014ID.CO.QRIS.WWW01189360001400000000000215ID10240000000000303UMI5204581253033605802ID5920https://evil.example6007JAKARTA610512345630441C7";

describe("qris", () => {
  it("extracts a payload from surrounding text", () => {
    expect(extractQrisPayload(`Bayar ini: ${VALID} ya`)).toBe(VALID);
  });

  it("parses TLV, merchant fields, and a valid CRC", () => {
    const parsed = parseQris(VALID);
    expect(parsed).not.toBeNull();
    expect(parsed?.merchantName).toBe("TOKO JAYA");
    expect(parsed?.currency).toBe("360");
    expect(parsed?.country).toBe("ID");
    expect(parsed?.crcValid).toBe(true);
  });

  it("flags a URL inside the payload as quishing", () => {
    const result = qrisSignals(URI);
    expect(result.signals.some((s) => /quishing|tautan/i.test(s.label))).toBe(true);
  });

  it("flags a broken CRC without calling a valid payload legitimate", () => {
    const broken = `${VALID.slice(0, -4)}0000`;
    const result = qrisSignals(broken);
    expect(result.signals.some((s) => /crc/i.test(s.label))).toBe(true);
    expect(result.signals.some((s) => /tidak.*aman|bersih|legit/i.test(s.label))).toBe(false);
  });

  it("reports a skipped stage when there is no payload", () => {
    const result = qrisSignals("Tolong bayar ke QRIS toko itu ya.");
    expect(result.signals).toEqual([]);
    expect(result.note).toMatch(/payload/i);
  });
});
```

Both payloads are structurally valid EMVCo TLV. Tag `26` has length `66`, composed of
`0014ID.CO.QRIS.WWW` (18) + `0118` + 18 digits (22) + `0215ID1024000000000` (19) +
`0303UMI` (7); then `52/53/58/59/60/61` and `6304`. `VALID` uses tag 59 length
`09`; `URI` uses length `20` and a different CRC, so the substitution does not corrupt
the TLV walk. Both were verified on 2026-11-08 with the parser in Step 3 (clean walk,
CRC match). The merchant identity is deliberately generic — never invent a real
merchant.

If a real QRIS sample is available, use it and record its source in a comment.

- [ ] **Step 2: Run — it must fail**

```bash
npm test -- src/lib/scoring/qris.test.ts
```

- [ ] **Step 3: Implement `src/lib/scoring/qris.ts`**

```ts
import type { Signal } from "@/lib/contracts/score";

/**
 * QRIS Agent — EMVCo merchant-presented QR, parsed locally.
 *
 * Parser ported from verssache/qris-dinamis (MIT). See ATTRIBUTION.md.
 * A valid CRC only proves the payload is well formed; it says nothing about
 * who owns the merchant account. The UI prints that sentence next to the
 * result, and this module never treats a valid CRC as a clean verdict.
 */

const CRC_TABLE = (() => {
  const table = new Uint16Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    table[i] = crc & 0xffff;
  }
  return table;
})();

function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc =
      ((crc << 8) & 0xffff) ^
      CRC_TABLE[((crc >> 8) ^ input.charCodeAt(i)) & 0xff];
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

interface Tlv {
  tag: string;
  value: string;
}

function parseTlv(payload: string): Tlv[] | null {
  const out: Tlv[] = [];
  let i = 0;
  while (i < payload.length) {
    if (i + 4 > payload.length) return null;
    const tag = payload.slice(i, i + 2);
    const length = Number(payload.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || !Number.isInteger(length)) return null;
    const start = i + 4;
    const end = start + length;
    if (end > payload.length) return null;
    out.push({ tag, value: payload.slice(start, end) });
    i = end;
  }
  return out;
}

export interface QrisParse {
  tags: Tlv[];
  merchantName: string | null;
  currency: string | null;
  country: string | null;
  crcValid: boolean;
  hasUri: boolean;
}

export function extractQrisPayload(text: string): string | null {
  const start = text.indexOf("000201");
  if (start === -1) return null;
  const rest = text.slice(start);
  const end = rest.search(/6304[0-9A-Fa-f]{4}/);
  if (end === -1) return null;
  return rest.slice(0, end + 8).trim();
}

export function parseQris(payload: string): QrisParse | null {
  if (!payload.startsWith("000201") || payload.length < 20) return null;
  const tags = parseTlv(payload);
  if (!tags) return null;

  const value = (tag: string) =>
    tags.find((entry) => entry.tag === tag)?.value ?? null;
  const crcIndex = payload.lastIndexOf("6304");
  const body = crcIndex === -1 ? "" : payload.slice(0, crcIndex + 4);
  const expected = payload.slice(crcIndex + 4, crcIndex + 8);
  const crcValid = body !== "" && crc16(body) === expected.toUpperCase();

  return {
    tags,
    merchantName: value("59"),
    currency: value("53"),
    country: value("58"),
    crcValid,
    hasUri: /(?:https?:\/\/|wa\.me\/|[a-z][a-z0-9+.-]*:\/\/)/i.test(payload),
  };
}

export interface QrisResult {
  signals: Signal[];
  note?: string;
}

export function qrisSignals(text: string): QrisResult {
  const payload = extractQrisPayload(text);
  if (!payload) return { signals: [], note: "Tidak ada payload QRIS." };
  const parsed = parseQris(payload);
  if (!parsed) {
    return { signals: [], note: "Payload QRIS tidak bisa dibaca." };
  }

  const signals: Signal[] = [];
  const evidence = payload.slice(0, 120);

  if (parsed.hasUri) {
    signals.push({
      label:
        "Payload QRIS memuat tautan — QR pembayaran tidak pernah mengarah ke situs",
      weight: 0.9,
      evidence,
      agent: "qris",
    });
  }
  if (!parsed.crcValid) {
    signals.push({
      label: "CRC QRIS tidak cocok — payload bisa rusak atau diubah",
      weight: 0.6,
      evidence,
      agent: "qris",
    });
  }
  if (parsed.currency && parsed.currency !== "360") {
    signals.push({
      label: "Mata uang QRIS bukan Rupiah (tag 53 ≠ 360)",
      weight: 0.4,
      evidence,
      agent: "qris",
    });
  }
  if (parsed.country && parsed.country !== "ID") {
    signals.push({
      label: "Negara QRIS bukan Indonesia (tag 58 ≠ ID)",
      weight: 0.4,
      evidence,
      agent: "qris",
    });
  }

  return { signals };
}
```

- [ ] **Step 4: Add the sticker-swap test and merchant-name comparison**

Append to `qris.test.ts`:

```ts
it("flags a merchant name that does not match the typed name", () => {
  const text = `Bayar ke Warung Bu Siti: ${VALID}`;
  const result = qrisSignals(text);
  expect(result.signals.some((s) => /nama merchant|stiker/i.test(s.label))).toBe(true);
});

it("does not flag a matching merchant name", () => {
  const text = `Bayar ke Toko Jaya: ${VALID}`;
  const result = qrisSignals(text);
  expect(result.signals.some((s) => /nama merchant|stiker/i.test(s.label))).toBe(false);
});
```

Implement the check in `qrisSignals` before returning:

```ts
const typed = text.replace(payload, " ");
const named =
  /\b(?:warung|toko|merchant|atas\s+nama|a\.n\.?)\b[^.!?]{0,40}/i.exec(typed)?.[0] ??
  null;
if (parsed.merchantName && named) {
  const tokens = (value: string) =>
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4);
  const a = new Set(tokens(parsed.merchantName));
  const overlap = tokens(named).some((token) => a.has(token));
  if (!overlap) {
    signals.push({
      label:
        "Nama merchant di QRIS tidak cocok dengan nama yang disebut — kemungkinan stiker diganti",
      weight: 0.5,
      evidence: parsed.merchantName,
      agent: "qris",
    });
  }
}
```

- [ ] **Step 5: Make the no-payload note honest about images**

`/api/companion/vision` copies text out of an image; it does not decode a QR matrix.
A user who pastes a photo of a QRIS sticker therefore reaches this detector with no
payload. Say so instead of implying the QR was checked:

```ts
if (!payload) {
  const mentionsQr = /\b(?:qris|qr\s*code|scan\s+qr)\b/i.test(text);
  return {
    signals: [],
    note: mentionsQr
      ? "Tidak ada payload QRIS di teks. Pembacaan QR dari gambar belum tersedia — tempel teks payload-nya."
      : "Tidak ada payload QRIS.",
  };
}
```

The existing unit test still passes on `/payload/i`.

- [ ] **Step 6: Attribution**

Create `ATTRIBUTION.md` if absent, or append:

```md
## verssache/qris-dinamis

- Source: https://github.com/verssache/qris-dinamis
- Licence: MIT
- Used in: `src/lib/scoring/qris.ts` (EMVCo TLV walk and CRC-16/CCITT)
- Retrieved: 2026-11-08
```

- [ ] **Step 7: Run and commit**

```bash
npm test -- src/lib/scoring/qris.test.ts
git add src/lib/scoring/qris.ts src/lib/scoring/qris.test.ts ATTRIBUTION.md
git commit -m "feat(scoring): local QRIS payload parser and quishing rules"
```

---

## Task 5: Register the detectors, add bench cases, re-measure

**Files:**
- Modify: `src/lib/scoring/score.ts:1-12`, `:209-238`
- Modify: `src/lib/scoring/bench-cases.ts`
- Modify: `src/lib/scoring/eval.test.ts`, `src/lib/scoring/score.bench.test.ts`

- [ ] **Step 1: Import the modules**

Add to the imports in `score.ts`:

```ts
import { jobSignals } from "@/lib/scoring/job";
import { marketplaceSignals } from "@/lib/scoring/marketplace";
import { qrisSignals } from "@/lib/scoring/qris";
```

- [ ] **Step 2: Insert the detectors after `conversation`**

```ts
  {
    id: "job",
    run: ({ text }) => jobSignals(text),
  },
  {
    id: "marketplace",
    run: ({ text }) => marketplaceSignals(text),
  },
  {
    id: "qris",
    run: ({ text }) => qrisSignals(text),
  },
```

Order is load-bearing: generic text/link/identity/conversation first, context packs
after, so the reader's mental order matches `AGENT_SEQUENCE`.

- [ ] **Step 3: Add bench cases**

Append to `SCAM_CASES` (semantic ids, independent of the scoring plan's `sNN`):

```ts
  {
    id: "job-s01",
    tag: "lowongan biaya",
    wantModus: "lowongan-tugas-berbayar",
    text: "Lowongan admin online, gaji Rp6 juta. Biaya pelatihan Rp150.000 ditransfer dulu sebelum training.",
  },
  {
    id: "job-s02",
    tag: "tugas like berbayar",
    wantModus: "lowongan-tugas-berbayar",
    text: "Tugas harian like dan subscribe video. Komisi Rp50.000 per tugas, top up saldo Rp100.000 dulu untuk membuka level.",
  },
  {
    id: "job-s03",
    tag: "penempatan luar negeri",
    wantModus: "lowongan-tugas-berbayar",
    text: "Penempatan kerja ke luar negeri tanpa ijazah. Biaya visa dan tiket pesawat ditanggung pelamar.",
  },
  {
    id: "mkt-s01",
    tag: "bayar luar marketplace",
    wantModus: "jual-beli-palsu",
    text: "Barang ready. Jangan lewat Shopee ya, transfer langsung ke rekening pribadi saya biar lebih murah.",
  },
  {
    id: "mkt-s02",
    tag: "gift card",
    wantModus: "jual-beli-palsu",
    text: "Untuk DP sepatu, bayar pakai voucher Google Play atau USDT. Nanti sisanya bisa dicicil.",
  },
  {
    id: "mkt-s03",
    tag: "refund qris",
    wantModus: "quishing-qris",
    text: "Refund gagal karena sistem. Scan QRIS ini dulu supaya dana kembali ke rekening kamu.",
  },
  {
    id: "qris-s01",
    tag: "qris quishing",
    wantModus: "quishing-qris",
    text: "Scan QRIS ini untuk membayar: 00020101021226660014ID.CO.QRIS.WWW01189360001400000000000215ID10240000000000303UMI5204581253033605802ID5920https://evil.example6007JAKARTA610512345630441C7",
  },
  {
    id: "qris-s02",
    tag: "qris crc rusak",
    wantModus: "quishing-qris",
    text: "Scan QRIS ini: 00020101021226660014ID.CO.QRIS.WWW01189360001400000000000215ID10240000000000303UMI5204581253033605802ID5909TOKO JAYA6007JAKARTA61051234563040000",
  },
  {
    id: "qris-s03",
    tag: "qris stiker diganti",
    text: "Bayar ke Warung Bu Siti: 00020101021226660014ID.CO.QRIS.WWW01189360001400000000000215ID10240000000000303UMI5204581253033605802ID5909TOKO JAYA6007JAKARTA61051234563042908",
  },
```

`qris-s03` has no `wantModus` on purpose: the sticker-swap finding is real, but the
payload's own `ID.CO.QRIS` token makes the keyword classifier say `quishing-qris`, and
pinning that would encode a label the finding does not mean. It counts toward recall,
not classification. The merchant is deliberately generic; never use a real one.

QRIS fixtures carry real CRCs: `qris-s01` is a valid payload whose tag 59 is a URL
(length `20`), so it is a quishing case; `qris-s02` is a valid TLV with a deliberately
wrong CRC (`0000`), so the mismatch is the signal. The comment records which. Add
three legitimate traps:

```ts
  {
    id: "job-l01",
    tag: "lowongan resmi",
    text: "Lowongan staf administrasi di PT Sumber Rejeki. Biaya tes kesehatan dan pelatihan ditanggung perusahaan. Kirim CV ke karier@sumberrejeki.co.id.",
  },
  {
    id: "mkt-l01",
    tag: "struk marketplace asli",
    text: "Pesanan Shopee sudah dibayar lewat Shopee. Paket dikirim dengan JNE dan resi bisa dilacak di aplikasi.",
  },
  {
    id: "qris-l01",
    tag: "qris merchant cocok",
    text: "Bayar ke Toko Jaya: 00020101021226660014ID.CO.QRIS.WWW01189360001400000000000215ID10240000000000303UMI5204581253033605802ID5909TOKO JAYA6007JAKARTA61051234563042908",
  },
```

The trailing CRCs are the measured values for these exact bodies (`2908` for VALID,
`41C7` for the URI payload); do not retype them by hand. If a body changes, recompute
and update the unit fixture in the same commit.

- [ ] **Step 3a: Fix the corpus header comment**

The top of `bench-cases.ts` hard-codes the corpus size ("45 messages … (20 scams) plus
25 messages"). It goes stale in this commit. Count the arrays after the additions and
write the real numbers; do not copy a number from this plan, because the scoring plan
may already have added cases to the same file:

```bash
node -e "const t=require('fs').readFileSync('src/lib/scoring/bench-cases.ts','utf8');const s=t.match(/export const SCAM_CASES[\s\S]*?\n\];/)[0];const l=t.match(/export const LEGIT_CASES[\s\S]*?\n\];/)[0];console.log((s.match(/id: \"/g)||[]).length,(l.match(/id: \"/g)||[]).length)"
```

- [ ] **Step 3b: Flip the sequence and every count in this commit**

`AGENT_SEQUENCE` moves from five to eight only now, because the detectors exist. Edit
`src/components/companion/agents.ts`:

```ts
export const AGENT_SEQUENCE: DetectorAgent[] = [
  "message",
  "link",
  "identity",
  "conversation",
  "job",
  "marketplace",
  "qris",
  "evidence",
];
```

Then update every consumer, in this same commit:

a. **Tests that pin the count.** Replace `/\d+ dari 5 agen/` with a regex built from
   `AGENT_SEQUENCE.length` in `signal-panel.test.tsx`, `score-card.test.tsx`,
   `companion-entry.test.tsx`, and `companion-chat.test.tsx`; add the
   `AGENT_SEQUENCE` import to the last three (only `signal-panel.test.tsx` has it
   today).
b. **`agents-view.tsx` layout.** The horizontal fan-out and converge buses assume five
   columns: `FanoutConnector` (`:147`, defined `:768`), `ScoreConverge` (`:176`,
   defined `:809`), `lg:grid-cols-5`, `05 agen`, `5 agen`, `kelima agen`. Neither
   component is used anywhere else, so **delete both functions and their JSX** and
   keep the plain vertical `Connector` above and below the grid — a five-lane bus
   cannot draw eight lanes, and a `length === 5` branch would be dead code from the
   moment it lands. Change the lane grid to `sm:grid-cols-2 lg:grid-cols-4`, and
   replace the hard-coded counts with
   `{String(AGENT_SEQUENCE.length).padStart(2, "0")} agen` and
   `{AGENT_SEQUENCE.length} agen · 3 langkah`. Remove any import that only the
   deleted components used, or Biome's `noUnusedVariables` fails the gate.
c. **`agents-detail-panel.tsx` copy.** "Lima pemeriksa di bawah satu orkestrator" →
   `${AGENT_SEQUENCE.length} pemeriksa di bawah satu orkestrator`.
d. **`src/lib/scoring/trace.test.ts`.** The stage list gains `job`, `marketplace`,
   `qris` before `scoring`.

Run `npm test -- src/components/companion src/lib/scoring` before committing.

- [ ] **Step 4: Run the eval and read the actual numbers**

```bash
npm test -- src/lib/scoring/eval.test.ts
```

The failure diff prints the real totals. Update `eval.test.ts` assertions and the
comment in `score.bench.test.ts` to those values. Do **not** type a target number by
hand; if a case does not behave as intended, fix the rule or the case, then re-run.

- [ ] **Step 5: Check false positives loudly**

```bash
npm test -- src/lib/scoring/eval.test.ts
```

Requirement: the existing legitimate corpus stays at **0 risky**. If the new detectors
add a false positive, tighten the context gate rather than raising the threshold.

- [ ] **Step 6: Resolve ownership collisions**

For every bench case, collect `(agent, evidence)` for signals with `weight > 0` and
assert no two agents quote the same substring. Add this to `eval.test.ts`:

```ts
import { LEGIT_CASES, SCAM_CASES } from "@/lib/scoring/bench-cases";
import { scoreText } from "@/lib/scoring/score";

it("never lets two agents quote the same evidence", () => {
  for (const testCase of [...SCAM_CASES, ...LEGIT_CASES]) {
    const result = scoreText({ text: testCase.text });
    const quoted = new Map<string, string>();
    for (const signal of result.signals) {
      if (signal.weight <= 0 || !signal.evidence) continue;
      const agent = signal.agent ?? "scoring";
      const previous = quoted.get(signal.evidence);
      expect(previous === undefined || previous === agent).toBe(true);
      quoted.set(signal.evidence, agent);
    }
  }
});
```

Known collisions to resolve by narrowing the **new** rule, never by lowering the old
weight:

a. `message/off-marketplace` vs `marketplace/mkt-offplatform` on `rekening pribadi`.
   The marketplace rule now requires a platform token; keep it that way. Both may still
   fire on different substrings (one names the personal account, the other names
   leaving the platform) — that is two real facets, not a duplicate, and the test
   allows it because the evidence strings differ.
b. `message/off-marketplace` vs `marketplace/mkt-dp` on `dp dulu`. Let the message rule
   keep the bare phrase; make `mkt-dp` require a transfer verb *and* a percentage or
   amount (`dp 50%`, `uang muka Rp200.000`).
c. `message/quishing` vs `qris` on a pasted payload. The rule **already has** a `gate`
   (`src/lib/scoring/message.ts:125`); adding a second key is TS1117. Extend the
   existing expression instead:

```ts
gate: (text, match) => {
  if (/000201/.test(text)) return false; // the QRIS Agent owns pasted payloads
  if (match.index === undefined) return false;
  const start = Math.max(0, match.index - 80);
  const end = Math.min(text.length, match.index + match[0].length + 80);
  return QR_ACTION.test(text.slice(start, end));
},
```

d. `job-s03` classifies as `lowongan-tugas-berbayar` only once the keyword exists.
   Add `penempatan` to that pattern in `MODUS_KEYWORDS`; do not add the bare word
   `kerja`, which would steal classification from unrelated job-lure and phishing
   cases:

```ts
{
  modus: "lowongan-tugas-berbayar",
  pattern:
    /\b(?:lowongan|penempatan|tugas|like|subscribe|top\s*up|topup|komisi)\b/i,
},
```

e. `message/topup-loop` vs `job/job-pay-to-earn` on the existing bench case
   `"Lowongan kerja terbatas! Tugas: like & subscribe video … top up dulu"`. Both are
   true readings of the same message: `message` quotes the bare top-up demand (the
   generic payout loop), `job` quotes the task sentence (the job-context version). The
   evidence strings differ, so the invariant holds; do **not** silence either rule.
   Record it as a deliberate two-facet case, and keep the combined weight in the
   `tinggi` band (it is 0.85 + 0.85, already there). Do not add a job-word gate to
   `message/topup-loop`: a payout loop outside a job offer must still be caught.

f. `message/quishing` vs `marketplace/mkt-qris-refund` on a "refund lewat QRIS" message
   with no payload. The `000201` gate only defers payloads, so the generic rule still
   quotes `QRIS` while marketplace quotes `Refund gagal, scan QRIS`; different evidence,
   two facets (QRIS-in-chat vs the refund trick), so the test allows it.

Re-run the eval after each narrowing; recall must not drop on the existing corpus.

- [ ] **Step 7: Commit**

```bash
git add src/lib/scoring/score.ts src/lib/scoring/message.ts \
  src/lib/scoring/bench-cases.ts src/lib/scoring/eval.test.ts \
  src/lib/scoring/score.bench.test.ts
git commit -m "feat(scoring): wire job, marketplace, and qris into the pipeline"
```

---

## Task 6: Registry

**Files:**
- Modify: `src/components/companion/agents.ts` (rewrite)
- Create: `src/components/companion/agents.test.ts`
- Modify: `src/components/companion/agents-detail-panel.tsx:36-42`
- Modify: `src/components/companion/agents-view.tsx:56-62`

- [ ] **Step 1: Write the failing registry test**

```ts
import {
  AGENT_REGISTRY,
  AGENT_SEQUENCE,
  type DetectorAgent,
} from "@/components/companion/agents";
import { STAGE_LABEL } from "@/lib/contracts/agent-run";

const IDS: DetectorAgent[] = [
  "message",
  "link",
  "identity",
  "conversation",
  "job",
  "marketplace",
  "qris",
  "evidence",
];

describe("agent registry", () => {
  it("has a profile for every detector, in sequence order", () => {
    expect(AGENT_SEQUENCE).toEqual(IDS);
    for (const id of IDS) {
      expect(AGENT_REGISTRY[id].id).toBe(id);
    }
  });

  it("never duplicates the contract label or task", () => {
    for (const id of IDS) {
      expect(AGENT_REGISTRY[id].label).toBe(STAGE_LABEL[id].label);
      expect(AGENT_REGISTRY[id].task).toBe(STAGE_LABEL[id].task);
    }
  });

  it("gives every agent a fixed flavour line and three mechanisms", () => {
    for (const id of IDS) {
      expect(AGENT_REGISTRY[id].flavor.length).toBeGreaterThan(10);
      expect(AGENT_REGISTRY[id].mechanism).toHaveLength(3);
    }
  });
});
```

- [ ] **Step 2: Rewrite `agents.ts`**

```ts
import {
  Briefcase,
  Fingerprint,
  Link2,
  MessageSquare,
  MessagesSquare,
  QrCode,
  Quote,
  Store,
  type LucideIcon,
} from "lucide-react";
import type { AgentId } from "@/lib/contracts/score";
import { STAGE_LABEL } from "@/lib/contracts/agent-run";

export type DetectorAgent = Exclude<AgentId, "scoring">;

export const AGENT_SEQUENCE: DetectorAgent[] = [
  "message",
  "link",
  "identity",
  "conversation",
  "job",
  "marketplace",
  "qris",
  "evidence",
];

export interface AgentProfile {
  id: DetectorAgent;
  displayName: string;
  label: string;
  task: string;
  mechanism: readonly string[];
  purpose: string;
  flavor: string;
  /** One honesty caveat printed in the expanded body; only `qris` uses it. */
  caveat?: string;
  icon: LucideIcon;
  portrait: string | null;
  identity: `--lumina-agent-${DetectorAgent}`;
}

export const AGENT_REGISTRY: Record<DetectorAgent, AgentProfile> = {
  message: {
    id: "message",
    displayName: "Mochi",
    label: STAGE_LABEL.message.label,
    task: STAGE_LABEL.message.task,
    mechanism: ["Kata kunci", "Urgensi · otoritas", "OTP · APK"],
    purpose:
      "Membaca nada pesan: urgensi palsu, klaim otoritas, iming-iming, serta permintaan OTP atau berkas APK.",
    flavor: "Membaca kata yang dipakai untuk menekan.",
    icon: MessageSquare,
    portrait: "/brand/agents/message.jpg",
    identity: "--lumina-agent-message",
  },
  link: {
    id: "link",
    displayName: "Bubu",
    label: STAGE_LABEL.link.label,
    task: STAGE_LABEL.link.task,
    mechanism: ["Ekstraksi URL", "Domain mirip merek", "Penyingkat · TLD"],
    purpose:
      "Membongkar setiap tautan: domain mirip merek resmi, penyingkat, TLD berisiko, dan jalur login palsu.",
    flavor: "Membaca domain dan bentuk tautan yang dikirim.",
    icon: Link2,
    portrait: "/brand/agents/link.jpg",
    identity: "--lumina-agent-link",
  },
  identity: {
    id: "identity",
    displayName: "Piyo",
    label: STAGE_LABEL.identity.label,
    task: STAGE_LABEL.identity.task,
    mechanism: ["Nomor pengirim", "Klaim institusi", "Nomor asing"],
    purpose:
      "Memeriksa identitas pengirim: nomor kontak, klaim institusi, dan nomor asing yang tidak wajar.",
    flavor: "Memeriksa nomor dan klaim pengirim.",
    icon: Fingerprint,
    portrait: "/brand/agents/identity.jpg",
    identity: "--lumina-agent-identity",
  },
  conversation: {
    id: "conversation",
    displayName: "Naga",
    label: STAGE_LABEL.conversation.label,
    task: STAGE_LABEL.conversation.task,
    mechanism: ["Riwayat giliran", "Eskalasi bertahap", "Konteks percakapan"],
    purpose:
      "Membandingkan pesan dengan giliran sebelumnya untuk menangkap eskalasi yang muncul bertahap.",
    flavor: "Melihat apakah tekanan itu datang bertahap.",
    icon: MessagesSquare,
    portrait: "/brand/agents/conversation.jpg",
    identity: "--lumina-agent-conversation",
  },
  job: {
    id: "job",
    displayName: "Kiko",
    label: STAGE_LABEL.job.label,
    task: STAGE_LABEL.job.task,
    mechanism: ["Biaya pendaftaran", "Tugas berbayar", "Penempatan luar negeri"],
    purpose:
      "Memeriksa tawaran kerja: biaya di muka, tugas like/subscribe, dan penempatan luar negeri yang membebani pelamar.",
    flavor: "Memeriksa biaya yang diminta sebelum ada surat tawaran.",
    icon: Briefcase,
    portrait: null,
    identity: "--lumina-agent-job",
  },
  marketplace: {
    id: "marketplace",
    displayName: "Lala",
    label: STAGE_LABEL.marketplace.label,
    task: STAGE_LABEL.marketplace.task,
    mechanism: ["Bayar di luar platform", "Harga tidak wajar", "Resi palsu"],
    purpose:
      "Mengikuti alur jual-beli: pembayaran ke rekening pribadi, gift card, dan trik refund lewat QRIS.",
    flavor: "Mengikuti alur bayar yang keluar dari platform.",
    icon: Store,
    portrait: null,
    identity: "--lumina-agent-marketplace",
  },
  qris: {
    id: "qris",
    displayName: "Ruru",
    label: STAGE_LABEL.qris.label,
    task: STAGE_LABEL.qris.task,
    mechanism: ["TLV EMVCo", "CRC-16", "Nama merchant"],
    purpose:
      "Membaca payload QRIS: struktur TLV, CRC, tautan di dalam QR, dan nama merchant yang tidak cocok.",
    flavor: "Membaca payload QR dan nama penerimanya.",
    caveat:
      "CRC valid hanya berarti formatnya benar; cocokkan nama merchant di layar sebelum membayar.",
    icon: QrCode,
    portrait: null,
    identity: "--lumina-agent-qris",
  },
  evidence: {
    id: "evidence",
    displayName: "Bao",
    label: STAGE_LABEL.evidence.label,
    task: STAGE_LABEL.evidence.task,
    mechanism: ["Kutipan temuan", "Garis waktu", "Narasi bukti"],
    purpose:
      "Merangkum temuan menjadi kutipan, garis waktu, dan narasi singkat yang bisa diperiksa ulang.",
    flavor: "Menyimpan kutipan yang bisa diperiksa ulang.",
    icon: Quote,
    portrait: "/brand/agents/evidence.jpg",
    identity: "--lumina-agent-evidence",
  },
};

const ids = <K extends keyof AgentProfile>(key: K) =>
  Object.fromEntries(AGENT_SEQUENCE.map((id) => [id, AGENT_REGISTRY[id][key]])) as Record<
    DetectorAgent,
    AgentProfile[K]
  >;

export const AGENT_DISPLAY_NAME = ids("displayName");
export const AGENT_MECHANISM = ids("mechanism");
export const AGENT_PURPOSE = ids("purpose");

export const LUMINA_STEPS = [
  "Jalankan agen",
  "Kumpulkan temuan",
  "Hitung skor",
] as const;
```

- [ ] **Step 3: Point the panels at the registry**

In `agents-detail-panel.tsx`, add `AGENT_REGISTRY` to the existing
`@/components/companion/agents` import, delete the local `AGENT_ICON` map and render
`AGENT_REGISTRY[id].icon`; delete the now-unused `Fingerprint, Link2, LucideIcon,
MessageSquare, MessagesSquare, Quote` imports (Biome fails on unused imports). In
`agents-view.tsx`, add `AGENT_REGISTRY` to the same import, delete `AGENT_PORTRAIT`
and the `AGENT_ICON_FALLBACK` helper added in Task 1; use `AGENT_REGISTRY[id].portrait`
and `.icon`, rendering the icon when `portrait` is `null`. Do not change the layout
beyond Task 5's four-column grid.

- [ ] **Step 4: Run**

```bash
npm test -- src/components/companion/agents.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/components/companion/agents.ts src/components/companion/agents.test.ts \
  src/components/companion/agents-detail-panel.tsx \
  src/components/companion/agents-view.tsx
git commit -m "feat(companion): agent registry becomes the single source of truth"
```

---

## Task 7: Identity tokens and the §3 addendum

**Files:**
- Modify: `src/app/globals.css` (`:root` around `:303-374`, `@theme inline` around `:28-81`)
- Modify: `AGENTS.md` §3
- Test: `src/app/globals.test.ts` (new, string-level)

- [ ] **Step 1: Add the tokens**

After the brand ramp in `:root`, add eight hues and eight soft tints. Starting values
(hue only; keep `L 0.52 C 0.10`):

```css
--lumina-agent-message: oklch(0.52 0.1 245);
--lumina-agent-link: oklch(0.52 0.1 200);
--lumina-agent-identity: oklch(0.52 0.1 155);
--lumina-agent-conversation: oklch(0.52 0.1 290);
--lumina-agent-job: oklch(0.52 0.1 110);
--lumina-agent-marketplace: oklch(0.52 0.1 335);
--lumina-agent-qris: oklch(0.52 0.1 5);
--lumina-agent-evidence: oklch(0.52 0.1 75);

--lumina-agent-message-soft: oklch(0.96 0.02 245);
--lumina-agent-link-soft: oklch(0.96 0.02 200);
--lumina-agent-identity-soft: oklch(0.96 0.02 155);
--lumina-agent-conversation-soft: oklch(0.96 0.02 290);
--lumina-agent-job-soft: oklch(0.96 0.02 110);
--lumina-agent-marketplace-soft: oklch(0.96 0.02 335);
--lumina-agent-qris-soft: oklch(0.96 0.02 5);
--lumina-agent-evidence-soft: oklch(0.96 0.02 75);
```

- [ ] **Step 2: Map them to utilities**

In `@theme inline`:

```css
--color-agent-message: var(--lumina-agent-message);
--color-agent-message-soft: var(--lumina-agent-message-soft);
--color-agent-link: var(--lumina-agent-link);
--color-agent-link-soft: var(--lumina-agent-link-soft);
--color-agent-identity: var(--lumina-agent-identity);
--color-agent-identity-soft: var(--lumina-agent-identity-soft);
--color-agent-conversation: var(--lumina-agent-conversation);
--color-agent-conversation-soft: var(--lumina-agent-conversation-soft);
--color-agent-job: var(--lumina-agent-job);
--color-agent-job-soft: var(--lumina-agent-job-soft);
--color-agent-marketplace: var(--lumina-agent-marketplace);
--color-agent-marketplace-soft: var(--lumina-agent-marketplace-soft);
--color-agent-qris: var(--lumina-agent-qris);
--color-agent-qris-soft: var(--lumina-agent-qris-soft);
--color-agent-evidence: var(--lumina-agent-evidence);
--color-agent-evidence-soft: var(--lumina-agent-evidence-soft);
```

- [ ] **Step 3: Amend AGENTS.md §3**

Append to the colour rule:

> "Aksen tindakan tetap `--lumina-brand`. Identitas agen memakai ramp
> `--lumina-agent-*`, hanya untuk border/tint bubble agen; status tetap memakai token
> status (`brand`, `warn`, `danger`, netral)."

- [ ] **Step 4: Add the guard test**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("agent identity tokens", () => {
  it("defines a line and soft variant for every agent", () => {
    const ids = [
      "message",
      "link",
      "identity",
      "conversation",
      "job",
      "marketplace",
      "qris",
      "evidence",
    ];
    for (const id of ids) {
      expect(css).toContain(`--lumina-agent-${id}:`);
      expect(css).toContain(`--lumina-agent-${id}-soft:`);
      expect(css).toContain(`--color-agent-${id}:`);
    }
  });

  it("keeps the brand orange out of the ramp", () => {
    expect(css).not.toMatch(/--lumina-agent-[a-z]+:\s*#ea580c/i);
  });
});
```

- [ ] **Step 5: Verify contrast**

For each hue, confirm the 2 px border is ≥3:1 against `#ffffff` and text on the soft
tint is ≥4.5:1. A quick check with any local contrast tool is enough; record the result
in the commit body. If `qris` (hue 5) and `marketplace` (335) read as the same red at
2 px, shift `qris` to hue 15 and re-check.

- [ ] **Step 6: Run and commit**

```bash
npm test -- src/app/globals.test.ts
npm run lint:fix
git add src/app/globals.css AGENTS.md src/app/globals.test.ts
git commit -m "feat(design): tokenized agent identity ramp (AGENTS.md §3 addendum)"
```

---

## Task 8: `AgentRun` — orchestrator and bubbles (static)

**Files:**
- Create: `src/components/companion/agent-run.tsx`
- Create: `src/components/companion/agent-run.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentRun } from "@/components/companion/agent-run";
import type { AgentStage, AgentTrace } from "@/lib/contracts/agent-run";

const stage = (over: Partial<AgentStage> & Pick<AgentStage, "id">): AgentStage => ({
  label: `${over.id} Agent`,
  task: "task",
  status: "selesai",
  findings: 0,
  ms: 1.2,
  ...over,
});

const trace: AgentTrace = {
  stages: [
    stage({ id: "message", status: "temuan", findings: 2, ms: 3 }),
    stage({ id: "link", status: "dilewati", note: "Tidak ada tautan." }),
    stage({ id: "identity", status: "selesai" }),
    stage({ id: "conversation", status: "selesai" }),
    stage({ id: "job", status: "dilewati", note: "Bukan tawaran kerja." }),
    stage({ id: "marketplace", status: "dilewati", note: "Bukan percakapan jual-beli." }),
    stage({ id: "qris", status: "dilewati", note: "Tidak ada payload QRIS." }),
    stage({ id: "evidence", status: "selesai" }),
    stage({ id: "scoring", label: "Scoring Orchestrator", findings: 0, ms: 0.4 }),
    stage({ id: "voice", label: "Penyusun bahasa", status: "berjalan", ms: 0 }),
  ],
  totalMs: 12,
};

describe("AgentRun", () => {
  it("renders one orchestrator and one bubble per present stage", () => {
    render(<AgentRun trace={trace} live />);
    expect(screen.getByText(/orkestrator/i)).toBeInTheDocument();
    for (const id of ["message", "link", "identity", "conversation", "job", "marketplace", "qris", "evidence", "voice"]) {
      expect(screen.getByTestId(`agent-${id}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId("agent-scoring")).not.toBeInTheDocument();
  });

  it("prints the real status for every bubble", () => {
    render(<AgentRun trace={trace} live />);
    expect(screen.getByTestId("agent-message")).toHaveAttribute("data-status", "temuan");
    expect(screen.getByTestId("agent-link")).toHaveAttribute("data-status", "dilewati");
    expect(screen.getByTestId("agent-voice")).toHaveAttribute("data-status", "berjalan");
  });

  it("shows the note for skipped stages", () => {
    render(<AgentRun trace={trace} live />);
    const link = screen.getByTestId("agent-link");
    expect(within(link).getByText(/tidak ada tautan/i)).toBeInTheDocument();
  });

  it("never says berhasil for a clean stage", () => {
    render(<AgentRun trace={trace} live />);
    expect(screen.queryByText(/berhasil/i)).not.toBeInTheDocument();
  });

  it("expands a bubble and keeps it open", async () => {
    const user = userEvent.setup();
    render(<AgentRun trace={trace} live />);
    const toggle = within(screen.getByTestId("agent-message")).getByRole("button", {
      name: /message agent/i,
    });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("only the voice bubble may be running", () => {
    render(<AgentRun trace={trace} live />);
    const running = screen
      .getAllByText("Berjalan")
      .map((node) => node.closest("[data-testid]")?.getAttribute("data-testid"));
    expect(running).toEqual(["agent-voice"]);
    expect(screen.getByTestId("agent-voice")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("names a missing skip reason instead of hiding it", () => {
    const noNote: AgentTrace = {
      stages: [
        stage({ id: "message", status: "dilewati", findings: 0 }),
        stage({ id: "scoring", label: "Scoring Orchestrator" }),
      ],
      totalMs: 2,
    };
    render(<AgentRun trace={noNote} live={false} />);
    expect(screen.getByTestId("agent-message")).toHaveTextContent(
      /tidak ada alasan tercatat/i,
    );
  });

  it("never reports a failed run as complete", () => {
    const failed: AgentTrace = {
      stages: [
        stage({ id: "message", status: "gagal", note: "Mesin berhenti." }),
        stage({ id: "link", status: "selesai" }),
        stage({ id: "scoring", label: "Scoring Orchestrator" }),
      ],
      totalMs: 4,
    };
    const { container } = render(<AgentRun trace={failed} live={false} />);
    expect(container.querySelector("[data-run-state]")).toHaveAttribute(
      "data-run-state",
      "gagal",
    );
    expect(screen.getByText(/1 gagal/i)).toBeInTheDocument();
    expect(screen.queryByText(/berhasil/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — it must fail**

```bash
npm test -- src/components/companion/agent-run.test.tsx
```

- [ ] **Step 3: Implement `agent-run.tsx`**

```tsx
"use client";

import {
  Check,
  ChevronRight,
  Circle,
  Loader2,
  MinusCircle,
  PenLine,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";
import {
  AGENT_REGISTRY,
  AGENT_SEQUENCE,
  LUMINA_STEPS,
  type DetectorAgent,
} from "@/components/companion/agents";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  AgentStage,
  AgentTrace,
  StageStatus,
} from "@/lib/contracts/agent-run";
import type { ScoreResult, Signal } from "@/lib/contracts/score";
import { cn } from "@/lib/utils";

const MS = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const STATUS_WORD: Record<StageStatus, string> = {
  menunggu: "Menunggu",
  berjalan: "Berjalan",
  selesai: "Selesai",
  temuan: "Temuan",
  dilewati: "Dilewati",
  gagal: "Gagal",
};

function isDetector(id: AgentStage["id"]): id is DetectorAgent {
  return id !== "scoring" && id !== "voice";
}

function statusText(stage: AgentStage): string {
  if (stage.status === "temuan") return `${stage.findings} temuan`;
  if (stage.status === "selesai" && stage.findings === 0) {
    return stage.id === "identity" ? "Tidak melapor" : "Selesai · 0 temuan";
  }
  return STATUS_WORD[stage.status];
}

function Glyph({ status }: { status: StageStatus }) {
  if (status === "berjalan") {
    return (
      <Loader2
        aria-hidden
        className="size-3.5 animate-spin motion-reduce:animate-none"
      />
    );
  }
  if (status === "temuan" || status === "selesai") {
    return <Check aria-hidden strokeWidth={2.2} className="size-3.5" />;
  }
  if (status === "gagal") {
    return <XCircle aria-hidden strokeWidth={1.8} className="size-3.5 text-danger" />;
  }
  if (status === "dilewati") {
    return <MinusCircle aria-hidden strokeWidth={1.8} className="size-3.5 text-dim" />;
  }
  return <Circle aria-hidden strokeWidth={1.8} className="size-3.5 text-dim" />;
}

function signalsFor(
  result: ScoreResult | undefined,
  id: DetectorAgent,
): Signal[] {
  return (result?.signals ?? []).filter(
    (signal) => signal.weight > 0 && signal.agent === id,
  );
}

function AgentBubble({
  stage,
  result,
  live = false,
}: {
  stage: AgentStage;
  result?: ScoreResult;
  live?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const profile = isDetector(stage.id) ? AGENT_REGISTRY[stage.id] : null;
  const identity = profile ? `var(${profile.identity})` : "var(--lumina-brand)";
  const soft = profile
    ? `var(${profile.identity}-soft)`
    : "var(--lumina-brand-soft)";
  const signals = profile ? signalsFor(result, profile.id) : [];
  const explain = stage.status === "dilewati" || stage.status === "gagal";
  const note = stage.note ?? (explain ? "Tidak ada alasan tercatat." : null);
  const showFlavor = live || open;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        data-testid={`agent-${stage.id}`}
        data-status={stage.status}
        aria-busy={stage.status === "berjalan" || undefined}
        style={{ borderLeftColor: identity }}
        className={cn(
          "relative min-w-0 rounded-r-[12px] border-l-2 py-1.5 pr-3 pl-3",
          stage.status === "gagal" && "bg-danger/5",
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-h-[44px] w-full min-w-0 items-center gap-2 rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"
          >
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line"
              style={{ backgroundColor: soft, color: identity }}
            >
              {profile?.portrait ? (
                <Image
                  src={profile.portrait}
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 object-cover"
                />
              ) : profile ? (
                <profile.icon className="size-3.5" />
              ) : (
                <PenLine className="size-3.5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="truncate font-medium text-[12px] text-txt">
                  {profile?.displayName ?? stage.label}
                </span>
                <span className="sr-only sm:not-sr-only sm:shrink-0 sm:font-mono sm:text-[10px] sm:text-dim">
                  {stage.label}
                </span>
              </span>
              {showFlavor ? (
                <span className="line-clamp-1 text-[11px] text-dim leading-snug">
                  {profile?.flavor ?? stage.task}
                </span>
              ) : null}
              {note ? (
                <span className="line-clamp-2 text-[11px] text-dim leading-snug">
                  {note}
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                "flex shrink-0 items-center gap-1 text-[11px]",
                stage.status === "gagal" ? "text-danger" : "text-txt/70",
              )}
            >
              <Glyph status={stage.status} />
              <span>{statusText(stage)}</span>
            </span>
            <span className="tabular w-12 shrink-0 text-right text-[10px] text-txt/70">
              {stage.status === "berjalan" ? "…" : `${MS.format(stage.ms)} ms`}
            </span>
            <ChevronRight
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 text-dim transition-transform duration-150 motion-reduce:transition-none",
                open && "rotate-90",
              )}
            />
          </button>
        </CollapsibleTrigger>

        {/*
          Radix unmounts closed content, so task, mechanisms, caveat, and
          evidence never sit in the accessibility tree while the row is
          collapsed. The trigger keeps the honest note for skipped/failed
          stages visible without expanding.
        */}
        <CollapsibleContent className="overflow-hidden">
          <div className="mt-1 flex flex-col gap-2 pb-1">
            <p className="text-[11px] text-dim">{stage.task}</p>
            {profile ? (
              <ul className="flex flex-wrap gap-1">
                {profile.mechanism.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-full border border-line px-2 py-0.5 text-[10px] text-dim"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            ) : null}
            {profile?.caveat ? (
              <p className="text-[11px] text-dim">{profile.caveat}</p>
            ) : null}
            {signals.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {signals.map((signal) => (
                  <li key={signal.label} className="text-[11px] text-txt">
                    <span className="font-medium">{signal.label}</span>
                    {signal.evidence ? (
                      <span className="mt-0.5 block text-dim [overflow-wrap:anywhere]">
                        “{signal.evidence}”
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {stage.status === "selesai" && stage.findings === 0 && !stage.note ? (
              <p className="text-[11px] text-dim">
                Agen ini selesai dan tidak menemukan pola yang dikenali.
              </p>
            ) : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function runState(
  stages: readonly AgentStage[],
  live: boolean,
): StageStatus {
  if (stages.some((stage) => stage.status === "gagal")) return "gagal";
  if (
    live &&
    stages.some((stage) => stage.id === "voice" && stage.status === "berjalan")
  ) {
    return "berjalan";
  }
  if (stages.some((stage) => stage.status === "temuan")) return "temuan";
  return "selesai";
}

export function AgentRun({
  trace,
  result,
  live = false,
}: {
  trace: AgentTrace;
  result?: ScoreResult;
  live?: boolean;
}) {
  const byId = new Map(trace.stages.map((stage) => [stage.id, stage]));
  const scoring = byId.get("scoring");
  const voice = byId.get("voice");
  const specialists = AGENT_SEQUENCE.map((id) => byId.get(id)).filter(
    (stage): stage is AgentStage => Boolean(stage),
  );
  const findings = specialists.reduce((sum, stage) => sum + stage.findings, 0);
  const engineMs = Math.max(0, trace.totalMs - (voice?.ms ?? 0));
  const voiceLive = live && voice?.status === "berjalan";
  const state = runState(trace.stages, live);
  const completed = specialists.filter(
    (stage) => stage.status === "selesai" || stage.status === "temuan",
  ).length;
  const skipped = specialists.filter(
    (stage) => stage.status === "dilewati",
  ).length;
  const failed = specialists.filter((stage) => stage.status === "gagal").length;
  const [announcement, setAnnouncement] = React.useState("");
  const wasLive = React.useRef(live);

  React.useEffect(() => {
    if (live) {
      wasLive.current = true;
      return;
    }
    if (wasLive.current) {
      setAnnouncement(
        state === "gagal"
          ? "Sebagian pemeriksaan gagal. Lihat alasan di setiap agen."
          : `${completed} agen selesai, ${skipped} dilewati, ${findings} temuan.`,
      );
    }
  }, [live, state, completed, skipped, findings]);

  return (
    <section
      className="flex w-full flex-col gap-2"
      data-live={voiceLive ? "true" : undefined}
      data-run-state={state}
    >
      <div className="rounded-[14px] border border-line bg-panel px-3.5 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-[12px] text-txt">Orkestrator</span>
          <span className="text-[11px] text-dim">
            {specialists.length} agen
          </span>
          {voiceLive ? (
            <span className="text-[11px] text-brand-ink">
              {completed} agen selesai · menyusun jawaban…
            </span>
          ) : (
            <span className="tabular text-[11px] text-dim">
              {state === "gagal" ? `${failed} gagal · ` : ""}
              {completed} selesai · {skipped} dilewati · {findings} temuan ·{" "}
              {MS.format(engineMs)} ms
            </span>
          )}
        </div>
        <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-dim">
          {LUMINA_STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-1">
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full border text-[9px]",
                  index < 2 || scoring
                    ? "border-brand-edge bg-brand-soft text-brand-ink"
                    : "border-line text-dim",
                )}
              >
                {index + 1}
              </span>
              <span>{step}</span>
              {index === 2 && scoring ? (
                <span className="tabular text-[10px] text-txt/70">
                  {MS.format(scoring.ms)} ms
                </span>
              ) : null}
              {index < 2 ? <span aria-hidden>→</span> : null}
            </li>
          ))}
        </ol>
        <ul aria-hidden className="mt-2 flex -space-x-1.5">
          {specialists.slice(0, 8).map((stage) => {
            const profile = isDetector(stage.id) ? AGENT_REGISTRY[stage.id] : null;
            return (
              <li
                key={stage.id}
                className="flex size-5 items-center justify-center overflow-hidden rounded-full border border-panel"
                style={{
                  backgroundColor: profile
                    ? `var(${profile.identity}-soft)`
                    : "var(--lumina-brand-soft)",
                  color: profile ? `var(${profile.identity})` : undefined,
                }}
              >
                {profile?.portrait ? (
                  <Image
                    src={profile.portrait}
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 object-cover"
                  />
                ) : profile ? (
                  <profile.icon className="size-2.5" />
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <ol className="ms-3 flex flex-col border-l border-line">
        {specialists.map((stage) => (
          <li key={stage.id} className="min-w-0">
            <AgentBubble
              stage={stage}
              result={result}
              live={live && stage.status === "berjalan"}
            />
          </li>
        ))}
        {voice ? (
          <li className="min-w-0">
            <AgentBubble stage={voice} result={result} live={live} />
          </li>
        ) : null}
      </ol>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Run the tests**

```bash
npm test -- src/components/companion/agent-run.test.tsx
```

- [ ] **Step 5: Add the fake-timer invariant test**

```tsx
it("does not change status when time advances", () => {
  jest.useFakeTimers();
  render(<AgentRun trace={trace} live={false} />);
  const before = screen
    .getAllByTestId(/^agent-/)
    .map((node) => node.getAttribute("data-status"));
  jest.advanceTimersByTime(10_000);
  const after = screen
    .getAllByTestId(/^agent-/)
    .map((node) => node.getAttribute("data-status"));
  expect(after).toEqual(before);
  jest.useRealTimers();
});
```

- [ ] **Step 6: Commit**

```bash
git add src/components/companion/agent-run.tsx \
  src/components/companion/agent-run.test.tsx
git commit -m "feat(companion): orchestrator and persistent agent bubbles"
```

---

## Task 9: Motion and reduced motion

**Files:**
- Modify: `src/components/companion/agent-run.tsx`
- Modify: `src/components/companion/agent-run.test.tsx`

- [ ] **Step 1: Add the motion gate**

Import `motion, { useReducedMotion }` from `motion/react`. In `AgentRun`:

```tsx
const reduce = useReducedMotion();
const animated = live && !reduce;
```

```tsx
// module scope — one shared variant so the tree never changes shape
const agentVariants = {
  hidden: { opacity: 0, y: 4 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 30 },
  },
} as const;

<motion.ol
  className="ms-3 flex flex-col border-l border-line"
  data-motion-list={animated ? "true" : "false"}
  initial={animated ? "hidden" : false}
  animate={animated ? "show" : false}
  variants={{
    show: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
  }}
>
  {specialists.map((stage) => (
    <motion.li key={stage.id} variants={agentVariants} className="min-w-0">
      <AgentBubble
        stage={stage}
        result={result}
        live={live && stage.status === "berjalan"}
      />
    </motion.li>
  ))}
  {voice ? (
    <motion.li key={voice.id} variants={agentVariants} className="min-w-0">
      <AgentBubble stage={voice} result={result} live={live} />
    </motion.li>
  ) : null}
</motion.ol>
```

The element type is **always** `motion.ol` / `motion.li`; only the animation props
change. Swapping `motion.ol` for `ol` when `live` flips false remounts every
`AgentBubble`, closes any expansion, and destroys focus — the exact defect the spec
forbids. `initial={false}` / `animate={false}` disable the entrance without changing
the tree.

The orchestrator header gets `motion.div` with `initial={animated ? { opacity: 0, y: 4 } : false}` and a 120 ms tween. The voice bubble keeps the spinner; under reduced motion the spinner becomes a static dot with "Berjalan" (the word is already there).

- [ ] **Step 2: Assert the historical path is still**

```tsx
it("switches off the entrance without remounting the bubbles", async () => {
  const user = userEvent.setup();
  const { container, rerender } = render(<AgentRun trace={trace} live />);
  expect(container.querySelector("[data-motion-list]")).toHaveAttribute(
    "data-motion-list",
    "true",
  );

  const toggle = within(screen.getByTestId("agent-message")).getByRole("button", {
    name: /message agent/i,
  });
  await user.click(toggle);

  rerender(<AgentRun trace={trace} live={false} />);
  expect(container.querySelector("[data-motion-list]")).toHaveAttribute(
    "data-motion-list",
    "false",
  );
  expect(toggle).toHaveAttribute("aria-expanded", "true"); // same node, still open
});
```

- [ ] **Step 3: Reduced-motion test and the static status mark**

The reduced path must not rely on CSS: jsdom never applies `motion-reduce:*`, so a
CSS-only rule is untestable and the spec's "static dot" would be a claim with no code
behind it. Thread the flag through:

a. `AgentRun` already has `const reduce = useReducedMotion();`; pass
   `reduced={reduce ?? false}` to every `<AgentBubble>`.
b. `AgentBubble` gains `reduced = false` in its props type, and `Glyph` gains the same
   flag. In the `berjalan` branch:

```tsx
if (status === "berjalan") {
  return reduced ? (
    <Circle aria-hidden strokeWidth={2.4} className="size-3.5 fill-current" />
  ) : (
    <Loader2 aria-hidden className="size-3.5 animate-spin" />
  );
}
```

`Circle` is already imported. Keep `motion-reduce:animate-none` on the spinner as a
second guard for users who toggle the OS setting without a re-render.

Now the test, in a separate file (`agent-run-reduced.test.tsx`) so the module mock does
not affect the other assertions:

```tsx
jest.mock("motion/react", () => ({
  ...jest.requireActual("motion/react"),
  useReducedMotion: () => true,
}));

it("keeps the same tree and drops the spinner under reduced motion", () => {
  const { container } = render(<AgentRun trace={trace} live />);
  expect(container.querySelector("[data-motion-list]")).toHaveAttribute(
    "data-motion-list",
    "false",
  );
  expect(container.querySelector(".animate-spin")).toBeNull();
  expect(screen.getAllByText("Berjalan")).toHaveLength(1);
});
```

If `jest.requireActual("motion/react")` cannot resolve the ESM build in this Jest
setup, replace the spread with a hand-written mock that renders `motion.ol`/`motion.li`
as plain elements and returns `useReducedMotion: () => true`; do not loosen the
assertion.

- [ ] **Step 4: Run**

```bash
npm test -- src/components/companion/agent-run.test.tsx \
  src/components/companion/agent-run-reduced.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/companion/agent-run.tsx \
  src/components/companion/agent-run.test.tsx \
  src/components/companion/agent-run-reduced.test.tsx
git commit -m "feat(companion): staggered crew arrival with a reduced-motion path"
```

---

## Task 10: Wire into the chat and retire `AgentTraceCard`

**Files:**
- Modify: `src/components/companion/companion-chat.tsx:20`, `:1133-1147`
- Delete: `src/components/companion/agent-trace.tsx`, `agent-trace.test.tsx`

- [ ] **Step 1: Swap the import**

Replace `import { AgentTraceCard } from "@/components/companion/agent-trace";`
with `import { AgentRun } from "@/components/companion/agent-run";`.

- [ ] **Step 2: Swap the render**

In the assistant branch:

```tsx
{turn.trace ? (
  <AgentRun
    trace={turn.trace}
    result={turn.result}
    live={turn.streaming === true}
  />
) : null}
```

- [ ] **Step 3: Stop the duplicate thinking row**

Change the thinking condition to:

```tsx
{turn.streaming && turn.text.length === 0 && !turn.trace ? (
  <ThinkingRow
    label="Menyusun jawaban"
    startedAt={turn.voiceStartedAt ?? null}
  />
) : null}
```

Checked turns now show the voice bubble instead. `tanya`/`obrolan` turns keep the
thinking row.

- [ ] **Step 4: Delete the old component and test**

```bash
git rm src/components/companion/agent-trace.tsx \
  src/components/companion/agent-trace.test.tsx
```

- [ ] **Step 5: Verify the turn still anchors**

`data-turn` remains on the assistant wrapper (`companion-chat.tsx:1133-1137`). Do not
move it onto `AgentRun`.

- [ ] **Step 6: Run**

```bash
npm run typecheck
npm test -- src/components/companion/companion-chat.test.tsx
```

`companion-chat.test.tsx` currently asserts `AgentTraceCard` content (`Message Agent`
inside the old card, and the absence of agent names in the `tanya` lane). Move those
assertions onto the crew in this commit: checked turns now render the names in
`AgentRun`; `tanya`/`obrolan` still render none. Use `findAllByText` rather than
`getByText` for names that appear in both the bubble and the panel.

- [ ] **Step 7: Commit**

```bash
git add src/components/companion/companion-chat.tsx
git commit -m "feat(companion): render the crew in the thread; retire the trace card"
```

---

## Task 11: Migrate the textual tests

**Files:**
- Modify: `src/components/companion/{companion-chat,signal-panel,score-card,companion-entry,companion-shell}.test.tsx`
- Modify: `src/lib/scoring/trace.test.ts`

- [ ] **Step 1: Update the shell test**

`companion-shell.test.tsx` asserts five labels, five mascots, and "Orkestrator". Extend
to eight labels and mascots (`Kiko`, `Lala`, `Ruru` added), and keep the `Lihat detail
Mochi` toggle assertions. `agents-detail-panel` now renders 8 rows, so any
`getAllByRole("listitem")` count changes.

- [ ] **Step 2: Sweep the remaining hard-coded five**

```bash
grep -rn "dari 5\|5 agen\|lima agen\|kelima agen\|Lima pemeriksa\|grid-cols-5" \
  src/components src/lib/scoring
```

Everything found must be either derived from `AGENT_SEQUENCE.length` or a deliberate
piece of static copy about the diagram. Tasks 5 and 10 already changed the counts and
the chat transcript; this step catches the stragglers.

- [ ] **Step 3: Run the whole companion + scoring suites**

```bash
npm test -- src/components/companion src/lib/scoring
```

- [ ] **Step 4: Commit**

```bash
git add src/components/companion/*.test.tsx src/lib/scoring/trace.test.ts
git commit -m "test(companion): migrate textual agent assertions to the crew"
```

---

## Task 12: Width, motion, and honesty audit

**Files:** none (verification only)

- [ ] **Step 1: Run the app**

```bash
npm run dev
```

- [ ] **Step 2: Check the three widths**

At 1440, 380, and 320 px:

a. send a message that triggers several agents and one that triggers none;
b. confirm no horizontal scrollbar;
c. confirm the header truncates the name but keeps status + ms;
d. confirm the expanded detail wraps long evidence;
e. confirm the voice row is the only animated status (spinner);
f. confirm the answer text sits outside the crew;
g. reload the thread: no stagger replay, open bubbles stay open.

Save screenshots under `.opencode/` (not committed; per AGENTS.md the directory is not
source).

- [ ] **Step 3: Reduced motion**

Enable the OS reduced-motion setting and repeat Step 2. Expect instant arrival, static
status marks, and the same information.

- [ ] **Step 4: Keyboard**

Tab through: every bubble header is reachable, `aria-expanded` flips, the focus ring is
visible, and no focus is stolen on completion.

- [ ] **Step 5: Honesty spot-checks**

a. Open a turn where `link` is `dilewati`: the note is visible **without expanding**.
b. Open a turn with `identity` clean: it says "Tidak melapor", not "berhasil".
c. Force a failing stage in a test trace and confirm the header shows `N gagal` and
   `data-run-state="gagal"`.
d. Paste a QRIS payload and a photo of a QR: the first can produce findings, the
   second is `dilewati` with the image limitation in its note.

- [ ] **Step 6: Commit nothing**

Verification only. If a defect is found, fix it in the owning task and re-run
`npm run verify`.

---

## Task 13: Final verification and documentation

**Files:**
- Modify: `STATUS.md`
- Modify: `docs/superpowers/plans/2026-11-08-scam-expansion.md` (cross-link)
- Modify: `docs/superpowers/plans/2026-11-08-agent-orchestration-ui.md` (status line)

- [ ] **Step 1: Full gate**

```bash
npm run verify
```

All four stages must pass: typecheck, Biome, Jest, build.

- [ ] **Step 2: Record the measured numbers**

Run the eval and copy the real totals into `STATUS.md`, `eval.test.ts`, and
`score.bench.test.ts`. Quote only what `runEval()` returned.

- [ ] **Step 3: Cross-link the plans**

At the top of `2026-11-08-scam-expansion.md`, add:

> "Follow-on: `2026-11-08-agent-orchestration-ui.md` extends this work with the crew UI
> and the job/marketplace/QRIS detectors. Land this plan first."

- [ ] **Step 4: Update the plan status**

Change this plan's header to `**Status:** Implemented <date>` once the gate is green.

- [ ] **Step 5: Commit**

```bash
git add STATUS.md docs/superpowers/plans/2026-11-08-scam-expansion.md \
  docs/superpowers/plans/2026-11-08-agent-orchestration-ui.md
git commit -m "docs: record crew UI landing and the measured corpus"
```

---

## Final verification

```bash
npm run verify
npm test -- src/lib/scoring/eval.test.ts
```

Acceptance criteria:

a. `AgentId` has 9 values; `STAGE_LABEL` labels all of them.
b. `AGENT_SEQUENCE` has 8 detectors; the panel and score card read "8".
c. The chat renders one orchestrator and one bubble per present stage, all persistent.
d. Every bubble's `data-status` equals the trace, and time advance changes nothing.
e. Only `voice` is ever `berjalan`.
f. `dilewati`/`gagal` show their note; no "berhasil" for clean stages.
g. Agent identity borders use `--lumina-agent-*`; no hex, no palette literal.
h. 320/380 px: no horizontal scroll.
i. Reduced motion: no stagger, no spin; state still legible.
j. `AgentTraceCard` is gone from the thread and its files are deleted.
k. `runEval()` confirms the corpus and the false-positive count; STATUS matches.
