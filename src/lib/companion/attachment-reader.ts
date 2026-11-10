import type { Attachment } from "@/components/companion/composer";
import type { ImageTranscription } from "@/lib/companion/vision-client";
import type { AnswerAttachment } from "@/lib/contracts/answer";

/**
 * Read the attachments the user explicitly asked about.
 *
 * Images are already transcribed by `transcribeImages`; this module joins the
 * per-image results back to their attachment and reads text-like files on the
 * device. PDFs and binaries are reported as unsupported rather than scored from
 * their filename or sent to a parser they never reached.
 *
 * Nothing here files an upload, stores it, or turns a filename into a model
 * field. The model-facing projection is `attachmentContext`, which has a kind
 * and text only.
 */

const MAX_TEXT_BYTES = 512 * 1024;
const MAX_TEXT_CHARS = 6000;
const MAX_CONTEXT_CHARS = 12_000;

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "jsonl",
  "log",
  "xml",
  "yaml",
  "yml",
  "html",
  "htm",
  "css",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "java",
  "c",
  "h",
  "cpp",
  "hpp",
  "go",
  "rs",
  "rb",
  "php",
  "sql",
  "sh",
  "bash",
  "ini",
  "conf",
  "env",
]);

export type AttachmentKind = "image" | "text" | "pdf" | "link" | "other";
export type AttachmentReadStatus = "read" | "unsupported" | "failed";

export interface AttachmentRead {
  id: string;
  /** Local UI only. Never projected into a model request. */
  name: string;
  kind: AttachmentKind;
  status: AttachmentReadStatus;
  text: string;
  note?: string;
}

export interface AttachmentReadResult {
  reads: AttachmentRead[];
  /** Combined local transcription, for display and deterministic fallback. */
  text: string;
  readable: number;
  failed: number;
  unsupported: number;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function attachmentKind(attachment: Attachment): AttachmentKind {
  if (attachment.type.startsWith("image/")) return "image";
  const ext = extensionOf(attachment.name);
  if (ext === "pdf" || attachment.type === "application/pdf") return "pdf";
  if (attachment.type.startsWith("text/") || TEXT_EXTENSIONS.has(ext)) {
    return "text";
  }
  return "other";
}

function clean(text: string): string {
  const printable = Array.from(text).filter((char) => {
    const code = char.charCodeAt(0);
    return (
      code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)
    );
  });
  return printable
    .join("")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

function readBlobText(file: Blob): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("read-failed"));
    reader.onabort = () => reject(new Error("read-aborted"));
    reader.readAsText(file);
  });
}

async function readTextFile(
  attachment: Attachment,
  signal: AbortSignal,
): Promise<AttachmentRead> {
  const base = {
    id: attachment.id,
    name: attachment.name,
    kind: "text" as const,
  };
  if (signal.aborted) {
    return {
      ...base,
      status: "failed",
      text: "",
      note: "Pembacaan dibatalkan.",
    };
  }
  if (attachment.size > MAX_TEXT_BYTES) {
    return {
      ...base,
      status: "unsupported",
      text: "",
      note: "Berkas teks terlalu besar untuk dibaca di perangkat ini.",
    };
  }
  try {
    const text = clean(await readBlobText(attachment.file));
    if (text.length === 0) {
      return {
        ...base,
        status: "failed",
        text: "",
        note: "Berkas tidak berisi teks yang bisa dibaca.",
      };
    }
    return { ...base, status: "read", text };
  } catch {
    return {
      ...base,
      status: "failed",
      text: "",
      note: "Berkas gagal dibaca.",
    };
  }
}

export async function readAttachments(
  attachments: readonly Attachment[],
  transcription: ImageTranscription,
  signal?: AbortSignal,
): Promise<AttachmentReadResult> {
  const control = signal ?? new AbortController().signal;
  const reads = await Promise.all(
    attachments.map(async (attachment): Promise<AttachmentRead> => {
      const kind = attachmentKind(attachment);
      const base = { id: attachment.id, name: attachment.name, kind };

      if (kind === "image") {
        const read = transcription.items.find(
          (item) => item.id === attachment.id,
        );
        return read
          ? { ...base, status: "read", text: clean(read.text) }
          : {
              ...base,
              status: "failed",
              text: "",
              note: "Gambar tidak menghasilkan teks yang terbaca.",
            };
      }

      if (kind === "text") return readTextFile(attachment, control);

      if (kind === "pdf") {
        return {
          ...base,
          status: "unsupported",
          text: "",
          note: "Teks PDF belum bisa dibaca di perangkat ini. Salin bagian yang ingin dibahas.",
        };
      }

      return {
        ...base,
        status: "unsupported",
        text: "",
        note: "Jenis berkas ini belum bisa dibaca di perangkat ini.",
      };
    }),
  );

  const text = reads
    .filter((read) => read.status === "read")
    .map((read) => `[${read.name}]\n${read.text}`)
    .join("\n\n");

  return {
    reads,
    text,
    readable: reads.filter((read) => read.status === "read").length,
    failed: reads.filter((read) => read.status === "failed").length,
    unsupported: reads.filter((read) => read.status === "unsupported").length,
  };
}

/**
 * Project readable attachment text into the model-facing shape.
 *
 * The filename and the local status note are deliberately dropped. The cap is
 * per-request, not per-file, so three large screenshots cannot exceed the
 * route's body budget.
 */
export function attachmentContext(
  reads: readonly AttachmentRead[],
): AnswerAttachment[] {
  const context: AnswerAttachment[] = [];
  let budget = MAX_CONTEXT_CHARS;

  for (const read of reads) {
    if (read.status !== "read" || read.text.length === 0) continue;
    const text = read.text.slice(0, Math.max(0, budget));
    if (text.length === 0) break;
    budget -= text.length;
    context.push({ kind: read.kind, text });
    if (context.length >= 3) break;
  }

  return context;
}

/** A local answer when the model cannot be reached or the file is unsupported. */
export function describeReads(result: AttachmentReadResult): string {
  const readParts = result.reads.filter((read) => read.status === "read");
  if (readParts.length > 0) {
    const header =
      readParts.length === 1
        ? "Ini teks yang terbaca dari lampiran:"
        : `Ini teks yang terbaca dari ${readParts.length} lampiran:`;
    return `${header}\n\n${readParts
      .map((read) => `— ${read.name}\n${read.text}`)
      .join("\n\n")}`;
  }
  const note = result.reads.find((read) => read.note)?.note;
  return note ?? "Saya belum menemukan teks yang bisa dibaca di lampiran itu.";
}
