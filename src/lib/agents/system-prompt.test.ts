import { buildSystemPrompt } from "@/lib/agents/system-prompt";

describe("buildSystemPrompt", () => {
  it("renders ordered sections and tool guidelines", () => {
    const prompt = buildSystemPrompt({
      preamble: "You are Lumina Studio.",
      tools: [
        {
          name: "read",
          snippet: "Read a workspace file.",
          guidelines: ["Read before editing."],
        },
      ],
      rules: ["Never claim a tool succeeded."],
      cwd: "/workspace",
    });

    expect(prompt).toContain("You are Lumina Studio.");
    expect(prompt).toContain("<tools>\n- read: Read a workspace file.");
    expect(prompt).toContain("  - Read before editing.");
    expect(prompt).toContain("<rules>\n- Never claim a tool succeeded.");
    expect(prompt).toContain("<cwd>\n/workspace");
    expect(prompt.indexOf("<tools>")).toBeLessThan(prompt.indexOf("<rules>"));
    expect(prompt.indexOf("<rules>")).toBeLessThan(prompt.indexOf("<cwd>"));
  });

  it("personalizes with a name and escapes it", () => {
    const prompt = buildSystemPrompt({
      preamble: "You are Lumina.",
      user: { name: "Vasco <admin>", language: "Indonesia" },
    });

    expect(prompt).toContain("Nama panggilan pengguna: Vasco &lt;admin&gt;.");
    expect(prompt).toContain("Bahasa jawaban: Indonesia.");
    expect(prompt).not.toContain("Vasco <admin>");
  });

  it("omits empty sections instead of printing empty tags", () => {
    const prompt = buildSystemPrompt({ preamble: "You are Lumina." });

    expect(prompt).toBe("You are Lumina.");
    expect(prompt).not.toContain("<tools>");
    expect(prompt).not.toContain("<user>");
  });

  it("renders project instructions and an addendum", () => {
    const prompt = buildSystemPrompt({
      preamble: "You are Lumina Studio.",
      context: [{ path: "AGENTS.md", content: "Use pnpm, not npm." }],
      append: "Prefer small diffs.",
    });

    expect(prompt).toContain(
      '<file path="AGENTS.md">\nUse pnpm, not npm.\n</file>',
    );
    expect(prompt).toContain("<addendum>\nPrefer small diffs.");
  });
});
