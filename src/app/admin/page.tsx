import type { Metadata } from "next";
import { AdminInventory } from "@/components/admin/admin-inventory";

export const metadata: Metadata = {
  title: "Admin — course",
  robots: { index: false, follow: false },
};

/**
 * Stream B's admin surface (plan `stream-b-admin-crud.md`).
 *
 * Deliberately not in the site nav: the product has four surfaces for people
 * being scammed, and this is a workbench for the people writing the curriculum.
 * Drafts live on this device; publishing is export + commit, so this route can
 * never change what a learner sees.
 */
export default function AdminPage() {
  return (
    <div className="appnext-container max-w-5xl py-10 sm:py-12">
      <header className="max-w-2xl">
        <p className="appnext-caption font-medium tracking-wide uppercase">
          Admin · Stream B
        </p>
        <h1 className="mt-2">Kurikulum</h1>
        <p className="mt-3">
          Buat, ubah dan hapus course di perangkat ini. Yang tampil di{" "}
          <code>/belajar</code> hanya konten yang sudah diekspor dan di-commit —
          draf tidak pernah menyentuh produk.
        </p>
      </header>

      <div className="mt-8">
        <AdminInventory />
      </div>
    </div>
  );
}
