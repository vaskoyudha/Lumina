import { AGENT_REGISTRY, AGENT_SEQUENCE } from "@/components/companion/agents";
import { COMMUNITY_AGENT_IDS, COMMUNITY_AGENTS } from "./agents";

it("keeps the community agent names and portraits in sync with the panel", () => {
  expect([...COMMUNITY_AGENT_IDS]).toEqual(AGENT_SEQUENCE);
  for (const id of COMMUNITY_AGENT_IDS) {
    expect(COMMUNITY_AGENTS[id].displayName).toBe(
      AGENT_REGISTRY[id].displayName,
    );
    expect(COMMUNITY_AGENTS[id].portrait).toBe(AGENT_REGISTRY[id].portrait);
    expect(COMMUNITY_AGENTS[id].field.length).toBeGreaterThan(3);
  }
});
