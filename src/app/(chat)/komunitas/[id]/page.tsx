import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { ContentLoading } from "@/components/belajar/content-state";
import {
  CommunityRules,
  CommunityThread,
  CommunityUnavailable,
} from "@/components/community/community-view";
import { WorkspaceShell } from "@/components/shell/workspace-shell";
import { getSession } from "@/lib/auth/server-session";
import { getPost, listReplies } from "@/lib/community/store";
export const metadata: Metadata = { title: "Diskusi komunitas" };
export const instant = false;
type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};
export default function ThreadPage(props: Props) {
  return (
    <Suspense fallback={<ContentLoading />}>
      <ThreadContent {...props} />
    </Suspense>
  );
}
export async function ThreadContent({ params, searchParams }: Props) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .catch(1)
    .parse((await searchParams).page);
  const session = await getSession();
  let post: Awaited<ReturnType<typeof getPost>>,
    replies: Awaited<ReturnType<typeof listReplies>>;
  try {
    [post, replies] = await Promise.all([
      getPost(id, session?.id ?? null),
      listReplies(id, session?.id ?? null, page),
    ]);
  } catch {
    return <CommunityUnavailable />;
  }
  if (!post) notFound();
  return (
    <WorkspaceShell label="Komunitas" aside={<CommunityRules />}>
      <CommunityThread
        post={post}
        replies={replies}
        canWrite={!!session}
        page={page}
      />
    </WorkspaceShell>
  );
}
