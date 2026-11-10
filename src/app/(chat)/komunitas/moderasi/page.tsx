import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContentLoading } from "@/components/belajar/content-state";
import {
  ModerationControls,
  VerificationControls,
} from "@/components/community/community-controls";
import { CommunityUnavailable } from "@/components/community/community-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/server-session";
import { isCommunityModerator } from "@/lib/community/access";
import { communityAgent } from "@/lib/community/agents";
import { CATEGORIES } from "@/lib/community/schema";
import { listVerifiablePosts, moderationQueue } from "@/lib/community/store";
export const metadata: Metadata = {
  title: "Moderasi komunitas",
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
  let reports: Awaited<ReturnType<typeof moderationQueue>>,
    posts: Awaited<ReturnType<typeof listVerifiablePosts>>;
  try {
    [reports, posts] = await Promise.all([
      moderationQueue(),
      listVerifiablePosts(),
    ]);
  } catch {
    return <CommunityUnavailable />;
  }
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-8">
      <h1 className="text-2xl font-semibold">Moderasi komunitas</h1>
      <p className="text-sm text-dim">
        Verifikasi berarti kiriman sudah ditinjau pengelola, bukan jaminan
        fakta. Identitas pelapor tidak ditampilkan.
      </p>

      <section aria-labelledby="verify-title" className="flex flex-col gap-3">
        <div>
          <h2 id="verify-title" className="text-lg font-semibold">
            Verifikasi kiriman
          </h2>
          <p className="text-sm text-dim">
            Kiriman tanpa label tampil lebih dulu. Hanya kiriman yang sudah
            ditinjau yang mendapat lencana “Terverifikasi admin”.
          </p>
        </div>
        {posts.length ? (
          posts.map((post) => {
            const agent = communityAgent(post.agentId);
            return (
              <Card
                key={post.id}
                className="rounded-card border border-line shadow-[var(--appnext-shadow-ambient)]"
              >
                <CardHeader>
                  <CardTitle className="break-words [overflow-wrap:anywhere]">
                    {post.title}
                  </CardTitle>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-dim">
                    <span>{post.author}</span>
                    <span>· {CATEGORIES[post.category].label}</span>
                    {agent && (
                      <Badge
                        variant="outline"
                        className="border-brand-line bg-brand-soft text-brand-ink"
                      >
                        Agen Lumina · {agent.field}
                      </Badge>
                    )}
                    <Badge variant={post.verified ? "default" : "secondary"}>
                      {post.verified ? "Terverifikasi admin" : "Belum ditinjau"}
                    </Badge>
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">
                    {post.body}
                  </p>
                  <Link
                    href={`/komunitas/${post.id}`}
                    className="text-sm text-brand-ink underline"
                  >
                    Baca diskusi
                  </Link>
                  <VerificationControls id={post.id} verified={post.verified} />
                </CardContent>
              </Card>
            );
          })
        ) : (
          <p className="rounded-card bg-panel p-6 text-sm text-dim">
            Belum ada kiriman untuk ditinjau.
          </p>
        )}
      </section>

      <section aria-labelledby="reports-title" className="flex flex-col gap-3">
        <div>
          <h2 id="reports-title" className="text-lg font-semibold">
            Laporan komunitas
          </h2>
          <p className="text-sm text-dim">
            Tinjau isi sebelum mengambil tindakan.
          </p>
        </div>
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
      </section>
    </div>
  );
}
