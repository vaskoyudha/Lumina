import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContentLoading } from "@/components/belajar/content-state";
import {
  CommunityFeed,
  CommunityUnavailable,
} from "@/components/community/community-view";
import { getSession } from "@/lib/auth/server-session";
import { QuerySchema } from "@/lib/community/schema";
import { listPosts } from "@/lib/community/store";
export const metadata: Metadata = {
  title: "Komunitas",
  description:
    "Bagikan modus penipuan baru, bertanya, dan belajar dari pengalaman anggota Lumina.",
};
type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export default function CommunityPage(props: Props) {
  return (
    <Suspense fallback={<ContentLoading />}>
      <CommunityContent {...props} />
    </Suspense>
  );
}
export async function CommunityContent({ searchParams }: Props) {
  await connection();
  const query = QuerySchema.parse(await searchParams);
  const session = await getSession();
  let result: Awaited<ReturnType<typeof listPosts>>;
  try {
    result = await listPosts(query, session?.id ?? null);
  } catch {
    return <CommunityUnavailable />;
  }
  return (
    <CommunityFeed
      {...result}
      query={query}
      canWrite={!!session}
      viewerName={session?.nama}
    />
  );
}
