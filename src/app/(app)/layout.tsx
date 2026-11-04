import { Suspense } from "react";
import { NavWithSession } from "@/components/shell/nav-with-session";

/**
 * (app) shell — dark tokens, product chrome.
 * `/darurat` lives here and is never gated (AGENTS.md).
 *
 * The session read is inside the Suspense boundary, so routes that do not need
 * it keep prerendering statically.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-txt">
      <Suspense
        fallback={<div className="h-14 border-line border-b bg-panel" />}
      >
        <NavWithSession />
      </Suspense>
      <main className="flex-1">{children}</main>
      <footer className="border-line border-t px-4 py-6 text-dim text-sm sm:px-6">
        <p className="mx-auto max-w-6xl">
          Lumina tidak menyimpan percakapan. Akun hanya untuk demo. Tutup tab,
          riwayatnya hilang.
        </p>
      </footer>
    </div>
  );
}
