import type { ReactNode } from "react";

/**
 * `(chat)` shell — no site nav, no footer.
 *
 * Workspace routes are not pages in a document: the companion and the learning
 * dashboard both own their left sidebar, internal scroll regions and bottom
 * privacy note. A global nav bar above them would be one permanent row of
 * chrome the user never needs, and it costs vertical space on the exact
 * screens that need it most.
 *
 * Route group only: Companion, Belajar, Simulasi, and Komunitas share this workspace ground.
 */
export default function ChatLayout({ children }: { children: ReactNode }) {
  return <div className="h-dvh overflow-hidden bg-bg text-txt">{children}</div>;
}
