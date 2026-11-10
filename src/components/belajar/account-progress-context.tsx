"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import type { LearningSummary } from "@/lib/content/schema";
import type { Progress as StoredProgress } from "@/lib/progress";

export type AccountSimulation = {
  scenarioId: string;
  mode: string;
  outcome: string;
  finishedAt: string;
};

export type AccountProgressSnapshot = {
  progress: StoredProgress | null;
  error: string | null;
  authenticated: boolean;
  simulations: AccountSimulation[];
};

export type AccountProgressStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => AccountProgressSnapshot;
  getServerSnapshot: () => AccountProgressSnapshot;
  set: (snapshot: AccountProgressSnapshot) => void;
};

/**
 * The server always streams the signed-out shell: no progress, no error.
 * `useSyncExternalStore` uses this snapshot for every hydration pass, even when
 * an effect already filled the store before a streamed Suspense boundary
 * hydrates. That keeps the first client render identical to the server HTML;
 * the real snapshot paints on the follow-up render.
 */
export const EMPTY_ACCOUNT_SNAPSHOT: AccountProgressSnapshot = {
  progress: null,
  error: null,
  authenticated: false,
  simulations: [],
};

export function createAccountProgressStore(): AccountProgressStore {
  let snapshot = EMPTY_ACCOUNT_SNAPSHOT;
  const listeners = new Set<() => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => EMPTY_ACCOUNT_SNAPSHOT,
    set(next) {
      if (next === snapshot) return;
      snapshot = next;
      for (const listener of listeners) listener();
    },
  };
}

export type AccountProgressState = AccountProgressSnapshot & {
  modules: LearningSummary[];
  refresh: () => Promise<void>;
  update: (progress: StoredProgress) => void;
};

export type AccountProgressContextValue = {
  modules: LearningSummary[];
  store: AccountProgressStore;
  refresh: () => Promise<void>;
  update: (progress: StoredProgress) => void;
};

export const AccountProgressContext =
  createContext<AccountProgressContextValue | null>(null);

const noopSubscribe = () => () => {};
const serverSnapshot = () => EMPTY_ACCOUNT_SNAPSHOT;

export function useAccountProgress(): AccountProgressState {
  const context = useContext(AccountProgressContext);
  const snapshot = useSyncExternalStore(
    context?.store.subscribe ?? noopSubscribe,
    context?.store.getSnapshot ?? serverSnapshot,
    context?.store.getServerSnapshot ?? serverSnapshot,
  );
  if (!context) {
    return {
      ...EMPTY_ACCOUNT_SNAPSHOT,
      modules: [],
      refresh: async () => {},
      update: () => {},
    };
  }
  return {
    ...snapshot,
    modules: context.modules,
    refresh: context.refresh,
    update: context.update,
  };
}

export function useStoredProgress(): StoredProgress | null {
  return useAccountProgress().progress;
}
