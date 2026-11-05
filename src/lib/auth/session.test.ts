import { newPayload, signPayload, verifyPayload } from "@/lib/auth/session";

/**
 * The session is a facade, so these tests only need to prove three things:
 * a valid token round-trips, a tampered token is rejected, and an expired one
 * is rejected. Nothing about storage, because there is none.
 */
describe("demo session cookie", () => {
  it("round-trips a payload", () => {
    const token = signPayload(newPayload("siti@lumina.id", "Siti"));
    const parsed = verifyPayload(token);
    expect(parsed?.email).toBe("siti@lumina.id");
    expect(parsed?.nama).toBe("Siti");
  });

  it("rejects a tampered payload", () => {
    const token = signPayload(newPayload("siti@lumina.id", "Siti"));
    const [body, mac] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({
        email: "attacker@x.id",
        nama: "Admin",
        exp: 9999999999,
      }),
    ).toString("base64url");
    expect(verifyPayload(`${forged}.${mac}`)).toBeNull();
    expect(verifyPayload(`${body}.${mac}tamper`)).toBeNull();
  });

  it("rejects an expired payload", () => {
    const token = signPayload({ email: "a@b.id", nama: "A", exp: 1 });
    expect(verifyPayload(token)).toBeNull();
  });

  it("rejects missing or malformed input", () => {
    expect(verifyPayload(undefined)).toBeNull();
    expect(verifyPayload("")).toBeNull();
    expect(verifyPayload("not-a-token")).toBeNull();
  });
});
