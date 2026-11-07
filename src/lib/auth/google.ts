import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { AuthError, digest, googleAccount } from "@/lib/auth/accounts";
import { authDatabase } from "@/lib/auth/database";

export const GOOGLE_STATE_COOKIE = "lumina_google_state";
export const googleCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/auth/google",
  maxAge: 600,
};

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const base =
    process.env.AUTH_URL ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  if (!clientId || !clientSecret || !base)
    throw new AuthError("google-unavailable");
  const url = new URL(base);
  if (
    (process.env.NODE_ENV === "production" && url.protocol !== "https:") ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new AuthError("google-unavailable");
  }
  return {
    clientId,
    clientSecret,
    redirectUri: `${url.origin}/api/auth/google/callback`,
  };
}

export async function beginGoogle(intent: "masuk" | "daftar") {
  const { clientId, redirectUri } = config();
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  await authDatabase().query(
    "INSERT INTO oauth_states (state_hash, verifier, nonce, intent, expires_at) VALUES ($1, $2, $3, $4, now() + interval '10 minutes')",
    [digest(state), verifier, nonce, intent],
  );
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { state, url: url.toString() };
}

export async function consumeGoogleState(
  state: string | null,
  cookie: string | undefined,
) {
  if (
    !state ||
    !cookie ||
    !/^[A-Za-z0-9_-]{43}$/.test(state) ||
    !/^[A-Za-z0-9_-]{43}$/.test(cookie) ||
    !timingSafeEqual(Buffer.from(state), Buffer.from(cookie))
  ) {
    throw new AuthError("google-expired");
  }
  // Atomic delete prevents concurrent callbacks from replaying one transaction.
  const row = (
    await authDatabase().query<{
      verifier: string;
      nonce: string;
      intent: "masuk" | "daftar";
      expires_at: Date;
    }>("DELETE FROM oauth_states WHERE state_hash = $1 RETURNING *", [
      digest(state),
    ])
  ).rows[0];
  if (!row || new Date(row.expires_at).getTime() <= Date.now())
    throw new AuthError("google-expired");
  return row;
}

export async function finishGoogle(
  code: string,
  transaction: { verifier: string; nonce: string },
) {
  const { clientId, clientSecret, redirectUri } = config();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code_verifier: transaction.verifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new AuthError("google-failed");
  const tokens = (await response.json()) as { id_token?: unknown };
  if (typeof tokens.id_token !== "string") throw new AuthError("google-failed");
  // Verifies Google's signature, issuer, audience and expiry; never decode-only.
  const ticket = await new OAuth2Client(clientId).verifyIdToken({
    idToken: tokens.id_token,
    audience: clientId,
  });
  const profile = ticket.getPayload();
  if (
    !profile?.sub ||
    !profile.email ||
    !profile.email_verified ||
    profile.nonce !== transaction.nonce
  )
    throw new AuthError("google-failed");
  return googleAccount(
    profile.sub,
    profile.email,
    profile.name || profile.email.split("@")[0],
  );
}
