import { requestMeta } from "@/lib/server/request";

jest.mock("server-only", () => ({}), { virtual: true });

describe("requestMeta", () => {
  const previous = process.env.TRUST_PROXY;

  afterEach(() => {
    if (previous === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous;
  });

  it("records the user agent and truncates it", () => {
    const meta = requestMeta(new Headers({ "user-agent": "A".repeat(400) }));
    expect(meta.userAgent).toHaveLength(300);
  });

  it("ignores the forwarded IP unless the proxy is trusted", () => {
    process.env.TRUST_PROXY = "false";
    expect(
      requestMeta(new Headers({ "x-lumina-client-ip": "103.28.1.2" })).clientIp,
    ).toBeNull();
  });

  it("records the forwarded IP only when it is valid", () => {
    process.env.TRUST_PROXY = "true";
    expect(
      requestMeta(new Headers({ "x-lumina-client-ip": "103.28.1.2" })).clientIp,
    ).toBe("103.28.1.2");
    expect(
      requestMeta(new Headers({ "x-lumina-client-ip": "not-an-ip" })).clientIp,
    ).toBeNull();
  });
});
