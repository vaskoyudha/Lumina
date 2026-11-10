import { cookies } from "next/headers";
import { deviceLabel } from "@/lib/auth/account-view";
import { authDatabase } from "@/lib/auth/database";
import { getSession } from "@/lib/auth/server-session";
import { listSessions } from "@/lib/auth/session";

const headers = { "cache-control": "no-store" };

export async function GET() {
  const session = await getSession();
  if (!session)
    return Response.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers },
    );

  const jar = await cookies();
  const [password, sessions] = await Promise.all([
    authDatabase().query<{ has_password: boolean }>(
      "SELECT password_hash IS NOT NULL AS has_password FROM users WHERE id = $1",
      [session.id],
    ),
    listSessions(session.id, jar.get("lumina_session")?.value),
  ]);

  return Response.json(
    {
      ok: true,
      account: {
        nama: session.nama,
        email: session.email,
        createdAt: session.created_at,
      },
      hasPassword: password.rows[0]?.has_password ?? false,
      sessions: sessions.map((row) => ({
        id: row.id,
        device: deviceLabel(row.userAgent),
        ip: row.clientIp,
        signedIn: row.signedIn,
        lastActive: row.lastActive,
        current: row.current,
      })),
    },
    { headers },
  );
}
