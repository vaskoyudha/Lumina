import { DETECTOR_IDS } from "@/lib/scoring/detector-ids";
import { DETECTOR_RUN_ORDER } from "@/lib/scoring/score";

describe("detector order", () => {
  it("keeps the engine's run order identical to the order the UI lists", () => {
    expect(DETECTOR_RUN_ORDER).toEqual(DETECTOR_IDS);
  });

  it("runs every detector exactly once", () => {
    expect(new Set(DETECTOR_RUN_ORDER).size).toBe(DETECTOR_RUN_ORDER.length);
  });
});
