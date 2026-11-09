import { CONTENT_FIXTURE, SIMULATION_FIXTURE } from "@/lib/content/fixtures";
import { ContentBundleSchema, SimulationSchema } from "@/lib/content/schema";

it("seeds all twelve complete modules and the real playable scenario", () => {
  expect(CONTENT_FIXTURE.modules).toHaveLength(12);
  expect(
    CONTENT_FIXTURE.modules.every(
      (m) => m.content && m.content.kuis.length >= 3,
    ),
  ).toBe(true);
  expect(CONTENT_FIXTURE.simulations).toHaveLength(1);
});
it("rejects broken graph edges before import or rendering", () => {
  const content = JSON.parse(JSON.stringify(SIMULATION_FIXTURE));
  content.scenario.start = "missing";
  expect(SimulationSchema.safeParse(content).success).toBe(false);
});
it("rejects invalid quiz answers and mismatched module numbers", () => {
  const bundle = JSON.parse(JSON.stringify(CONTENT_FIXTURE));
  const content = bundle.modules[0].content;
  if (!content) throw new Error("Fixture missing");
  content.kuis[0].correctId = "not-an-option";
  expect(ContentBundleSchema.safeParse(bundle).success).toBe(false);
  content.no = 99;
  expect(ContentBundleSchema.safeParse(bundle).success).toBe(false);
});
