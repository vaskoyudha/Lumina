"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadSaved,
  removeSaved,
  SAVED_EVENT,
  toggleSaved,
} from "@/lib/loker/saved";
import type { LokerView, SavedLoker } from "@/lib/loker/types";

function subscribe(onChange: () => void) {
  window.addEventListener(SAVED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SAVED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * `loaded` is false until the first post-mount read. `/profil` uses it to show
 * a skeleton instead of flashing "belum ada" over a store it has not read yet.
 */
export function useSavedLoker() {
  const [saved, setSaved] = useState<SavedLoker[] | null>(null);

  useEffect(() => {
    const read = () => setSaved(loadSaved());
    read();
    return subscribe(read);
  }, []);

  const toggle = useCallback((posting: LokerView) => {
    toggleSaved(posting);
  }, []);

  const remove = useCallback((id: string) => {
    removeSaved(id);
  }, []);

  return {
    saved: saved ?? [],
    loaded: saved !== null,
    toggle,
    remove,
  };
}
