import { MODUL_01 } from "@/data/modul-01";
import { MODUL_02 } from "@/data/modul-02";
import { MODUL_03 } from "@/data/modul-03";
import { MODUL_04 } from "@/data/modul-04";
import { MODUL_05 } from "@/data/modul-05";
import { MODUL_06 } from "@/data/modul-06";
import { MODUL_07 } from "@/data/modul-07";
import { MODUL_08 } from "@/data/modul-08";
import { MODUL_09 } from "@/data/modul-09";
import { MODUL_10 } from "@/data/modul-10";
import { MODUL_11 } from "@/data/modul-11";
import { MODUL_12 } from "@/data/modul-12";
import type { ModuleContent } from "@/data/modul-schema";

/**
 * The published curriculum: which course numbers actually have written content.
 *
 * `modus.json` says 12 schemes exist; this file says which of them (plus any
 * admin-added course) has a body to read. That distinction matters: before
 * this, `/belajar/[modul]` only rendered module 10 and "lengkap" was a claim
 * typed into JSON. Now "lengkap" is derived from this map, so it cannot lie.
 *
 * All twelve original modules are written. Admin adds a course by adding one
 * entry here — see `src/app/admin`.
 */

export const KURIKULUM: Readonly<Record<number, ModuleContent>> = {
  1: MODUL_01,
  2: MODUL_02,
  3: MODUL_03,
  4: MODUL_04,
  5: MODUL_05,
  6: MODUL_06,
  7: MODUL_07,
  8: MODUL_08,
  9: MODUL_09,
  10: MODUL_10,
  11: MODUL_11,
  12: MODUL_12,
};

export function courseFor(no: number): ModuleContent | null {
  return KURIKULUM[no] ?? null;
}

export function isPublished(no: number): boolean {
  return no in KURIKULUM;
}

export const PUBLISHED_COUNT = Object.keys(KURIKULUM).length;
