import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminInventory } from "@/components/admin/admin-inventory";
import { ContentLoading } from "@/components/belajar/content-state";
import { listModules, moduleSummaries } from "@/lib/content/store";

export const metadata: Metadata = {
  title: "Admin — course",
  robots: { index: false, follow: false },
};

/** Database inventory; local drafts are published using the validated import CLI. */
export default function AdminPage() {
  return (
    <Suspense fallback={<ContentLoading />}>
      <AdminContent />
    </Suspense>
  );
}
async function AdminContent() {
  await connection();
  const modules = moduleSummaries(await listModules());
  return (
    <div className="appnext-container max-w-5xl py-10 sm:py-12">
      <header className="max-w-2xl">
        <p className="appnext-caption font-medium tracking-wide uppercase">
          Admin · Stream B
        </p>
        <h1 className="mt-2">Kurikulum</h1>
        <p className="mt-3">
          Buat, ubah dan hapus course di perangkat ini. Yang tampil di{" "}
          <code>/belajar</code> hanya konten yang sudah diimpor ke database —
          draf tidak pernah menyentuh produk.
        </p>
      </header>

      <div className="mt-8">
        <AdminInventory modules={modules} />
      </div>
    </div>
  );
}
