import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CourseEditor } from "@/components/admin/course-editor";
import { ContentLoading } from "@/components/belajar/content-state";
import { getModule } from "@/lib/content/store";

export const metadata: Metadata = {
  title: "Admin — editor course",
  robots: { index: false, follow: false },
};

export const instant = false;

export default function AdminCoursePage(props: {
  params: Promise<{ no: string }>;
}) {
  return (
    <Suspense fallback={<ContentLoading />}>
      <AdminCourseContent {...props} />
    </Suspense>
  );
}
async function AdminCourseContent({
  params,
}: {
  params: Promise<{ no: string }>;
}) {
  await connection();
  const { no: raw } = await params;
  const no = Number.parseInt(raw, 10);

  if (Number.isNaN(no) || no < 1 || no > 99) notFound();

  const module = await getModule(no);
  return (
    <div className="appnext-container max-w-5xl py-10 sm:py-12">
      <CourseEditor no={no} module={module} />
    </div>
  );
}
