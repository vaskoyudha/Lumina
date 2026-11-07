import { type NextRequest, NextResponse } from "next/server";
import { consumeAttempt } from "@/lib/auth/accounts";
import {
  beginGoogle,
  GOOGLE_STATE_COOKIE,
  googleCookieOptions,
} from "@/lib/auth/google";

export async function GET(request: NextRequest) {
  const intent =
    request.nextUrl.searchParams.get("intent") === "daftar"
      ? "daftar"
      : "masuk";
  try {
    consumeAttempt("google:global", 200);
    const flow = beginGoogle(intent);
    const response = NextResponse.redirect(flow.url);
    response.cookies.set(GOOGLE_STATE_COOKIE, flow.state, googleCookieOptions);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return NextResponse.redirect(
      new URL(`/${intent}?error=google-unavailable`, request.url),
    );
  }
}
