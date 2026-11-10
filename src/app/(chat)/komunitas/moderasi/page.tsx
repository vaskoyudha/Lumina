import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContentLoading } from "@/components/belajar/content-state";
import { ModerationControls } from "@/components/community/community-controls";
import { CommunityUnavailable } from "@/components/community/community-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/server-session";
import { isCommunityModerator } from "@/lib/community/access";
import { moderationQueue } from "@/lib/community/store";
export const metadata: Metadata = {
  title: "Laporan komunitas",
  robots: { index: false, follow: false },
};
export default function ModerationPage() {
  return (
    <Suspense fallback={<ContentLoading />}>
      <ModerationContent />
    </Suspense>
  );
}
async function ModerationContent() {
  const session = await getSession();
  if (!session || !isCommunityModerator(session.id)) notFound();
  let reports: Awaited<ReturnType<typeof moderationQueue>>;
  try {
    reports = await moderationQueue();
  } catch {
    return <CommunityUnavailable />;
  }
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-8">
      <h1 className="text-2xl font-semibold">Laporan komunitas</h1>
      <p className="text-sm text-dim">
        Tinjau isi sebelum mengambil tindakan. Identitas pelapor tidak
        ditampilkan.
      </p>
      {reports.length ? (
        reports.map((r) => (
          <Card
            key={`${r.kind}-${r.id}`}
            className="rounded-card border border-line shadow-[var(--appnext-shadow-ambient)]"
          >
            <CardHeader>
              <CardTitle className="break-words [overflow-wrap:anywhere]">
                {r.title}
              </CardTitle>
              <p className="text-xs text-dim">
                {r.reports} laporan · {r.reason} ·{" "}
                {r.kind === "post" ? "topik" : "balasan"}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">
                {r.body}
              </p>
              <Link
                href={`/komunitas/${r.postId}`}
                className="text-sm text-brand-ink underline"
              >
                Baca diskusi
              </Link>
              <ModerationControls id={r.id} kind={r.kind} />
            </CardContent>
          </Card>
        ))
      ) : (
        <p className="rounded-card bg-panel p-6 text-sm text-dim">
          Tidak ada laporan yang menunggu ditinjau.
        </p>
      )}
    </div>
  );
}
