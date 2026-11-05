"use client";

import { useEffect } from "react";

export function PlaygroundTheme({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.dataset.simulationTheme = "playground";
    return () => {
      delete document.body.dataset.simulationTheme;
    };
  }, []);

  return <div className="sim-world">{children}</div>;
}
