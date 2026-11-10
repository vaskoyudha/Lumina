# Report Template Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a verdict into a sendable report template with real `tel:`, `wa.me`, and `mailto:` actions per verified institution.

**Architecture:** A pure template builder assembles plain text from the `ScoreResult` plus user-typed fields; an optional polish endpoint rewrites tone only and is discarded if it drops a blank. Contacts live in one registry (`REPORT_CONTACTS`) keyed by channel id; `REPORT_CHANNELS` keeps answering which institution applies to a scheme. The UI mounts inside the existing "Kalau sudah terlanjur" card.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4 tokens, zod 4, Jest 30 + React Testing Library, Biome.

**Spec:** `docs/superpowers/specs/2026-11-10-report-template-design.md`

## Global Constraints

- No check runs on `main`; work on `codex/report-template` (worktree already created).
- `npm run verify` must pass before any commit; never skip the gate.
- No score, percentage, or "selamat" on this surface (plan §5-D).
- Never invent a fact, a contact digit, a mailbox, or a legal claim.
- No persistence: inputs stay in component state; nothing is logged.
- The checked message never reaches the polish endpoint; only typed fields, scheme name, channel id, and tactic names do.
- Biome style: 2 spaces, double quotes, semicolons, trailing commas.
- Touch targets ≥ 44px; layout must work at 380px with no horizontal scroll.

---

### Task 1: Contact registry

**Files:**
- Create: `src/data/report-contacts.ts`
- Test: `src/data/report-contacts.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `ContactKind`, `ReportContact`, `ReportChannelId`, `REPORT_CONTACTS`.

- [ ] **Step 1: Write the failing test**

```ts
// src/data/report-contacts.test.ts
import { REPORT_CONTACTS } from "@/data/report-contacts";

