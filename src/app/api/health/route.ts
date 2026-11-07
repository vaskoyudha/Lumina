import { connection } from "next/server";
import { authDatabase } from "@/lib/auth/database";
export async function GET() {
  await connection();
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        authDatabase().query("SELECT 1"),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("timeout")), 2000);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
