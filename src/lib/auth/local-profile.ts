"use client";

/**
 * Local profile — the only place user state exists.
 *
 * Mirrors the shape Stream B needs for `progress.ts` (plan §5-B):
 * `{ completedModules, badges, missedPatterns }`. Kept in one module so B can
 * reuse it rather than inventing a second storage key.
 *
 * Nothing here ever leaves the browser.
 */

const PROFILE_KEY = "lumina.profile";
const PROGRESS_KEY = "lumina.progress";

export interface LocalProfile {
  email: string;
  nama: string;
  /** ISO 8601 */
  createdAt: string;
}

export interface LocalProgress {
  completedModules: number[];
  badges: string[];
  missedPatterns: string[];
}

export const EMPTY_PROGRESS: LocalProgress = {
  completedModules: [],
  badges: [],
  missedPatterns: [],
};

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

export function loadProgress(): LocalProgress {
  return read<LocalProgress>(PROGRESS_KEY) ?? EMPTY_PROGRESS;
}

export function saveProgress(progress: LocalProgress): void {
  write(PROGRESS_KEY, progress);
}

export function seedProgress(progress: LocalProgress): void {
  write(PROGRESS_KEY, progress);
}

export function clearLocalState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_KEY);
  window.localStorage.removeItem(PROGRESS_KEY);
}
