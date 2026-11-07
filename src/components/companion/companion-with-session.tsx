import { CompanionChat } from "@/components/companion/companion-chat";
import { getSession } from "@/lib/auth/server-session";

export async function CompanionWithSession() {
  const session = await getSession();
  return (
    <CompanionChat
      session={session ? { nama: session.nama, email: session.email } : null}
    />
  );
}