describe("REPORT_CONTACTS", () => {
  it("covers the four channels the templates can name", () => {
    const ids = ["iasc", "komdigi", "patrolisiber", "cekrekening"] as const;
    for (const id of ids) {
      expect(REPORT_CONTACTS[id]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("lists only https sources", () => {
    for (const contacts of Object.values(REPORT_CONTACTS)) {
      for (const contact of contacts) {
        expect(contact.source.startsWith("https://")).toBe(true);
      }
    }
  });

  it("normalises WhatsApp values to 62 and phone values to digits", () => {
    for (const contacts of Object.values(REPORT_CONTACTS)) {
      for (const contact of contacts) {
        if (contact.kind === "wa") {
          expect(contact.value).toMatch(/^62\d+$/);
        }
        if (contact.kind === "tel") {
          expect(contact.value).toMatch(/^\d+$/);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/data/report-contacts.test.ts`
Expected: FAIL — `Cannot find module '@/data/report-contacts'`.

- [ ] **Step 3: Write the registry**

```ts
// src/data/report-contacts.ts
/**
 * Verified reporting contacts, one entry per institution.
 *
 * `REPORT_CHANNELS` in `tactics.ts` answers *which institution applies to this
 * scheme*; this file answers *how to reach it*. Digits live here once.
 *
 * Policy (`tactics.ts:274`): no hotline number ships unless it was read from the
 * institution's own page. `verifiedAt` records when; `source` records where.
 * Re-verify before changing a value; never guess a digit.
 */

export type ContactKind = "tel" | "wa" | "email" | "form";

export interface ReportContact {
  kind: ContactKind;
  /** Button label, e.g. "Telepon 157". */
  label: string;
  /** `tel:`/`wa.me` digits, a mailbox, or an https URL. */
  value: string;
  /** Hours or requirements. Never a promise about the outcome. */
  note?: string;
  /** Page the value was read from. Printed nowhere. */
  source: string;
  /** ISO date of verification; "existing" = kept from the repo, not re-read. */
  verifiedAt: string;
}

export type ReportChannelId =
  | "iasc"
  | "komdigi"
  | "patrolisiber"
  | "cekrekening";

const OJK_KONTAK =
  "https://ojk.go.id/id/kanal/edukasi-dan-perlindungan-konsumen/tentang-epk/Pages/Kontak.aspx";
const OJK_JADWAL =
  "https://ojk.go.id/id/berita-dan-kegiatan/publikasi/Pages/Jadwal-Operasional-Kontak-157.aspx";

export const REPORT_CONTACTS: Readonly<
  Record<ReportChannelId, readonly ReportContact[]>
> = {
  iasc: [
    {
      kind: "tel",
      label: "Telepon 157",
      value: "157",
      note: "24 jam setiap hari.",
      source: OJK_KONTAK,
      verifiedAt: "2026-11-10",
    },
    {
      kind: "wa",
      label: "WhatsApp",
      value: "6281157157157",
      note: "Chat digital 07.45–16.50 WIB.",
      source: OJK_JADWAL,
      verifiedAt: "2026-11-10",
    },
    {
      kind: "email",
      label: "Email",
      value: "konsumen@ojk.go.id",
      source: OJK_KONTAK,
      verifiedAt: "2026-11-10",
    },
    {
      kind: "form",
      label: "Formulir pengaduan",
      value: "https://kontak157.ojk.go.id/appkpublicportal/Pengaduan",
      note: "Untuk korban penipuan transaksi keuangan.",
      source: OJK_KONTAK,
      verifiedAt: "2026-11-10",
    },
  ],
  komdigi: [
    {
      kind: "form",
      label: "Formulir aduan nomor",
      value: "https://aduannomor.id/buat-laporan",
      note: "Perlu foto KTP dan bukti; maksimal 8 berkas, 35 MB.",
      source: "https://aduannomor.id/",
      verifiedAt: "2026-11-10",
    },
    {
      kind: "wa",
      label: "WhatsApp",
      value: "628118331316",
      note: "Hanya menerima WhatsApp.",
      source: "https://aduannomor.id/pertanyaan-yang-sering-diajukan",
      verifiedAt: "2026-11-10",
    },
    {
      kind: "email",
      label: "Email",
      value: "aduanite@mail.komdigi.go.id",
      source: "https://aduannomor.id/pertanyaan-yang-sering-diajukan",
      verifiedAt: "2026-11-10",
    },
  ],
  patrolisiber: [
    {
      kind: "form",
      label: "Formulir laporan",
      value: "https://patrolisiber.id",
      source: "https://patrolisiber.id",
      verifiedAt: "existing",
    },
  ],
  cekrekening: [
    {
      kind: "form",
      label: "Cek dan laporkan rekening",
      value: "https://cekrekening.id",
      source: "https://cekrekening.id",
      verifiedAt: "existing",
    },
  ],
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/data/report-contacts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/report-contacts.ts src/data/report-contacts.test.ts
git commit -m "feat(data): add verified report contact registry"
```

---

### Task 2: Channel ids and the polish contract

**Files:**
- Modify: `src/data/tactics.ts:277-323`
- Create: `src/lib/contracts/report.ts`
- Test: `src/lib/contracts/report.test.ts`

**Interfaces:**
- Consumes: `ReportChannelId` from Task 1.
- Produces: `ReportChannel` with `id`; exported `IASC`, `KOMDIGI`; `ReportPolishRequestSchema`, `ReportPolishRequest`, `ReportDraftSchema`, `ReportDraft`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/contracts/report.test.ts
import { ReportPolishRequestSchema } from "@/lib/contracts/report";

const valid = {
  channelId: "iasc",
  draft: { subject: "Laporan", body: "Nama: [NAMA ANDA]" },
  facts: { modus: "fake-call", tactics: ["otoritas"] },
};

describe("ReportPolishRequestSchema", () => {
  it("accepts the documented shape", () => {
    expect(ReportPolishRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an extra field", () => {
    const parsed = ReportPolishRequestSchema.safeParse({
      ...valid,
      text: "pesan yang diperiksa",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown channel id", () => {
    const parsed = ReportPolishRequestSchema.safeParse({
      ...valid,
      channelId: "bank",
    });
    expect(parsed.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/contracts/report.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Add ids to `ReportChannel` and export the two constants**

In `src/data/tactics.ts`, add the import at the top:

```ts
import type { ReportChannelId } from "@/data/report-contacts";
```

Replace the interface:

```ts
export interface ReportChannel {
  id: ReportChannelId;
  label: string;
  href: string;
  /** What reporting this actually achieves. Never "report it" alone. */
  note: string;
}
```

Replace the four constants so each carries its id, and export `IASC` and
`KOMDIGI` (Task 3 consumes them):

```ts
export const IASC: ReportChannel = {
  id: "iasc",
  label: "IASC OJK",
  href: "https://iasc.ojk.go.id",
  note: "Rekening dan nomor pelaku bisa diblokir untuk calon korban berikutnya.",
};

const CEKREKENING: ReportChannel = {
  id: "cekrekening",
  label: "CekRekening.id",
  href: "https://cekrekening.id",
  note: "Rekening yang dilaporkan ditandai saat orang lain memeriksanya.",
};

export const KOMDIGI: ReportChannel = {
  id: "komdigi",
  label: "Komdigi",
  href: "https://aduannomor.id",
  note: "Nomor dan akun pelaku bisa ditindak agar berhenti menghubungi orang lain.",
};

const POLISI: ReportChannel = {
  id: "patrolisiber",
  label: "Patroli Siber",
  href: "https://patrolisiber.id",
  note: "Laporan resmi untuk kasus dengan kerugian uang.",
};
```

- [ ] **Step 4: Write the contract**

```ts
// src/lib/contracts/report.ts
import { z } from "zod";

/**
 * The report-polish request.
 *
 * `.strict()` at every level: the checked message, its quotes, and the score
 * have no field to travel in. This is the same posture as `AnswerRequestSchema`
 * and `ToolSummaryRequestSchema`.
 */

export const ReportDraftSchema = z
  .object({
    subject: z.string().min(1).max(160),
    body: z.string().min(1).max(1200),
  })
  .strict();

export const ReportFactsSchema = z
  .object({
    modus: z.string().min(1).max(80),
    tactics: z.array(z.string().min(1).max(40)).max(6),
  })
  .strict();

export const ReportPolishRequestSchema = z
  .object({
    channelId: z.enum(["iasc", "komdigi", "patrolisiber", "cekrekening"]),
    draft: ReportDraftSchema,
    facts: ReportFactsSchema,
  })
  .strict();

export type ReportDraft = z.infer<typeof ReportDraftSchema>;
export type ReportFacts = z.infer<typeof ReportFactsSchema>;
export type ReportPolishRequest = z.infer<typeof ReportPolishRequestSchema>;
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- src/lib/contracts/report.test.ts src/data/report-contacts.test.ts src/components/companion/explanation-card.test.tsx`
Expected: PASS — the card test still passes because `href` and `label` are unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/data/tactics.ts src/lib/contracts/report.ts src/lib/contracts/report.test.ts
git commit -m "feat(contracts): add report channel ids and polish schema"
```

---

### Task 3: Close the unrecognized high-risk hole

**Files:**
- Modify: `src/lib/companion/explain.ts:203-211`
- Test: `src/lib/companion/explain.test.ts`

**Interfaces:**
- Consumes: `IASC`, `KOMDIGI` from Task 2.
- Produces: `explain().report` non-empty for `unrecognized && risk === "tinggi"`.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/companion/explain.test.ts`:

```ts
describe("report fallback for an unrecognized high-risk message", () => {
  const OTP_ONLY =
    "Kirim kode OTP 6 digit yang baru saja masuk ke nomor ini sekarang.";

  it("still gives OTP theft a channel to report to", () => {
    const result = scoreText({ text: OTP_ONLY });
    expect(result.risk).toBe("tinggi");
    expect(result.modus).toBe("tidak-dikenali");

    const { report } = explain(result, OTP_ONLY);
    expect(report.map((channel) => channel.id)).toEqual(["iasc", "komdigi"]);
  });

  it("does not invent a channel for a harmless unrecognized message", () => {
    const text = "Halo, besok kita rapat jam sembilan pagi.";
    const result = scoreText({ text });
    expect(result.modus).toBe("tidak-dikenali");
    expect(explain(result, text).report).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/companion/explain.test.ts -t "OTP theft"`
Expected: FAIL — `report` is `[]`.

- [ ] **Step 3: Implement the fallback**

In `src/lib/companion/explain.ts`, change the import from `@/data/tactics` to
include `IASC` and `KOMDIGI`, then replace the `report` line:

```ts
  /*
   * An unrecognized message has no scheme-specific channel, but a high-risk
   * verdict is still a fraud report: OTP theft must not lose its reporting
   * block just because `classifyModus()` could not name the scheme. Low-risk
   * unrecognized stays empty — there is nothing to report.
   */
  const report: readonly ReportChannel[] = unrecognized
    ? result.risk === "tinggi"
      ? [IASC, KOMDIGI]
      : []
    : (REPORT_CHANNELS[result.modus] ?? []);
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/lib/companion/explain.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/companion/explain.ts src/lib/companion/explain.test.ts
git commit -m "fix(companion): report OTP theft even without a matched scheme"
```

---

### Task 4: Template builder

**Files:**
- Create: `src/lib/companion/report-template.ts`
- Test: `src/lib/companion/report-template.test.ts`

**Interfaces:**
- Consumes: `ScoreResult` (`src/lib/contracts/score.ts`), `MODUS_BY_ID`, `ReportChannelId`.
- Produces: `ReportInputs`, `buildReportDraft({ result, inputs, channel }) => { subject, body }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/companion/report-template.test.ts
import { buildReportDraft } from "@/lib/companion/report-template";
import { scoreText } from "@/lib/scoring/score";

const PHISH =
  "Halo, ini dari BCA. Akun Anda akan diblokir dalam 2 jam. " +
  "Verifikasi di https://bca-verif.xyz/login sekarang.";

const OTP_ONLY =
  "Kirim kode OTP 6 digit yang baru saja masuk ke nomor ini sekarang.";

describe("buildReportDraft", () => {
  it("keeps every blank when nothing was typed", () => {
    const result = scoreText({ text: PHISH });
    const { body } = buildReportDraft({
      result,
      inputs: {},
      channel: "iasc",
    });

    expect(body).toContain("[NAMA ANDA]");
    expect(body).toContain("[NOMOR ATAU REKENING PELAKU]");
    expect(body).toContain("[TANGGAL KEJADIAN]");
    expect(body).toContain("[JUMLAH KERUGIAN]");
    expect(body).toContain("[KRONOLOGI SINGKAT]");
    expect(body).toContain("[DAFTAR BUKTI]");
  });

  it("uses typed values and keeps the rest blank", () => {
    const result = scoreText({ text: PHISH });
    const { body } = buildReportDraft({
      result,
      inputs: { name: "Sari", perpetrator: "0812xxxx", loss: "Rp1.500.000" },
      channel: "komdigi",
    });

    expect(body).toContain("Nama pelapor: Sari");
    expect(body).toContain("Nomor/akun pelaku: 0812xxxx");
    expect(body).not.toContain("[NAMA ANDA]");
  });

  it("names the matched scheme in the body and subject", () => {
    const result = scoreText({ text: PHISH });
    const { subject, body } = buildReportDraft({
      result,
      inputs: {},
      channel: "iasc",
    });

    expect(subject).toContain("Laporan dugaan penipuan");
    expect(body).toContain(`Modus yang saya alami: ${result.modus}`);
  });

  it("omits the modus line when no scheme matched", () => {
    const result = scoreText({ text: OTP_ONLY });
    const { body } = buildReportDraft({
      result,
      inputs: {},
      channel: "iasc",
    });

    expect(result.modus).toBe("tidak-dikenali");
    expect(body).not.toContain("Modus yang saya alami");
  });

  it("never prints a score or a percentage", () => {
    const result = scoreText({ text: PHISH });
    const { body } = buildReportDraft({
      result,
      inputs: {},
      channel: "iasc",
    });

    expect(body).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(body).not.toMatch(/\bskor\b/i);
    expect(body).not.toContain(`${result.score}`);
  });

  it("trims the narrative before anything else when over the cap", () => {
    const result = scoreText({ text: PHISH });
    const narrative = "a".repeat(1200);
    const { body } = buildReportDraft({
      result,
      inputs: { narrative },
      channel: "iasc",
    });

    expect(body.length).toBeLessThanOrEqual(700);
    expect(body).toContain("[NOMOR ATAU REKENING PELAKU]");
    expect(body).toContain("[NAMA ANDA]");
    expect(body).toContain("[DAFTAR BUKTI]");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/companion/report-template.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the builder**

```ts
// src/lib/companion/report-template.ts
import type { ReportChannelId } from "@/data/report-contacts";
import type { ScoreResult } from "@/lib/contracts/score";
import { MODUS_BY_ID } from "@/lib/modus";

/**
 * Deterministic report draft.
 *
 * Everything here comes from the verdict and from what the user typed. There is
 * no network call and no model: the skeleton has to be sendable when the venue
 * is offline, and it must never invent a fact the engine did not produce.
 *
 * The checked message is not read. Evidence enters only through `narrative`,
 * which the user writes deliberately.
 */

export interface ReportInputs {
  name?: string;
  perpetrator?: string;
  loss?: string;
  narrative?: string;
}

const BLANK = {
  name: "[NAMA ANDA]",
  perpetrator: "[NOMOR ATAU REKENING PELAKU]",
  date: "[TANGGAL KEJADIAN]",
  loss: "[JUMLAH KERUGIAN]",
  narrative: "[KRONOLOGI SINGKAT]",
  evidence: "[DAFTAR BUKTI]",
} as const;

const INSTITUTION: Record<ReportChannelId, string> = {
  iasc: "Otoritas Jasa Keuangan",
  komdigi: "Kementerian Komunikasi dan Digital",
  patrolisiber: "Patroli Siber",
  cekrekening: "CekRekening.id",
};

export const REPORT_BODY_CAP = 700;

export function buildReportDraft({
  result,
  inputs,
  channel,
}: {
  result: ScoreResult;
  inputs: ReportInputs;
  channel: ReportChannelId;
}): { subject: string; body: string } {
  const modus = MODUS_BY_ID.get(result.modus)?.nama ?? null;

  const subject = modus
    ? `Laporan dugaan penipuan — ${modus}`
    : "Laporan dugaan penipuan";

  let narrative = valueOrBlank(inputs.narrative, BLANK.narrative);
  let body = assemble({
    channel,
    modus,
    name: valueOrBlank(inputs.name, BLANK.name),
    perpetrator: valueOrBlank(inputs.perpetrator, BLANK.perpetrator),
    loss: valueOrBlank(inputs.loss, BLANK.loss),
    narrative,
  });

  /*
   * The narrative is the only field that can grow without bound. Trim it until
   * the body fits; the blanks and the mandatory lines are never dropped.
   */
  while (body.length > REPORT_BODY_CAP && narrative.length > 0) {
    const overflow = body.length - REPORT_BODY_CAP;
    narrative = narrative.slice(0, Math.max(0, narrative.length - overflow - 1));
    body = assemble({
      channel,
      modus,
      name: valueOrBlank(inputs.name, BLANK.name),
      perpetrator: valueOrBlank(inputs.perpetrator, BLANK.perpetrator),
      loss: valueOrBlank(inputs.loss, BLANK.loss),
      narrative: narrative.length > 0 ? narrative : BLANK.narrative,
    });
  }

  return { subject, body };
}

function valueOrBlank(value: string | undefined, blank: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : blank;
}

function assemble({
  channel,
  modus,
  name,
  perpetrator,
  loss,
  narrative,
}: {
  channel: ReportChannelId;
  modus: string | null;
  name: string;
  perpetrator: string;
  loss: string;
  narrative: string;
}): string {
  return [
    `Kepada ${INSTITUTION[channel]},`,
    "",
    "Saya ingin melaporkan dugaan penipuan yang saya alami.",
    ...(modus ? [`Modus yang saya alami: ${modus}.`] : []),
    "",
    `Nama pelapor: ${name}`,
    `Nomor/akun pelaku: ${perpetrator}`,
    `Tanggal kejadian: ${BLANK.date}`,
    `Jumlah kerugian: ${loss}`,
    `Kronologi: ${narrative}`,
    `Bukti yang saya lampirkan: ${BLANK.evidence}`,
    "",
    "Mohon nomor tiket laporan agar saya dapat memantau tindak lanjutnya.",
  ].join("\n");
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/lib/companion/report-template.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/companion/report-template.ts src/lib/companion/report-template.test.ts
git commit -m "feat(companion): add deterministic report template builder"
```

---

### Task 5: Polish client

**Files:**
- Create: `src/lib/companion/report-client.ts`
- Test: `src/lib/companion/report-client.test.ts`

**Interfaces:**
- Consumes: `ReportPolishRequest`.
- Produces: `keepsBlanks(original, polished): boolean`; `requestReportPolish(input, signal?, fetchImpl?): Promise<string | null>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/companion/report-client.test.ts
import {
  keepsBlanks,
  requestReportPolish,
} from "@/lib/companion/report-client";

const input = {
  channelId: "iasc" as const,
  draft: { subject: "Laporan", body: "Nama: [NAMA ANDA]" },
  facts: { modus: "fake-call", tactics: ["otoritas"] },
};

describe("keepsBlanks", () => {
  it("accepts text that carries every blank", () => {
    expect(keepsBlanks("Nama: [NAMA ANDA]", "Nama pelapor: [NAMA ANDA]")).toBe(
      true,
    );
  });

  it("rejects text that dropped a blank", () => {
    expect(keepsBlanks("Nama: [NAMA ANDA]", "Nama pelapor: Sari")).toBe(false);
  });
});

describe("requestReportPolish", () => {
  it("returns polished text when blanks survive", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: "Nama pelapor: [NAMA ANDA]" }), {
        status: 200,
      }),
    ) as unknown as typeof fetch;

    await expect(requestReportPolish(input, undefined, fetchImpl)).resolves.toBe(
      "Nama pelapor: [NAMA ANDA]",
    );
  });

  it("returns null when the model drops a blank", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: "Nama pelapor: Sari" }), {
        status: 200,
      }),
    ) as unknown as typeof fetch;

    await expect(requestReportPolish(input, undefined, fetchImpl)).resolves.toBe(
      null,
    );
  });

  it("never throws on a failed request", async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    await expect(requestReportPolish(input, undefined, fetchImpl)).resolves.toBe(
      null,
    );
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/companion/report-client.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the client**

```ts
// src/lib/companion/report-client.ts
import type { ReportPolishRequest } from "@/lib/contracts/report";

/**
 * Browser side of the report polish.
 *
 * Never throws, like the other companion clients: an offline venue is the
 * expected case and the deterministic draft is always available.
 */

/** Every `[BLANK]` in the original must still be in the polished text. */
export function keepsBlanks(original: string, polished: string): boolean {
  const blanks = original.match(/\[[^\]]+\]/g) ?? [];
  return blanks.every((blank) => polished.includes(blank));
}

export async function requestReportPolish(
  input: ReportPolishRequest,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetchImpl("/api/companion/tools/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) return null;

    const body = (await response.json()) as { text?: string };
    const text = body.text?.trim() ?? "";
    if (text.length === 0) return null;
    return keepsBlanks(input.draft.body, text) ? text : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/lib/companion/report-client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/companion/report-client.ts src/lib/companion/report-client.test.ts
git commit -m "feat(companion): add report polish client with blank guard"
```

---

### Task 6: Polish endpoint

**Files:**
- Create: `src/app/api/companion/tools/report/route.ts`
- Test: `src/app/api/companion/tools/report/route.test.ts`

**Interfaces:**
- Consumes: `ReportPolishRequestSchema` from Task 2.
- Produces: `POST /api/companion/tools/report` → `{ ok: true, text }` or `{ ok: false, error }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/companion/tools/report/route.test.ts
/** @jest-environment node */
jest.mock("@/lib/auth/accounts", () => ({
  consumeAttempt: jest.fn().mockResolvedValue(undefined),
  AuthError: class AuthError extends Error {},
}));

import { POST } from "@/app/api/companion/tools/report/route";
import { consumeAttempt } from "@/lib/auth/accounts";

const valid = {
  channelId: "iasc",
  draft: { subject: "Laporan", body: "Nama: [NAMA ANDA]" },
  facts: { modus: "fake-call", tactics: ["otoritas"] },
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/companion/tools/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const env = process.env;
const realFetch = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...env,
    LUMINA_LLM_URL: "http://model.local/v1",
    LUMINA_LLM_MODEL: "test-model",
  };
  jest.mocked(consumeAttempt).mockResolvedValue(undefined);
  global.fetch = jest.fn();
});

afterAll(() => {
  global.fetch = realFetch;
  process.env = env;
});

describe("POST /api/companion/tools/report", () => {
  it("rejects a body carrying the checked message", async () => {
    const response = await POST(request({ ...valid, message: "kutipan" }));
    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 503 not-configured when the model is unset", async () => {
    process.env.LUMINA_LLM_URL = "";
    const response = await POST(request(valid));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "not-configured",
    });
  });

  it("forwards the draft and returns the polished text", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Nama pelapor: [NAMA ANDA]" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(request(valid));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      text: "Nama pelapor: [NAMA ANDA]",
    });

    const sent = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    ) as { messages: { role: string; content: string }[] };
    expect(sent.messages[1]?.content).toContain("[NAMA ANDA]");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/app/api/companion/tools/report/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the route**

```ts
// src/app/api/companion/tools/report/route.ts
import { ReportPolishRequestSchema } from "@/lib/contracts/report";
import {
  BodyTooLarge,
  limitAI,
  readJson,
  upstreamAbort,
} from "@/lib/server/request";

/** Must stay below the client's 23 s abort. */
const DEADLINE_MS = 20000;

const MAX_TOKENS = 600;

const SYSTEM = [
  "Kamu adalah Lumina, pendamping yang membantu korban penipuan menyiapkan laporan.",
  "Tulis ulang draf laporan agar lebih tenang dan jelas, dalam Bahasa Indonesia.",
  "Pertahankan setiap penanda dalam kurung siku persis seperti aslinya, misalnya [NAMA ANDA].",
  "Jangan menambah nama, nomor, jumlah uang, tanggal, pasal, atau klaim hukum apa pun.",
  "Jangan menilai risiko dan jangan menyebut skor.",
  "Maksimal 140 kata. Tanpa markdown, tanpa daftar bernomor, tanpa salam pembuka.",
].join("\n");

function fail(status: number, error: string) {
  return Response.json({ ok: false, error }, { status });
}

/**
 * Rewrites the deterministic draft's tone only.
 *
 * The request schema has no field for the checked message, its quotes, or the
 * score, so "the message never leaves the device" is structural, not a promise
 * in the prompt.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJson(request, 65536);
  } catch (error) {
    return fail(error instanceof BodyTooLarge ? 413 : 400, "invalid-request");
  }
  const parsed = ReportPolishRequestSchema.safeParse(body);
  if (!parsed.success) return fail(400, "invalid-request");

  const base = process.env.LUMINA_LLM_URL?.trim();
  const model = process.env.LUMINA_LLM_MODEL?.trim();
  if (!base || !model) return fail(503, "not-configured");

  const limited = await limitAI(request, "text");
  if (limited) return limited;
  const upstreamControl = upstreamAbort(request, DEADLINE_MS);

  try {
    const upstream = await fetch(
      `${base.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        signal: upstreamControl.signal,
        headers: {
          "content-type": "application/json",
          ...(process.env.LUMINA_LLM_KEY
            ? { authorization: `Bearer ${process.env.LUMINA_LLM_KEY}` }
            : {}),
        },
        body: JSON.stringify({
          model,
          stream: false,
          temperature: 0.3,
          reasoning_effort: "none",
          max_tokens: MAX_TOKENS,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: JSON.stringify(parsed.data) },
          ],
        }),
      },
    );

    if (!upstream.ok) return fail(503, "upstream-failed");

    const json = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (text.length === 0) return fail(503, "upstream-empty");

    return Response.json({ ok: true, text });
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    return fail(503, aborted ? "upstream-timeout" : "upstream-unreachable");
  } finally {
    upstreamControl.cleanup();
  }
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/app/api/companion/tools/report/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/companion/tools/report/route.ts src/app/api/companion/tools/report/route.test.ts
git commit -m "feat(api): add report polish endpoint"
```

---

### Task 7: Report template component

**Files:**
- Create: `src/components/companion/report-template.tsx`
- Test: `src/components/companion/report-template.test.tsx`

**Interfaces:**
- Consumes: `buildReportDraft`, `ReportInputs`, `REPORT_CONTACTS`, `requestReportPolish`, `ReportChannel`, `ScoreResult`.
- Produces: `<ReportTemplate result={ScoreResult} channels={readonly ReportChannel[]} />`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/companion/report-template.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportTemplate } from "@/components/companion/report-template";
import { REPORT_CHANNELS } from "@/data/tactics";
import { scoreText } from "@/lib/scoring/score";

const PHISH =
  "Halo, ini dari BCA. Akun Anda akan diblokir dalam 2 jam. " +
  "Verifikasi di https://bca-verif.xyz/login sekarang.";

function renderFor(text = PHISH, channels = REPORT_CHANNELS["phishing-tautan"]) {
  const result = scoreText({ text });
  return render(<ReportTemplate result={result} channels={channels} />);
}

describe("ReportTemplate", () => {
  it("keeps the form closed until asked", () => {
    renderFor();
    expect(screen.queryByLabelText(/Nama pelapor/i)).not.toBeInTheDocument();
  });

  it("opens the form and shows the draft", async () => {
    const user = userEvent.setup();
    renderFor();

    await user.click(screen.getByRole("button", { name: /Buat template laporan/i }));

    expect(screen.getByLabelText(/Nama pelapor/i)).toBeInTheDocument();
    expect(screen.getByText(/\[NAMA ANDA\]/)).toBeInTheDocument();
  });

  it("fills the draft with what the user typed", async () => {
    const user = userEvent.setup();
    renderFor();

    await user.click(screen.getByRole("button", { name: /Buat template laporan/i }));
    await user.type(screen.getByLabelText(/Nama pelapor/i), "Sari");

    expect(screen.getByText(/Nama pelapor: Sari/)).toBeInTheDocument();
  });

  it("builds a real tel link and prints the number", async () => {
    const user = userEvent.setup();
    renderFor(undefined, [REPORT_CHANNELS["fake-call"][0]]);
    await user.click(screen.getByRole("button", { name: /Buat template laporan/i }));

    const call = screen.getByRole("link", { name: /Telepon 157/i });
    expect(call).toHaveAttribute("href", "tel:157");
    expect(screen.getByText("157")).toBeInTheDocument();
  });

  it("builds a mailto link whose body carries the draft", async () => {
    const user = userEvent.setup();
    renderFor();
    await user.click(screen.getByRole("button", { name: /Buat template laporan/i }));

    const mail = screen.getByRole("link", { name: /Email/i });
    const href = mail.getAttribute("href") ?? "";
    expect(href.startsWith("mailto:")).toBe(true);
    expect(decodeURIComponent(href)).toContain("[NAMA ANDA]");
  });

  it("tells the user to call the bank without inventing a number", async () => {
    const user = userEvent.setup();
    renderFor();
    await user.click(screen.getByRole("button", { name: /Buat template laporan/i }));

    expect(screen.getByText(/nomor di belakang kartu/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/components/companion/report-template.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

```tsx
// src/components/companion/report-template.tsx
"use client";

import { Check, ChevronDown, Copy, ExternalLink, Mail, Phone } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { REPORT_CONTACTS, type ReportContact } from "@/data/report-contacts";
import type { ReportChannel } from "@/data/tactics";
import {
  buildReportDraft,
  type ReportInputs,
} from "@/lib/companion/report-template";
import { requestReportPolish } from "@/lib/companion/report-client";
import type { ScoreResult } from "@/lib/contracts/score";
import { cn } from "@/lib/utils";

/**
 * ReportTemplate — from verdict to a sendable report.
 *
 * The draft is deterministic and built on the device. "Rapikan" is the only
 * action that touches the network, and a polish that drops a blank is thrown
 * away in `requestReportPolish`.
 */
export function ReportTemplate({
  result,
  channels,
}: {
  result: ScoreResult;
  channels: readonly ReportChannel[];
}) {
  const [open, setOpen] = React.useState(false);
  const [inputs, setInputs] = React.useState<ReportInputs>({});
  const [channelId, setChannelId] = React.useState(channels[0]?.id ?? "iasc");
  const [polished, setPolished] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [copyFailed, setCopyFailed] = React.useState(false);

  const draft = React.useMemo(
    () => buildReportDraft({ result, inputs, channel: channelId }),
    [result, inputs, channelId],
  );
  const body = polished ?? draft.body;
  const contacts = REPORT_CONTACTS[channelId] ?? [];

  function field(key: keyof ReportInputs, label: string) {
    return (
      <label className="flex flex-col gap-1 text-xs text-dim">
        <span>{label}</span>
        <input
          className="min-h-11 rounded-[8px] border border-line bg-panel-2/40 px-3 text-sm text-txt outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          value={inputs[key] ?? ""}
          onChange={(event) => {
            setPolished(null);
            setInputs((prev) => ({ ...prev, [key]: event.target.value }));
          }}
        />
      </label>
    );
  }

  async function polish() {
    setBusy(true);
    const text = await requestReportPolish({
      channelId,
      draft,
      facts: { modus: result.modus, tactics: [] },
    });
    setBusy(false);
    if (text) setPolished(text);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopyFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-line border-t pt-3">
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="min-h-11 justify-between"
      >
        Buat template laporan
        <ChevronDown
          aria-hidden
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </Button>

      {open ? (
        <div className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {field("name", "Nama pelapor")}
            {field("perpetrator", "Nomor atau rekening pelaku")}
            {field("loss", "Jumlah kerugian")}
          </div>
          <label className="flex flex-col gap-1 text-xs text-dim">
            <span>Kronologi singkat (opsional)</span>
            <textarea
              className="min-h-20 rounded-[8px] border border-line bg-panel-2/40 px-3 py-2 text-sm text-txt outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              value={inputs.narrative ?? ""}
              onChange={(event) => {
                setPolished(null);
                setInputs((prev) => ({
                  ...prev,
                  narrative: event.target.value,
                }));
              }}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {channels.map((channel) => (
              <Button
                key={channel.id}
                type="button"
                size="sm"
                variant={channel.id === channelId ? "default" : "outline"}
                onClick={() => {
                  setChannelId(channel.id);
                  setPolished(null);
                }}
              >
                {channel.label}
              </Button>
            ))}
          </div>

          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-[8px] bg-panel-2/40 p-3 text-xs text-txt leading-relaxed">
            {body}
          </pre>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11"
              onClick={copy}
            >
              {copied ? (
                <Check aria-hidden className="size-4" />
              ) : (
                <Copy aria-hidden className="size-4" />
              )}
              {copied ? "Tersalin" : "Salin"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11"
              disabled={busy}
              onClick={polish}
            >
              {busy ? "Merapikan…" : "Rapikan"}
            </Button>
            {contacts.map((contact) => (
              <ContactAction
                key={`${contact.kind}-${contact.value}`}
                contact={contact}
                draft={draft}
                body={body}
              />
            ))}
          </div>

          {copyFailed ? (
            <p className="text-dim text-xs leading-snug">
              Peramban menolak papan klip. Pilih teks di kotak di atas lalu
              salin manual.
            </p>
          ) : null}

          <p className="text-dim text-xs leading-snug">
            Bank tetap langkah pertama: telepon nomor di belakang kartu atau di
            aplikasi resmi bank, lalu minta pembekuan akses.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ContactAction({
  contact,
  draft,
  body,
}: {
  contact: ReportContact;
  draft: { subject: string; body: string };
  body: string;
}) {
  if (contact.kind === "tel") {
    return (
      <Button asChild type="button" size="sm" variant="outline" className="min-h-11">
        <a href={`tel:${contact.value}`}>
          <Phone aria-hidden className="size-4" />
          {contact.label}
          <span className="tabular text-dim">{contact.value}</span>
        </a>
      </Button>
    );
  }

  if (contact.kind === "wa") {
    return (
      <Button asChild type="button" size="sm" variant="outline" className="min-h-11">
        <a
          href={`https://wa.me/${contact.value}?text=${encodeURIComponent(body)}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          {contact.label}
        </a>
      </Button>
    );
  }

  if (contact.kind === "email") {
    const subject = encodeURIComponent(draft.subject);
    const text = encodeURIComponent(body);
    return (
      <Button asChild type="button" size="sm" variant="outline" className="min-h-11">
        <a href={`mailto:${contact.value}?subject=${subject}&body=${text}`}>
          <Mail aria-hidden className="size-4" />
          {contact.label}
        </a>
      </Button>
    );
  }

  return (
    <Button asChild type="button" size="sm" variant="outline" className="min-h-11">
      <a href={contact.value} target="_blank" rel="noreferrer noopener">
        <ExternalLink aria-hidden className="size-4" />
        {contact.label}
      </a>
    </Button>
  );
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/components/companion/report-template.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/companion/report-template.tsx src/components/companion/report-template.test.tsx
git commit -m "feat(companion): add report template builder card"
```

---

### Task 8: Mount in the explanation card

**Files:**
- Modify: `src/components/companion/explanation-card.tsx:223-264`
- Modify: `src/components/companion/companion-chat.tsx:1558-1566`
- Test: `src/components/companion/explanation-card.test.tsx`

**Interfaces:**
- Consumes: `ReportTemplate` from Task 7.
- Produces: `ExplanationCard` gains a `result: ScoreResult` prop.

- [ ] **Step 1: Write the failing tests**

In `src/components/companion/explanation-card.test.tsx`, add `result` to
`renderFor` and add two cases:

```tsx
function renderFor(
  text: string,
  schemeName: string | null = "Phishing tautan & akun",
) {
  const result = scoreText({ text });
  return render(
    <ExplanationCard
      explanation={explain(result, text)}
      schemeName={schemeName}
      result={result}
    />,
  );
}
```

```tsx
  it("offers a template for an OTP-only high-risk message", () => {
    renderFor(
      "Kirim kode OTP 6 digit yang baru saja masuk ke nomor ini sekarang.",
      null,
    );
    expect(screen.getByText("Kalau sudah terlanjur")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Buat template laporan/i }),
    ).toBeInTheDocument();
  });

  it("shows the generic-channel note only when no channel exists", () => {
    renderFor("Halo, apa kabar?", null);
    expect(
      screen.getByText(/belum cocok dengan salah satu skema/i),
    ).toBeVisible();
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/components/companion/explanation-card.test.tsx`
Expected: FAIL — `result` is not a prop; the OTP case has no report block.

- [ ] **Step 3: Mount the builder and fix the note**

In `src/components/companion/explanation-card.tsx`:

```tsx
import type { ScoreResult } from "@/lib/contracts/score";
import { ReportTemplate } from "@/components/companion/report-template";
```

Update the signature:

```tsx
export function ExplanationCard({
  explanation,
  schemeName,
  result,
  className,
}: {
  explanation: Explanation;
  /** Human name of the matched scheme, e.g. "Phishing tautan & akun". */
  schemeName: string | null;
  /** The verdict the explanation was built from; the report tool needs it. */
  result: ScoreResult;
  className?: string;
}) {
```

Inside the report card's `CardContent`, after the `<ul>`:

```tsx
            <ReportTemplate result={result} channels={report} />
```

Replace the trailing note with:

```tsx
      {unrecognized && report.length === 0 && verify.length > 0 ? (
        <p className="px-1 text-dim text-xs leading-snug">
          Polanya belum cocok dengan salah satu skema yang dikenal, jadi belum
          ada kanal laporan khusus. Langkah pemeriksaan di atas tetap berlaku.
        </p>
      ) : null}
      {unrecognized && report.length > 0 ? (
        <p className="px-1 text-dim text-xs leading-snug">
          Polanya belum cocok dengan skema yang dikenal, tetapi kanal di atas
          tetap menerima laporan penipuan. Langkah pemeriksaan juga berlaku.
        </p>
      ) : null}
```

In `src/components/companion/companion-chat.tsx:1558`, pass the verdict:

```tsx
                            <ExplanationCard
                              explanation={turn.explanation}
                              schemeName={
                                modusFor(turn.result.relatedModule)?.nama ??
                                null
                              }
                              result={turn.result}
                            />
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/components/companion/explanation-card.test.tsx src/components/companion/companion-chat.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/companion/explanation-card.tsx src/components/companion/explanation-card.test.tsx src/components/companion/companion-chat.tsx
git commit -m "feat(companion): mount report template in the report card"
```

---

### Task 9: Gate

**Files:** none.

- [ ] **Step 1: Run the full gate**

Run: `npm run verify`
Expected: typecheck, lint, all tests, and build pass.

- [ ] **Step 2: Inspect the 380px layout**

Run: `npm run dev`, open `/companion`, check a phishing message at 380px width:
the disclosure is reachable, inputs stack, actions wrap, no horizontal scroll,
and the `tel:` row prints `157` beside the link.

- [ ] **Step 3: Commit any formatting fix**

```bash
git add -A -- src
git commit -m "chore: format report template files"
```

(Only if `npm run verify` rewrote something; otherwise skip.)
