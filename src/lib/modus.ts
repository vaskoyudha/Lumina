import { z } from "zod";
import raw from "@/data/modus.json";

/**
 * `modus.json` is the single source of truth for the 12 schemes (§11.2).
 * Stream B reads this file; it must not re-type the list.
 *
 * Validated on import so a typo fails the build, not the demo.
 */

export const ModusSchema = z.object({
  id: z.string(),
  no: z.number().int().min(1).max(12),
  nama: z.string(),
  /** IASC complaint count. `null` where the source has no figure. */
  laporan: z.number().int().nullable(),
  /** Used when the figure is not a count: "Peringatan OJK", "Ikut momen tahunan". */
  laporanNote: z.string().nullable(),
  kerugian: z.string(),
  ciri: z.array(z.string()).min(1),
  /** Learning-curve level (§11.4), 1..5. */
  level: z.number().int().min(1).max(5),
  modulStatus: z.enum(["lengkap", "segera"]),
  /** Simulation wired to this module, or null when it has none. Null is allowed. */
  scenarioId: z.string().nullable(),
  /** Planned but cut simulation (L2..L4). Shown as "rencana", never played. */
  scenarioPlanned: z.string().nullable(),
  detectors: z.array(z.enum(["message", "link", "identity", "conversation"])),
});

export const ModusListSchema = z
  .array(ModusSchema)
  .length(12)
  .refine((list) => new Set(list.map((m) => m.no)).size === 12, {
    error: "nomor modus duplikat",
  });

export type Modus = z.infer<typeof ModusSchema>;

export const MODUS: readonly Modus[] = ModusListSchema.parse(raw);

export const MODUS_BY_NO = new Map<number, Modus>(
  MODUS.map((m) => [m.no, m] as const),
);

export const MODUS_BY_ID = new Map<string, Modus>(
  MODUS.map((m) => [m.id, m] as const),
);

export const UNRECOGNIZED_ID = "tidak-dikenali";

/** Module that has a playable simulation. Used by the demo path. */
export const DEMO_MODULE = MODUS_BY_NO.get(10);

/** Modules B will actually write, in build order (§11.2: 10 → 1 → 2 → 7). */
export const BUILD_ORDER = [10, 1, 2, 7] as const;

export function modusFor(no: number | null): Modus | null {
  return no === null ? null : (MODUS_BY_NO.get(no) ?? null);
}

export function formattedLaporan(m: Modus): string {
  if (m.laporan !== null) return m.laporan.toLocaleString("id-ID");
  return m.laporanNote ?? "—";
}
