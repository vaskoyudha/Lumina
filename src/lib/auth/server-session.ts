import { cookies } from "next/headers";
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
  const jar = await cookies();
  return verifyPayload(jar.get(SESSION_COOKIE)?.value);
}
