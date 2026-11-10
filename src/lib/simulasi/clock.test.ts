import { messageClock } from "@/lib/simulasi/clock";

describe("messageClock", () => {
  it("starts at the narrative clock", () => {
    expect(messageClock(0)).toBe("16.42");
  });

  it("advances one minute per transcript entry", () => {
    expect(messageClock(1)).toBe("16.43");
    expect(messageClock(18)).toBe("17.00");
    expect(messageClock(60)).toBe("17.42");
  });

  it("wraps at midnight and clamps invalid input", () => {
    expect(messageClock(24 * 60)).toBe("16.42");
    expect(messageClock(-5)).toBe("16.42");
    expect(messageClock(3.9)).toBe("16.45");
  });
});
