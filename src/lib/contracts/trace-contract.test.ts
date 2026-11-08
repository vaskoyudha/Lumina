import { STAGE_LABEL } from "@/lib/contracts/agent-run";
import type { AgentId } from "@/lib/contracts/score";

const AGENT_IDS: AgentId[] = [
  "message",
  "link",
  "identity",
  "conversation",
  "job",
  "marketplace",
  "qris",
  "evidence",
  "scoring",
];

describe("trace contract", () => {
  it("labels every AgentId exactly once", () => {
    for (const id of AGENT_IDS) {
      expect(STAGE_LABEL[id]).toEqual({
        label: expect.any(String),
        task: expect.any(String),
      });
    }
  });

  it("keeps scoring and voice out of AgentId", () => {
    expect(STAGE_LABEL.voice.label).toBe("Penyusun bahasa");
    expect(AGENT_IDS).not.toContain("voice");
  });
});
