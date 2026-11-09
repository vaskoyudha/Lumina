import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/shell/workspace-shell";

/**
 * Learning surface: the Companion sidebar flush left, the catalog or module
 * column, and the optional 340px study rail flush right. `/belajar` lives in
 * the `(chat)` route group, so the app nav and footer are gone.
 *
 * The session read and Suspense boundary live in `WorkspaceShell`, shared with
 * `/simulasi`, so both routes paint the same sidebar before the cookie resolves.
 */
export function BelajarShell({
  children,
  aside,
  className,
}: {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <WorkspaceShell label="Belajar" aside={aside} className={className}>
      {children}
    </WorkspaceShell>
  );
}
