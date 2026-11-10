import { type ReactNode, Suspense } from "react";
import { CommunityFrame } from "@/components/community/community-frame";
import { getSession } from "@/lib/auth/server-session";
import { isCommunityModerator } from "@/lib/community/access";
import "@/styles/community-twitter.css";

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={<CommunityFrame session={null}>{children}</CommunityFrame>}
    >
      <CommunityWithSession>{children}</CommunityWithSession>
    </Suspense>
  );
}

async function CommunityWithSession({ children }: { children: ReactNode }) {
  const session = await getSession();
  return (
    <CommunityFrame
      session={session ? { nama: session.nama, email: session.email } : null}
      moderator={session ? isCommunityModerator(session.id) : false}
    >
      {children}
    </CommunityFrame>
  );
}
