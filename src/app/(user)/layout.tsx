import { Suspense } from "react";
import { SiteNav } from "@/components/shell/site-nav";

/**
 * Learner shell: the four product surfaces plus home. Everything under
 * `(user)` gets this nav and the privacy footer, and `/admin` deliberately does
 * not — the admin area has its own chrome in `admin/layout.tsx`.
 */
export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense
        fallback={<div className="h-14 border-b border-line bg-panel" />}
      >
        <SiteNav />
      </Suspense>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line px-4 py-6 text-dim text-sm sm:px-6">
        <p className="mx-auto max-w-6xl">
          Lumina tidak menyimpan percakapan. Tidak ada akun, tidak ada unggahan
          ke server. Tutup tab, riwayatnya hilang.
        </p>
      </footer>
    </div>
  );
}
