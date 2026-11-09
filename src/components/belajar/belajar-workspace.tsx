"use client";

import type { ReactNode } from "react";
import type { CompanionSession } from "@/components/companion/companion-auth";
import { WorkspaceFrame } from "@/components/shell/workspace-frame";

/**
 * `/belajar`'s workspace. The chrome lives in `WorkspaceFrame` because `/simulasi`
 * uses the exact same sidebar, scroll column, and mobile drawer; this wrapper
 * only names the surface.
 */
export function BelajarWorkspace({
  children,
  aside,
  session = null,
  className,
}: {
  children: ReactNode;
  aside?: ReactNode;
  session?: CompanionSession | null;
  className?: string;
}) {
  return (
    <WorkspaceFrame
      label="Belajar"
      aside={aside}
      session={session}
      className={className}
    >
      {children}
    </WorkspaceFrame>
  );
}
