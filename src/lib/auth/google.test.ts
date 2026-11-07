/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET as callback } from "@/app/api/auth/google/callback/route";
import { GET as start } from "@/app/api/auth/google/route";
import { authDatabase } from "@/lib/auth/database";
import {
  beginGoogle,
  consumeGoogleState,
  finishGoogle,
} from "@/lib/auth/google";
import { readSession } from "@/lib/auth/session";

jest.mock("server-only", () => ({}), { virtual: true });
const mockVerify = jest.fn();
jest.mock("google-auth-library", () => ({
  OAuth2Client: jest
    .fn()
    .mockImplementation(() => ({ verifyIdToken: mockVerify })),
}));
process.env.AUTH_DATABASE_PATH = ":memory:";
const mockFetch = jest.fn();

beforeEach(() => {
  authDatabase().exec(
    "DELETE FROM sessions; DELETE FROM users; DELETE FROM oauth_states; DELETE FROM auth_attempts;",
  );
  process.env.GOOGLE_CLIENT_ID = "test-client";
  process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  process.env.AUTH_URL = "http://localhost:3000";
  global.fetch = mockFetch;
  mockFetch.mockReset();
  mockVerify.mockReset();
});

function request(state: string, query: string, cookie = state) {
  return new NextRequest(
    `http://localhost:3000/api/auth/google/callback?state=${state}&${query}`,
    { headers: { cookie: `lumina_google_state=${cookie}` } },
  );
}

it("starts an authorization-code flow with state, nonce, PKCE and minimal scopes", () => {
  const flow = beginGoogle("daftar");
  const url = new URL(flow.url);
  expect(url.origin).toBe("https://accounts.google.com");
  expect(url.searchParams.get("scope")).toBe("openid email profile");
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  expect(url.searchParams.get("redirect_uri")).toBe(
    "http://localhost:3000/api/auth/google/callback",
  );
  expect(url.searchParams.get("nonce")).toBeTruthy();
  expect(flow.url).not.toContain("test-secret");
  expect(consumeGoogleState(flow.state, flow.state).intent).toBe("daftar");
  expect(() => consumeGoogleState(flow.state, flow.state)).toThrow(
    "google-expired",
  );
});

it("rejects forged and expired callbacks before any token exchange", async () => {
  const flow = beginGoogle("masuk");
  const forged = await callback(
    request(flow.state, "code=code", "x".repeat(43)),
  );
  expect(forged.headers.get("location")).toContain("error=google-expired");
  expect(mockFetch).not.toHaveBeenCalled();
  authDatabase().exec("UPDATE oauth_states SET expires_at = 1");
  const expired = await callback(request(flow.state, "code=code"));
  expect(expired.headers.get("location")).toContain("error=google-expired");
  expect(expired.cookies.get("lumina_session")).toBeUndefined();
});

it("handles cancelled access and missing configuration without creating a session", async () => {
  const flow = beginGoogle("daftar");
  const cancelled = await callback(request(flow.state, "error=access_denied"));
  expect(cancelled.headers.get("location")).toContain(
    "/daftar?error=google-cancelled",
  );
  expect(cancelled.cookies.get("lumina_session")).toBeUndefined();
  delete process.env.GOOGLE_CLIENT_ID;
  const unavailable = await start(
    new NextRequest("http://localhost:3000/api/auth/google?intent=daftar"),
  );
  expect(unavailable.headers.get("location")).toContain(
    "/daftar?error=google-unavailable",
  );
});

it("verifies the ID token, creates a database account and sets a valid session", async () => {
  const flow = beginGoogle("daftar");
  const nonce = new URL(flow.url).searchParams.get("nonce");
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ id_token: "verified-token" }),
  });
  mockVerify.mockResolvedValue({
    getPayload: () => ({
      sub: "subject",
      email: "rina@example.com",
      email_verified: true,
      name: "Rina",
      nonce,
    }),
  });
  const response = await callback(request(flow.state, "code=code"));
  expect(response.headers.get("location")).toBe(
    "http://localhost:3000/companion",
  );
  expect(mockVerify).toHaveBeenCalledWith({
    idToken: "verified-token",
    audience: "test-client",
  });
  expect(
    readSession(response.cookies.get("lumina_session")?.value)?.email,
  ).toBe("rina@example.com");
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("rejects unverified emails, mismatched nonces and token verification errors", async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ id_token: "token" }),
  });
  mockVerify.mockResolvedValue({
    getPayload: () => ({
      sub: "subject",
      email: "rina@example.com",
      email_verified: false,
      nonce: "nonce",
    }),
  });
  await expect(
    finishGoogle("code", { verifier: "verifier", nonce: "nonce" }),
  ).rejects.toThrow("google-failed");
  mockVerify.mockResolvedValue({
    getPayload: () => ({
      sub: "subject",
      email: "rina@example.com",
      email_verified: true,
      nonce: "different",
    }),
  });
  await expect(
    finishGoogle("code", { verifier: "verifier", nonce: "nonce" }),
  ).rejects.toThrow("google-failed");
  mockVerify.mockRejectedValue(new Error("invalid signature"));
  const flow = beginGoogle("masuk");
  const rejected = await callback(request(flow.state, "code=code"));
  expect(rejected.headers.get("location")).toContain("error=google-failed");
  expect(
    authDatabase().prepare("SELECT count(*) AS count FROM users").get()?.count,
  ).toBe(0);
});
