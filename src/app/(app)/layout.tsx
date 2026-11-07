import { Suspense } from "react";
import { NavWithSession } from "@/components/shell/nav-with-session";

/**
 * (app) shell — Lumina light tokens, product chrome.
 * `/darurat` lives here and is never gated (AGENTS.md).
 *
 * The session read is inside the Suspense boundary, so routes that do not need
 * it keep prerendering statically.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  /*
    App-shell pattern, not a document: the root is exactly the viewport and
    clips, and `main` is the one scrolling region. That is what lets the
    companion own its own scroll containers (message log, session list) instead
    of growing the page — with a `min-h-dvh` root the chat expanded to 1112px
    and pushed its composer below the fold. Document pages are unaffected:
    they simply scroll inside `main`, and the nav and footer stay put.
  */
  return (
    <div
      data-app-shell
      className="flex h-dvh flex-col overflow-hidden bg-bg text-txt"
    >
      <Suspense
        fallback={<div className="h-14 border-line border-b bg-panel" />}
      >
        <NavWithSession />
      </Suspense>
      <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </main>
      <footer className="shrink-0 border-line border-t px-4 py-6 text-dim text-sm sm:px-6">
        <p className="mx-auto max-w-6xl">
          Akun bersifat opsional. Progres belajar tetap di perangkat ini. Tutup
          tab, riwayat percakapannya hilang.
        </p>
      </footer>
    </div>
  );
}
