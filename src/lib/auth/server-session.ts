import { cookies } from "next/headers";
import { connection } from "next/server";
import {
  SESSION_COOKIE,
  type SessionPayload,
  verifyPayload,
} from "@/lib/auth/session";

/**
 * Server-side session read, for server components.
 *
 * Kept out of `actions.ts` on purpose: that file is `"use server"`, which makes
 * every export a server action. A layout reading a cookie is not an action.
 */
export async function getSession(): Promise<SessionPayload | null> {
  // `verifyPayload` calls Date.now() to check expiry, and Date.now() is an
  // unstable value during prerendering (Cache Components). Awaiting
  // connection() moves this to request time, where reading a clock is valid.
  await connection();

  const jar = await cookies();
  return verifyPayload(jar.get(SESSION_COOKIE)?.value);
}
