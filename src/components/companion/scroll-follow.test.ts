import { type ScrollMetrics, shouldFollow } from "./scroll-follow";

function metrics(top: number, height = 1000, viewport = 100): ScrollMetrics {
  return { top, height, viewport };
}

describe("shouldFollow", () => {
  it("follows when the log is at the bottom", () => {
    expect(shouldFollow(metrics(900), metrics(900), true)).toBe(true);
  });

  it("stops following when the reader is 200px above the bottom", () => {
    expect(shouldFollow(metrics(700), metrics(700), true)).toBe(false);
  });

  it("keeps following when content grows while the reader is armed", () => {
    expect(shouldFollow(metrics(900), metrics(900, 1200), true)).toBe(true);
  });

  it("keeps the previous armed state when growth clamps the scroll position", () => {
    expect(shouldFollow(metrics(900), metrics(950, 1200), false)).toBe(false);
    expect(shouldFollow(metrics(900), metrics(950, 1200), true)).toBe(true);
  });
});
