import { AdminNav } from "@/components/admin/admin-nav";

/**
 * Admin area shell. Separate from `(user)` on purpose: `/admin` must not show
 * the learner nav, and it does not share the learner footer's privacy copy.
 *
 * When the login lands (post-submission), this is the layout the admin account
 * lands in — the account picks the area, not a query parameter.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AdminNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line px-4 py-6 text-dim text-sm sm:px-6">
        <p className="mx-auto max-w-5xl">
          Area kerja kurikulum. Draf tersimpan di perangkat ini; publikasi lewat
          ekspor dan commit, bukan tombol.
        </p>
      </footer>
    </div>
  );
}
