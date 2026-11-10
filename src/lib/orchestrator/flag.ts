export function isOrchestratorEnabled(): boolean {
  const value = process.env.LUMINA_COMPANION_ORCHESTRATOR?.trim();
  return /^(1|true|on|yes)$/i.test(value ?? "");
}

export function orchestratorDeadlineMs(): number {
  const value = Number(process.env.LUMINA_ORCHESTRATOR_DEADLINE_MS);
  return Number.isFinite(value) && value >= 10_000 && value <= 120_000
    ? value
    : 60_000;
}
