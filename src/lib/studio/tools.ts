import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import {
  access,
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { LinkVerifyError, verifyLink } from "@/lib/link-verify/urlvet";
import type { StudioToolResult } from "@/lib/studio/contracts";

const MAX_FILE_BYTES = 1_000_000;
const MAX_WRITE_BYTES = 200_000;
const MAX_OUTPUT = 50_000;
const MAX_GREP_FILES = 200;
const MAX_GREP_MATCHES = 50;
const DEFAULT_BASH_MS = 10_000;

const ReadArgsSchema = z
  .object({
    path: z.string().min(1).max(4096),
    offset: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(2000).optional(),
  })
  .strict();

const WriteArgsSchema = z
  .object({
    path: z.string().min(1).max(4096),
    content: z.string().max(MAX_WRITE_BYTES),
  })
  .strict();

const EditArgsSchema = z
  .object({
    path: z.string().min(1).max(4096),
    edits: z
      .array(
        z
          .object({
            oldText: z.string().min(1).max(50_000),
            newText: z.string().max(50_000),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();

const LsArgsSchema = z
  .object({
    path: z.string().max(4096).optional(),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .strict();

const GrepArgsSchema = z
  .object({
    pattern: z.string().min(1).max(500),
    path: z.string().max(4096).optional(),
    glob: z.string().max(200).optional(),
    ignoreCase: z.boolean().optional(),
    literal: z.boolean().optional(),
    context: z.number().int().min(0).max(3).optional(),
    limit: z.number().int().min(1).max(MAX_GREP_MATCHES).optional(),
  })
  .strict();

const BashArgsSchema = z
  .object({
    command: z.string().min(1).max(4000),
    timeoutMs: z.number().int().min(1000).max(DEFAULT_BASH_MS).optional(),
  })
  .strict();

const CheckUrlArgsSchema = z
  .object({
    url: z
      .string()
      .min(1)
      .max(2048)
      .refine((value) => /^https?:\/\//i.test(value), "invalid-url"),
  })
  .strict();

export const StudioToolCallSchema = z.discriminatedUnion("name", [
  z
    .object({
      id: z.string().min(1).max(100),
      name: z.literal("read"),
      arguments: ReadArgsSchema,
    })
    .strict(),
  z
    .object({
      id: z.string().min(1).max(100),
      name: z.literal("write"),
      arguments: WriteArgsSchema,
    })
    .strict(),
  z
    .object({
      id: z.string().min(1).max(100),
      name: z.literal("edit"),
      arguments: EditArgsSchema,
    })
    .strict(),
  z
    .object({
      id: z.string().min(1).max(100),
      name: z.literal("ls"),
      arguments: LsArgsSchema,
    })
    .strict(),
  z
    .object({
      id: z.string().min(1).max(100),
      name: z.literal("grep"),
      arguments: GrepArgsSchema,
    })
    .strict(),
  z
    .object({
      id: z.string().min(1).max(100),
      name: z.literal("bash"),
      arguments: BashArgsSchema,
    })
    .strict(),
  z
    .object({
      id: z.string().min(1).max(100),
      name: z.literal("check_url"),
      arguments: CheckUrlArgsSchema,
    })
    .strict(),
]);

export type StudioToolCall = z.infer<typeof StudioToolCallSchema>;

export const STUDIO_TOOLS = [
  {
    type: "function",
    function: {
      name: "read",
      description:
        "Read a text file from the workspace. Paths are relative to the workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path" },
          offset: {
            type: "integer",
            minimum: 1,
            description: "1-indexed start line",
          },
          limit: { type: "integer", minimum: 1, maximum: 2000 },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write",
      description:
        "Create or overwrite a text file in the workspace. Creates parent directories.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path" },
          content: { type: "string", description: "Complete file content" },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit",
      description:
        "Replace exact, unique text in a workspace file. Each oldText must occur once.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path" },
          edits: {
            type: "array",
            minItems: 1,
            maxItems: 20,
            items: {
              type: "object",
              properties: {
                oldText: { type: "string" },
                newText: { type: "string" },
              },
              required: ["oldText", "newText"],
              additionalProperties: false,
            },
          },
        },
        required: ["path", "edits"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ls",
      description:
        "List workspace entries. Directories end with / and symlinks with @.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative directory, default .",
          },
          limit: { type: "integer", minimum: 1, maximum: 500 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "grep",
      description:
        "Search text files in the workspace by JavaScript regular expression or literal text.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string" },
          path: { type: "string", description: "Relative file or directory" },
          glob: {
            type: "string",
            description: "Optional filename glob, e.g. *.ts",
          },
          ignoreCase: { type: "boolean" },
          literal: { type: "boolean" },
          context: { type: "integer", minimum: 0, maximum: 3 },
          limit: { type: "integer", minimum: 1, maximum: MAX_GREP_MATCHES },
        },
        required: ["pattern"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bash",
      description:
        "Run a bash command inside the isolated workspace. No network, no host files, 10s maximum.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
          timeoutMs: { type: "integer", minimum: 1000, maximum: 10000 },
        },
        required: ["command"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_url",
      description:
        "Inspect one URL with the phishing scanner (url.vet). Use only when the user explicitly asks to check a link, website, or URL. This is not a general web fetch; the sandbox has no network.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The exact URL, starting with http:// or https://",
          },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
] as const;

function fail(error: string, output = ""): StudioToolResult {
  return { ok: false, error, output };
}

function baseRoot(): string {
  const configured = process.env.STUDIO_WORKSPACE_ROOT?.trim();
  const root = configured
    ? path.resolve(configured)
    : "/var/lib/lumina-studio/workspaces";
  if (!path.isAbsolute(root))
    throw new Error("workspace root must be absolute");
  return root;
}

export async function workspaceFor(userId: string): Promise<string> {
  if (!/^[a-z0-9-]{8,80}$/i.test(userId)) throw new Error("invalid user");
  const root = path.join(baseRoot(), userId.toLowerCase());
  await mkdir(root, { recursive: true, mode: 0o700 });
  return root;
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function resolveInside(root: string, input: string): Promise<string> {
  if (!input || input.includes("\0") || path.isAbsolute(input)) {
    throw new Error("path must be relative to the workspace");
  }
  const candidate = path.resolve(root, input);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new Error("path escapes the workspace");
  }

  let probe = candidate;
  while (!(await exists(probe))) {
    const parent = path.dirname(probe);
    if (parent === probe) break;
    probe = parent;
  }
  const realProbe = await realpath(probe);
  if (realProbe !== root && !realProbe.startsWith(`${root}${path.sep}`)) {
    throw new Error("path escapes the workspace");
  }

  if (await exists(candidate)) {
    const info = await lstat(candidate);
    if (info.isSymbolicLink()) throw new Error("symlinks are not allowed");
    const real = await realpath(candidate);
    if (real !== root && !real.startsWith(`${root}${path.sep}`)) {
      throw new Error("path escapes the workspace");
    }
  }
  return candidate;
}

function relative(root: string, target: string): string {
  return path.relative(root, target) || ".";
}

function decodeText(buffer: Buffer): string | null {
  if (buffer.subarray(0, 8192).includes(0)) return null;
  return buffer.toString("utf8");
}

function cap(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_OUTPUT) return { text, truncated: false };
  return {
    text: `${text.slice(0, MAX_OUTPUT)}\n[output truncated]`,
    truncated: true,
  };
}

async function readTool(root: string, args: z.infer<typeof ReadArgsSchema>) {
  const file = await resolveInside(root, args.path);
  const info = await stat(file);
  if (!info.isFile()) return fail("not a file");
  if (info.size > MAX_FILE_BYTES) return fail("file is too large");
  const text = decodeText(await readFile(file));
  if (text === null) return fail("binary files are not supported");
  const lines = text.split(/\r?\n/);
  const start = (args.offset ?? 1) - 1;
  if (start >= lines.length)
    return fail("offset is beyond the end of the file");
  const selected = lines.slice(start, start + (args.limit ?? 2000));
  const numbered = selected
    .map((line, index) => `${start + index + 1}\t${line}`)
    .join("\n");
  const limited = cap(numbered);
  return {
    ok: true,
    output: limited.text,
    truncated: limited.truncated || selected.length < lines.length - start,
  };
}

async function writeTool(root: string, args: z.infer<typeof WriteArgsSchema>) {
  if (Buffer.byteLength(args.content, "utf8") > MAX_WRITE_BYTES) {
    return fail("content is too large");
  }
  const file = await resolveInside(root, args.path);
  if (await exists(file)) {
    const info = await lstat(file);
    if (!info.isFile()) return fail("target is not a file");
  }
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, args.content, "utf8");
  return {
    ok: true,
    output: `Wrote ${Buffer.byteLength(args.content, "utf8")} bytes to ${relative(root, file)}`,
  };
}

async function editTool(root: string, args: z.infer<typeof EditArgsSchema>) {
  const file = await resolveInside(root, args.path);
  const info = await stat(file);
  if (!info.isFile() || info.size > MAX_FILE_BYTES)
    return fail("file is not editable");
  const text = decodeText(await readFile(file));
  if (text === null) return fail("binary files are not supported");

  const replacements: { start: number; end: number; next: string }[] = [];
  for (const edit of args.edits) {
    const first = text.indexOf(edit.oldText);
    if (first === -1) return fail("oldText was not found");
    if (text.indexOf(edit.oldText, first + 1) !== -1) {
      return fail("oldText is not unique");
    }
    const end = first + edit.oldText.length;
    if (replacements.some((item) => first < item.end && end > item.start)) {
      return fail("edits overlap");
    }
    replacements.push({ start: first, end, next: edit.newText });
  }

  let next = text;
  for (const edit of replacements.sort((a, b) => b.start - a.start)) {
    next = `${next.slice(0, edit.start)}${edit.next}${next.slice(edit.end)}`;
  }
  if (next === text) return fail("edits did not change the file");
  if (Buffer.byteLength(next, "utf8") > MAX_FILE_BYTES) {
    return fail("edited file would be too large");
  }
  await writeFile(file, next, "utf8");
  return { ok: true, output: `Edited ${relative(root, file)}` };
}

async function lsTool(root: string, args: z.infer<typeof LsArgsSchema>) {
  const directory = await resolveInside(root, args.path ?? ".");
  const info = await stat(directory);
  if (!info.isDirectory()) return fail("not a directory");
  const entries = await readdir(directory, { withFileTypes: true });
  const limit = args.limit ?? 500;
  const lines = entries
    .map((entry) => ({
      name: entry.name,
      suffix: entry.isDirectory() ? "/" : entry.isSymbolicLink() ? "@" : "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((entry) => `${entry.name}${entry.suffix}`);
  const limited = cap(lines.join("\n") || "(empty directory)");
  return {
    ok: true,
    output: limited.text,
    truncated: limited.truncated || entries.length > limit,
  };
}

function globMatcher(
  glob: string,
): (name: string, pathname: string) => boolean {
  let source = "";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === "*") {
      if (glob[index + 1] === "*") {
        source += ".*";
        index += 1;
      } else {
        source += "[^/]*";
      }
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  const regex = new RegExp(`^${source}$`);
  const hasSlash = glob.includes("/");
  return (name, pathname) => regex.test(hasSlash ? pathname : name);
}

async function collectFiles(
  root: string,
  directory: string,
  matcher: ((name: string, pathname: string) => boolean) | null,
  files: string[],
) {
  if (files.length >= MAX_GREP_FILES) return;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (files.length >= MAX_GREP_FILES) return;
    if (entry.isSymbolicLink()) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (
        [".git", "node_modules", ".next", "dist", "build"].includes(entry.name)
      )
        continue;
      await collectFiles(root, target, matcher, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (matcher && !matcher(entry.name, relative(root, target))) continue;
    files.push(target);
  }
}

async function grepTool(root: string, args: z.infer<typeof GrepArgsSchema>) {
  let expression: RegExp;
  try {
    const source = args.literal
      ? args.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      : args.pattern;
    expression = new RegExp(source, args.ignoreCase ? "gi" : "g");
  } catch {
    return fail("invalid regular expression");
  }

  const target = await resolveInside(root, args.path ?? ".");
  const info = await stat(target);
  const files: string[] = [];
  if (info.isDirectory()) {
    await collectFiles(
      root,
      target,
      args.glob ? globMatcher(args.glob) : null,
      files,
    );
  } else if (info.isFile()) {
    files.push(target);
  } else {
    return fail("path is not a file or directory");
  }

  const matches: string[] = [];
  for (const file of files) {
    if (matches.length >= (args.limit ?? MAX_GREP_MATCHES)) break;
    const fileInfo = await stat(file);
    if (fileInfo.size > MAX_FILE_BYTES) continue;
    const text = decodeText(await readFile(file));
    if (text === null) continue;
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      expression.lastIndex = 0;
      if (!expression.test(lines[index])) continue;
      const from = Math.max(0, index - (args.context ?? 0));
      const to = Math.min(lines.length - 1, index + (args.context ?? 0));
      for (let at = from; at <= to; at += 1) {
        matches.push(`${relative(root, file)}:${at + 1}:${lines[at]}`);
      }
      if (matches.length >= (args.limit ?? MAX_GREP_MATCHES)) break;
    }
  }

  const limited = cap(matches.join("\n") || "No matches found.");
  return {
    ok: true,
    output: limited.text,
    truncated:
      limited.truncated || matches.length >= (args.limit ?? MAX_GREP_MATCHES),
  };
}

const BWRAP = "/usr/sbin/bwrap";
const TIMEOUT = "/usr/sbin/timeout";
const PRLIMIT = "/usr/sbin/prlimit";

function bwrapArgs(root: string, command: string): string[] {
  return [
    "--die-with-parent",
    "--new-session",
    "--unshare-all",
    "--hostname",
    "studio",
    "--cap-drop",
    "ALL",
    "--clearenv",
    "--setenv",
    "PATH",
    "/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin",
    "--setenv",
    "HOME",
    "/workspace",
    "--setenv",
    "TMPDIR",
    "/tmp",
    "--setenv",
    "LANG",
    "C.UTF-8",
    "--tmpfs",
    "/",
    "--ro-bind",
    "/usr",
    "/usr",
    "--symlink",
    "usr/bin",
    "/bin",
    "--symlink",
    "usr/sbin",
    "/sbin",
    "--symlink",
    "usr/lib",
    "/lib",
    "--symlink",
    "usr/lib64",
    "/lib64",
    "--ro-bind",
    "/etc/passwd",
    "/etc/passwd",
    "--ro-bind",
    "/etc/group",
    "/etc/group",
    "--ro-bind-try",
    "/etc/ld.so.cache",
    "/etc/ld.so.cache",
    "--ro-bind-try",
    "/etc/ld.so.conf",
    "/etc/ld.so.conf",
    "--ro-bind-try",
    "/etc/ld.so.conf.d",
    "/etc/ld.so.conf.d",
    "--ro-bind-try",
    "/etc/alternatives",
    "/etc/alternatives",
    "--proc",
    "/proc",
    "--dev",
    "/dev",
    "--tmpfs",
    "/tmp",
    "--bind",
    root,
    "/workspace",
    "--chdir",
    "/workspace",
    "--remount-ro",
    "/",
    "--",
    "/usr/bin/bash",
    "-c",
    command,
  ];
}

function runBash(
  root: string,
  args: z.infer<typeof BashArgsSchema>,
  signal: AbortSignal,
): Promise<StudioToolResult> {
  if (!existsSync(BWRAP) || !existsSync(TIMEOUT) || !existsSync(PRLIMIT)) {
    return Promise.resolve(fail("sandbox is unavailable"));
  }
  const timeoutMs = args.timeoutMs ?? DEFAULT_BASH_MS;
  const child = spawn(
    TIMEOUT,
    [
      "-s",
      "KILL",
      String(Math.ceil(timeoutMs / 1000)),
      PRLIMIT,
      "--as=268435456",
      "--nproc=64",
      "--fsize=1048576",
      "--nofile=256",
      BWRAP,
      ...bwrapArgs(root, args.command),
    ],
    {
      cwd: root,
      env: {
        PATH: "/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin",
        NODE_ENV: process.env.NODE_ENV ?? "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  ) as ChildProcess;

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let truncated = false;
    let settled = false;

    const finish = (result: StudioToolResult) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      resolve(result);
    };
    const abort = () => {
      child.kill("SIGKILL");
      finish(fail("aborted"));
    };
    signal.addEventListener("abort", abort, { once: true });

    const collect = (chunk: Buffer) => {
      if (truncated) return;
      const remaining = MAX_OUTPUT - bytes;
      if (chunk.length > remaining) {
        chunks.push(chunk.subarray(0, remaining));
        bytes = MAX_OUTPUT;
        truncated = true;
        child.kill("SIGKILL");
        return;
      }
      chunks.push(chunk);
      bytes += chunk.length;
    };
    child.stdout?.on("data", collect);
    child.stderr?.on("data", collect);
    child.on("error", () => finish(fail("sandbox failed")));
    child.on("close", (code, signal) => {
      const output = Buffer.concat(chunks).toString("utf8");
      if (truncated) {
        finish({
          ok: false,
          error: "output_too_large",
          output: `${output}\n[output truncated]`,
          truncated: true,
        });
        return;
      }
      if (
        code === 124 ||
        code === 137 ||
        signal === "SIGKILL" ||
        signal === "SIGTERM"
      ) {
        finish({ ...fail("timeout", output), exitCode: code ?? undefined });
        return;
      }
      finish({ ok: true, output, exitCode: code ?? 1 });
    });
  });
}

async function checkUrlTool(
  args: z.infer<typeof CheckUrlArgsSchema>,
  signal: AbortSignal,
): Promise<StudioToolResult> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const verdict = await verifyLink(args.url, controller.signal);
    return { ok: true, output: JSON.stringify(verdict, null, 2) };
  } catch (error) {
    if (error instanceof LinkVerifyError) {
      if (error.code === "disabled")
        return fail("link scanner is not configured");
      if (error.code === "timeout") return fail("link scanner timed out");
      if (error.code === "invalid")
        return fail("link scanner returned an invalid report");
      return fail("link scanner is unavailable");
    }
    return fail("link check failed");
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

export async function executeStudioTool(
  call: StudioToolCall,
  options: { userId: string; signal: AbortSignal },
): Promise<StudioToolResult> {
  try {
    const root = await workspaceFor(options.userId);
    switch (call.name) {
      case "read":
        return await readTool(root, call.arguments);
      case "write":
        return await writeTool(root, call.arguments);
      case "edit":
        return await editTool(root, call.arguments);
      case "ls":
        return await lsTool(root, call.arguments);
      case "grep":
        return await grepTool(root, call.arguments);
      case "bash":
        return await runBash(root, call.arguments, options.signal);
      case "check_url":
        return await checkUrlTool(call.arguments, options.signal);
    }
  } catch (error) {
    return fail(
      error instanceof Error ? error.message.slice(0, 200) : "tool failed",
    );
  }
}
