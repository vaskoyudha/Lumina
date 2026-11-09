import { z } from "zod";
import type { LokerView, SavedLoker } from "@/lib/loker/types";

/**
 * Saved postings are a device-local snapshot, never a server record.
 *
 * The snapshot is deliberately smaller than `LokerView`: no description, no
 * apply URL, no signals. It is enough to recognise the posting and re-find it
 * from the next scan, and it keeps the storage key small.
 */

export const SAVED_KEY = "lumina-saved-loker";
export const SAVED_EVENT = "lumina:saved-loker";
export const SAVED_MAX = 200;

const SavedLokerSchema = z
  .object({
    id: z.string().min(1).max(2048),
    title: z.string().min(1).max(200),
    company: z.string().min(1).max(200),
    location: z.string().max(200).nullable(),
    salaryText: z.string().max(120).nullable(),
    sentinelStatus: z.enum(["clean", "suspicious", "rejected"]),
    luminaRisk: z.enum(["bersih", "rendah", "mencurigakan", "tinggi"]),
    savedAt: z.string(),
  })
  .strict();

const SavedListSchema = z.array(SavedLokerSchema).max(SAVED_MAX);

export function loadSaved(): SavedLoker[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = SavedListSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function writeSaved(list: readonly SavedLoker[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SAVED_KEY,
    JSON.stringify(list.slice(0, SAVED_MAX)),
  );
  window.dispatchEvent(new Event(SAVED_EVENT));
}

export function snapshotOf(posting: LokerView): SavedLoker {
  return {
    id: posting.urlKey,
    title: posting.title,
    company: posting.company,
    location: posting.location,
    salaryText: posting.salaryText,
    sentinelStatus: posting.sentinelStatus,
    luminaRisk: posting.luminaRisk,
    savedAt: new Date().toISOString(),
  };
}

export function toggleSaved(posting: LokerView): SavedLoker[] {
  const current = loadSaved();
  const exists = current.some((item) => item.id === posting.urlKey);
  const next = exists
    ? current.filter((item) => item.id !== posting.urlKey)
    : [snapshotOf(posting), ...current].slice(0, SAVED_MAX);
  writeSaved(next);
  return next;
}

export function removeSaved(id: string): SavedLoker[] {
  const next = loadSaved().filter((item) => item.id !== id);
  writeSaved(next);
  return next;
}
