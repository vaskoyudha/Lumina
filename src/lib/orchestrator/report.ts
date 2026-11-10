import { z } from "zod";

/**
 * The specialist's final report is a tool call, not free-form JSON.
 *
 * The harness validates every point against the evidence that this specialist
 * actually received. A rejected report becomes a tool result the model can read
 * and correct; it never reaches the UI as a summary.
 */

export const ReportPointSchema = z
  .object({
    signal: z.string().trim().min(2).max(160),
    point: z.string().trim().min(3).max(240),
    reason: z.string().trim().min(3).max(600),
    pattern: z.string().trim().min(2).max(120),
    watchout: z.string().trim().min(3).max(280),
    quote: z
      .string()
      .trim()
      .max(240)
      .optional()
      .describe(
        "Potongan persis dari pesan yang akan disorot. Wajib untuk temuan yang terlihat di teks.",
      ),
  })
  .strict();

export const SubmitReportSchema = z
  .object({
    thought: z.string().trim().max(800).default(""),
    summary: z.string().trim().min(3).max(1200),
    points: z.array(ReportPointSchema).max(5).default([]),
    watchouts: z.array(z.string().trim().min(3).max(280)).max(4).default([]),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export type ReportPoint = z.infer<typeof ReportPointSchema>;
export type SubmitReport = z.infer<typeof SubmitReportSchema>;

export interface ReportSignal {
  label: string;
  evidence?: string | null;
  weight?: number;
}

const SECRET_NOUN =
  /\b(?:otp|pin|password|kata\s*sandi|sandi|kode\s*verifikasi|cvv)\b/i;
const SEND_VERB =
  /\b(?:kirim|kirimkan|berikan|masukkan|sebutkan|balas|forward|teruskan|dikirim|diberikan)\b/i;
const NEGATION = /\b(?:jangan|tidak|hindari|never|jangan\s+pernah)\b/i;

function unsafeInstruction(text: string): boolean {
  return text
    .split(/[.!?;\n]+/)
    .some(
      (sentence) =>
        SECRET_NOUN.test(sentence) &&
        SEND_VERB.test(sentence) &&
        !NEGATION.test(sentence),
    );
}

export interface ReportContext {
  message: string;
  signals: readonly ReportSignal[];
}

export interface InvalidReport {
  ok: false;
  error: "invalid-report";
  issues: string[];
}

export type ReportResult = { ok: true; report: SubmitReport } | InvalidReport;

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function contains(haystack: string, needle: string): boolean {
  return normalize(haystack).includes(normalize(needle));
}

function issuePath(path: PropertyKey[]): string {
  return path.length ? path.join(".") : "report";
}

export function validateReport(
  input: unknown,
  context: ReportContext,
): ReportResult {
  const parsed = SubmitReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid-report",
      issues: parsed.error.issues.map(
        (issue) => `${issuePath(issue.path)}: ${issue.message}`,
      ),
    };
  }

  const report = parsed.data;
  const issues: string[] = [];
  const summary = report.summary.trim();
  if (summary.startsWith("{") || summary.startsWith("```")) {
    issues.push("summary: jangan mengirim JSON atau blok kode");
  }

  if (context.signals.length > 0 && report.points.length === 0) {
    issues.push(
      "points: tool menemukan sinyal; sertakan minimal satu poin yang merujuk sinyal itu",
    );
  }
  report.watchouts.forEach((watchout, index) => {
    if (unsafeInstruction(watchout)) {
      issues.push(
        `watchouts.${index}: jangan menginstruksikan pengguna mengirim OTP/PIN/password`,
      );
    }
  });
  if (report.points.length > context.signals.length) {
    issues.push(
      "points: jumlah poin melebihi jumlah sinyal yang dikembalikan tool",
    );
  }

  const byLabel = new Map(
    context.signals.map((signal) => [normalize(signal.label), signal]),
  );
  const seen = new Set<string>();

  report.points.forEach((point, index) => {
    const key = normalize(point.signal);
    if (!byLabel.has(key)) {
      issues.push(
        `points.${index}.signal: "${point.signal}" bukan sinyal yang dikembalikan tool`,
      );
    }
    if (seen.has(key)) {
      issues.push(`points.${index}.signal: sinyal duplikat "${point.signal}"`);
    }
    seen.add(key);

    if (unsafeInstruction(point.watchout)) {
      issues.push(
        `points.${index}.watchout: jangan menginstruksikan pengguna mengirim OTP/PIN/password`,
      );
    }

    if (point.quote) {
      const quote = point.quote;
      const evidence = context.signals
        .filter((signal) => normalize(signal.label) === key)
        .map((signal) => signal.evidence ?? "");
      const grounded =
        contains(context.message, quote) ||
        evidence.some((value) => contains(value, quote));
      if (!grounded) {
        issues.push(
          `points.${index}.quote: kutipan tidak ada di pesan atau bukti sinyal`,
        );
      }
    }
  });

  if (issues.length > 0) {
    return { ok: false, error: "invalid-report", issues };
  }
  return { ok: true, report };
}

export const SUBMIT_REPORT_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_report",
    description:
      "Submit the final evidence-grounded report. Call this when your investigation is ready; if the harness rejects it, read the issues and call it again with the corrected fields. The harness rejects unknown signals and invented quotes, so use the labels and evidence returned by the other tools.",
    parameters: z.toJSONSchema(SubmitReportSchema),
  },
};
