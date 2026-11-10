import type { AgentTrace } from "@/lib/contracts/agent-run";
export function ValidationNote({ trace }: { trace?: AgentTrace | null }) {
  const validation = trace?.validation;
  if (!validation) return null;
  return (
    <div
      data-testid="validation-summary"
      className="flex flex-wrap items-start gap-2 rounded-lg bg-panel-2 p-3 text-sm"
    >
      <span className="font-medium">
        {validation.verdict === "tipis"
          ? "Bukti tipis"
          : validation.verdict === "bertentangan"
            ? "Ada kontradiksi"
            : "Bukti cukup"}
      </span>
      <span className="min-w-0 break-words text-dim">{validation.note}</span>
    </div>
  );
}
