/** @jest-environment node */
import {
  extractEmail,
  lookupDomainAge,
  registrableDomain,
} from "@/lib/loker/enrich";

describe("extractEmail", () => {
  it("returns the first address, lowercased", () => {
    expect(extractEmail("Hubungi HRD@Example.COM untuk melamar")).toBe(
      "hrd@example.com",
    );
  });

  it("falls back to later fields when the description has none", () => {
    expect(extractEmail(null, "", "PT Maju <rekrutmen@maju.co.id>")).toBe(
      "rekrutmen@maju.co.id",
    );
  });

  it("returns null when nothing looks like an address", () => {
    expect(extractEmail("Lamar lewat situs kami.")).toBeNull();
    expect(extractEmail()).toBeNull();
  });
});

describe("registrableDomain", () => {
  it("strips subdomains", () => {
    expect(registrableDomain("id.jobstreet.com")).toBe("jobstreet.com");
    expect(registrableDomain("careers.allianz.com")).toBe("allianz.com");
  });

  it("keeps two-part Indonesian TLDs", () => {
    expect(registrableDomain("karir.maju.co.id")).toBe("maju.co.id");
  });

  it("rejects hosts that cannot be looked up", () => {
    expect(registrableDomain("localhost")).toBe("");
    expect(registrableDomain("127.0.0.1")).toBe("");
    expect(registrableDomain("")).toBe("");
  });
});

describe("lookupDomainAge", () => {
  const now = Date.UTC(2026, 10, 9);
  const io = (result: unknown) => ({
    fetchJson: jest.fn().mockResolvedValue(result),
  });

  it("reads the registration event and returns whole days", async () => {
    const hundredDaysAgo = new Date(now - 100 * 86_400_000).toISOString();
    const out = await lookupDomainAge(
      "id.jobstreet.com",
      io({
        events: [
          {
            eventAction: "last changed",
            eventDate: new Date(now).toISOString(),
          },
          { eventAction: "registration", eventDate: hundredDaysAgo },
        ],
      }),
      now,
    );
    expect(out).toEqual({ status: "ok", ageDays: 100 });
  });

  it("asks RDAP for the registrable domain, not the subdomain", async () => {
    const fake = io({ events: [] });
    await lookupDomainAge("karir.maju.co.id", fake, now);
    expect(fake.fetchJson).toHaveBeenCalledWith(
      "https://rdap.org/domain/maju.co.id",
    );
  });

  it("reports unknown when RDAP has no registration event", async () => {
    const out = await lookupDomainAge("maju.co.id", io({ events: [] }), now);
    expect(out).toEqual({ status: "unknown", ageDays: null });
  });

  it("reports error when the request fails", async () => {
    const failing = {
      fetchJson: jest.fn().mockRejectedValue(new Error("404")),
    };
    const out = await lookupDomainAge("maju.co.id", failing, now);
    expect(out).toEqual({ status: "error", ageDays: null });
  });

  it("does not call RDAP for an unusable host", async () => {
    const fake = io({ events: [] });
    const out = await lookupDomainAge("localhost", fake, now);
    expect(out).toEqual({ status: "unknown", ageDays: null });
    expect(fake.fetchJson).not.toHaveBeenCalled();
  });
});
