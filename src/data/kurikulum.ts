import { MODUL_10 } from "@/data/modul-10";
import type { ModuleContent } from "@/data/modul-schema";

/**
 * The published curriculum: which course numbers actually have written content.
 *
 * `modus.json` says 12 schemes exist; this file says which of them (plus any
 * admin-added course) has a body to read. That distinction matters: before
 * this, `/belajar/[modul]` only rendered module 10 and "lengkap" was a claim
 * typed into JSON. Now "lengkap" is derived from this map, so it cannot lie.
 *
 * Admin adds a course by adding one entry here — see `src/app/admin`.
 */

export const KURIKULUM: Readonly<Record<number, ModuleContent>> = {
  10: MODUL_10,
};

export function courseFor(no: number): ModuleContent | null {
  return KURIKULUM[no] ?? null;
}

export function isPublished(no: number): boolean {
  return no in KURIKULUM;
}

export const PUBLISHED_COUNT = Object.keys(KURIKULUM).length;
