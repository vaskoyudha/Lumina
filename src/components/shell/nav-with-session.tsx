import { SiteNav } from "@/components/shell/site-nav";
import { getSession } from "@/lib/auth/server-session";

/**
 * Async session reader, kept in its own component so it can sit inside a
 * Suspense boundary. Reading a cookie in the layout itself would turn every
 * `(app)` route dynamic and break static prerendering of /belajar/[modul].
 */
export async function NavWithSession() {
  const session = await getSession();
  return (
    <SiteNav
      session={session ? { nama: session.nama, email: session.email } : null}
    />
  );
}
