import { type ReactNode, Suspense } from "react";
import { CommunityAside } from "@/components/community/community-aside";
import { WorkspaceShell } from "@/components/shell/workspace-shell";
import { getSession } from "@/lib/auth/server-session";
import { isCommunityModerator } from "@/lib/community/access";
import { QuerySchema } from "@/lib/community/schema";
import { listPosts } from "@/lib/community/store";

/**
 * `/komunitas` uses the same workspace chrome as Companion, Belajar, and
 * Simulasi: one shared left sidebar, a scrolling content column, and the
 * community rail on the right. The session read for the moderator link sits in
 * `Suspense` so the shell paints before the cookie resolves.
 */
export default function CommunityLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceShell
      label="Komunitas"
      aside={
        <Suspense fallback={<CommunityAside />}>
          <CommunityAsideWithSession />
        </Suspense>
      }
    >
      {children}
    </WorkspaceShell>
  );
}

async function CommunityAsideWithSession() {
  const session = await getSession();
  let latest: Awaited<ReturnType<typeof listPosts>>["posts"] = [];
  let trending: Awaited<ReturnType<typeof listPosts>>["posts"] = [];
  try {
    const [newest, busiest] = await Promise.all([
      listPosts(QuerySchema.parse({ sort: "terbaru" }), null),
      listPosts(QuerySchema.parse({ sort: "ramai" }), null),
    ]);
    latest = newest.posts;
    trending = busiest.posts;
  } catch {
    // The feed shows its own unavailable state; the rail stays empty instead.
  }
  return (
    <CommunityAside
      moderator={session ? isCommunityModerator(session.id) : false}
      latest={latest}
      trending={trending}
    />
  );
}
