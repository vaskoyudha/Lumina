import { getSession } from "@/lib/auth/server-session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { ok: true, session: null },
      { headers: { "cache-control": "no-store" } },
    );
  }
  return Response.json(
    {
      ok: true,
      session: {
        nama: session.nama,
        email: session.email,
        createdAt: session.created_at,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
