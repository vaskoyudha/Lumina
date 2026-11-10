import {
  AGENT_REGISTRY,
  AGENT_SEQUENCE,
  CREW_SEQUENCE,
  type DetectorAgent,
} from "@/components/companion/agents";
import { AGENT_IDENTITIES, CREW_IDS } from "@/lib/agents/identities";
import { STAGE_LABEL } from "@/lib/contracts/agent-run";
import { DETECTOR_IDS } from "@/lib/scoring/detector-ids";

const IDS: DetectorAgent[] = [...DETECTOR_IDS, "evidence"];

describe("agent registry", () => {
  it("has a profile for every detector, in sequence order", () => {
    expect(AGENT_SEQUENCE).toEqual(IDS);
    for (const id of IDS) {
      expect(AGENT_REGISTRY[id].id).toBe(id);
    }
  });

  it("keeps the crew sequence identical to the canonical identity registry", () => {
    expect(CREW_SEQUENCE).toEqual(CREW_IDS);
    expect(CREW_SEQUENCE).toHaveLength(8);
    for (const id of CREW_IDS) {
      expect(AGENT_REGISTRY[id].displayName).toBe(
        AGENT_IDENTITIES[id].displayName,
      );
      expect(AGENT_REGISTRY[id].purpose).toBe(AGENT_IDENTITIES[id].purpose);
      expect(AGENT_REGISTRY[id].mechanism).toEqual(
        AGENT_IDENTITIES[id].mechanisms,
      );
    }
  });

  it("never duplicates the contract label or task", () => {
    for (const id of IDS) {
      expect(AGENT_REGISTRY[id].label).toBe(STAGE_LABEL[id].label);
      expect(AGENT_REGISTRY[id].task).toBe(STAGE_LABEL[id].task);
    }
  });

  it("gives every agent a fixed flavour line and three mechanisms", () => {
    for (const id of IDS) {
      expect(AGENT_REGISTRY[id].flavor.length).toBeGreaterThan(10);
      expect(AGENT_REGISTRY[id].mechanism).toHaveLength(3);
    }
  });

  it("points every identity token at a declared CSS variable for its own id", () => {
    for (const id of IDS) {
      expect(AGENT_REGISTRY[id].identity).toBe(`--lumina-agent-${id}`);
    }
  });
});
