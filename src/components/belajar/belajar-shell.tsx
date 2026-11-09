import type { ReactNode } from "react";
import {
  AccountProgressProvider,
  ProgressNotice,
} from "@/components/belajar/belajar-progress";
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
  modules,
}: {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
  modules: import("@/lib/content/schema").LearningSummary[];
}) {
  return (
    <AccountProgressProvider modules={modules}>
      <WorkspaceShell label="Belajar" aside={aside} className={className}>
        <ProgressNotice />
        {children}
      </WorkspaceShell>
    </AccountProgressProvider>
  );
}
