import { AGENT_REGISTRY, AGENT_SEQUENCE } from "@/components/companion/agents";
import { COMMUNITY_AGENT_IDS, COMMUNITY_AGENTS } from "./agents";

it("keeps the community agent names and portraits in sync with the panel", () => {
  // The community feed is a projection: it covers the detectors that have a
  // portrait and a brief, in the panel's order. A detector without a portrait
  // stays in the panel and simply has no community identity.
  const projected = AGENT_SEQUENCE.filter((id) =>
    (COMMUNITY_AGENT_IDS as readonly string[]).includes(id),
  );
  expect([...COMMUNITY_AGENT_IDS]).toEqual(projected);
  for (const id of COMMUNITY_AGENT_IDS) {
    expect(AGENT_REGISTRY[id].portrait).toBeTruthy();
    expect(COMMUNITY_AGENTS[id].displayName).toBe(
      AGENT_REGISTRY[id].displayName,
    );
    expect(COMMUNITY_AGENTS[id].portrait).toBe(AGENT_REGISTRY[id].portrait);
    expect(COMMUNITY_AGENTS[id].field.length).toBeGreaterThan(3);
  }
});
