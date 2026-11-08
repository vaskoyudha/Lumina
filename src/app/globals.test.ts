import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("agent identity tokens", () => {
  it("defines a line and soft variant for every agent", () => {
    const ids = [
      "message",
      "link",
      "identity",
      "conversation",
      "job",
      "marketplace",
      "qris",
      "evidence",
    ];
    for (const id of ids) {
      expect(css).toContain(`--lumina-agent-${id}:`);
      expect(css).toContain(`--lumina-agent-${id}-soft:`);
      expect(css).toContain(`--color-agent-${id}:`);
    }
  });

  it("keeps the brand orange out of the ramp", () => {
    expect(css).not.toMatch(/--lumina-agent-[a-z]+:\s*#ea580c/i);
  });
});
