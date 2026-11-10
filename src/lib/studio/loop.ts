import { buildSystemPrompt } from "@/lib/agents/system-prompt";
import { fetchChat } from "@/lib/server/llm";
import type {
  StudioProcessStep,
  StudioRequest,
  StudioToolRecord,
  StudioToolResult,
} from "@/lib/studio/contracts";
import { StudioResponseSchema } from "@/lib/studio/contracts";
import {
  executeStudioTool,
  STUDIO_TOOLS,
  StudioToolCallSchema,
} from "@/lib/studio/tools";

const MAX_STEPS = 6;
const MAX_TOOL_BYTES = 200_000;

const SYSTEM_RULES = [
  "The only writable directory is /workspace. Tools resolve relative paths there; the host, network, and secrets are unavailable.",
  "Use read, ls, and grep to inspect files before editing. Use write for new files or complete rewrites, edit for small unique replacements, and bash for commands inside the sandbox.",
  "Before each tool call, write one short sentence in the user's language saying what you will do and why. This sentence is shown as the process step; do not reveal hidden chain-of-thought.",
  "Use check_url only when the user explicitly asks to inspect a link, website, or URL. It asks a phishing scanner about that URL; it is not a general web fetch, and the sandbox itself has no network.",
  "Never claim a tool succeeded unless its result says so. If a command fails, read the output and fix the cause.",
  "Do not ask for API keys, passwords, OTPs, or host credentials. Do not try to escape the workspace.",
  "Answer in the user's language; Indonesian by default. Keep the final answer concise and mention the files you changed.",
];

function studioSystemPrompt(userName?: string): string {
  return buildSystemPrompt({
    preamble:
      "You are Lumina Studio, a careful coding agent working inside an isolated workspace.",
    tools: STUDIO_TOOLS.map((tool) => ({
      name: tool.function.name,
      snippet: tool.function.description,
    })),
    rules: SYSTEM_RULES,
    user: userName ? { name: userName } : undefined,
    cwd: "/workspace",
    append: process.env.STUDIO_APPEND_PROMPT,
  });
}

export class StudioUpstreamError extends Error {
  constructor(public readonly status: number) {
    super(`upstream ${status}`);
  }
}

interface StudioMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}

interface ModelMessage {
  content?: string | null;
  tool_calls?: {
    id?: string;
    type?: string;
    function?: { name?: string; arguments?: string };
  }[];
}

function parseArguments(raw: string | undefined): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export interface StudioLoopResult {
  text: string;
  tools: StudioToolRecord[];
  process: StudioProcessStep[];
}

export async function runStudioLoop(
  input: StudioRequest,
  options: { userId: string; userName?: string; signal: AbortSignal },
): Promise<StudioLoopResult> {
  const base = process.env.LUMINA_LLM_URL?.trim();
  const model = process.env.LUMINA_LLM_MODEL?.trim();
  if (!base || !model) throw new StudioUpstreamError(503);

  const messages: StudioMessage[] = [
    { role: "system", content: studioSystemPrompt(options.userName) },
    ...input.history.map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.text,
    })),
    { role: "user", content: input.question },
  ];
  const tools: StudioToolRecord[] = [];
  const processSteps: StudioProcessStep[] = [];
  let bytes = 0;
  let text = "";

  for (let step = 0; step < MAX_STEPS; step += 1) {
    if (options.signal.aborted) throw new StudioUpstreamError(504);
    const final = step === MAX_STEPS - 1;
    const response = await fetchChat({
      base,
      apiKey: process.env.LUMINA_LLM_KEY,
      model,
      fallbackModel: process.env.LUMINA_LLM_FALLBACK_MODEL,
      signal: options.signal,
      body: {
        stream: false,
        temperature: 0.2,
        max_tokens: 2000,
        messages,
        ...(final ? {} : { tools: STUDIO_TOOLS, tool_choice: "auto" }),
      },
    });
    if (!response.ok) throw new StudioUpstreamError(response.status);

    const payload = (await response.json().catch(() => null)) as {
      choices?: { message?: ModelMessage }[];
    } | null;
    const message = payload?.choices?.[0]?.message;
    if (!message) throw new StudioUpstreamError(503);

    const content = message.content?.trim() ?? "";
    if (content) text = content;
    const calls = (message.tool_calls ?? []).map((call, index) => ({
      id: call.id ?? `call-${step + 1}-${index + 1}`,
      type: "function" as const,
      function: {
        name: call.function?.name ?? "",
        arguments: call.function?.arguments ?? "{}",
      },
    }));

    if (calls.length === 0) {
      return { text, tools, process: processSteps };
    }
    if (final) {
      return { text, tools, process: processSteps };
    }

    if (content) {
      processSteps.push({ kind: "thought", text: content.slice(0, 2000) });
    }

    messages.push({
      role: "assistant",
      content: content || null,
      tool_calls: calls,
    });
    const first = calls[0];
    const parsedArguments = parseArguments(first.function.arguments);
    const parsed = StudioToolCallSchema.safeParse({
      id: first.id,
      name: first.function.name,
      arguments: parsedArguments,
    });

    if (!parsed.success) {
      messages.push({
        role: "tool",
        tool_call_id: first.id,
        content: JSON.stringify({
          ok: false,
          error: "invalid_arguments",
          output: "The tool call did not match its schema.",
        }),
      });
      for (const extra of calls.slice(1)) {
        messages.push({
          role: "tool",
          tool_call_id: extra.id,
          content: JSON.stringify({
            ok: false,
            error: "ignored",
            output: "Only one tool call per step is executed.",
          }),
        });
      }
      continue;
    }

    const started = Date.now();
    let result: StudioToolResult;
    try {
      result = await executeStudioTool(parsed.data, {
        userId: options.userId,
        signal: options.signal,
      });
    } catch (error) {
      result = {
        ok: false,
        output: "",
        error:
          error instanceof Error ? error.message.slice(0, 200) : "tool failed",
      };
    }
    const ms = Date.now() - started;
    bytes += result.output.length;
    if (bytes > MAX_TOOL_BYTES) {
      result = {
        ...result,
        ok: false,
        output: `${result.output.slice(0, Math.max(0, MAX_TOOL_BYTES - (bytes - result.output.length)))}\n[total tool output truncated]`,
        truncated: true,
      };
    }
    const record: StudioToolRecord = {
      id: first.id,
      name: parsed.data.name,
      arguments: parsed.data.arguments,
      result,
      ms,
    };
    tools.push(record);
    processSteps.push({ kind: "tool", tool: record });
    messages.push({
      role: "tool",
      tool_call_id: first.id,
      content: JSON.stringify(result),
    });
    for (const extra of calls.slice(1)) {
      messages.push({
        role: "tool",
        tool_call_id: extra.id,
        content: JSON.stringify({
          ok: false,
          error: "ignored",
          output: "Only one tool call per step is executed.",
        }),
      });
    }
  }

  return { text, tools, process: processSteps };
}

export function studioResponse(result: StudioLoopResult) {
  return StudioResponseSchema.parse({
    ok: true,
    text: result.text,
    tools: result.tools,
    process: result.process,
  });
}
