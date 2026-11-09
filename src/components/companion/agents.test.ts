import {
  AGENT_REGISTRY,
  AGENT_SEQUENCE,
  type DetectorAgent,
} from "@/components/companion/agents";
import { STAGE_LABEL } from "@/lib/contracts/agent-run";

const IDS: DetectorAgent[] = [
  "message",
  "link",
  "identity",
  "conversation",
  "job",
  "marketplace",
  "qris",
  "evidence",
];

describe("agent registry", () => {
  it("has a profile for every detector, in sequence order", () => {
    expect(AGENT_SEQUENCE).toEqual(IDS);
    for (const id of IDS) {
      expect(AGENT_REGISTRY[id].id).toBe(id);
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
