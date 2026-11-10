/**
 * Structured system-prompt builder, modelled on Pi's sectioned prompt.
 *
 * Pi renders independently replaceable sections (preamble, tools, rules,
 * project context, cwd) instead of one flat string. The model can then tell
 * policy from context from workspace facts, and a later change can replace one
 * section without rewriting the rest.
 */

export interface PromptTool {
  name: string;
  snippet: string;
  guidelines?: string[];
}

export interface PromptContextFile {
  path: string;
  content: string;
}

export interface SystemPromptOptions {
  preamble: string;
  tools?: PromptTool[];
  rules?: string[];
  context?: PromptContextFile[];
  user?: { name?: string; language?: string };
  cwd?: string;
  append?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(name: string, content: string): string {
  return `<${name}>\n${content.trim()}\n</${name}>`;
}

export function buildSystemPrompt(options: SystemPromptOptions): string {
  const sections: string[] = [options.preamble.trim()];

  if (options.tools?.length) {
    const lines = options.tools.map((tool) => {
      const guidelines = tool.guidelines?.length
        ? `\n${tool.guidelines.map((rule) => `  - ${rule}`).join("\n")}`
        : "";
      return `- ${tool.name}: ${tool.snippet}${guidelines}`;
    });
    sections.push(wrap("tools", lines.join("\n")));
  }

  if (options.rules?.length) {
    sections.push(
      wrap("rules", options.rules.map((rule) => `- ${rule}`).join("\n")),
    );
  }

  if (options.user?.name?.trim()) {
    const name = escapeXml(options.user.name.trim().slice(0, 80));
    const language = options.user.language?.trim()
      ? ` Bahasa jawaban: ${escapeXml(options.user.language.trim().slice(0, 40))}.`
      : "";
    sections.push(
      wrap(
        "user",
        `Nama panggilan pengguna: ${name}.${language} Sapa hanya jika relevan; jangan mengarang preferensi atau data pribadi lain.`,
      ),
    );
  }

  for (const file of options.context ?? []) {
    sections.push(
      wrap(
        "project_instructions",
        `<file path="${escapeXml(file.path)}">\n${file.content.trim()}\n</file>`,
      ),
    );
  }

  if (options.cwd?.trim()) sections.push(wrap("cwd", options.cwd.trim()));
  if (options.append?.trim())
    sections.push(wrap("addendum", options.append.trim()));

  return sections.join("\n\n");
}
