import { SPECIALISTS, specialistSystemPrompt } from "@/lib/orchestrator/agents";

describe("specialistSystemPrompt", () => {
  it("lists only the tools the run allows", () => {
    const prompt = specialistSystemPrompt(SPECIALISTS.message, [
      "score_message",
    ]);

    expect(prompt).toContain("- score_message:");
    expect(prompt).toContain("- submit_report:");
    expect(prompt).not.toContain("- scan_detector:");
    expect(prompt).not.toContain("- extract_entities:");
  });
});
