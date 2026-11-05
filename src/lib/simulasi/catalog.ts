import { L1_KURIR_APK } from "@/lib/simulasi/scenario";
import { validateScenario } from "@/lib/simulasi/validate";

/** Scenarios that really exist and can be opened by the runner. */
export const SCENARIO_CATALOG = [L1_KURIR_APK] as const;

for (const scenario of SCENARIO_CATALOG) {
  const errors = validateScenario(scenario);
  if (errors.length > 0) {
    throw new Error(
      `Skenario ${scenario.scenario.id} tidak valid: ${errors.join("; ")}`,
    );
  }
}
