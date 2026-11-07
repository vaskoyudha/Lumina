"use client";

/**
 * Local profile — the only place the display name/email record exists.
 *
 * Progress lives in `@/lib/progress` (one versioned key, one schema); this
 * module owns only the profile record. Nothing here ever leaves the browser.
 */

import { STORAGE_KEY as PROGRESS_KEY } from "@/lib/progress";

const PROFILE_KEY = "lumina.profile";

export interface LocalProfile {
  email: string;
  nama: string;
  /** ISO 8601 */
  createdAt: string;
}

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full quota: the app still works, progress just does
    // not persist. Never throw into a form submit.
  }
}

export function loadProfile(): LocalProfile | null {
  return read<LocalProfile>(PROFILE_KEY);
}

export function saveProfile(profile: LocalProfile): void {
  write(PROFILE_KEY, profile);
}

export function clearLocalState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_KEY);
  window.localStorage.removeItem(PROGRESS_KEY);
}
