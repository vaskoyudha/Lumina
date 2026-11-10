/** @jest-environment node */
jest.mock("@/lib/server/llm", () => ({
  fetchChat: jest.fn(),
}));

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fetchChat } from "@/lib/server/llm";
import { runStudioLoop } from "@/lib/studio/loop";

const userId = "test-user-1234";
let base = "";

beforeAll(async () => {
  base = await mkdtemp(path.join(tmpdir(), "lumina-studio-loop-"));
  process.env.STUDIO_WORKSPACE_ROOT = base;
  process.env.LUMINA_LLM_URL = "http://llm.test/v1";
  process.env.LUMINA_LLM_MODEL = "test-model";
});

afterAll(async () => {
  delete process.env.STUDIO_WORKSPACE_ROOT;
  delete process.env.LUMINA_LLM_URL;
  delete process.env.LUMINA_LLM_MODEL;
  await rm(base, { recursive: true, force: true });
});

describe("runStudioLoop", () => {
  beforeEach(() => {
    jest.mocked(fetchChat).mockReset();
  });

  it("executes one typed tool call and returns the final text", async () => {
    jest
      .mocked(fetchChat)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "Saya akan menulis hello.txt di workspace.",
                tool_calls: [
                  {
                    id: "call-write",
                    type: "function",
                    function: {
                      name: "write",
                      arguments: JSON.stringify({
                        path: "hello.txt",
                        content: "halo studio\n",
                      }),
                    },
                  },
                ],
              },
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "File hello.txt dibuat." } }],
        }),
      } as Response);

    const result = await runStudioLoop(
      { question: "buat hello.txt", history: [] },
      { userId, signal: new AbortController().signal },
    );

    expect(result.text).toBe("File hello.txt dibuat.");
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]).toMatchObject({
      name: "write",
      result: { ok: true },
    });
    expect(result.process).toHaveLength(2);
    expect(result.process[0]).toEqual({
      kind: "thought",
      text: "Saya akan menulis hello.txt di workspace.",
    });
    expect(result.process[1]).toMatchObject({
      kind: "tool",
      tool: { name: "write", result: { ok: true } },
    });
    await expect(
      readFile(path.join(base, userId, "hello.txt"), "utf8"),
    ).resolves.toBe("halo studio\n");
    expect(fetchChat).toHaveBeenCalledTimes(2);
  });

  it("sends a sectioned prompt with the user's name", async () => {
    jest.mocked(fetchChat).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Siap." } }],
      }),
    } as Response);

    await runStudioLoop(
      { question: "halo", history: [] },
      { userId, userName: "Vasco", signal: new AbortController().signal },
    );

    const call = jest.mocked(fetchChat).mock.calls[0]?.[0] as unknown as {
      body: { messages: { role: string; content: string }[] };
    };
    const system = call.body.messages[0]?.content ?? "";
    expect(system).toContain("<tools>");
    expect(system).toContain("<rules>");
    expect(system).toContain("<user>");
    expect(system).toContain("Nama panggilan pengguna: Vasco.");
    expect(system).toContain("<cwd>\n/workspace");
  });
});
