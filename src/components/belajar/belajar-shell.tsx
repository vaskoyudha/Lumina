import { type ReactNode, Suspense } from "react";
import { BelajarWorkspace } from "@/components/belajar/belajar-workspace";
import { getSession } from "@/lib/auth/server-session";

/**
 * Shared surface for the learning pages: the Companion sidebar flush left, the
 * catalog column, and the 340px study rail flush right. `/belajar` lives in the
 * `(chat)` route group, so the app nav and footer are gone; the sidebar is the
 * same `SessionSidebar` the companion renders, with this page's own content in
 * the main column.
 *
 * The session read sits inside Suspense, the same pattern as
 * `CompanionWithSession`: the shell can paint immediately (signed out) and swap
 * the account slot when the cookie resolves, without making the page wait.
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
    <Suspense
      fallback={
        <BelajarWorkspace aside={aside} className={className}>
          {children}
        </BelajarWorkspace>
      }
    >
      <BelajarShellWithSession aside={aside} className={className}>
        {children}
      </BelajarShellWithSession>
    </Suspense>
  );
}

async function BelajarShellWithSession({
  children,
  aside,
  className,
}: {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  const session = await getSession();

  return (
    <BelajarWorkspace
      session={session ? { nama: session.nama, email: session.email } : null}
      aside={aside}
      className={className}
    >
      {children}
    </BelajarWorkspace>
  );
}
