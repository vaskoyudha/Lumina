import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourseEditor } from "@/components/admin/course-editor";
import { isPublished } from "@/data/kurikulum";
import { MODUS_BY_NO } from "@/lib/modus";

export const metadata: Metadata = {
  title: "Admin — editor course",
  robots: { index: false, follow: false },
};

/**
 * Admin edits any number 1..99, so there is no finite param list to prerender.
 * Opt out of the "instant" prerender contract: this route is a workbench, not a
 * page a learner ever waits on.
 */
export const instant = false;

/**
 * Editor for one course number. It accepts any 1..99 — including numbers the
 * catalog does not know yet, because "create" means a new course can start
 * before `modus.json` is touched.
 */
export default async function AdminCoursePage({
  params,
}: {
  params: Promise<{ no: string }>;
}) {
  const { no: raw } = await params;
  const no = Number.parseInt(raw, 10);

  if (Number.isNaN(no) || no < 1 || no > 99) notFound();

  return (
    <div className="appnext-container max-w-5xl py-10 sm:py-12">
      <CourseEditor no={no} />
      {!isPublished(no) && !MODUS_BY_NO.get(no) ? (
        <p className="appnext-caption mt-6">
          Nomor {no} belum ada di <code>modus.json</code>. Itu normal untuk
          course baru: objek yang harus ditempel ke file itu ada di tab{" "}
          <strong className="font-medium text-txt">Terbitkan</strong>, langkah
          3.
        </p>
      ) : null}
    </div>
  );
}
