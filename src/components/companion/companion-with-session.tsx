import { CompanionChat } from "@/components/companion/companion-chat";
import { getSession } from "@/lib/auth/server-session";

export async function CompanionWithSession({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string }>;
}) {
  const [session, { panel }] = await Promise.all([getSession(), searchParams]);
  return (
    <CompanionChat
      session={session ? { nama: session.nama, email: session.email } : null}
      initialPanel={panel === "agen" ? "agen" : undefined}
    />
  );
}
