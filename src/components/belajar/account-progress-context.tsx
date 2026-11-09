"use client";

import { createContext, useContext } from "react";
import type { LearningSummary } from "@/lib/content/schema";
import type { Progress as StoredProgress } from "@/lib/progress";

export type AccountProgressState = {
  modules: LearningSummary[];
  progress: StoredProgress | null;
  error: string | null;
  authenticated: boolean;
  simulations: {
    scenarioId: string;
    mode: string;
    outcome: string;
    finishedAt: string;
  }[];
  refresh: () => Promise<void>;
  update: (progress: StoredProgress) => void;
};

export const AccountProgressContext =
  createContext<AccountProgressState | null>(null);

export function useAccountProgress() {
  const state = useContext(AccountProgressContext);
  if (!state)
    return {
      modules: [],
      progress: null,
      error: null,
      authenticated: false,
      simulations: [],
      refresh: async () => {},
      update: () => {},
    } as AccountProgressState;
  return state;
}

export function useStoredProgress(): StoredProgress | null {
  return useAccountProgress().progress;
}
