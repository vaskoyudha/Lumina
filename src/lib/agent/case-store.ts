import type { AgentTrace } from "@/lib/contracts/agent-run";
import { STAGE_LABEL } from "@/lib/contracts/agent-run";
import type { ScoreResult } from "@/lib/contracts/score";
export interface CaseRecord {
  id: string;
  createdAt: string;
  inputHash: string;
  signals: { ruleId: string; mechanism: string; weight: number }[];
  trace: AgentTrace;
  toolCalls: { name: string; ms: number; status: string }[];
}
const TTL = 86400000;
export class CaseStore {
  private cases = new Map<string, CaseRecord>();
  prune(now: number) {
    for (const [id, item] of this.cases)
      if (now - Date.parse(item.createdAt) >= TTL) this.cases.delete(id);
  }
  async record(
    text: string,
    result: ScoreResult,
    trace: AgentTrace,
    now = Date.now(),
    existingId?: string,
  ): Promise<CaseRecord> {
    this.prune(now);
    const inputHash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
      ),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    const safeId = (value: string) =>
      /^[a-z][a-z0-9.-]{0,80}$/.test(value) ? value : "unknown";
    const safeTrace: AgentTrace = {
      totalMs: trace.totalMs,
      stages: trace.stages.map((s) => ({
        id: s.id,
        ...STAGE_LABEL[s.id],
        status: s.status,
        findings: s.findings,
        ms: s.ms,
      })),
      ...(trace.validation
        ? {
            validation: {
              verdict: trace.validation.verdict,
              clusters: trace.validation.clusters,
              topWeight: trace.validation.topWeight,
              capped: trace.validation.capped,
              note: "Bukti dikelompokkan menurut mekanisme.",
            },
          }
        : {}),
    };
    const record: CaseRecord = {
      id: existingId ?? crypto.randomUUID(),
      createdAt:
        this.cases.get(existingId ?? "")?.createdAt ??
        new Date(now).toISOString(),
      inputHash,
      signals: result.signals
        .filter((s) => s.weight > 0)
        .map((s) => ({
          ruleId: safeId(s.ruleId ?? "unknown"),
          mechanism: s.mechanism ?? "unknown",
          weight: s.weight,
        })),
      trace: safeTrace,
      toolCalls: trace.stages
        .filter((s) => s.id === "verify" || s.id === "job-search")
        .map((s) => ({ name: s.id, ms: s.ms, status: s.status })),
    };
    if (this.cases.size >= 100 && !this.cases.has(record.id))
      this.cases.delete(this.cases.keys().next().value as string);
    this.cases.set(record.id, record);
    return structuredClone(record);
  }
  list(now = Date.now()) {
    this.prune(now);
    return structuredClone([...this.cases.values()]);
  }
  clear() {
    this.cases.clear();
  }
}
export const sessionCases = new CaseStore();
export function redactLog(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactLog);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /text|evidence|question|authorization|key|password|token|secret/i.test(
          key,
        )
          ? "[REDACTED]"
          : redactLog(item),
      ]),
    );
  return value;
}
export function caseMetrics(cases: CaseRecord[]) {
  const times = cases
    .flatMap((c) => c.toolCalls.map((t) => t.ms))
    .sort((a, b) => a - b);
  const voices = cases.flatMap((c) =>
    c.trace.stages.filter((s) => s.id === "voice"),
  );
  return {
    cases: cases.length,
    toolCalls: times.length,
    p95Ms: times.length ? times[Math.ceil(times.length * 0.95) - 1] : null,
    fallbackRate: voices.length
      ? voices.filter((s) => s.status === "dilewati" || s.status === "gagal")
          .length / voices.length
      : null,
  };
}
