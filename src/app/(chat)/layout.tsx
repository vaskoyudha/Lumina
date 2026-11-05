import type { ReactNode } from "react";

/**
 * `(chat)` shell — no site nav, no footer.
 *
 * The companion is a workspace, not a page in a document. A global nav bar
 * above a chat is one permanent row of chrome the user never needs while
 * typing, and it costs vertical space on the exact screen that needs it most.
 * Navigation lives in the rail inside the chat shell instead.
 *
 * Route group only: the URL stays `/companion`. `/darurat` keeps its own
 * nav-bearing shell in `(app)` and is never gated (AGENTS.md §8).
 */
export default function ChatLayout({ children }: { children: ReactNode }) {
  return <div className="h-dvh overflow-hidden bg-bg text-txt">{children}</div>;
}
