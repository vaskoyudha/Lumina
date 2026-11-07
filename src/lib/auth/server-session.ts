import { cookies } from "next/headers";
import { connection } from "next/server";
import {
  readSession,
  SESSION_COOKIE,
  type SessionPayload,
} from "@/lib/auth/session";

/**
 * Server-side session read, for server components.
 *
 * Kept out of `actions.ts` on purpose: that file is `"use server"`, which makes
 * every export a server action. A layout reading a cookie is not an action.
 */
export async function getSession(): Promise<SessionPayload | null> {
  // Database and expiry checks belong to request time with Cache Components.
  await connection();

  const jar = await cookies();
  return readSession(jar.get(SESSION_COOKIE)?.value);
}
