import { type NextRequest, NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/accounts";
import {
  consumeGoogleState,
  finishGoogle,
  GOOGLE_STATE_COOKIE,
  googleCookieOptions,
} from "@/lib/auth/google";
import {
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  let intent = "masuk";
  let response: NextResponse;
  try {
    const params = request.nextUrl.searchParams;
    const transaction = await consumeGoogleState(
      params.get("state"),
      request.cookies.get(GOOGLE_STATE_COOKIE)?.value,
    );
    intent = transaction.intent;
    if (params.get("error")) throw new AuthError("google-cancelled");
    const code = params.get("code");
    if (!code || code.length > 4096) throw new AuthError("google-failed");
    const account = await finishGoogle(code, transaction);
    const token = await createSession(
      account.id,
      request.cookies.get(SESSION_COOKIE)?.value,
    );
    response = NextResponse.redirect(
      new URL("/companion", process.env.AUTH_URL || request.url),
    );
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  } catch (error) {
    const allowed = [
      "google-cancelled",
      "google-expired",
      "google-link-required",
      "google-unavailable",
    ];
    const reason =
      error instanceof AuthError && allowed.includes(error.message)
        ? error.message
        : "google-failed";
    response = NextResponse.redirect(
      new URL(
        `/${intent}?error=${reason}`,
        process.env.AUTH_URL || request.url,
      ),
    );
  }
  response.cookies.set(GOOGLE_STATE_COOKIE, "", {
    ...googleCookieOptions,
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
