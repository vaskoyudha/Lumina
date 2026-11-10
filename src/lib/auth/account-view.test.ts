import {
  deviceLabel,
  formatAccountDate,
  formatSessionMoment,
  relativeActivity,
} from "@/lib/auth/account-view";

describe("account view helpers", () => {
  it("labels the common browsers and systems", () => {
    expect(
      deviceLabel(
        "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0",
      ),
    ).toBe("Firefox · Linux");
    expect(
      deviceLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome · Windows");
    expect(
      deviceLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
      ),
    ).toBe("Edge · Windows");
  });

  it("never invents a device when the user agent is missing", () => {
    expect(deviceLabel(null)).toBe("Perangkat tidak dikenal");
    expect(deviceLabel("")).toBe("Perangkat tidak dikenal");
  });

  it("formats account dates in Jakarta time", () => {
    expect(formatAccountDate("2026-01-02T00:00:00.000Z")).toBe(
      "2 Januari 2026",
    );
    expect(formatAccountDate(null)).toBeNull();
    expect(formatAccountDate("not-a-date")).toBeNull();
  });

  it("formats a session moment with the Jakarta clock", () => {
    expect(formatSessionMoment("2026-11-10T04:30:00.000Z")).toBe(
      "10 Nov 2026, 11.30",
    );
    expect(formatSessionMoment(null)).toBe("—");
  });

  it("formats recent activity relative to now", () => {
    const now = new Date("2026-11-10T04:05:00.000Z");
    expect(relativeActivity("2026-11-10T04:05:00.000Z", now)).toBe("baru saja");
    expect(relativeActivity("2026-11-10T04:00:00.000Z", now)).toBe(
      "5 menit lalu",
    );
    expect(relativeActivity("2026-11-10T01:00:00.000Z", now)).toBe(
      "3 jam lalu",
    );
    expect(relativeActivity(null, now)).toBe("—");
  });
});
