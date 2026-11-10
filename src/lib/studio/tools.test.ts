import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { executeStudioTool, StudioToolCallSchema } from "@/lib/studio/tools";

const userId = "test-user-1234";
const signal = new AbortController().signal;
let base = "";

async function run(name: string, args: unknown) {
  const call = StudioToolCallSchema.parse({
    id: `test-${name}`,
    name,
    arguments: args,
  });
  return executeStudioTool(call, { userId, signal });
}

beforeAll(async () => {
  base = await mkdtemp(path.join(tmpdir(), "lumina-studio-"));
  process.env.STUDIO_WORKSPACE_ROOT = base;
});

afterAll(async () => {
  delete process.env.STUDIO_WORKSPACE_ROOT;
  await rm(base, { recursive: true, force: true });
});

describe("Studio file tools", () => {
  it("writes, reads, edits, lists, and greps a workspace file", async () => {
    await expect(
      run("write", {
        path: "src/hello.txt",
        content: "halo dunia\nbaris kedua\n",
      }),
    ).resolves.toMatchObject({ ok: true });
    await expect(run("read", { path: "src/hello.txt" })).resolves.toMatchObject(
      {
        ok: true,
        output: "1\thalo dunia\n2\tbaris kedua\n3\t",
      },
    );
    await expect(
      run("edit", {
        path: "src/hello.txt",
        edits: [{ oldText: "baris kedua", newText: "baris diubah" }],
      }),
    ).resolves.toMatchObject({ ok: true });
    const text = await readFile(
      path.join(base, userId, "src/hello.txt"),
      "utf8",
    );
    expect(text).toContain("baris diubah");
    await expect(run("ls", { path: "src" })).resolves.toMatchObject({
      ok: true,
      output: "hello.txt",
    });
    await expect(
      run("grep", { pattern: "diubah", path: "src" }),
    ).resolves.toMatchObject({
      ok: true,
      output: "src/hello.txt:2:baris diubah",
    });
  });

  it("rejects traversal and absolute paths", async () => {
    await expect(run("read", { path: "../escape.txt" })).resolves.toMatchObject(
      {
        ok: false,
        error: "path escapes the workspace",
      },
    );
    await expect(run("read", { path: "/etc/passwd" })).resolves.toMatchObject({
      ok: false,
      error: "path must be relative to the workspace",
    });
  });
});

describe("Studio bash sandbox", () => {
  const available = existsSync("/usr/sbin/bwrap");

  it("runs inside the workspace without host secrets or network", async () => {
    if (!available) return;
    const result = await run("bash", {
      command:
        "pwd; echo ok > out.txt; cat out.txt; cat /opt/lumina/.env.local; ls /root/.ssh; exec 3<>/dev/tcp/1.1.1.1/443",
      timeoutMs: 5000,
    });
    expect(result.ok).toBe(true);
    expect(result.output).toContain("/workspace");
    expect(result.output).toContain("ok");
    expect(result.output).toContain("/opt/lumina/.env.local: No such file");
    expect(result.output).toContain("Network is unreachable");
    expect(existsSync(path.join(base, userId, "out.txt"))).toBe(true);
  });

  it("kills a command that exceeds the timeout", async () => {
    if (!available) return;
    await expect(
      run("bash", { command: "sleep 30", timeoutMs: 1000 }),
    ).resolves.toMatchObject({ ok: false, error: "timeout" });
  });
});
