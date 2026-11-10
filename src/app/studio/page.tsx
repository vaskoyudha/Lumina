import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StudioChat } from "@/components/studio/studio-chat";
import { getSession } from "@/lib/auth/server-session";
import { isStudioAllowed } from "@/lib/studio/access";

export const metadata: Metadata = {
  title: "Studio — coding agent",
  robots: { index: false, follow: false },
};

async function StudioSession() {
  const session = await getSession();
  if (!session) redirect("/masuk");
  if (!isStudioAllowed(session.id)) redirect("/");
  return <StudioChat />;
}

export default function StudioPage() {
  return (
    <main className="min-h-dvh bg-bg px-4 py-8 sm:px-6">
      <Suspense
        fallback={
          <p className="mx-auto max-w-3xl text-sm text-dim">
            Memeriksa akses Studio…
          </p>
        }
      >
        <StudioSession />
      </Suspense>
    </main>
  );
}
