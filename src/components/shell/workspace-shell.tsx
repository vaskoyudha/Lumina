import { type ReactNode, Suspense } from "react";
import { WorkspaceFrame } from "@/components/shell/workspace-frame";
import { getSession } from "@/lib/auth/server-session";

/**
 * Server wrapper for the shared workspace chrome. The session read sits inside
 * `Suspense` so the shell can paint immediately (signed out) and swap the
 * account slot when the cookie resolves, without making the page wait.
 *
 * Route groups keep the URL: `/belajar` and `/simulasi` stay where they are.
 */
export function WorkspaceShell({
  children,
  aside,
  className,
  label,
}: {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <Suspense
      fallback={
        <WorkspaceFrame aside={aside} className={className} label={label}>
          {children}
        </WorkspaceFrame>
      }
    >
      <WorkspaceShellWithSession
        aside={aside}
        className={className}
        label={label}
      >
        {children}
      </WorkspaceShellWithSession>
    </Suspense>
  );
}

async function WorkspaceShellWithSession({
  children,
  aside,
  className,
  label,
}: {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
  label?: string;
}) {
  const session = await getSession();

  return (
    <WorkspaceFrame
      session={
        session
          ? {
              nama: session.nama,
              email: session.email,
              createdAt: session.created_at,
            }
          : null
      }
      aside={aside}
      className={className}
      label={label}
    >
      {children}
    </WorkspaceFrame>
  );
}
